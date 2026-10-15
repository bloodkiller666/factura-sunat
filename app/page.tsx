"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CloudOff, Database, Loader2 } from "lucide-react";
import { CompanySelector, type EmpresaActiva } from "@/components/company-selector";
import { CompanyInfoCard } from "@/components/company-info-card";
import { FILTROS_INICIALES, FiltersPanel } from "@/components/filters-panel";
import { ImportarExcelModal } from "@/components/importar-excel-modal";
import { InvoiceDetailModal } from "@/components/invoice-detail-modal";
import { InvoicesTable } from "@/components/invoices-table";
import { LoginView } from "@/components/login-view";
import { KpiCards, type Metricas } from "@/components/kpi-cards";
import { PortalHeader } from "@/components/portal-header";
import { SkeletonKpis } from "@/components/skeletons";
import { type NuevoToast, Toast, type ToastState } from "@/components/toast";
import {
  API_BASE,
  ApiError,
  apiActualizarCheckSap,
  apiConfigurado,
  apiComprobantes,
  apiDetalle,
  apiDescargarXml,
  apiEmpresas,
  apiImportarPaquete,
  apiImportarXml,
  apiPdf,
  apiSincronizarPendientes,
  conDetalle,
  mapComprobante,
  mapEmpresa,
} from "@/lib/api";
import { descargarBlobArchivo } from "@/lib/comprobante-descargas";
import { TODOS_LOS_PERIODOS, etiquetaPeriodo } from "@/lib/format";
import {
  type EstadoImportacion,
  analizarHoja,
  esExcelModerno,
} from "@/lib/importar-excel";
import type { Comprobante, Empresa, FiltrosState } from "@/lib/types";
import { type FormatoDescarga, claveDescarga } from "@/lib/utils";
import { useSesion } from "@/lib/use-sesion";
import { leerHojaXlsx } from "@/lib/xlsx-lectura";

/** Documentos que representan venta (las guías no generan importe facturado). */
const TIPOS_FACTURABLES = new Set(["Factura", "Boleta de Venta", "Nota de Crédito", "Nota de Débito"]);

/** Página que pide el backend en cada tanda. */
const LOTE_PAGINA = 100;
/** Tope de comprobantes a cargar de una empresa en la carga inicial. */
const LIMITE_CARGA = 1000;

/** Empresa provisional mientras no llega la lista real del backend. */
const EMPRESA_VACIA: Empresa = {
  id: "",
  nombreCorto: "—",
  razonSocial: "—",
  ruc: "00000000000",
  estado: "ACTIVO",
  condicion: "HABIDO",
  domicilioFiscal: "",
  actividadPrincipal: "",
  comprobantesElectronicos: [],
  comprobantes: [],
};

/** Resultado de la carga de comprobantes de una empresa. */
interface CargaComprobantes {
  ruc: string;
  items: Comprobante[];
  hayMas: boolean;
  error: string | null;
}

/** ¿El comprobante cae dentro del periodo elegido? `"TODOS"` no acota por mes. */
function coincideMes(iso: string, periodo: string): boolean {
  if (periodo === TODOS_LOS_PERIODOS) return true;
  const [anio, mes] = periodo.split("-").map(Number);
  const [a, m] = iso.split("-").map(Number);
  return anio === a && mes === m;
}

function aplicarFiltros(
  comprobantes: Comprobante[],
  filtros: FiltrosState,
  checksSap: Record<string, boolean>,
): Comprobante[] {
  const consulta = filtros.q.trim().toLowerCase();
  const filtroSap = filtros.numeroSap.trim().toLowerCase();

  return comprobantes.filter((comprobante) => {
    const coincideTexto =
      consulta === "" ||
      comprobante.numero.toLowerCase().includes(consulta) ||
      comprobante.descripcion.toLowerCase().includes(consulta) ||
      comprobante.tipo.toLowerCase().includes(consulta) ||
      comprobante.cliente.razonSocial.toLowerCase().includes(consulta) ||
      comprobante.ordenCompra.toLowerCase().includes(consulta) ||
      comprobante.cliente.ruc.includes(consulta);

    const coincidePeriodoElegido = coincideMes(comprobante.fechaEmision, filtros.mes);
    const coincideTipo = filtros.tipo === "TODOS" || comprobante.tipo === filtros.tipo;
    const coincideSunat =
      filtros.estadoSunat === "TODOS" || comprobante.estadoSunat === filtros.estadoSunat;
    const coincideSap =
      filtroSap === "" || comprobante.numeroSap.toLowerCase().includes(filtroSap);

    const marcado = checksSap[comprobante.id] ?? comprobante.checkSap;
    const coincideCheck =
      filtros.checkSap === "TODOS" || (filtros.checkSap === "CON" ? marcado : !marcado);

    const coincideDesde = filtros.desde === "" || comprobante.fechaEmision >= filtros.desde;
    const coincideHasta = filtros.hasta === "" || comprobante.fechaEmision <= filtros.hasta;

    return (
      coincideTexto &&
      coincidePeriodoElegido &&
      coincideTipo &&
      coincideSunat &&
      coincideSap &&
      coincideCheck &&
      coincideDesde &&
      coincideHasta
    );
  });
}

/** Métricas del periodo elegido: alimentan las tarjetas KPI. */
function calcularMetricas(comprobantes: Comprobante[], periodo: string): Metricas {
  const delPeriodo = comprobantes.filter((comprobante) =>
    coincideMes(comprobante.fechaEmision, periodo),
  );

  // Solo cuenta lo vigente (ni anulados ni rechazados). Las notas de crédito
  // restan y cada moneda se suma por separado: no hay tipo de cambio para
  // mezclar soles con dólares.
  const vigentes = delPeriodo.filter(
    (comprobante) =>
      TIPOS_FACTURABLES.has(comprobante.tipo) &&
      comprobante.estadoSunat !== "Anulado" &&
      comprobante.estadoSunat !== "Rechazado",
  );
  const sumar = (moneda: string) =>
    Math.round(
      vigentes
        .filter((comprobante) => comprobante.moneda === moneda)
        .reduce(
          (suma, comprobante) =>
            suma + (comprobante.tipo === "Nota de Crédito" ? -comprobante.total : comprobante.total),
          0,
        ) * 100,
    ) / 100;

  return {
    totalFacturado: sumar("PEN"),
    totalFacturadoUsd: sumar("USD"),
    aprobados: delPeriodo.filter((c) => c.estadoSunat === "Aprobado").length,
    pendientes: delPeriodo.filter((c) => c.estadoSunat === "Pendiente").length,
    anulados: delPeriodo.filter((c) => c.estadoSunat === "Anulado").length,
    rechazados: delPeriodo.filter((c) => c.estadoSunat === "Rechazado").length,
    totalComprobantes: delPeriodo.length,
    mesEtiqueta: etiquetaPeriodo(periodo),
    delMes: periodo !== TODOS_LOS_PERIODOS,
  };
}

/** Periodos (`yyyy-mm`) presentes en los comprobantes cargados, del más nuevo al más viejo. */
function derivarPeriodos(comprobantes: Comprobante[]): string[] {
  const periodos = new Set<string>();
  for (const comprobante of comprobantes) {
    const iso = comprobante.fechaEmision;
    if (iso.length >= 7) periodos.add(iso.slice(0, 7));
  }
  return [...periodos].sort().reverse();
}

export default function Page() {
  const sesion = useSesion();

  /* Empresas del usuario (multiempresa) y la activa. */
  const [empresas, setEmpresas] = useState<EmpresaActiva[]>([]);
  const [rucActivo, setRucActivo] = useState<string | null>(null);
  const [errorEmpresas, setErrorEmpresas] = useState<string | null>(null);

  /* Comprobantes reales cargados del backend, etiquetados por empresa. */
  const [carga, setCarga] = useState<CargaComprobantes | null>(null);
  /** Refresco lanzado desde un botón (sincronizar/importar). */
  const [refrescando, setRefrescando] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIALES);
  const [detalle, setDetalle] = useState<Comprobante | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [descargaEnCurso, setDescargaEnCurso] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  /** Cambios de "Check SAP" aún no reflejados en la lista (optimistas). */
  const [checksSap, setChecksSap] = useState<Record<string, boolean>>({});
  /** Análisis del Excel importado: `null` = modal cerrado. */
  const [importacion, setImportacion] = useState<EstadoImportacion | null>(null);

  const temporizadorDescarga = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entradaXmlRef = useRef<HTMLInputElement>(null);
  /** Raíz de la página: acota los selectores de GSAP. */
  const raizRef = useRef<HTMLDivElement>(null);

  const empresa = useMemo<Empresa>(() => {
    const activa = empresas.find((e) => e.ruc === rucActivo);
    if (!activa) return EMPRESA_VACIA;
    return mapEmpresa({
      id: activa.id,
      ruc: activa.ruc,
      razon_social: activa.nombreCorto,
      nombre_comercial: activa.nombreCorto,
      activo: true,
      sunat_ambiente: null,
      rol: activa.rol,
    });
  }, [empresas, rucActivo]);

  const rolActivo = empresas.find((e) => e.ruc === rucActivo)?.rol ?? "lector";
  /** Solo admin/emisor pueden importar o sincronizar (lo valida el backend igual). */
  const puedeOperar = rolActivo === "admin" || rolActivo === "emisor";

  /**
   * Cargando (derivado): hay una empresa activa cuyos datos aún no llegaron.
   * El refresco por botón tiene su propio indicador.
   */
  const cargando =
    sesion.token !== null &&
    rucActivo !== null &&
    empresas.length > 0 &&
    (carga === null || carga.ruc !== rucActivo);

  const errorCarga = carga && carga.ruc === rucActivo ? carga.error : null;
  const comprobantes = useMemo(
    () => (carga && carga.ruc === rucActivo ? carga.items : []),
    [carga, rucActivo],
  );
  const hayMas = carga && carga.ruc === rucActivo ? carga.hayMas : false;

  /* Los periodos del selector salen de los comprobantes cargados. */
  const periodos = useMemo(() => derivarPeriodos(comprobantes), [comprobantes]);

  /** Comprobantes visibles con su Check SAP vigente. */
  const comprobantesFiltrados = useMemo(
    () =>
      aplicarFiltros(comprobantes, filtros, checksSap).map((comprobante) => ({
        ...comprobante,
        checkSap: checksSap[comprobante.id] ?? comprobante.checkSap,
      })),
    [comprobantes, filtros, checksSap],
  );

  const metricas = useMemo(
    () => calcularMetricas(comprobantes, filtros.mes),
    [comprobantes, filtros.mes],
  );

  /* Entrada de la página: revelado escalonado (respeta prefers-reduced-motion). */
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-anim='reveal']", {
          y: 26,
          opacity: 0,
          duration: 0.72,
          ease: "power3.out",
          stagger: 0.08,
          clearProps: "opacity,transform",
        });
      });

      return () => mm.revert();
    },
    { scope: raizRef },
  );

  /* Autocierre del toast. */
  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(temporizador);
  }, [toast]);

  /* Limpieza del temporizador de descarga al desmontar. */
  useEffect(
    () => () => {
      if (temporizadorDescarga.current) clearTimeout(temporizadorDescarga.current);
    },
    [],
  );

  const notificar = useCallback((nuevo: NuevoToast) => {
    setToast({ id: Date.now(), ...nuevo });
  }, []);

  /**
   * Descarga los comprobantes de una empresa en tandas de 100 hasta el tope.
   * Función pura: no toca estado; cada llamador aplica el resultado después
   * del `await`, de modo que el indicador de carga es siempre estado derivado.
   */
  const descargarComprobantes = useCallback(
    async (token: string, ruc: string): Promise<CargaComprobantes> => {
      try {
        const acumulado: Comprobante[] = [];
        let offset = 0;
        let hayMasPaginas = false;

        do {
          const pagina = await apiComprobantes(token, ruc, {
            limit: LOTE_PAGINA,
            offset,
          });
          acumulado.push(...pagina.items.map(mapComprobante));
          offset += pagina.items.length;
          hayMasPaginas = pagina.has_more;
        } while (hayMasPaginas && acumulado.length < LIMITE_CARGA);

        return {
          ruc,
          items: acumulado,
          hayMas: hayMasPaginas && acumulado.length >= LIMITE_CARGA,
          error: null,
        };
      } catch (error) {
        return {
          ruc,
          items: [],
          hayMas: false,
          error:
            error instanceof Error ? error.message : "No se pudieron cargar los comprobantes.",
        };
      }
    },
    [],
  );

  /* 1. Empresas del usuario, apenas hay token. */
  useEffect(() => {
    const token = sesion.token;
    if (!token) return;

    let vigente = true;
    (async () => {
      try {
        const lista = await apiEmpresas(token);
        if (!vigente) return;
        const activas = lista
          .filter((e) => e.activo)
          .map((e) => ({
            id: e.id,
            ruc: e.ruc,
            nombreCorto: e.nombre_comercial || e.razon_social,
            rol: e.rol,
          }));
        setEmpresas(activas);
        setRucActivo(
          (previo) =>
            (previo && activas.some((e) => e.ruc === previo) ? previo : activas[0]?.ruc) ?? null,
        );
        setErrorEmpresas(activas.length === 0 ? "Tu usuario no tiene empresas asignadas." : null);
      } catch (error) {
        if (vigente) {
          setErrorEmpresas(
            error instanceof Error ? error.message : "No se pudo consultar tus empresas.",
          );
        }
      }
    })();

    return () => {
      vigente = false;
    };
  }, [sesion.token]);

  /* 2. Comprobantes de la empresa activa (solo si es de la lista del usuario). */
  useEffect(() => {
    const token = sesion.token;
    const ruc = rucActivo;
    if (!token || !ruc || !empresas.some((e) => e.ruc === ruc)) return;

    let vigente = true;
    (async () => {
      const resultado = await descargarComprobantes(token, ruc);
      if (vigente) setCarga(resultado);
    })();

    return () => {
      vigente = false;
    };
  }, [sesion.token, rucActivo, empresas, descargarComprobantes]);

  /** Marca y desmarca el "Check SAP" de un comprobante (el usuario decide). */
  async function alternarCheckSap(id: string) {
    const token = sesion.token;
    const original = comprobantes.find((c) => c.id === id);
    if (!token || !original) return;

    const anterior = checksSap[id] ?? original.checkSap;
    const nuevo = !anterior;
    // Optimista: la casilla responde al instante y se revierte si el backend falla.
    setChecksSap((previos) => ({ ...previos, [id]: nuevo }));
    try {
      await apiActualizarCheckSap(token, id, nuevo);
    } catch (error) {
      setChecksSap((previos) => ({ ...previos, [id]: anterior }));
      const sinPermiso = error instanceof ApiError && error.status === 403;
      notificar({
        titulo: sinPermiso ? "Sin permiso" : "No se guardó el Check SAP",
        detalle: sinPermiso
          ? "Tu rol en esta empresa no permite modificar el Check SAP."
          : error instanceof Error
            ? error.message
            : "Inténtalo nuevamente.",
        tono: "aviso",
      });
    }
  }

  /**
   * Abre el detalle: primero con los datos de la lista y luego, en segundo
   * plano, con el detalle real de ítems que devuelve el backend.
   */
  async function verDetalle(comprobante: Comprobante) {
    setDetalle(comprobante);
    if (!sesion.token || comprobante.items.length > 0) return;

    setCargandoDetalle(true);
    try {
      const detalleApi = await apiDetalle(sesion.token, comprobante.id);
      const completo = conDetalle(comprobante, detalleApi);
      setDetalle(completo);
      if (carga && carga.ruc === rucActivo) {
        setCarga({
          ...carga,
          items: carga.items.map((c) => (c.id === completo.id ? completo : c)),
        });
      }
    } catch {
      // Sin detalle se muestra la cabecera: no es un error bloqueante.
    } finally {
      setCargandoDetalle(false);
    }
  }

  /** Descargas reales: PDF generado por el backend y XML archivado en R2. */
  async function descargar(comprobante: Comprobante, formato: FormatoDescarga) {
    if (!sesion.token || descargaEnCurso) return;

    const clave = claveDescarga(comprobante.id, formato);
    setDescargaEnCurso(clave);
    if (temporizadorDescarga.current) clearTimeout(temporizadorDescarga.current);

    try {
      if (formato === "PDF") {
        const { blob, nombre } = await apiPdf(
          sesion.token,
          comprobante.id,
          `${comprobante.numero}.pdf`,
        );
        descargarBlobArchivo(blob, nombre);
        notificar({ titulo: "PDF descargado", detalle: nombre, tono: "ok" });
      } else {
        const { blob, nombre } = await apiDescargarXml(sesion.token, comprobante.id);
        descargarBlobArchivo(blob, nombre);
        notificar({ titulo: "XML descargado", detalle: nombre, tono: "ok" });
      }
    } catch (error) {
      notificar({
        titulo: formato === "PDF" ? "No se pudo descargar el PDF" : "No se pudo descargar el XML",
        detalle: error instanceof Error ? error.message : "Reintenta en unos segundos.",
        tono: "aviso",
      });
    } finally {
      temporizadorDescarga.current = setTimeout(() => setDescargaEnCurso(null), 900);
    }
  }

  /** Consulta a SUNAT el estado de los pendientes (admin/emisor). */
  async function sincronizarSunat() {
    if (!sesion.token || !rucActivo || sincronizando) return;

    setSincronizando(true);
    try {
      const lote = await apiSincronizarPendientes(sesion.token, rucActivo);
      const detalleResumen =
        lote.total === 0
          ? "No hay comprobantes pendientes por consultar."
          : `${lote.con_cambio} con cambio de estado · ${lote.fallidos} fallido(s)${
              lote.detenido_por ? " · detenido por SUNAT" : ""
            }`;
      notificar({
        titulo: `Sincronización SUNAT: ${lote.procesados} consultado(s)`,
        detalle: detalleResumen,
        tono: lote.total === 0 ? "info" : "ok",
      });
      setRefrescando(true);
      setCarga(await descargarComprobantes(sesion.token, rucActivo));
    } catch (error) {
      notificar({
        titulo: "No se pudo sincronizar con SUNAT",
        detalle: error instanceof Error ? error.message : "Reintenta en unos segundos.",
        tono: "aviso",
      });
    } finally {
      setRefrescando(false);
      setSincronizando(false);
    }
  }

  /** Importación real de XML UBL (individuales o ZIP masivo) — admin/emisor. */
  async function importarXml(archivos: File[]) {
    if (!sesion.token || !rucActivo || archivos.length === 0) return;

    let importados = 0;
    let duplicados = 0;
    let conError = 0;

    setRefrescando(true);
    for (const archivo of archivos) {
      const esZip = archivo.name.toLowerCase().endsWith(".zip");
      try {
        if (esZip) {
          const reporte = await apiImportarPaquete(sesion.token, rucActivo, archivo);
          importados += reporte.importados;
          duplicados += reporte.duplicados;
          conError += reporte.con_error;
        } else {
          await apiImportarXml(sesion.token, rucActivo, archivo);
          importados += 1;
        }
      } catch (error) {
        const codigo = (error as { code?: string }).code;
        if (codigo === "conflict") duplicados += 1;
        else conError += 1;
      }
    }

    const partes = [
      importados > 0 ? `${importados} importado(s)` : null,
      duplicados > 0 ? `${duplicados} duplicado(s)` : null,
      conError > 0 ? `${conError} con error` : null,
    ].filter(Boolean);

    notificar({
      titulo: "Importación de XML terminada",
      detalle: partes.length > 0 ? partes.join(" · ") : "No se procesó ningún archivo.",
      tono: importados > 0 ? "ok" : "aviso",
    });

    if (importados > 0) {
      setCarga(await descargarComprobantes(sesion.token, rucActivo));
    }
    setRefrescando(false);
  }

  /**
   * Analiza un Excel elegido por el usuario contra las columnas de la tabla.
   * Todo ocurre en el navegador: el archivo no se sube a ningún servidor.
   */
  async function importarExcel(archivo: File) {
    setImportacion({ fase: "analizando", archivo: archivo.name });

    if (!esExcelModerno(archivo.name)) {
      setImportacion({
        fase: "error",
        archivo: archivo.name,
        mensaje:
          "La extensión del archivo no corresponde a un libro de Excel moderno (.xlsx o .xlsm).",
      });
      return;
    }

    try {
      const datos = new Uint8Array(await archivo.arrayBuffer());
      const hoja = await leerHojaXlsx(datos);
      const reporte = analizarHoja(hoja, archivo.name);

      setImportacion({ fase: "listo", archivo: archivo.name, reporte });
    } catch (error) {
      setImportacion({
        fase: "error",
        archivo: archivo.name,
        mensaje:
          error instanceof Error
            ? error.message
            : "Ocurrió un problema inesperado al leer el archivo.",
      });
    }
  }

  /* ----------------------------- Pantallas previas ----------------------------- */

  /* Sin configuración del .env no hay nada que conectar: se explica qué falta. */
  if (!apiConfigurado || !sesion.configurado) {
    const faltan = [
      apiConfigurado ? null : "NEXT_PUBLIC_API_URL (URL del backend)",
      sesion.configurado ? null : "NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ].filter(Boolean);

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f7fc] to-[#eef1f9] px-4 dark:from-[#05060c] dark:to-[#04050a]">
        <div className="vidrio max-w-lg rounded-3xl p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300">
            <CloudOff className="h-7 w-7" />
          </span>
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Falta configurar el entorno
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            El portal se conecta al backend y a Supabase con las variables del archivo{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">
              .env.local
            </code>{" "}
            (copia{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">
              .env.example
            </code>
            ). Falta:
          </p>
          <ul className="mt-3 space-y-1 text-left text-xs font-medium text-slate-600 dark:text-slate-300">
            {faltan.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  /* Validando la sesión de Supabase. */
  if (sesion.cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center dark:bg-[#05060c]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  /* Sin sesión: login. */
  if (!sesion.token) {
    return <LoginView entrar={sesion.entrar} />;
  }

  return (
    <div
      ref={raizRef}
      id="portal-raiz"
      className="relative min-h-screen bg-gradient-to-b from-[#f5f7fc] via-[#fafbff] to-[#eef1f9] dark:from-[#05060c] dark:via-[#06070e] dark:to-[#04050a]"
    >
      {/* Orbes de fondo: profundidad sutil sin interferir con la UI */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] overflow-hidden"
      >
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] animate-[flotarOrbe_14s_ease-in-out_infinite] rounded-full bg-indigo-500/20 blur-[130px] dark:bg-indigo-500/25" />
        <div className="absolute -top-24 right-[-8rem] h-[360px] w-[360px] animate-[flotarOrbe_18s_ease-in-out_infinite] rounded-full bg-emerald-400/15 blur-[130px] dark:bg-emerald-500/20" />
      </div>

      <PortalHeader cargando={cargando || refrescando} email={sesion.email} onSalir={sesion.salir} />

      <main className="relative z-10 mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <CompanySelector
          empresas={empresas}
          rucActivo={rucActivo}
          cargando={empresas.length === 0 && !errorEmpresas}
          onCambiar={(ruc) => {
            setRucActivo(ruc);
            setChecksSap({});
            setFiltros(FILTROS_INICIALES);
          }}
        />

        <div data-anim="reveal" className="flex flex-col gap-4 sm:gap-5">
          {(errorEmpresas || errorCarga) && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              <Database className="mt-0.5 h-4 w-4 shrink-0" />
              {errorEmpresas ?? errorCarga}
            </div>
          )}

          <CompanyInfoCard empresa={empresa} cargando={cargando} />

          {cargando ? <SkeletonKpis /> : <KpiCards metricas={metricas} />}

          <FiltersPanel
            filtros={filtros}
            onCambiar={(parcial) => setFiltros((previos) => ({ ...previos, ...parcial }))}
            onLimpiar={() => setFiltros(FILTROS_INICIALES)}
            resultados={comprobantesFiltrados.length}
            total={comprobantes.length}
            cargando={cargando}
            periodos={periodos}
          />

          <InvoicesTable
            comprobantes={comprobantesFiltrados}
            empresa={empresa}
            totalEmpresa={comprobantes.length}
            cargando={cargando || refrescando}
            descargaEnCurso={descargaEnCurso}
            importando={importacion?.fase === "analizando"}
            sincronizando={sincronizando}
            puedeOperar={puedeOperar}
            onVerDetalle={(comprobante) => void verDetalle(comprobante)}
            onDescargar={(comprobante, formato) => void descargar(comprobante, formato)}
            onNotificar={notificar}
            onAlternarCheckSap={alternarCheckSap}
            onImportarExcel={importarExcel}
            onImportarXml={() => entradaXmlRef.current?.click()}
            onSincronizar={() => void sincronizarSunat()}
          />

          {hayMas && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Se muestran los primeros {LIMITE_CARGA} comprobantes de la empresa. Usa los filtros
              para acotar la búsqueda.
            </p>
          )}
        </div>
      </main>

      <footer
        data-anim="reveal"
        className="relative z-10 mx-auto max-w-[1600px] px-4 pb-10 text-center text-xs text-slate-400 sm:px-6 lg:px-8 dark:text-slate-500"
      >
        Portal de facturación electrónica · Comprobantes reales validados ante SUNAT
        {API_BASE ? ` · API: ${API_BASE}` : ""}
      </footer>

      <InvoiceDetailModal
        comprobante={detalle}
        empresa={empresa}
        descargaEnCurso={descargaEnCurso}
        cargandoDetalle={cargandoDetalle}
        onCerrar={() => setDetalle(null)}
        onDescargar={(comprobante, formato) => void descargar(comprobante, formato)}
      />

      <ImportarExcelModal estado={importacion} onCerrar={() => setImportacion(null)} />

      {/* Entrada de archivos XML/ZIP oculta: la dispara el botón de la barra. */}
      <input
        ref={entradaXmlRef}
        type="file"
        accept=".xml,.zip"
        multiple
        hidden
        onChange={(evento) => {
          const archivos = Array.from(evento.target.files ?? []);
          evento.target.value = "";
          void importarXml(archivos);
        }}
      />

      <Toast toast={toast} />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CompanyInfoCard } from "@/components/company-info-card";
import { CompanySelector } from "@/components/company-selector";
import { FILTROS_INICIALES, FiltersPanel } from "@/components/filters-panel";
import { ImportarExcelModal } from "@/components/importar-excel-modal";
import { InvoiceDetailModal } from "@/components/invoice-detail-modal";
import { InvoicesTable } from "@/components/invoices-table";
import { KpiCards, type Metricas } from "@/components/kpi-cards";
import { PortalHeader } from "@/components/portal-header";
import { PrintSheet } from "@/components/print-sheet";
import { SkeletonKpis } from "@/components/skeletons";
import { type NuevoToast, Toast, type ToastState } from "@/components/toast";
import { descargarXml, imprimirPdf, nombreArchivoPdf } from "@/lib/comprobante-descargas";
import { TODOS_LOS_PERIODOS, coincidePeriodo, etiquetaPeriodo } from "@/lib/format";
import {
  type EstadoImportacion,
  analizarHoja,
  esExcelModerno,
} from "@/lib/importar-excel";
import { EMPRESAS } from "@/lib/mock-data";
import type { Comprobante, FiltrosState } from "@/lib/types";
import { type FormatoDescarga, claveDescarga } from "@/lib/utils";
import { leerHojaXlsx } from "@/lib/xlsx-lectura";

/** Documentos que representan venta (las guías no generan importe facturado). */
const TIPOS_FACTURABLES = new Set(["Factura", "Boleta de Venta", "Nota de Crédito", "Nota de Débito"]);

/** Duración simulada de la "consulta a SUNAT" al cambiar de empresa. */
const MS_CARGA_EMPRESA = 700;
/** Duración del indicador de progreso mientras se entrega el archivo. */
const MS_DESCARGA = 900;

/**
 * Marcas "Check SAP" con las que arranca el portal: parten de los datos
 * simulados y a partir de ahí el usuario las marca y desmarca a voluntad.
 */
const CHECKS_SAP_INICIALES: Record<string, boolean> = Object.fromEntries(
  EMPRESAS.flatMap((empresa) =>
    empresa.comprobantes.map((comprobante) => [comprobante.id, comprobante.checkSap] as const),
  ),
);

/** ¿El comprobante cae dentro del periodo elegido? `"TODOS"` no acota por mes. */
function coincideMes(iso: string, periodo: string): boolean {
  if (periodo === TODOS_LOS_PERIODOS) return true;
  const [anio, mes] = periodo.split("-").map(Number);
  return coincidePeriodo(iso, anio, mes);
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

    const marcado = checksSap[comprobante.id] ?? false;
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

/**
 * Métricas del periodo elegido: alimentan las tarjetas KPI. Con
 * `"TODOS"` se mide la empresa completa y la etiqueta lo dice.
 */
function calcularMetricas(comprobantes: Comprobante[], periodo: string): Metricas {
  const delPeriodo = comprobantes.filter((comprobante) =>
    coincideMes(comprobante.fechaEmision, periodo),
  );

  const totalFacturado = delPeriodo
    .filter((comprobante) => TIPOS_FACTURABLES.has(comprobante.tipo))
    .reduce((suma, comprobante) => suma + comprobante.total, 0);

  return {
    totalFacturado: Math.round(totalFacturado * 100) / 100,
    aprobados: delPeriodo.filter((c) => c.estadoSunat === "Aprobado").length,
    pendientes: delPeriodo.filter((c) => c.estadoSunat === "Pendiente").length,
    anulados: delPeriodo.filter((c) => c.estadoSunat === "Anulado").length,
    rechazados: delPeriodo.filter((c) => c.estadoSunat === "Rechazado").length,
    totalComprobantes: delPeriodo.length,
    mesEtiqueta: etiquetaPeriodo(periodo),
    delMes: periodo !== TODOS_LOS_PERIODOS,
  };
}

export default function Page() {
  const [empresaId, setEmpresaId] = useState<string>(EMPRESAS[0].id);
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIALES);
  const [detalle, setDetalle] = useState<Comprobante | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  /** Comprobante que se está exportando a PDF en la hoja de impresión. */
  const [imprimiendo, setImprimiendo] = useState<Comprobante | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargaEnCurso, setDescargaEnCurso] = useState<string | null>(null);
  /** Se incrementa en cada cambio de empresa para reiniciar el temporizador de carga. */
  const [solicitudCarga, setSolicitudCarga] = useState(0);
  /** Marca manual "Check SAP" por comprobante (editable, no persiste al recargar). */
  const [checksSap, setChecksSap] = useState<Record<string, boolean>>(CHECKS_SAP_INICIALES);
  /** Análisis del Excel importado: `null` = modal cerrado. */
  const [importacion, setImportacion] = useState<EstadoImportacion | null>(null);

  const temporizadorDescarga = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Raíz de la página: acota los selectores de GSAP. */
  const raizRef = useRef<HTMLDivElement>(null);
  /** Bloque que se redibuja al cambiar de empresa (ficha, KPIs, filtros y tabla). */
  const contenidoRef = useRef<HTMLDivElement>(null);
  /** Evita repetir la transición de empresa durante el primer render. */
  const primeraEmpresa = useRef(true);

  const empresa = useMemo(
    () => EMPRESAS.find((item) => item.id === empresaId) ?? EMPRESAS[0],
    [empresaId],
  );

  /**
   * Comprobantes visibles. Cada copia lleva su "Check SAP" vigente, de modo que
   * la tabla, el reporte Excel y el filtro trabajan siempre con el mismo valor.
   */
  const comprobantesFiltrados = useMemo(
    () =>
      cargando
        ? []
        : aplicarFiltros(empresa.comprobantes, filtros, checksSap).map((comprobante) => ({
            ...comprobante,
            checkSap: checksSap[comprobante.id] ?? false,
          })),
    [cargando, empresa, filtros, checksSap],
  );

  /** Los KPIs siguen al periodo elegido en los filtros, igual que la tabla. */
  const metricas = useMemo(
    () => calcularMetricas(empresa.comprobantes, filtros.mes),
    [empresa, filtros.mes],
  );

  /**
   * Entrada de la página: revelado escalonado de header, selector, contenido
   * y pie. Se usa `matchMedia` para respetar `prefers-reduced-motion`.
   */
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

  /**
   * Transición al alternar entre TDM Servicios, TDM Geosintéticos y TDM
   * (Tecnología de Materiales): el bloque de contenido entra con un desplazamiento suave.
   */
  useGSAP(
    () => {
      if (primeraEmpresa.current) {
        primeraEmpresa.current = false;
        return;
      }

      const contenido = contenidoRef.current;
      if (!contenido) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          contenido,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            clearProps: "opacity,transform",
          },
        );
      });

      return () => mm.revert();
    },
    { dependencies: [empresaId], revertOnUpdate: true },
  );

  /**
   * Simula la consulta a SUNAT. El estado de carga se activa en el manejador
   * del evento (no dentro del efecto) y este efecto solo programa el cierre.
   */
  useEffect(() => {
    const temporizador = setTimeout(() => setCargando(false), MS_CARGA_EMPRESA);
    return () => clearTimeout(temporizador);
  }, [solicitudCarga]);

  // Autocierre del toast
  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(temporizador);
  }, [toast]);

  // Limpieza del temporizador de descarga al desmontar
  useEffect(
    () => () => {
      if (temporizadorDescarga.current) clearTimeout(temporizadorDescarga.current);
    },
    [],
  );

  /**
   * Exportación a PDF: el comprobante se monta primero en `PrintSheet` y, ya
   * con el DOM listo, se abre el diálogo nativo de impresión, que permite
   * guardar como PDF eligiendo carpeta y nombre de archivo.
   */
  useEffect(() => {
    if (!imprimiendo) return;

    const marco = requestAnimationFrame(() => {
      imprimirPdf(imprimiendo, empresa, () => setImprimiendo(null));
    });

    return () => cancelAnimationFrame(marco);
  }, [imprimiendo, empresa]);

  /** Notificación genérica: la usan la tabla y sus acciones masivas. */
  function notificar(nuevo: NuevoToast) {
    setToast({ id: Date.now(), ...nuevo });
  }

  /** Marca y desmarca el "Check SAP" de un comprobante (el usuario decide). */
  function alternarCheckSap(id: string) {
    setChecksSap((previos) => ({ ...previos, [id]: !previos[id] }));
  }

  /**
   * Analiza un Excel elegido por el usuario contra las columnas de la tabla del
   * portal. Todo ocurre en el navegador: el archivo no se sube a ningún servidor.
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

  function seleccionarEmpresa(id: string) {
    if (id === empresaId) return;
    setEmpresaId(id);
    setFiltros(FILTROS_INICIALES);
    setDetalle(null);
    setCargando(true);
    setSolicitudCarga((solicitud) => solicitud + 1);
  }

  function descargar(comprobante: Comprobante, formato: FormatoDescarga) {
    const clave = claveDescarga(comprobante.id, formato);
    if (descargaEnCurso) return;

    setDescargaEnCurso(clave);
    if (temporizadorDescarga.current) clearTimeout(temporizadorDescarga.current);

    if (formato === "XML") {
      // Genera el UBL 2.1 en memoria y dispara la descarga del archivo .xml.
      const nombreArchivo = descargarXml(comprobante, empresa);
      setToast({
        id: Date.now(),
        titulo: "XML descargado",
        detalle: `${nombreArchivo} · ${comprobante.cliente.razonSocial}`,
        tono: "info",
      });
    } else {
      // Monta la hoja de impresión; el efecto abre el diálogo nativo de PDF.
      setImprimiendo(comprobante);
      setToast({
        id: Date.now(),
        titulo: "Elige la carpeta para guardar el PDF",
        detalle: `${nombreArchivoPdf(comprobante, empresa)}`,
        tono: "ok",
      });
    }

    temporizadorDescarga.current = setTimeout(() => setDescargaEnCurso(null), MS_DESCARGA);
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

      <PortalHeader cargando={cargando} />

      <main className="relative z-10 mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <CompanySelector
          empresas={EMPRESAS}
          seleccionadaId={empresa.id}
          onSeleccionar={seleccionarEmpresa}
        />

        <div ref={contenidoRef} data-anim="reveal" className="flex flex-col gap-4 sm:gap-5">
          <CompanyInfoCard empresa={empresa} cargando={cargando} />

          {cargando ? <SkeletonKpis /> : <KpiCards metricas={metricas} />}

          <FiltersPanel
            filtros={filtros}
            onCambiar={(parcial) => setFiltros((previos) => ({ ...previos, ...parcial }))}
            onLimpiar={() => setFiltros(FILTROS_INICIALES)}
            resultados={comprobantesFiltrados.length}
            total={empresa.comprobantes.length}
            cargando={cargando}
          />

          <InvoicesTable
            comprobantes={comprobantesFiltrados}
            empresa={empresa}
            totalEmpresa={empresa.comprobantes.length}
            cargando={cargando}
            descargaEnCurso={descargaEnCurso}
            importando={importacion?.fase === "analizando"}
            onVerDetalle={setDetalle}
            onDescargar={descargar}
            onNotificar={notificar}
            onAlternarCheckSap={alternarCheckSap}
            onImportarExcel={importarExcel}
          />
        </div>
      </main>

      <footer
        data-anim="reveal"
        className="relative z-10 mx-auto max-w-[1600px] px-4 pb-10 text-center text-xs text-slate-400 sm:px-6 lg:px-8 dark:text-slate-500"
      >
        Prototipo de interfaz · Grupo TDM · Información fiscal y comprobantes simulados con fines de
        demostración. No realiza operaciones reales ante SUNAT.
      </footer>

      <InvoiceDetailModal
        comprobante={detalle}
        empresa={empresa}
        descargaEnCurso={descargaEnCurso}
        onCerrar={() => setDetalle(null)}
        onDescargar={descargar}
      />

      <ImportarExcelModal estado={importacion} onCerrar={() => setImportacion(null)} />

      {/* Hoja exclusiva de impresión: solo se renderiza (y se imprime) al exportar a PDF. */}
      <PrintSheet comprobante={imprimiendo} empresa={empresa} />

      <Toast toast={toast} />
    </div>
  );
}

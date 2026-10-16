"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  apiActualizarCheckSap,
  apiArchivos,
  apiComprobantes,
  apiConsultarCdr,
  apiDescargarArchivo,
  apiDescargarTipo,
  apiDetalle,
  apiEmpresas,
  apiEvidencias,
  apiImportarXml,
  apiPdf,
  apiSincronizarPendientes,
  conDetalle,
  mapArchivo,
  mapComprobante,
  mapEmpresa,
} from "@/lib/api";
import { aviso } from "@/lib/avisos";
import {
  FILTROS_INICIALES,
  aplicarFiltros,
  calcularMetricas,
  checkVigente,
  hayFiltrosActivos,
} from "@/lib/filtros";
import { TODOS_LOS_PERIODOS } from "@/lib/format";
import {
  MAX_COMPROBANTES_LOTE,
  construirLoteRespaldo,
} from "@/lib/lote";
import { descargarBlob, descargarExcel, documentosAExportar, TIPO_ZIP } from "@/lib/exportar";
import { mesesDisponibles } from "@/lib/sire-lote";
import type {
  ArchivoGuardado,
  Comprobante,
  Empresa,
  EstadoSunat,
  FiltroRespaldo,
  FiltrosState,
} from "@/lib/types";

const LOTE_PAGINA = 100;
/** Tope de comprobantes que se cargan de una vez (los más recientes primero). */
export const LIMITE_CARGA = 1500;

interface Carga {
  ruc: string;
  mes: string;
  /** Versión de la consulta que produjo estos datos (sube con cada recarga). */
  version: number;
  items: Comprobante[];
  hayMas: boolean;
  error: string | null;
}

function mensajeDe(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto;
}

/** Último día del mes `yyyy-mm`, como `yyyy-mm-dd`. */
function finDeMes(mes: string): string {
  const [anio, m] = mes.split("-").map(Number);
  const dia = new Date(anio, m, 0).getDate();
  return `${mes}-${String(dia).padStart(2, "0")}`;
}

export function usePortal(token: string | null) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [rucActivo, setRucActivo] = useState<string | null>(null);
  const [errorEmpresas, setErrorEmpresas] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIALES);
  const [carga, setCarga] = useState<Carga | null>(null);
  const [version, setVersion] = useState(0);
  const [checksPendientes, setChecksPendientes] = useState<Record<string, boolean>>({});
  const [seleccionados, setSeleccionados] = useState<Set<string>>(() => new Set());

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [descargando, setDescargando] = useState<Set<string>>(() => new Set());
  const [consultando, setConsultando] = useState<Set<string>>(() => new Set());
  const [sincronizando, setSincronizando] = useState(false);
  const [generandoLote, setGenerandoLote] = useState(false);
  const [evidencias, setEvidencias] = useState<ArchivoGuardado[] | null>(null);
  const [errorEvidencias, setErrorEvidencias] = useState<string | null>(null);

  const empresa = useMemo(
    () => empresas.find((e) => e.ruc === rucActivo) ?? null,
    [empresas, rucActivo],
  );
  const puedeOperar = empresa?.rol === "admin" || empresa?.rol === "emisor";

  /**
   * Clave de la consulta vigente: cambia con la empresa, el periodo o una recarga.
   * Mientras se recarga la MISMA empresa y periodo se siguen mostrando los datos
   * anteriores (con un indicador discreto) en vez de vaciar la tabla.
   */
  const claveCarga = rucActivo ? `${rucActivo}|${filtros.mes}|${version}` : null;
  const hayDatos = Boolean(carga && carga.ruc === rucActivo && carga.mes === filtros.mes);
  const cargando = Boolean(token && rucActivo && !hayDatos);
  const actualizando = hayDatos && carga?.version !== version;
  const comprobantes = useMemo(
    () => (hayDatos && carga ? carga.items : []),
    [hayDatos, carga],
  );

  /* 1. Empresas del usuario. */
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    apiEmpresas(token)
      .then((lista) => {
        if (!vigente) return;
        const activas = lista.filter((e) => e.activo).map(mapEmpresa);
        setEmpresas(activas);
        setRucActivo((previo) =>
          previo && activas.some((e) => e.ruc === previo) ? previo : (activas[0]?.ruc ?? null),
        );
        setErrorEmpresas(activas.length === 0 ? "Tu usuario no tiene empresas asignadas." : null);
      })
      .catch((error) => {
        if (vigente) setErrorEmpresas(mensajeDe(error, "No se pudieron consultar tus empresas."));
      })
      .finally(() => {
        if (vigente) setCargandoEmpresas(false);
      });
    return () => {
      vigente = false;
    };
  }, [token]);

  /* 2. Comprobantes de la empresa y el periodo elegidos (el periodo se pide al servidor). */
  useEffect(() => {
    if (!token || !rucActivo || !claveCarga) return;
    let vigente = true;
    (async () => {
      try {
        const acumulado: Comprobante[] = [];
        let offset = 0;
        let hayMas = false;
        const mes = filtros.mes;
        do {
          const pagina = await apiComprobantes(token, rucActivo, {
            limit: LOTE_PAGINA,
            offset,
            ...(mes !== TODOS_LOS_PERIODOS
              ? { fecha_desde: `${mes}-01`, fecha_hasta: finDeMes(mes) }
              : {}),
          });
          acumulado.push(...pagina.items.map(mapComprobante));
          offset += pagina.items.length;
          hayMas = pagina.has_more;
        } while (hayMas && acumulado.length < LIMITE_CARGA);
        if (vigente) {
          setCarga({ ruc: rucActivo, mes, version, items: acumulado, hayMas, error: null });
        }
      } catch (error) {
        if (vigente) {
          setCarga({
            ruc: rucActivo,
            mes: filtros.mes,
            version,
            items: [],
            hayMas: false,
            error: mensajeDe(error, "No se pudieron cargar los comprobantes."),
          });
        }
      }
    })();
    return () => {
      vigente = false;
    };
    // `filtros.mes` ya forma parte de `claveCarga`.
  }, [token, rucActivo, claveCarga]); // eslint-disable-line react-hooks/exhaustive-deps

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  const filtrados = useMemo(
    () => aplicarFiltros(comprobantes, filtros, checksPendientes),
    [comprobantes, filtros, checksPendientes],
  );
  const metricas = useMemo(
    () => calcularMetricas(comprobantes, filtros.mes),
    [comprobantes, filtros.mes],
  );

  /** Los periodos del selector: todos los que SIRE puede entregar (más los cargados). */
  const periodos = useMemo(() => {
    const ahora = new Date();
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
    return mesesDisponibles(hoy).reverse();
  }, []);

  const detalle = useMemo(
    () => comprobantes.find((c) => c.id === detalleId) ?? null,
    [comprobantes, detalleId],
  );

  /* ----------------------------- Acciones ----------------------------- */

  const cambiarFiltros = useCallback((parcial: Partial<FiltrosState>) => {
    setFiltros((previos) => ({ ...previos, ...parcial }));
  }, []);

  const limpiarFiltros = useCallback(() => setFiltros(FILTROS_INICIALES), []);

  const filtrarPorEstado = useCallback(
    (estado: EstadoSunat) => cambiarFiltros({ estadoSunat: estado }),
    [cambiarFiltros],
  );
  const filtrarPorRespaldo = useCallback(
    (respaldo: FiltroRespaldo) => cambiarFiltros({ respaldo }),
    [cambiarFiltros],
  );

  const cambiarEmpresa = useCallback((ruc: string) => {
    setRucActivo(ruc);
    setChecksPendientes({});
    setSeleccionados(new Set());
    setDetalleId(null);
    setEvidencias(null);
    setErrorEvidencias(null);
    setFiltros(FILTROS_INICIALES);
  }, []);

  const alternarSeleccion = useCallback((id: string) => {
    setSeleccionados((previos) => {
      const siguientes = new Set(previos);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  }, []);

  const seleccionarVisibles = useCallback((ids: string[], marcar: boolean) => {
    setSeleccionados((previos) => {
      const siguientes = new Set(previos);
      for (const id of ids) {
        if (marcar) siguientes.add(id);
        else siguientes.delete(id);
      }
      return siguientes;
    });
  }, []);

  const limpiarSeleccion = useCallback(() => setSeleccionados(new Set()), []);

  /** Selección vigente: solo cuenta lo que sigue visible tras filtrar. */
  const seleccion = useMemo(
    () => filtrados.filter((c) => seleccionados.has(c.id)),
    [filtrados, seleccionados],
  );

  const alternarCheckSap = useCallback(
    async (id: string) => {
      const original = comprobantes.find((c) => c.id === id);
      if (!token || !original) return;
      const anterior = checkVigente(original, checksPendientes);
      setChecksPendientes((previos) => ({ ...previos, [id]: !anterior }));
      try {
        await apiActualizarCheckSap(token, id, !anterior);
      } catch (error) {
        setChecksPendientes((previos) => ({ ...previos, [id]: anterior }));
        aviso.error(
          error instanceof ApiError && error.status === 403
            ? "Sin permiso para cambiar el Check SAP"
            : "No se guardó el Check SAP",
          error instanceof ApiError && error.status === 403
            ? "Tu rol en esta empresa es de solo lectura."
            : mensajeDe(error, "Inténtalo de nuevo."),
        );
      }
    },
    [token, comprobantes, checksPendientes],
  );

  const abrirDetalle = useCallback(
    async (comprobante: Comprobante) => {
      setDetalleId(comprobante.id);
      if (!token || comprobante.items.length > 0) return;
      setCargandoDetalle(true);
      try {
        const completo = conDetalle(comprobante, await apiDetalle(token, comprobante.id));
        setCarga((previa) =>
          previa
            ? { ...previa, items: previa.items.map((c) => (c.id === completo.id ? completo : c)) }
            : previa,
        );
      } catch {
        // Sin detalle se muestra la cabecera: no es un error bloqueante.
      } finally {
        setCargandoDetalle(false);
      }
    },
    [token],
  );

  const cerrarDetalle = useCallback(() => setDetalleId(null), []);

  const conClave = useCallback(
    async (conjunto: "descargando" | "consultando", clave: string, tarea: () => Promise<void>) => {
      const set = conjunto === "descargando" ? setDescargando : setConsultando;
      set((previos) => new Set(previos).add(clave));
      try {
        await tarea();
      } finally {
        set((previos) => {
          const siguientes = new Set(previos);
          siguientes.delete(clave);
          return siguientes;
        });
      }
    },
    [],
  );

  const descargar = useCallback(
    async (c: Comprobante, tipo: "pdf" | "xml" | "cdr") => {
      if (!token) return;
      await conClave("descargando", `${c.id}:${tipo}`, async () => {
        try {
          const { blob, nombre } =
            tipo === "pdf"
              ? await apiPdf(token, c.id, `${c.nombreArchivo || c.numero}.pdf`)
              : await apiDescargarTipo(token, c.id, tipo);
          descargarBlob(blob, nombre);
          aviso.ok(`${tipo.toUpperCase()} descargado`, nombre);
          // El PDF se archiva la primera vez: refresca los indicadores de respaldo.
          if (tipo === "pdf" && !c.tienePdf && puedeOperar) recargar();
        } catch (error) {
          aviso.error(`No se pudo descargar el ${tipo.toUpperCase()}`, mensajeDe(error, "Reintenta."));
        }
      });
    },
    [token, conClave, puedeOperar, recargar],
  );

  const consultarCdr = useCallback(
    async (c: Comprobante) => {
      if (!token) return;
      await conClave("consultando", c.id, async () => {
        try {
          const r = await apiConsultarCdr(token, c.id);
          if (r.cdr) {
            aviso.ok(`CDR recibido de SUNAT · ${r.estado_label}`, r.cdr.descripcion);
          } else {
            aviso.info(
              "SUNAT no entregó el CDR",
              r.mensaje ??
                "Si el comprobante lo emite otro sistema (OSE/PSE), importa su CDR desde Importar → CDR.",
            );
          }
          recargar();
        } catch (error) {
          aviso.error("No se pudo consultar a SUNAT", mensajeDe(error, "Reintenta en un momento."));
        }
      });
    },
    [token, conClave, recargar],
  );

  const sincronizarPendientes = useCallback(async () => {
    if (!token || !rucActivo || sincronizando) return;
    setSincronizando(true);
    try {
      const lote = await apiSincronizarPendientes(token, rucActivo);
      if (lote.total === 0) {
        aviso.info("Nada pendiente", "No hay comprobantes pendientes por consultar en SUNAT.");
      } else {
        aviso.ok(
          `SUNAT consultada: ${lote.procesados} comprobante(s)`,
          `${lote.con_cambio} cambiaron de estado · ${lote.fallidos} con error${
            lote.detenido_por ? " · detenido porque SUNAT no responde" : ""
          }`,
        );
        recargar();
      }
    } catch (error) {
      aviso.error("No se pudo consultar a SUNAT", mensajeDe(error, "Reintenta en un momento."));
    } finally {
      setSincronizando(false);
    }
  }, [token, rucActivo, sincronizando, recargar]);

  const importarXmlDeComprobante = useCallback(
    async (archivo: File) => {
      if (!token || !rucActivo) return;
      try {
        await apiImportarXml(token, rucActivo, archivo);
        aviso.ok("XML importado", "El comprobante se completó con su XML e ítems.");
        recargar();
      } catch (error) {
        aviso.error("No se pudo importar el XML", mensajeDe(error, "Revisa el archivo."));
      }
    },
    [token, rucActivo, recargar],
  );

  const cargarArchivos = useCallback(
    async (c: Comprobante): Promise<ArchivoGuardado[]> => {
      if (!token) return [];
      return (await apiArchivos(token, c.id)).map(mapArchivo);
    },
    [token],
  );

  const cargarPdf = useCallback(
    async (c: Comprobante): Promise<Blob> => {
      if (!token) throw new Error("Sin sesión");
      return (await apiPdf(token, c.id, `${c.numero}.pdf`)).blob;
    },
    [token],
  );

  const exportarExcel = useCallback(() => {
    if (!empresa) return;
    const conjunto = documentosAExportar(seleccion, filtrados).map((c) => ({
      ...c,
      checkSap: checkVigente(c, checksPendientes),
    }));
    if (conjunto.length === 0) {
      aviso.error("No hay comprobantes para exportar", "Ajusta los filtros o selecciona filas.");
      return;
    }
    const nombre = descargarExcel(conjunto, empresa);
    aviso.ok("Reporte Excel descargado", `${nombre} · ${conjunto.length} comprobantes`);
  }, [empresa, seleccion, filtrados, checksPendientes]);

  const generarLote = useCallback(async () => {
    if (!token || !empresa || generandoLote) return;
    const conjunto = seleccion.length > 0 ? seleccion : filtrados;
    if (conjunto.length === 0) {
      aviso.error("No hay comprobantes para el lote", "Selecciona filas o ajusta los filtros.");
      return;
    }
    if (conjunto.length > MAX_COMPROBANTES_LOTE) {
      aviso.error(
        `Un lote admite hasta ${MAX_COMPROBANTES_LOTE} comprobantes`,
        `Hay ${conjunto.length}: selecciona menos o filtra por periodo.`,
      );
      return;
    }
    setGenerandoLote(true);
    const id = aviso.info(`Armando el lote de ${conjunto.length} comprobantes…`, "Descargando XML, CDR y PDF.");
    void id;
    try {
      const resultado = await construirLoteRespaldo(token, empresa, conjunto);
      descargarBlob(new Blob([resultado.zip], { type: TIPO_ZIP }), resultado.nombre);
      const incompletos = resultado.faltantes.length;
      aviso.ok(
        "Lote de respaldo descargado",
        incompletos === 0
          ? `${resultado.archivos} archivos de ${resultado.comprobantes} comprobantes`
          : `${incompletos} de ${resultado.comprobantes} comprobantes tienen respaldo incompleto; el detalle está en LEEME.txt`,
      );
      recargar();
    } catch (error) {
      aviso.error("No se pudo armar el lote", mensajeDe(error, "Reintenta."));
    } finally {
      setGenerandoLote(false);
    }
  }, [token, empresa, generandoLote, seleccion, filtrados, recargar]);

  const cargarEvidencias = useCallback(async () => {
    if (!token || !rucActivo) return;
    setErrorEvidencias(null);
    try {
      setEvidencias(await apiEvidencias(token, rucActivo));
    } catch (error) {
      setErrorEvidencias(mensajeDe(error, "Reintenta en un momento."));
    }
  }, [token, rucActivo]);

  const descargarEvidencia = useCallback(
    async (archivo: ArchivoGuardado) => {
      if (!token) return;
      await conClave("descargando", `ev:${archivo.id}`, async () => {
        try {
          const { blob, nombre } = await apiDescargarArchivo(token, archivo);
          descargarBlob(blob, nombre);
          aviso.ok("Evidencia descargada", nombre);
        } catch (error) {
          aviso.error("No se pudo descargar la evidencia", mensajeDe(error, "Reintenta."));
        }
      });
    },
    [token, conClave],
  );

  return {
    empresas,
    empresa,
    cargandoEmpresas,
    errorEmpresas,
    puedeOperar: Boolean(puedeOperar),
    cambiarEmpresa,
    filtros,
    cambiarFiltros,
    limpiarFiltros,
    hayFiltros: hayFiltrosActivos(filtros),
    filtrarPorEstado,
    filtrarPorRespaldo,
    periodos,
    cargando,
    actualizando,
    errorCarga: hayDatos && carga ? carga.error : null,
    hayMas: hayDatos && carga ? carga.hayMas : false,
    comprobantes,
    filtrados,
    metricas,
    checksPendientes,
    seleccionados,
    seleccion,
    alternarSeleccion,
    seleccionarVisibles,
    limpiarSeleccion,
    detalle,
    cargandoDetalle,
    abrirDetalle,
    cerrarDetalle,
    descargando,
    consultando,
    sincronizando,
    generandoLote,
    descargar,
    consultarCdr,
    alternarCheckSap,
    sincronizarPendientes,
    importarXmlDeComprobante,
    cargarArchivos,
    cargarPdf,
    exportarExcel,
    generarLote,
    recargar,
    evidencias,
    errorEvidencias,
    cargarEvidencias,
    descargarEvidencia,
  };
}

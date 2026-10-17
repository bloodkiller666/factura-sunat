"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  apiResumen,
  apiSincronizarPendientes,
  conDetalle,
  mapArchivo,
  mapComprobante,
  mapEmpresa,
  type ApiDetalle,
  type ApiPagina,
  type ApiResumen,
} from "@/lib/api";
import { aviso } from "@/lib/avisos";
import {
  FILTROS_INICIALES,
  ORDEN_INICIAL,
  alternarOrden,
  checkVigente,
  claveDeConjunto,
  claveDeFiltros,
  consultaDePagina,
  consultaDeResumen,
  hayFiltrosActivos,
  metricasDeResumen,
  type CampoOrden,
  type Orden,
} from "@/lib/filtros";
import { formatearEntero } from "@/lib/format";
import { MAX_COMPROBANTES_LOTE, construirLoteRespaldo } from "@/lib/lote";
import { descargarBlob, descargarExcel, TIPO_ZIP } from "@/lib/exportar";
import type {
  ArchivoGuardado,
  Comprobante,
  Empresa,
  EstadoSunat,
  FiltroRespaldo,
  FiltrosState,
} from "@/lib/types";

export const TAMANO_PAGINA_INICIAL = 50;
/** Espera tras la última tecla antes de buscar en el servidor. */
const RETARDO_BUSQUEDA_MS = 300;
/** Tope de filas de un reporte Excel de «todo lo filtrado» (con selección no aplica). */
export const MAX_EXPORTACION = 5000;
const POR_PAGINA_EXPORTACION = 100;
/** Páginas ya pedidas que se conservan para ir y volver sin esperar. */
const MAX_PAGINAS_EN_CACHE = 40;

interface PaginaCargada {
  ruc: string;
  /** Clave de la consulta que produjo estos datos (empresa + filtros + orden + página). */
  clave: string;
  items: Comprobante[];
  hayMas: boolean;
  /** Total del conjunto filtrado; `null` solo si el servidor aún no lo ha contado. */
  total: number | null;
  error: string | null;
}

interface ResumenCargado {
  ruc: string;
  clave: string;
  api: ApiResumen;
  desde: string;
  hasta: string;
}

function mensajeDe(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto;
}

/** Guarda en un Map con tope: al llenarse se descarta lo más antiguo. */
function guardarEnCache<T>(cache: Map<string, T>, clave: string, valor: T): void {
  cache.delete(clave);
  cache.set(clave, valor);
  while (cache.size > MAX_PAGINAS_EN_CACHE) {
    const masAntigua = cache.keys().next().value;
    if (masAntigua === undefined) break;
    cache.delete(masAntigua);
  }
}

export function usePortal(token: string | null) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [rucActivo, setRucActivo] = useState<string | null>(null);
  const [errorEmpresas, setErrorEmpresas] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIALES);
  const [qEfectiva, setQEfectiva] = useState(FILTROS_INICIALES.q);
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);
  const [pagina, setPagina] = useState(0);
  const [tamano, setTamano] = useState(TAMANO_PAGINA_INICIAL);
  const [version, setVersion] = useState(0);

  const [cargada, setCargada] = useState<PaginaCargada | null>(null);
  const [resumen, setResumen] = useState<ResumenCargado | null>(null);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);
  const [checksPendientes, setChecksPendientes] = useState<Record<string, boolean>>({});
  const [seleccionMapa, setSeleccionMapa] = useState<Map<string, Comprobante>>(() => new Map());

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [detalleBase, setDetalleBase] = useState<Comprobante | null>(null);
  const [detalleApi, setDetalleApi] = useState<Record<string, ApiDetalle>>({});
  const [descargando, setDescargando] = useState<Set<string>>(() => new Set());
  const [consultando, setConsultando] = useState<Set<string>>(() => new Set());
  const [sincronizando, setSincronizando] = useState(false);
  const [generandoLote, setGenerandoLote] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [evidencias, setEvidencias] = useState<ArchivoGuardado[] | null>(null);
  const [errorEvidencias, setErrorEvidencias] = useState<string | null>(null);

  // Páginas ya pedidas y totales ya contados: ir y volver es instantáneo y no se recuenta.
  const cachePaginas = useRef(new Map<string, ApiPagina>());
  const cacheTotales = useRef(new Map<string, number>());
  const cacheResumen = useRef(new Map<string, ApiResumen>());

  const empresa = useMemo(
    () => empresas.find((e) => e.ruc === rucActivo) ?? null,
    [empresas, rucActivo],
  );
  const puedeOperar = empresa?.rol === "admin" || empresa?.rol === "emisor";

  /* La búsqueda de texto espera a que el usuario deje de teclear; el resto es inmediato. */
  useEffect(() => {
    const espera = filtros.q === "" ? 0 : RETARDO_BUSQUEDA_MS;
    const temporizador = window.setTimeout(() => setQEfectiva(filtros.q), espera);
    return () => window.clearTimeout(temporizador);
  }, [filtros.q]);
  const filtrosEfectivos = useMemo(() => ({ ...filtros, q: qEfectiva }), [filtros, qEfectiva]);

  const claveConjunto = claveDeConjunto(filtrosEfectivos, orden, tamano);
  const clavePagina = rucActivo ? `${rucActivo}|${claveConjunto}|${pagina}|${version}` : null;
  const claveTotal = rucActivo
    ? `${rucActivo}|${claveDeFiltros(filtrosEfectivos)}|${version}`
    : null;
  const claveResumen = rucActivo
    ? `${rucActivo}|${JSON.stringify(consultaDeResumen(filtros))}|${version}`
    : null;

  /* Se muestra lo último cargado de esta empresa mientras llega la página nueva. */
  const hayDatos = Boolean(cargada && cargada.ruc === rucActivo);
  const cargando = Boolean(token && rucActivo && !hayDatos);
  const actualizando = hayDatos && cargada?.clave !== clavePagina;
  const items = useMemo(() => (hayDatos && cargada ? cargada.items : []), [hayDatos, cargada]);
  const total = hayDatos && cargada ? cargada.total : null;

  const hayResumen = Boolean(resumen && resumen.ruc === rucActivo);
  const metricas = useMemo(
    () =>
      hayResumen && resumen
        ? metricasDeResumen(resumen.api, { desde: resumen.desde, hasta: resumen.hasta })
        : null,
    [hayResumen, resumen],
  );
  const actualizandoResumen = hayResumen && resumen?.clave !== claveResumen;

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

  /* 2. Una página de comprobantes (filtros, orden y paginación los resuelve el servidor). */
  useEffect(() => {
    if (!token || !rucActivo || !clavePagina || !claveTotal) return;
    const ruc = rucActivo;
    const clave = clavePagina;
    const siguiente = pagina + 1;
    let vigente = true;

    const pedir = (numeroPagina: number, contar: boolean) =>
      apiComprobantes(
        token,
        ruc,
        consultaDePagina(filtrosEfectivos, orden, { pagina: numeroPagina, tamano, contar }),
      );

    /** Precarga la página siguiente en segundo plano para que "Siguiente" sea inmediato. */
    const precargar = (hayMas: boolean) => {
      if (!hayMas) return;
      const claveSiguiente = `${ruc}|${claveConjunto}|${siguiente}|${version}`;
      if (cachePaginas.current.has(claveSiguiente)) return;
      pedir(siguiente, false)
        .then((respuesta) => guardarEnCache(cachePaginas.current, claveSiguiente, respuesta))
        .catch(() => {
          // La precarga es oportunista: si falla, la página se pedirá al navegar.
        });
    };

    const aplicar = (respuesta: ApiPagina) => {
      if (respuesta.total !== null && respuesta.total !== undefined) {
        cacheTotales.current.set(claveTotal, respuesta.total);
      }
      const nuevos = respuesta.items.map(mapComprobante);
      setCargada({
        ruc,
        clave,
        items: nuevos,
        hayMas: respuesta.has_more,
        total: cacheTotales.current.get(claveTotal) ?? null,
        error: null,
      });
      // La selección guarda copias: se refrescan con lo último que trajo el servidor.
      setSeleccionMapa((previa) => {
        if (previa.size === 0) return previa;
        const porId = new Map(nuevos.map((c) => [c.id, c]));
        let cambio = false;
        const siguienteMapa = new Map(previa);
        for (const id of previa.keys()) {
          const fresco = porId.get(id);
          if (fresco) {
            siguienteMapa.set(id, fresco);
            cambio = true;
          }
        }
        return cambio ? siguienteMapa : previa;
      });
      precargar(respuesta.has_more);
    };

    const enCache = cachePaginas.current.get(clave);
    if (enCache) {
      aplicar(enCache);
      return () => {
        vigente = false;
      };
    }

    (async () => {
      try {
        // El servidor solo cuenta si todavía no se conoce el total de este conjunto filtrado.
        const contar = !cacheTotales.current.has(claveTotal);
        const respuesta = await pedir(pagina, contar);
        if (!vigente) return;
        guardarEnCache(cachePaginas.current, clave, respuesta);
        aplicar(respuesta);
      } catch (error) {
        if (!vigente) return;
        setCargada({
          ruc,
          clave,
          items: [],
          hayMas: false,
          total: null,
          error: mensajeDe(error, "No se pudieron cargar los comprobantes."),
        });
      }
    })();

    return () => {
      vigente = false;
    };
    // Todo lo que influye en la consulta ya forma parte de `clavePagina`.
  }, [token, rucActivo, clavePagina]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 3. Indicadores: dependen solo de la empresa y el rango de fechas, no de la página. */
  useEffect(() => {
    if (!token || !rucActivo || !claveResumen) return;
    const ruc = rucActivo;
    const clave = claveResumen;
    const { desde, hasta } = filtros;
    let vigente = true;
    const guardado = cacheResumen.current.get(clave);
    if (guardado) {
      setResumen({ ruc, clave, api: guardado, desde, hasta });
      setErrorResumen(null);
      return;
    }
    apiResumen(token, ruc, consultaDeResumen(filtros))
      .then((api) => {
        if (!vigente) return;
        guardarEnCache(cacheResumen.current, clave, api);
        setResumen({ ruc, clave, api, desde, hasta });
        setErrorResumen(null);
      })
      .catch((error) => {
        if (vigente) setErrorResumen(mensajeDe(error, "No se pudieron calcular los indicadores."));
      });
    return () => {
      vigente = false;
    };
  }, [token, rucActivo, claveResumen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 4. Detalle del comprobante abierto (ítems reales); se refresca tras cada recarga. */
  useEffect(() => {
    if (!token || !detalleId) return;
    let vigente = true;
    apiDetalle(token, detalleId)
      .then((api) => {
        if (vigente) setDetalleApi((previo) => ({ ...previo, [detalleId]: api }));
      })
      .catch(() => {
        // Sin detalle se muestra la cabecera: no es un error bloqueante.
      });
    return () => {
      vigente = false;
    };
  }, [token, detalleId, version]);

  // Carga el detalle la primera vez; al recargar se refresca sin parpadeo.
  const cargandoDetalle = detalleId !== null && detalleApi[detalleId] === undefined;

  const recargar = useCallback(() => {
    cachePaginas.current.clear();
    cacheTotales.current.clear();
    cacheResumen.current.clear();
    setVersion((v) => v + 1);
  }, []);

  const detalle = useMemo(() => {
    if (!detalleId) return null;
    const enPagina = items.find((c) => c.id === detalleId);
    const comprobante = enPagina ?? (detalleBase?.id === detalleId ? detalleBase : null);
    if (!comprobante) return null;
    const api = detalleApi[detalleId];
    return api ? conDetalle(comprobante, api) : comprobante;
  }, [detalleId, detalleBase, detalleApi, items]);

  /* ----------------------------- Acciones ----------------------------- */

  const cambiarFiltros = useCallback((parcial: Partial<FiltrosState>) => {
    setFiltros((previos) => ({ ...previos, ...parcial }));
    setPagina(0);
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIALES);
    setPagina(0);
  }, []);

  const ordenarPor = useCallback((campo: CampoOrden) => {
    setOrden((previo) => alternarOrden(previo, campo));
    setPagina(0);
  }, []);

  const cambiarTamano = useCallback((nuevo: number) => {
    setTamano(nuevo);
    setPagina(0);
  }, []);

  const irAPagina = useCallback((destino: number) => setPagina(Math.max(0, destino)), []);

  const filtrarPorEstado = useCallback(
    (estado: EstadoSunat) => cambiarFiltros({ estadoSunat: estado }),
    [cambiarFiltros],
  );
  const filtrarPorRespaldo = useCallback(
    (respaldo: FiltroRespaldo) => cambiarFiltros({ respaldo }),
    [cambiarFiltros],
  );

  const cambiarEmpresa = useCallback((ruc: string) => {
    cachePaginas.current.clear();
    cacheTotales.current.clear();
    cacheResumen.current.clear();
    setRucActivo(ruc);
    setChecksPendientes({});
    setSeleccionMapa(new Map());
    setDetalleId(null);
    setEvidencias(null);
    setErrorEvidencias(null);
    setFiltros(FILTROS_INICIALES);
    setQEfectiva(FILTROS_INICIALES.q);
    setOrden(ORDEN_INICIAL);
    setPagina(0);
  }, []);

  const alternarSeleccion = useCallback((comprobante: Comprobante) => {
    setSeleccionMapa((previa) => {
      const siguiente = new Map(previa);
      if (siguiente.has(comprobante.id)) siguiente.delete(comprobante.id);
      else siguiente.set(comprobante.id, comprobante);
      return siguiente;
    });
  }, []);

  const seleccionarVisibles = useCallback((visibles: Comprobante[], marcar: boolean) => {
    setSeleccionMapa((previa) => {
      const siguiente = new Map(previa);
      for (const c of visibles) {
        if (marcar) siguiente.set(c.id, c);
        else siguiente.delete(c.id);
      }
      return siguiente;
    });
  }, []);

  const limpiarSeleccion = useCallback(() => setSeleccionMapa(new Map()), []);

  const seleccionados = useMemo(() => new Set(seleccionMapa.keys()), [seleccionMapa]);
  const seleccion = useMemo(() => [...seleccionMapa.values()], [seleccionMapa]);

  const alternarCheckSap = useCallback(
    async (id: string) => {
      const original = items.find((c) => c.id === id) ?? seleccionMapa.get(id) ?? detalle ?? undefined;
      if (!token || !original || original.id !== id) return;
      const anterior = checkVigente(original, checksPendientes);
      setChecksPendientes((previos) => ({ ...previos, [id]: !anterior }));
      try {
        await apiActualizarCheckSap(token, id, !anterior);
        // Lo guardado cambió: las páginas en caché ya no lo reflejan.
        cachePaginas.current.clear();
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
    [token, items, seleccionMapa, detalle, checksPendientes],
  );

  const abrirDetalle = useCallback((comprobante: Comprobante) => {
    setDetalleBase(comprobante);
    setDetalleId(comprobante.id);
  }, []);

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

  /**
   * Trae del servidor, página a página, todo lo que cumple los filtros vigentes (con un
   * tope). Sirve para exportar «todo lo filtrado» sin haberlo cargado en pantalla.
   */
  const traerFiltrados = useCallback(
    async (maximo: number): Promise<{ items: Comprobante[]; truncado: boolean }> => {
      if (!token || !rucActivo) return { items: [], truncado: false };
      const acumulado: Comprobante[] = [];
      let offset = 0;
      let hayMas = true;
      while (hayMas && acumulado.length < maximo) {
        const respuesta = await apiComprobantes(
          token,
          rucActivo,
          consultaDePagina(filtros, orden, {
            pagina: offset / POR_PAGINA_EXPORTACION,
            tamano: POR_PAGINA_EXPORTACION,
            contar: false,
          }),
        );
        acumulado.push(...respuesta.items.map(mapComprobante));
        offset += POR_PAGINA_EXPORTACION;
        hayMas = respuesta.has_more;
      }
      return { items: acumulado.slice(0, maximo), truncado: hayMas || acumulado.length > maximo };
    },
    [token, rucActivo, filtros, orden],
  );

  const exportarExcel = useCallback(async () => {
    if (!empresa || exportando) return;
    setExportando(true);
    try {
      let conjunto = seleccion;
      let truncado = false;
      if (conjunto.length === 0) {
        aviso.info("Preparando el reporte…", "Trayendo del servidor los comprobantes filtrados.");
        ({ items: conjunto, truncado } = await traerFiltrados(MAX_EXPORTACION));
      }
      if (conjunto.length === 0) {
        aviso.error("No hay comprobantes para exportar", "Ajusta los filtros o selecciona filas.");
        return;
      }
      const nombre = descargarExcel(
        conjunto.map((c) => ({ ...c, checkSap: checkVigente(c, checksPendientes) })),
        empresa,
      );
      aviso.ok(
        "Reporte Excel descargado",
        truncado
          ? `${nombre} · solo los primeros ${formatearEntero(MAX_EXPORTACION)}; acota los filtros para el resto`
          : `${nombre} · ${formatearEntero(conjunto.length)} comprobantes`,
      );
    } catch (error) {
      aviso.error("No se pudo preparar el reporte", mensajeDe(error, "Reintenta."));
    } finally {
      setExportando(false);
    }
  }, [empresa, exportando, seleccion, traerFiltrados, checksPendientes]);

  const generarLote = useCallback(async () => {
    if (!token || !empresa || generandoLote) return;
    setGenerandoLote(true);
    try {
      let conjunto = seleccion;
      if (conjunto.length === 0) {
        if ((total ?? Infinity) > MAX_COMPROBANTES_LOTE) {
          aviso.error(
            `Un lote admite hasta ${MAX_COMPROBANTES_LOTE} comprobantes`,
            `Hay ${total === null ? "demasiados" : formatearEntero(total)}: selecciona menos o filtra por fechas.`,
          );
          return;
        }
        ({ items: conjunto } = await traerFiltrados(MAX_COMPROBANTES_LOTE));
      }
      if (conjunto.length === 0) {
        aviso.error("No hay comprobantes para el lote", "Selecciona filas o ajusta los filtros.");
        return;
      }
      if (conjunto.length > MAX_COMPROBANTES_LOTE) {
        aviso.error(
          `Un lote admite hasta ${MAX_COMPROBANTES_LOTE} comprobantes`,
          `Hay ${conjunto.length}: selecciona menos o filtra por fechas.`,
        );
        return;
      }
      aviso.info(`Armando el lote de ${conjunto.length} comprobantes…`, "Descargando XML, CDR y PDF.");
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
  }, [token, empresa, generandoLote, seleccion, total, traerFiltrados, recargar]);

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
    orden,
    ordenarPor,
    pagina,
    tamano,
    irAPagina,
    cambiarTamano,
    cargando,
    actualizando,
    errorCarga: hayDatos && cargada ? cargada.error : null,
    hayMas: hayDatos && cargada ? cargada.hayMas : false,
    comprobantes: items,
    total,
    metricas,
    actualizandoResumen,
    errorResumen,
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
    exportando,
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

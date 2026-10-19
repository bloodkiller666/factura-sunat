/**
 * Filtros, orden y métricas del listado: lógica pura, sin React (se prueba con vitest).
 *
 * Filtrar, ordenar, paginar y totalizar lo hace el servidor; aquí solo se traduce el estado
 * de la pantalla a parámetros de la API y la respuesta de resumen al modelo de los indicadores.
 */

import type { ApiResumen, FiltrosApi } from "./api";
import { describirRango } from "./calendario";
import type { Comprobante, FiltrosState, TipoDocumento } from "./types";

export const FILTROS_INICIALES: FiltrosState = {
  q: "",
  tipo: "TODOS",
  estadoSunat: "TODOS",
  respaldo: "TODOS",
  numeroSap: "",
  checkSap: "TODOS",
  desde: "",
  hasta: "",
};

/** ¿Hay algún filtro distinto del valor por defecto? */
export function hayFiltrosActivos(filtros: FiltrosState): boolean {
  return (Object.keys(FILTROS_INICIALES) as Array<keyof FiltrosState>).some(
    (clave) => filtros[clave] !== FILTROS_INICIALES[clave],
  );
}

/** Valor vigente del Check SAP: el cambio optimista pendiente manda sobre el guardado. */
export function checkVigente(
  comprobante: Comprobante,
  pendientes: Record<string, boolean>,
): boolean {
  return pendientes[comprobante.id] ?? comprobante.checkSap;
}

/** Valor vigente del N° de SAP: el cambio optimista pendiente manda sobre el guardado. */
export function sapVigente(
  comprobante: Comprobante,
  pendientes: Record<string, string>,
): string {
  return pendientes[comprobante.id] ?? comprobante.numeroSap;
}

/* ------------------------------ Orden ------------------------------ */

export type CampoOrden = "fecha" | "numero" | "cliente" | "importe";
export interface Orden {
  campo: CampoOrden;
  direccion: "asc" | "desc";
}

export const ORDEN_INICIAL: Orden = { campo: "fecha", direccion: "desc" };

/** Al pulsar una columna: la activa invierte; una nueva arranca en su sentido natural. */
export function alternarOrden(actual: Orden, campo: CampoOrden): Orden {
  if (actual.campo === campo) {
    return { campo, direccion: actual.direccion === "asc" ? "desc" : "asc" };
  }
  return { campo, direccion: campo === "fecha" || campo === "importe" ? "desc" : "asc" };
}

/* ------------------------- Traducción a la API ------------------------- */

const CODIGO_DE_TIPO: Record<TipoDocumento, string> = {
  Factura: "01",
  "Boleta de Venta": "03",
  "Nota de Crédito": "07",
  "Nota de Débito": "08",
};

const RESPALDO_API = {
  SIN_XML: "sin_xml",
  SIN_CDR: "sin_cdr",
  COMPLETO: "completo",
} as const;

/** El servidor exige al menos 2 caracteres para buscar (evita escaneos por una letra). */
export const MINIMO_BUSQUEDA = 2;

export interface OpcionesPagina {
  pagina: number;
  tamano: number;
  /** Pedir el total del conjunto filtrado (solo en la primera página o al cambiar de filtro). */
  contar: boolean;
}

/** Filtros de la pantalla → parámetros comunes de la API (sin paginación ni orden). */
export function filtrosParaApi(filtros: FiltrosState): FiltrosApi {
  const q = filtros.q.trim();
  const sap = filtros.numeroSap.trim();
  return {
    ...(q.length >= MINIMO_BUSQUEDA ? { q } : {}),
    ...(filtros.tipo !== "TODOS" ? { tipo_documento: CODIGO_DE_TIPO[filtros.tipo] } : {}),
    ...(filtros.estadoSunat !== "TODOS" ? { estado: filtros.estadoSunat.toLowerCase() } : {}),
    ...(filtros.respaldo !== "TODOS" ? { respaldo: RESPALDO_API[filtros.respaldo] } : {}),
    ...(sap ? { n_sap: sap } : {}),
    ...(filtros.checkSap !== "TODOS" ? { check_sap: filtros.checkSap === "CON" } : {}),
    ...(filtros.desde ? { fecha_desde: filtros.desde } : {}),
    ...(filtros.hasta ? { fecha_hasta: filtros.hasta } : {}),
  };
}

/** Parámetros de una página del listado. */
export function consultaDePagina(
  filtros: FiltrosState,
  orden: Orden,
  { pagina, tamano, contar }: OpcionesPagina,
): FiltrosApi {
  return {
    ...filtrosParaApi(filtros),
    orden: orden.campo,
    direccion: orden.direccion,
    limit: tamano,
    offset: pagina * tamano,
    contar,
  };
}

/**
 * Los indicadores dependen solo del rango de fechas (no del resto de filtros): así no se
 * mueven al buscar o filtrar, y al tocar un estado el listado se acota sin cambiar la tarjeta.
 */
export function consultaDeResumen(filtros: FiltrosState): FiltrosApi {
  return {
    ...(filtros.desde ? { fecha_desde: filtros.desde } : {}),
    ...(filtros.hasta ? { fecha_hasta: filtros.hasta } : {}),
  };
}

/**
 * Clave de los filtros que definen QUÉ comprobantes hay (sin orden ni tamaño de página):
 * el total del conjunto solo cambia con ellos, así que ordenar o cambiar de tamaño no recuenta.
 */
export function claveDeFiltros(filtros: FiltrosState): string {
  return JSON.stringify(filtrosParaApi(filtros));
}

/** Clave de un conjunto paginable (filtros + orden + tamaño), sin el número de página. */
export function claveDeConjunto(filtros: FiltrosState, orden: Orden, tamano: number): string {
  return JSON.stringify([filtrosParaApi(filtros), orden, tamano]);
}

/* ------------------------------ Métricas ------------------------------ */

export interface Cobertura {
  /** Comprobantes que deberían tener respaldo (todos menos los anulados). */
  total: number;
  conXml: number;
  conCdr: number;
  conPdf: number;
}

export interface Metricas {
  totalComprobantes: number;
  aprobados: number;
  pendientes: number;
  anulados: number;
  rechazados: number;
  /** Facturado neto en soles: las notas de crédito restan; sin anulados ni rechazados. */
  facturadoPen: number;
  /** Facturado neto en dólares, aparte: no se convierte a soles. */
  facturadoUsd: number;
  cobertura: Cobertura;
  /** Texto del rango de fechas que cubren los indicadores. */
  etiquetaRango: string;
}

function numero(valor: string | number | undefined): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Respuesta de `/comprobantes/resumen` → métricas de las tarjetas. */
export function metricasDeResumen(
  api: ApiResumen,
  rango: Pick<FiltrosState, "desde" | "hasta">,
): Metricas {
  return {
    totalComprobantes: api.total,
    aprobados: api.por_estado.aprobado ?? 0,
    pendientes: api.por_estado.pendiente ?? 0,
    anulados: api.por_estado.anulado ?? 0,
    rechazados: api.por_estado.rechazado ?? 0,
    facturadoPen: numero(api.facturado_neto.PEN),
    facturadoUsd: numero(api.facturado_neto.USD),
    cobertura: {
      total: api.cobertura.exigibles,
      conXml: api.cobertura.con_xml,
      conCdr: api.cobertura.con_cdr,
      conPdf: api.cobertura.con_pdf,
    },
    etiquetaRango: describirRango(rango.desde, rango.hasta),
  };
}

/** Meses `yyyy-mm` desde `desde` hasta `hasta` (ambos inclusive), del más antiguo al más nuevo. */
export function mesesEntre(desde: string, hasta: string): string[] {
  const [a0, m0] = desde.split("-").map(Number);
  const [a1, m1] = hasta.split("-").map(Number);
  const meses: string[] = [];
  let anio = a0;
  let mes = m0;
  while (anio < a1 || (anio === a1 && mes <= m1)) {
    meses.push(`${anio}-${String(mes).padStart(2, "0")}`);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
  return meses;
}

import type { EstadoSunat } from "./types";

/** Navegador/Node: formateo consistente en soles peruanos. */
const formatoMoneda = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const formatoDolares = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea en soles; con `moneda="USD"` en dólares (sin convertir). */
export function formatearMoneda(valor: number, moneda = "PEN"): string {
  return (moneda === "USD" ? formatoDolares : formatoMoneda).format(valor);
}

/** Igual que formatearMoneda pero sin el prefijo "S/ ", útil en tablas. */
export function formatearNumero(valor: number): string {
  return formatoNumero.format(valor);
}

/** "2026-09-02" -> "02/09/2026" */
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** "2026-09-02" -> "2 de setiembre de 2026" */
export function formatearFechaLarga(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  const nombreMes = MESES[Number(mes) - 1] ?? mes;
  return `${Number(dia)} de ${nombreMes} de ${anio}`;
}

export function coincidePeriodo(iso: string, anio: number, mes: number): boolean {
  const [a, m] = iso.split("-");
  return Number(a) === anio && Number(m) === mes;
}

/** Valor del filtro de periodo cuando no se quiere acotar a un mes. */
export const TODOS_LOS_PERIODOS = "TODOS";

/** Etiqueta del filtro de periodo: "2026-10" -> "Octubre 2026". */
export function etiquetaPeriodo(periodo: string): string {
  if (periodo === TODOS_LOS_PERIODOS) return "Todos los periodos";
  const [anio, mes] = periodo.split("-");
  const nombre = MESES[Number(mes) - 1] ?? mes;
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/* ------------------------------------------------------------------ *
 * Estilos de los badges (con soporte de modo oscuro)
 * ------------------------------------------------------------------ */

export const ESTILOS_SUNAT: Record<EstadoSunat, string> = {
  Aprobado:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30 dark:shadow-[0_0_20px_-6px_rgba(16,185,129,0.85)]",
  Pendiente:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30 dark:shadow-[0_0_20px_-6px_rgba(245,158,11,0.85)]",
  Anulado:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30 dark:shadow-[0_0_20px_-6px_rgba(244,63,94,0.85)]",
  Rechazado:
    "bg-red-50 text-red-700 ring-red-600/25 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/35 dark:shadow-[0_0_20px_-6px_rgba(239,68,68,0.9)]",
};

export const PUNTOS_SUNAT: Record<EstadoSunat, string> = {
  Aprobado: "bg-emerald-500 shadow-[0_0_10px_1px_rgba(16,185,129,0.75)]",
  Pendiente: "bg-amber-500 shadow-[0_0_10px_1px_rgba(245,158,11,0.75)]",
  Anulado: "bg-rose-500 shadow-[0_0_10px_1px_rgba(244,63,94,0.75)]",
  Rechazado: "bg-red-600 shadow-[0_0_10px_1px_rgba(239,68,68,0.8)]",
};

/** Las guías de remisión no representan un importe de venta. */
export function esSinImporte(tipo: string): boolean {
  return tipo === "Guía de Remisión";
}

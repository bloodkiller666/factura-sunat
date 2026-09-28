import type { EstadoComercial, EstadoSunat } from "./types";

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

export function formatearMoneda(valor: number): string {
  return formatoMoneda.format(valor);
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

/* ------------------------------------------------------------------ *
 * Estilos de los badges (con soporte de modo oscuro)
 * ------------------------------------------------------------------ */

export const ESTILOS_SUNAT: Record<EstadoSunat, string> = {
  Aprobado:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30",
  Pendiente:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/30",
  Anulado:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/30",
};

export const PUNTOS_SUNAT: Record<EstadoSunat, string> = {
  Aprobado: "bg-emerald-500",
  Pendiente: "bg-amber-500",
  Anulado: "bg-rose-500",
};

export const ESTILOS_COMERCIAL: Record<EstadoComercial, string> = {
  Pagado:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/30",
  Pendiente:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/30",
  Vencido:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/30",
};

export const PUNTOS_COMERCIAL: Record<EstadoComercial, string> = {
  Pagado: "bg-blue-500",
  Pendiente: "bg-orange-500",
  Vencido: "bg-rose-500",
};

/** Las guías de remisión no representan un importe de venta. */
export function esSinImporte(tipo: string): boolean {
  return tipo === "Guía de Remisión";
}

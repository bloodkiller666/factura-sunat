/**
 * Aritmética de fechas para el selector de rango. Todo trabaja con cadenas ISO
 * `yyyy-mm-dd` (sin zona horaria) para que "el 1 de setiembre" sea el mismo día en
 * cualquier navegador; los `Date` solo se usan internamente, siempre en UTC.
 */

import { etiquetaPeriodo, formatearFecha } from "./format";

export const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Lunes primero, como en Perú. */
export const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

export interface Rango {
  desde: string;
  hasta: string;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function aIso(anio: number, mes1: number, dia: number): string {
  return `${String(anio).padStart(4, "0")}-${String(mes1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function esFechaIso(valor: string): boolean {
  const m = ISO.exec(valor);
  if (!m) return false;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDelMes(anio, mes);
}

/** Días que tiene el mes `mes1` (1-12) de `anio`. */
export function diasDelMes(anio: number, mes1: number): number {
  return new Date(Date.UTC(anio, mes1, 0)).getUTCDate();
}

/** Fecha de hoy en hora local del navegador, como ISO. */
export function hoyIso(ahora: Date = new Date()): string {
  return aIso(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate());
}

export function partes(iso: string): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return { anio, mes, dia };
}

export function primerDiaDelMes(iso: string): string {
  const { anio, mes } = partes(iso);
  return aIso(anio, mes, 1);
}

export function ultimoDiaDelMes(iso: string): string {
  const { anio, mes } = partes(iso);
  return aIso(anio, mes, diasDelMes(anio, mes));
}

/** Suma `n` días (puede ser negativo). */
export function sumarDias(iso: string, n: number): string {
  const { anio, mes, dia } = partes(iso);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia + n));
  return aIso(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate());
}

/** Suma `n` meses y ajusta el día al último del mes de destino (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(iso: string, n: number): string {
  const { anio, mes, dia } = partes(iso);
  const total = anio * 12 + (mes - 1) + n;
  const anioNuevo = Math.floor(total / 12);
  const mesNuevo = (total % 12) + 1;
  return aIso(anioNuevo, mesNuevo, Math.min(dia, diasDelMes(anioNuevo, mesNuevo)));
}

/** Día de la semana con lunes = 0 … domingo = 6. */
export function diaDeSemana(iso: string): number {
  const { anio, mes, dia } = partes(iso);
  return (new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() + 6) % 7;
}

/**
 * Semanas del mes (lunes a domingo). Los huecos antes del día 1 y después del último
 * día son `null`, y todas las semanas tienen 7 celdas.
 */
export function semanasDelMes(anio: number, mes1: number): Array<Array<string | null>> {
  const primero = aIso(anio, mes1, 1);
  const celdas: Array<string | null> = Array(diaDeSemana(primero)).fill(null);
  for (let dia = 1; dia <= diasDelMes(anio, mes1); dia += 1) celdas.push(aIso(anio, mes1, dia));
  while (celdas.length % 7 !== 0) celdas.push(null);
  const semanas: Array<Array<string | null>> = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}

/** Ordena dos extremos: el usuario puede marcar primero el final. */
export function ordenarRango(a: string, b: string): Rango {
  return a <= b ? { desde: a, hasta: b } : { desde: b, hasta: a };
}

export function enRango(iso: string, rango: Rango): boolean {
  return iso >= rango.desde && iso <= rango.hasta;
}

export interface Atajo {
  id: string;
  etiqueta: string;
  /** `null` = sin acotar (todas las fechas). */
  rango: Rango | null;
}

/** Atajos habituales para auditoría y cierre mensual. */
export function atajosDeRango(hoy: string): Atajo[] {
  const mesActual = primerDiaDelMes(hoy);
  const mesAnterior = sumarMeses(mesActual, -1);
  const { anio } = partes(hoy);
  return [
    { id: "hoy", etiqueta: "Hoy", rango: { desde: hoy, hasta: hoy } },
    { id: "7d", etiqueta: "Últimos 7 días", rango: { desde: sumarDias(hoy, -6), hasta: hoy } },
    { id: "30d", etiqueta: "Últimos 30 días", rango: { desde: sumarDias(hoy, -29), hasta: hoy } },
    {
      id: "mes",
      etiqueta: "Este mes",
      rango: { desde: mesActual, hasta: ultimoDiaDelMes(hoy) },
    },
    {
      id: "mes-anterior",
      etiqueta: "Mes anterior",
      rango: { desde: mesAnterior, hasta: ultimoDiaDelMes(mesAnterior) },
    },
    {
      id: "anio",
      etiqueta: `Año ${anio}`,
      rango: { desde: aIso(anio, 1, 1), hasta: aIso(anio, 12, 31) },
    },
    { id: "todo", etiqueta: "Todas las fechas", rango: null },
  ];
}

/** Atajos para el filtro de vencimiento: miran hacia adelante (y a lo ya vencido). */
export function atajosDeVencimiento(hoy: string): Atajo[] {
  const mesActual = primerDiaDelMes(hoy);
  const mesSiguiente = sumarMeses(mesActual, 1);
  return [
    { id: "vencidos", etiqueta: "Ya vencidos", rango: { desde: "", hasta: sumarDias(hoy, -1) } },
    { id: "hoy", etiqueta: "Vencen hoy", rango: { desde: hoy, hasta: hoy } },
    { id: "7d", etiqueta: "Próximos 7 días", rango: { desde: hoy, hasta: sumarDias(hoy, 6) } },
    { id: "30d", etiqueta: "Próximos 30 días", rango: { desde: hoy, hasta: sumarDias(hoy, 29) } },
    {
      id: "mes",
      etiqueta: "Este mes",
      rango: { desde: mesActual, hasta: ultimoDiaDelMes(hoy) },
    },
    {
      id: "mes-siguiente",
      etiqueta: "Mes siguiente",
      rango: { desde: mesSiguiente, hasta: ultimoDiaDelMes(mesSiguiente) },
    },
    { id: "todo", etiqueta: "Todas las fechas", rango: null },
  ];
}

/** ¿El rango cubre exactamente un mes calendario? Devuelve su `yyyy-mm`. */
export function mesCompleto(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return null;
  if (desde !== primerDiaDelMes(desde) || hasta !== ultimoDiaDelMes(desde)) return null;
  return desde.slice(0, 7);
}

/** Texto del rango para el botón y los indicadores. */
export function describirRango(desde: string, hasta: string): string {
  if (!desde && !hasta) return "Todas las fechas";
  const mes = mesCompleto(desde, hasta);
  if (mes) return etiquetaPeriodo(mes);
  if (desde && hasta) {
    return desde === hasta
      ? formatearFecha(desde)
      : `${formatearFecha(desde)} – ${formatearFecha(hasta)}`;
  }
  return desde ? `Desde ${formatearFecha(desde)}` : `Hasta ${formatearFecha(hasta)}`;
}

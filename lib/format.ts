/** Formateo consistente para Perú (es-PE): importes, fechas y periodos. */

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

const formatoSoles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoDolares = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat("es-PE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoEntero = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });
// Se crea una sola vez: construir un `Intl.DateTimeFormat` en cada llamada es lo más caro de la lista.
const formatoFechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" });

const formatoCompacto = new Intl.NumberFormat("es-PE", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formatea en soles; con `moneda="USD"` en dólares (sin convertir). */
export function formatearMoneda(valor: number, moneda = "PEN"): string {
  return (moneda === "USD" ? formatoDolares : formatoSoles).format(valor);
}

/** Importe sin símbolo de moneda (para tablas donde la moneda va aparte). */
export function formatearNumero(valor: number): string {
  return formatoNumero.format(valor);
}

export function formatearEntero(valor: number): string {
  return formatoEntero.format(valor);
}

/** `1 234 567` → `1,2 M` (tarjetas con poco ancho). */
export function formatearCompacto(valor: number): string {
  return formatoCompacto.format(valor);
}

/** Símbolo corto de la moneda: `S/` o `US$`. */
export function simboloMoneda(moneda: string): string {
  return moneda === "USD" ? "US$" : "S/";
}

/** `"2026-09-02"` → `"02/09/2026"`; vacío o inválido → `"—"`. */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.split("-");
  if (!anio || !mes || !dia) return "—";
  return `${dia}/${mes}/${anio}`;
}

/** `"2026-09-02"` → `"2 de setiembre de 2026"`. */
export function formatearFechaLarga(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [anio, mes, dia] = iso.split("-");
  if (!anio || !mes || !dia) return "—";
  return `${Number(dia)} de ${MESES[Number(mes) - 1] ?? mes} de ${anio}`;
}

/** Fecha y hora locales de una marca ISO con zona horaria. */
export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return formatoFechaHora.format(fecha);
}

/** Tamaño legible: `8,4 KB`, `1,2 MB`. */
export function formatearTamano(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Valor del filtro de periodo cuando no se quiere acotar a un mes. */
export const TODOS_LOS_PERIODOS = "TODOS";

/** `"2026-10"` → `"Octubre 2026"`. */
export function etiquetaPeriodo(periodo: string): string {
  if (periodo === TODOS_LOS_PERIODOS) return "Todos los periodos";
  const [anio, mes] = periodo.split("-");
  const nombre = MESES[Number(mes) - 1] ?? mes;
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** `"2026-10"` → `"202610"` (formato de periodo tributario de SIRE). */
export function periodoSire(periodoIso: string): string {
  return periodoIso.replace("-", "");
}

/** Porcentaje entero seguro frente a divisiones por cero. */
export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

/** Iniciales para el avatar de una empresa: `TDM ASFALTOS` → `TA`. */
export function iniciales(texto: string): string {
  const letras = texto
    .split(/\s+/)
    .filter((palabra) => /^[\p{L}\p{N}]/u.test(palabra))
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase() ?? "");
  return letras.join("") || "?";
}

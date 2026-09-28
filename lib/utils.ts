export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(" ");
}

export type FormatoDescarga = "PDF" | "XML";

/** Clave única por comprobante + formato, usada para el estado de carga. */
export function claveDescarga(idComprobante: string, formato: FormatoDescarga): string {
  return `${idComprobante}:${formato}`;
}

/**
 * Columna «Estado correo» de Compras: ¿el asunto del correo en que llegó la compra quedó cargado
 * en el portal (Supabase)? Lógica pura, sin React (se prueba con vitest).
 */

import type { Comprobante } from "./types";

export type EstadoCorreo = "SUBIDO" | "NO ENCONTRADO";

/**
 * `SUBIDO` si la compra tiene el asunto de su correo guardado; `NO ENCONTRADO` si no lo tiene:
 * nunca vino por el buzón, o su correo aún no se vincula. Un asunto en blanco no cuenta.
 */
export function estadoCorreo(c: Pick<Comprobante, "correo">): EstadoCorreo {
  return c.correo && c.correo.asunto.trim() !== "" ? "SUBIDO" : "NO ENCONTRADO";
}

/** Texto de ayuda (tooltip) de cada estado. */
export const AYUDA_ESTADO_CORREO: Record<EstadoCorreo, string> = {
  SUBIDO: "El asunto del correo está cargado en el portal",
  "NO ENCONTRADO": "No hay un correo vinculado a esta compra",
};

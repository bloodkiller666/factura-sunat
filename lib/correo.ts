/**
 * Columna «Estado correo» de Compras: ¿el asunto del correo en que llegó la compra quedó cargado
 * en el portal (Supabase)? Lógica pura, sin React (se prueba con vitest).
 */

import type { Comprobante } from "./types";

export type EstadoCorreo = "Enviado" | "No enviado";

/**
 * «Enviado» si la compra tiene el asunto de su correo guardado (el proveedor la mandó al
 * buzón y quedó vinculada); «No enviado» si no lo tiene: nunca vino por el buzón o su
 * correo aún no se vincula. Un asunto en blanco no cuenta.
 */
export function estadoCorreo(c: Pick<Comprobante, "correo">): EstadoCorreo {
  return c.correo && c.correo.asunto.trim() !== "" ? "Enviado" : "No enviado";
}

/** Texto de ayuda (tooltip) de cada estado. */
export const AYUDA_ESTADO_CORREO: Record<EstadoCorreo, string> = {
  "Enviado": "El proveedor envió el correo y su asunto está cargado en el portal",
  "No enviado": "No hay un correo vinculado a esta compra",
};

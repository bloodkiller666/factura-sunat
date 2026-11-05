/**
 * Recuerda el ticket de SIRE de un periodo mientras SUNAT lo genera.
 *
 * SUNAT puede tardar muchos minutos en preparar un archivo. Si el usuario cierra la ventana o la
 * espera se agota, volver a pedir la propuesta crea OTRO ticket y suma carga (y riesgo de 429).
 * Guardarlo permite que el siguiente «Sincronizar» retome el mismo ticket.
 */

import type { LibroSire } from "./api";

/** Un ticket de SUNAT no se retoma más allá de este tiempo: pasado, se pide uno nuevo. */
export const VIGENCIA_TICKET_MS = 12 * 60 * 60 * 1000;

const PREFIJO = "sire-ticket:";

/** Lo mínimo que se usa de `localStorage` (permite probarlo con uno en memoria). */
export interface AlmacenTickets {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

function almacenPorDefecto(): AlmacenTickets | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // navegación privada o permisos: se sigue sin recordar
  }
}

function claveDe(ruc: string, libro: LibroSire, periodo: string): string {
  return `${PREFIJO}${ruc}:${libro}:${periodo}`;
}

export function guardarTicket(
  ruc: string,
  libro: LibroSire,
  periodo: string,
  ticket: string,
  almacen: AlmacenTickets | null = almacenPorDefecto(),
  ahora: number = Date.now(),
): void {
  try {
    almacen?.setItem(claveDe(ruc, libro, periodo), JSON.stringify({ ticket, guardado: ahora }));
  } catch {
    /* sin espacio o sin permiso: no es grave, solo no se retomará */
  }
}

export function leerTicket(
  ruc: string,
  libro: LibroSire,
  periodo: string,
  almacen: AlmacenTickets | null = almacenPorDefecto(),
  ahora: number = Date.now(),
): string | undefined {
  try {
    const crudo = almacen?.getItem(claveDe(ruc, libro, periodo));
    if (!crudo) return undefined;
    const dato = JSON.parse(crudo) as { ticket?: unknown; guardado?: unknown };
    if (typeof dato.ticket !== "string" || typeof dato.guardado !== "number") return undefined;
    if (ahora - dato.guardado > VIGENCIA_TICKET_MS) {
      almacen?.removeItem(claveDe(ruc, libro, periodo));
      return undefined;
    }
    return dato.ticket;
  } catch {
    return undefined;
  }
}

export function olvidarTicket(
  ruc: string,
  libro: LibroSire,
  periodo: string,
  almacen: AlmacenTickets | null = almacenPorDefecto(),
): void {
  try {
    almacen?.removeItem(claveDe(ruc, libro, periodo));
  } catch {
    /* nada que hacer */
  }
}

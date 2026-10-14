/**
 * Cliente de Supabase Auth para el navegador.
 *
 * El backend no emite tokens: solo verifica el JWT que Supabase entrega al
 * hacer login. Aquí solo se crea el cliente con la clave anónima (pública):
 * los secretos del proyecto nunca llegan al navegador.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** `true` si las variables del navegador están completas. */
export const supabaseConfigurado = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";

let cliente: SupabaseClient | null = null;

/** Cliente único de Supabase (o `null` si el .env no está configurado). */
export function clienteSupabase(): SupabaseClient | null {
  if (!supabaseConfigurado) return null;
  if (!cliente) {
    cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return cliente;
}

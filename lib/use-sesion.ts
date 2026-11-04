"use client";

/**
 * Sesión del usuario con Supabase Auth.
 *
 * El portal no tiene backend de autenticación propio: Supabase emite el JWT y
 * el backend lo verifica. El hook expone el token vigente (supabase-js lo
 * refresca solo) y las acciones de entrar/salir.
 */

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { traducirErrorCuenta, type CambioCuenta } from "./cuenta";
import { clienteSupabase, supabaseConfigurado } from "./supabase";

interface Sesion {
  /** Token de acceso vigente (o `null` sin sesión). */
  token: string | null;
  email: string | null;
  cargando: boolean;
  configurado: boolean;
  entrar: (email: string, password: string) => Promise<{ ok: boolean; mensaje?: string }>;
  salir: () => Promise<void>;
  /** Cambia el correo y/o la contraseña de quien tiene la sesión abierta. */
  actualizarCuenta: (cambios: CambioCuenta) => Promise<ResultadoActualizacion>;
}

export interface ResultadoActualizacion {
  ok: boolean;
  mensaje: string;
}

export function useSesion(): Sesion {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(supabaseConfigurado);

  useEffect(() => {
    const supabase = clienteSupabase();
    if (!supabase) return;

    let vigente = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (vigente) {
          setSesion(data.session);
          setCargando(false);
        }
      })
      .catch(() => {
        if (vigente) setCargando(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);
      setCargando(false);
    });

    return () => {
      vigente = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const entrar = useCallback(async (email: string, password: string) => {
    const supabase = clienteSupabase();
    if (!supabase) {
      return { ok: false, mensaje: "Supabase no está configurado en este entorno (.env)." };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, mensaje: traducirError(error.message) };
    }
    return { ok: true };
  }, []);

  const salir = useCallback(async () => {
    const supabase = clienteSupabase();
    await supabase?.auth.signOut();
    setSesion(null);
  }, []);

  const actualizarCuenta = useCallback(async (cambios: CambioCuenta) => {
    const supabase = clienteSupabase();
    if (!supabase) {
      return { ok: false, mensaje: "Supabase no está configurado en este entorno (.env)." };
    }
    // Solo se manda lo que cambia: pedir un campo sin querer cambiarlo lo rechazaría o lo reiniciaría.
    const { error } = await supabase.auth.updateUser({
      ...(cambios.email !== undefined && { email: cambios.email }),
      ...(cambios.password !== undefined && { password: cambios.password }),
    });
    if (error) return { ok: false, mensaje: traducirErrorCuenta(error.message) };

    const partes: string[] = [];
    if (cambios.password !== undefined) partes.push("Tu contraseña se actualizó.");
    if (cambios.email !== undefined) {
      partes.push(
        `Te enviamos un enlace de confirmación a ${cambios.email}: tu correo cambia cuando lo abras.`,
      );
    }
    return { ok: true, mensaje: partes.join(" ") };
  }, []);

  return {
    token: sesion?.access_token ?? null,
    email: sesion?.user.email ?? null,
    cargando,
    configurado: supabaseConfigurado,
    entrar,
    salir,
    actualizarCuenta,
  };
}

/** Mensajes de Supabase → texto entendible para el usuario del portal. */
function traducirError(mensaje: string): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (texto.includes("email not confirmed")) {
    return "Confirma tu correo desde el enlace que te envió Supabase.";
  }
  if (texto.includes("rate limit")) {
    return "Demasiados intentos; espera un momento y vuelve a intentar.";
  }
  return mensaje;
}

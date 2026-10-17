/** Orden de la tabla de evidencias SIRE: lógica pura, sin React (se prueba con vitest). */

import type { ArchivoGuardado } from "./types";

export type CampoEvidencia = "periodo" | "archivo" | "tamano" | "hash" | "guardado";

export interface OrdenEvidencia {
  campo: CampoEvidencia;
  direccion: "asc" | "desc";
}

/** Lo más reciente primero: así llega del servidor y es lo que se espera ver. */
export const ORDEN_EVIDENCIA_INICIAL: OrdenEvidencia = { campo: "guardado", direccion: "desc" };

/** `…-RVIE-202609-…zip` → `2026-09`. */
export function periodoDeEvidencia(nombre: string): string | null {
  const coincidencia = /RVIE-(\d{4})(\d{2})/.exec(nombre);
  return coincidencia ? `${coincidencia[1]}-${coincidencia[2]}` : null;
}

/** Al pulsar una columna: la activa invierte; una nueva arranca en su sentido natural. */
export function alternarOrdenEvidencia(
  actual: OrdenEvidencia,
  campo: CampoEvidencia,
): OrdenEvidencia {
  if (actual.campo === campo) {
    return { campo, direccion: actual.direccion === "asc" ? "desc" : "asc" };
  }
  // Fechas, periodos y tamaños: primero lo mayor/más reciente; texto: de la A a la Z.
  const naturalDesc: CampoEvidencia[] = ["periodo", "tamano", "guardado"];
  return { campo, direccion: naturalDesc.includes(campo) ? "desc" : "asc" };
}

type Clave = string | number | null;

function clave(evidencia: ArchivoGuardado, campo: CampoEvidencia): Clave {
  switch (campo) {
    case "periodo":
      return periodoDeEvidencia(evidencia.nombre);
    case "archivo":
      return evidencia.nombre.toLowerCase();
    case "tamano":
      return evidencia.tamano;
    case "hash":
      return evidencia.hashSha256;
    case "guardado": {
      const marca = evidencia.creado ? Date.parse(evidencia.creado) : Number.NaN;
      return Number.isNaN(marca) ? null : marca;
    }
  }
}

/**
 * Copia ordenada por la columna elegida. Los valores vacíos van siempre al final, sea cual
 * sea el sentido, y el desempate por fecha de guardado hace el orden estable y predecible.
 */
export function ordenarEvidencias(
  evidencias: ArchivoGuardado[],
  orden: OrdenEvidencia,
): ArchivoGuardado[] {
  const sentido = orden.direccion === "asc" ? 1 : -1;
  const fecha = (e: ArchivoGuardado) => (clave(e, "guardado") as number | null) ?? 0;
  return [...evidencias].sort((a, b) => {
    const ka = clave(a, orden.campo);
    const kb = clave(b, orden.campo);
    if (ka === null && kb !== null) return 1;
    if (kb === null && ka !== null) return -1;
    if (ka !== null && kb !== null && ka !== kb) return (ka < kb ? -1 : 1) * sentido;
    return fecha(b) - fecha(a);
  });
}

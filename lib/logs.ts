/**
 * Apartado «Logs»: textos y resúmenes de las corridas de la automatización diaria.
 *
 * Lógica pura, sin React (se prueba con vitest). Los datos vienen de
 * `GET /companies/{ruc}/automatizacion/logs`; cada corrida trae lo que la PC guardó en sus
 * archivos locales (bitácora, estado y pendientes), que el navegador no puede leer.
 */

import type { ApiLogAutomatizacion } from "./api";

export type ResultadoLog = ApiLogAutomatizacion["resultado"];
export type FiltroLogs = "todos" | ResultadoLog;

export const FILTROS_LOGS: Array<{ id: FiltroLogs; etiqueta: string }> = [
  { id: "todos", etiqueta: "Todas" },
  { id: "con_novedades", etiqueta: "Con novedades" },
  { id: "con_errores", etiqueta: "Con errores" },
  { id: "ok", etiqueta: "Sin novedades" },
];

export const ETIQUETA_RESULTADO: Record<ResultadoLog, string> = {
  ok: "Sin novedades",
  con_novedades: "Con novedades",
  con_errores: "Con errores",
};

const ETIQUETA_TAREA: Record<string, string> = { sire: "SIRE", correo: "Correo" };

export function etiquetaTarea(tarea: string): string {
  return ETIQUETA_TAREA[tarea] ?? tarea;
}

/** `53` → «53 s»; `125` → «2 min 5 s»; sin dato → «—». */
export function duracionLegible(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined) return "—";
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return resto === 0 ? `${minutos} min` : `${minutos} min ${resto} s`;
}

/** Las novedades de la corrida como frases cortas («3 PDF unidos»); solo las mayores que cero. */
export function frasesDeNovedades(novedades: Record<string, number>): string[] {
  return Object.entries(novedades)
    .filter(([, cantidad]) => cantidad > 0)
    .map(([texto, cantidad]) => `${cantidad} ${texto}`);
}

export interface BloqueDetalle {
  titulo: string;
  lineas: string[];
}

function numero(valor: unknown): number {
  return typeof valor === "number" ? valor : 0;
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === "string") : [];
}

/** Lo que hizo cada tarea de la corrida, en líneas legibles para el panel de detalle. */
export function bloquesDeDetalle(detalle: ApiLogAutomatizacion["detalle"]): BloqueDetalle[] {
  const bloques: BloqueDetalle[] = [];
  const sire = detalle.sire;
  if (sire) {
    bloques.push({
      titulo: "SIRE",
      lineas: [
        `Meses consultados: ${lista(sire.meses).join(", ") || "—"}`,
        `Ventas nuevas: ${numero(sire.ventas_nuevas)} · Compras nuevas: ${numero(sire.compras_nuevas)}`,
      ],
    });
  }
  const correo = detalle.correo;
  if (correo) {
    bloques.push({
      titulo: "Correo",
      lineas: [
        `Correos revisados: ${numero(correo.revisados)} · Con facturas: ${numero(correo.con_facturas)}`,
        `Compras de la empresa con archivos: ${numero(correo.comprobantes_de_la_empresa)}`,
      ],
    });
  }
  const importacion = detalle.importacion;
  if (importacion) {
    bloques.push({
      titulo: "Importación al portal",
      lineas: [
        `Completadas con su XML: ${numero(importacion.completadas)} · Nuevas (no estaban en SIRE): ${numero(importacion.nuevas)} · Ya estaban: ${numero(importacion.repetidas)}`,
        `PDF guardados: ${numero(importacion.pdf_guardados)} · PDF sueltos unidos: ${numero(importacion.pdf_sueltos_unidos)}`,
      ],
    });
  }
  return bloques;
}

/** `2026/10/20999999999/F010-00000456` → `F010-00000456 · 20999999999` (se reconoce a simple vista). */
export function etiquetaDeCarpeta(carpeta: string): string {
  const partes = carpeta.split("/").filter(Boolean);
  if (partes.length >= 2) return `${partes[partes.length - 1]} · ${partes[partes.length - 2]}`;
  return carpeta;
}

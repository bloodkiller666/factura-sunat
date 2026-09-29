"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type VarianteDescarga = "icono" | "tarjeta" | "suave" | "primario";

interface Props {
  /** `icono` para la tabla de escritorio (el texto solo aparece durante la
   *  acción); `tarjeta` para las tarjetas móviles; `suave` y `primario` para
   *  el modal, siempre con etiqueta visible. */
  variante: VarianteDescarga;
  /** Icono en reposo del botón. */
  icono: ReactNode;
  /** Etiqueta en reposo; también alimenta `aria-label` y `title`. */
  etiqueta: string;
  /** Etiqueta mostrada mientras el archivo se genera. */
  textoProgreso: string;
  cargando: boolean;
  /** El archivo acaba de entregarse: se muestra "¡Descargado!". */
  completado: boolean;
  deshabilitado?: boolean;
  /** Clases de acento propias de cada acción (se suman a la variante). */
  className?: string;
  onClick: () => void;
}

const CLASE_VARIANTE: Record<VarianteDescarga, string> = {
  icono:
    "relative h-8 min-w-8 rounded-xl border border-transparent px-1.5 text-[11px] dark:border-white/5 dark:bg-white/[0.03]",
  tarjeta:
    "w-full min-w-0 gap-1.5 overflow-hidden rounded-xl border border-slate-200/90 bg-white/70 px-2 py-2 text-xs text-slate-600 backdrop-blur-md hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200",
  suave:
    "gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-100 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20",
  primario:
    "gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm text-white shadow-lg shadow-indigo-600/25 ring-1 ring-inset ring-white/20 hover:from-indigo-500 hover:to-blue-500",
};

/**
 * Botón de descarga con retroalimentación visual. La descarga real la dispara
 * `onClick` tal cual llega: este componente solo añade la capa animada
 * (press, glow, spinner → check y cambio de etiqueta con fundido).
 */
export function BotonDescarga({
  variante,
  icono,
  etiqueta,
  textoProgreso,
  cargando,
  completado,
  deshabilitado = false,
  className,
  onClick,
}: Props) {
  const soloIcono = variante === "icono";
  const texto = cargando ? textoProgreso : completado ? "¡Descargado!" : null;
  const activo = cargando || completado;

  return (
    <button
      type="button"
      data-accion="true"
      onClick={onClick}
      disabled={cargando || deshabilitado}
      title={etiqueta}
      aria-label={etiqueta}
      aria-busy={cargando}
      className={cn(
        "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
        CLASE_VARIANTE[variante],
        cargando && "animate-[pulsoLuminoso_1.3s_ease-in-out_infinite] cursor-wait",
        // Solo se atenúa cuando está bloqueado por otra razón: el glow de
        // "generando…" debe verse a plena intensidad.
        deshabilitado && !cargando && "opacity-45",
        className,
      )}
    >
      {cargando ? (
        <Spinner claro={variante === "primario"} />
      ) : completado ? (
        <Check
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0",
            variante === "primario" ? "text-white" : "text-emerald-500 dark:text-emerald-300",
          )}
        />
      ) : (
        icono
      )}

      {soloIcono ? (
        // Píldora flotante: da el feedback sin ensanchar la columna de acciones.
        <span
          aria-hidden={!texto}
          className={cn(
            "pointer-events-none absolute right-0 bottom-full mb-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold whitespace-nowrap shadow-lg transition-opacity duration-200",
            texto ? "opacity-100" : "opacity-0",
            completado
              ? "bg-emerald-500 text-white shadow-emerald-500/40"
              : "bg-slate-900 text-slate-100 ring-1 ring-inset ring-white/15 dark:bg-slate-800",
          )}
        >
          {texto && (
            <span key={texto} className="block animate-[fadeInUp_.28s_ease-out_both]">
              {texto}
            </span>
          )}
        </span>
      ) : (
        <span
          key={texto ?? etiqueta}
          className={cn(
            "animate-[fadeInUp_.28s_ease-out_both]",
            variante === "tarjeta" ? "min-w-0 truncate" : "whitespace-nowrap",
            activo && "tabular-nums",
          )}
        >
          {texto ?? etiqueta}
        </span>
      )}
    </button>
  );
}

function Spinner({ claro = false }: { claro?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-4 w-4 shrink-0 animate-spin rounded-full border-2",
        claro ? "border-white/40 border-t-white" : "border-indigo-300 border-t-indigo-600 dark:border-indigo-400/40 dark:border-t-indigo-300",
      )}
    />
  );
}

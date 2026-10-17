"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrdenColumna<C extends string> {
  campo: C;
  direccion: "asc" | "desc";
}

interface Props<C extends string> {
  etiqueta: string;
  campo: C;
  orden: OrdenColumna<C>;
  onOrden: (campo: C) => void;
  alinear?: "izquierda" | "derecha";
  /** Segunda línea tenue bajo el título (p. ej. «con IGV»). */
  nota?: string;
  className?: string;
}

/**
 * Encabezado de columna ordenable: un botón con la flecha del sentido vigente.
 * Anuncia `aria-sort` para lectores de pantalla y deja ver que la columna se puede ordenar.
 */
export function EncabezadoOrden<C extends string>({
  etiqueta,
  campo,
  orden,
  onOrden,
  alinear = "izquierda",
  nota,
  className,
}: Props<C>) {
  const activo = orden.campo === campo;
  const Flecha = !activo ? ArrowUpDown : orden.direccion === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={activo ? (orden.direccion === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-2.5 font-medium", alinear === "derecha" && "text-right", className)}
    >
      <button
        type="button"
        onClick={() => onOrden(campo)}
        className={cn(
          "inline-flex items-center gap-1 rounded text-[11.5px] font-medium tracking-wide uppercase transition-colors hover:text-fg",
          activo ? "text-fg" : "text-fg-3",
          alinear === "derecha" && "flex-row-reverse",
        )}
      >
        <span className="text-left">
          {etiqueta}
          {nota && (
            <span className="block text-[10.5px] font-normal tracking-normal text-fg-4 normal-case">
              {nota}
            </span>
          )}
        </span>
        <Flecha
          className={cn("h-3 w-3 shrink-0 transition-opacity", activo ? "opacity-100" : "opacity-35")}
          aria-hidden
        />
      </button>
    </th>
  );
}

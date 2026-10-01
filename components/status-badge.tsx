import type { CSSProperties } from "react";
import { CheckCircle2, Clock, Ban, CircleX } from "lucide-react";
import { ESTILOS_SUNAT, PUNTOS_SUNAT } from "@/lib/format";
import type { EstadoSunat } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONOS_SUNAT: Record<EstadoSunat, typeof CheckCircle2> = {
  Aprobado: CheckCircle2,
  Pendiente: Clock,
  Anulado: Ban,
  Rechazado: CircleX,
};

/**
 * Tono de la insignia:
 * - `auto`: sigue el tema (tabla, filtros y resto de la app).
 * - `claro`: fuerza la paleta clara; se usa sobre el papel siempre blanco de la
 *   vista previa y de la exportación a PDF, donde los tokens de modo oscuro
 *   perderían contraste.
 */
export type TonoInsignia = "auto" | "claro";

interface PaletaClara {
  fondo: string;
  texto: string;
  anillo: string;
  punto: string;
}

const CLARO_SUNAT: Record<EstadoSunat, PaletaClara> = {
  Aprobado: {
    fondo: "rgb(236 253 245)",
    texto: "rgb(4 120 87)",
    anillo: "rgb(5 150 105 / 0.22)",
    punto: "rgb(16 185 129)",
  },
  Pendiente: {
    fondo: "rgb(255 251 235)",
    texto: "rgb(180 83 9)",
    anillo: "rgb(217 119 6 / 0.22)",
    punto: "rgb(245 158 11)",
  },
  Anulado: {
    fondo: "rgb(255 241 242)",
    texto: "rgb(190 18 60)",
    anillo: "rgb(225 29 72 / 0.22)",
    punto: "rgb(244 63 94)",
  },
  Rechazado: {
    fondo: "rgb(254 242 242)",
    texto: "rgb(185 28 28)",
    anillo: "rgb(220 38 38 / 0.28)",
    punto: "rgb(239 68 68)",
  },
};

function estiloClaro(paleta: PaletaClara): CSSProperties {
  return {
    backgroundColor: paleta.fondo,
    color: paleta.texto,
    boxShadow: `inset 0 0 0 1px ${paleta.anillo}`,
  };
}

export function SunatBadge({
  estado,
  size = "md",
  tono = "auto",
}: {
  estado: EstadoSunat;
  size?: "md" | "sm";
  tono?: TonoInsignia;
}) {
  const Icono = ICONOS_SUNAT[estado];
  const claro = tono === "claro";
  return (
    <span
      style={claro ? estiloClaro(CLARO_SUNAT[estado]) : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ring-1 ring-inset backdrop-blur-md transition",
        !claro && ESTILOS_SUNAT[estado],
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <span
        style={claro ? { backgroundColor: CLARO_SUNAT[estado].punto } : undefined}
        className={cn("h-1.5 w-1.5 rounded-full", !claro && PUNTOS_SUNAT[estado])}
      />
      <Icono className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {estado}
    </span>
  );
}

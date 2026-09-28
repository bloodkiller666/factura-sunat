import { CheckCircle2, Clock, Ban, CircleDollarSign, CreditCard, AlertTriangle } from "lucide-react";
import { ESTILOS_COMERCIAL, ESTILOS_SUNAT, PUNTOS_COMERCIAL, PUNTOS_SUNAT } from "@/lib/format";
import type { EstadoComercial, EstadoSunat } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONOS_SUNAT: Record<EstadoSunat, typeof CheckCircle2> = {
  Aprobado: CheckCircle2,
  Pendiente: Clock,
  Anulado: Ban,
};

const ICONOS_COMERCIAL: Record<EstadoComercial, typeof CheckCircle2> = {
  Pagado: CircleDollarSign,
  Pendiente: CreditCard,
  Vencido: AlertTriangle,
};

export function SunatBadge({ estado, size = "md" }: { estado: EstadoSunat; size?: "md" | "sm" }) {
  const Icono = ICONOS_SUNAT[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap",
        ESTILOS_SUNAT[estado],
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", PUNTOS_SUNAT[estado])} />
      <Icono className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {estado}
    </span>
  );
}

export function ComercialBadge({
  estado,
  size = "md",
}: {
  estado: EstadoComercial;
  size?: "md" | "sm";
}) {
  const Icono = ICONOS_COMERCIAL[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap",
        ESTILOS_COMERCIAL[estado],
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", PUNTOS_COMERCIAL[estado])} />
      <Icono className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {estado}
    </span>
  );
}

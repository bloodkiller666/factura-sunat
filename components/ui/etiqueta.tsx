import type { ReactNode } from "react";
import { Ban, CheckCircle2, CircleX, Clock } from "lucide-react";
import type { EstadoSunat } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Tono = "ok" | "aviso" | "error" | "neutro" | "acento";

const TONOS: Record<Tono, string> = {
  ok: "border-ok-line bg-ok-bg text-ok",
  aviso: "border-warn-line bg-warn-bg text-warn",
  error: "border-bad-line bg-bad-bg text-bad",
  neutro: "border-mute-line bg-mute-bg text-mute",
  acento: "border-accent-line bg-accent-soft text-accent",
};

/** Etiqueta compacta de texto: tipos de documento, roles, ambientes. */
export function Etiqueta({
  tono = "neutro",
  children,
  className,
}: {
  tono?: Tono;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[11px] leading-[18px] font-medium whitespace-nowrap",
        TONOS[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}

const ESTADOS: Record<EstadoSunat, { tono: Tono; icono: typeof Clock; ayuda: string }> = {
  Aprobado: { tono: "ok", icono: CheckCircle2, ayuda: "SUNAT aceptó el comprobante" },
  Pendiente: { tono: "aviso", icono: Clock, ayuda: "Aún sin respuesta de SUNAT" },
  Rechazado: { tono: "error", icono: CircleX, ayuda: "SUNAT rechazó el comprobante" },
  Anulado: { tono: "neutro", icono: Ban, ayuda: "Comprobante dado de baja" },
};

/** Estado SUNAT del comprobante: color + icono + texto (nunca solo color). */
export function EstadoPill({ estado }: { estado: EstadoSunat }) {
  const { tono, icono: Icono, ayuda } = ESTADOS[estado];
  return (
    <span
      title={ayuda}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-2 text-[12px] leading-4 font-medium whitespace-nowrap",
        TONOS[tono],
      )}
    >
      <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      {estado}
    </span>
  );
}

/** Indicador de un respaldo (XML, CDR o PDF): lleno si existe, apagado si falta. */
export function ChipRespaldo({
  nombre,
  presente,
  detalle,
}: {
  nombre: "XML" | "CDR" | "PDF";
  presente: boolean;
  detalle?: string;
}) {
  const titulo = presente
    ? `${nombre} archivado${detalle ? ` · ${detalle}` : ""}`
    : `${nombre} no disponible${detalle ? ` · ${detalle}` : ""}`;
  return (
    <span
      title={titulo}
      aria-label={titulo}
      className={cn(
        "inline-flex h-[20px] items-center rounded px-1.5 font-mono text-[10.5px] font-semibold tracking-wide",
        presente
          ? "border border-ok-line bg-ok-bg text-ok"
          : "border border-dashed border-line-strong text-fg-4",
      )}
    >
      {nombre}
    </span>
  );
}

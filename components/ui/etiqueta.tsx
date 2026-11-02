import type { ReactNode } from "react";
import { Ban, CheckCircle2, CircleX, Clock } from "lucide-react";
import { AYUDA_ESTADO_CORREO, type EstadoCorreo } from "@/lib/correo";
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
        "inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-px text-[12px] leading-[18px] font-medium whitespace-nowrap",
        TONOS[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** «Estado correo» de una compra: Enviado (verde) o No enviado (rojo). */
export function EstadoCorreoPill({
  estado,
  compacto = false,
}: {
  estado: EstadoCorreo;
  /** En la tabla de una laptop solo el icono (el texto sigue en el tooltip y para lectores). */
  compacto?: boolean;
}) {
  const enviado = estado === "Enviado";
  const Icono = enviado ? CheckCircle2 : CircleX;
  return (
    <Etiqueta tono={enviado ? "ok" : "error"} className="uppercase">
      <span title={AYUDA_ESTADO_CORREO[estado]} className="inline-flex items-center gap-1">
        <Icono className="h-3 w-3" aria-hidden />
        <span className={compacto ? "sr-only 2xl:not-sr-only" : undefined}>{estado}</span>
      </span>
    </Etiqueta>
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
        "rotulo inline-flex items-center gap-1.5 rounded-[4px] border-[1.5px] py-[3px] pr-2 pl-1.5 text-[12.5px] leading-4 font-semibold whitespace-nowrap",
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
        "inline-flex h-[20px] items-center rounded-[3px] px-1.5 font-mono text-[11.5px] font-semibold tracking-wide",
        presente
          ? "border border-ok-line bg-ok-bg text-ok"
          : "border border-dashed border-line-strong text-fg-4",
      )}
    >
      {nombre}
    </span>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Boton, type IconoLucide } from "@/components/ui/boton";
import { cn } from "@/lib/utils";

export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={cn("esqueleto", className)} />;
}

export function EstadoVacio({
  icono: Icono,
  titulo,
  descripcion,
  accion,
}: {
  icono: IconoLucide;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-fg-3">
        <Icono className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="text-[14px] font-semibold text-fg">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-sm text-[13px] text-fg-3">{descripcion}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Progreso({
  valor,
  tono = "acento",
  className,
}: {
  /** Entre 0 y 1. */
  valor: number;
  tono?: "acento" | "ok" | "aviso";
  className?: string;
}) {
  const color = { acento: "bg-accent", ok: "bg-ok", aviso: "bg-warn" }[tono];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(valor * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", color)}
        style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%` }}
      />
    </div>
  );
}

/** Copia un texto al portapapeles y confirma con un icono. */
export function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Boton
      variante="fantasma"
      tamano="sm"
      icono={copiado ? Check : Copy}
      etiqueta={copiado ? "Copiado" : etiqueta}
      onClick={() => {
        void navigator.clipboard?.writeText(texto).then(() => {
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 1400);
        });
      }}
    />
  );
}

export function Tarjeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface shadow-sm", className)}>
      {children}
    </section>
  );
}

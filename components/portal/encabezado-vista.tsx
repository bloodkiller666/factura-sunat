import type { ReactNode } from "react";

/** Título y descripción de las vistas simples (Evidencias SIRE, Logs). */
export function EncabezadoVista({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-fg">{titulo}</h1>
      <p className="mt-1 text-[13px] text-fg-3">{children}</p>
    </div>
  );
}

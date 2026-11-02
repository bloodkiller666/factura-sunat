import type { ReactNode } from "react";

/** Título y descripción de las vistas simples (Evidencias SIRE, Logs). */
export function EncabezadoVista({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="text-[30px] leading-9 font-bold tracking-tight text-fg">{titulo}</h1>
      <p className="mt-0.5 text-[14px] text-fg-3">{children}</p>
    </div>
  );
}

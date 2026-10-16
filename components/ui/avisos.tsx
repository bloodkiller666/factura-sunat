"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { descartarAviso, leerAvisos, suscribirAvisos, type TonoAviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";

const ICONOS: Record<TonoAviso, typeof Info> = {
  ok: CheckCircle2,
  info: Info,
  aviso: TriangleAlert,
};

const COLORES: Record<TonoAviso, string> = {
  ok: "text-ok",
  info: "text-accent",
  aviso: "text-warn",
};

const VACIO: ReturnType<typeof leerAvisos> = [];

export function Avisos() {
  const avisos = useSyncExternalStore(suscribirAvisos, leerAvisos, () => VACIO);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
    >
      {avisos.map((aviso) => {
        const Icono = ICONOS[aviso.tono];
        return (
          <div
            key={aviso.id}
            role={aviso.tono === "aviso" ? "alert" : "status"}
            className="pointer-events-auto flex animate-[aparece_160ms_ease-out] items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop"
          >
            <Icono className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", COLORES[aviso.tono])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-5 font-medium text-fg">{aviso.titulo}</p>
              {aviso.detalle && (
                <p className="mt-0.5 text-[12.5px] leading-[18px] break-words text-fg-3">
                  {aviso.detalle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => descartarAviso(aviso.id)}
              aria-label="Cerrar aviso"
              className="-mt-0.5 -mr-1 rounded-md p-1 text-fg-4 hover:bg-surface-3 hover:text-fg"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}

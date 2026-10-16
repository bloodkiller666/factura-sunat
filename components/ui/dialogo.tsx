"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/utils";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  /** `lateral`: panel anclado a la derecha (detalle); `centrado`: modal clásico. */
  modo?: "centrado" | "lateral";
  ancho?: "sm" | "md" | "lg";
  children: ReactNode;
  pie?: ReactNode;
  /** Contenido propio de la cabecera (reemplaza título/descripción). */
  cabecera?: ReactNode;
}

const ANCHOS = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" } as const;

/**
 * Diálogo basado en el elemento nativo <dialog>: el navegador aporta la capa
 * superior, el atrapado de foco, el cierre con Escape y la inertización del
 * fondo, que es justo lo difícil de hacer bien a mano.
 */
export function Dialogo({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  modo = "centrado",
  ancho = "md",
  children,
  pie,
  cabecera,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  // Evita que el fondo se desplace mientras el diálogo está abierto.
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  const lateral = modo === "lateral";

  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onCancel={(evento) => {
        evento.preventDefault();
        onCerrar();
      }}
      onClick={(evento) => {
        // Un clic directo sobre <dialog> es un clic en el fondo oscurecido.
        if (evento.target === ref.current) onCerrar();
      }}
      className={cn(
        "border border-line bg-surface p-0 text-fg shadow-pop",
        lateral
          ? "panel-lateral m-0 ml-auto h-dvh max-h-dvh w-full max-w-[600px] rounded-none border-y-0 border-r-0"
          : cn("m-auto w-[calc(100%-2rem)] rounded-2xl", ANCHOS[ancho]),
      )}
    >
      {abierto && (
        <div className={cn("flex flex-col", lateral ? "h-dvh" : "max-h-[86dvh]")}>
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
            {cabecera ?? (
              <div className="min-w-0">
                <h2 className="text-[15px] leading-6 font-semibold tracking-tight text-fg">
                  {titulo}
                </h2>
                {descripcion && <p className="mt-0.5 text-[13px] text-fg-3">{descripcion}</p>}
              </div>
            )}
            <Boton
              variante="fantasma"
              tamano="sm"
              icono={X}
              etiqueta="Cerrar"
              onClick={onCerrar}
              className="-mt-1 -mr-2 shrink-0"
            />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {pie && (
            <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
              {pie}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}

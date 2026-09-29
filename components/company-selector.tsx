"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Building2, Check } from "lucide-react";
import type { Empresa } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  empresas: Empresa[];
  seleccionadaId: string;
  onSeleccionar: (id: string) => void;
}

/** Evita animar cuando el sistema pide reducir el movimiento. */
function prefiereMenosMovimiento(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CompanySelector({ empresas, seleccionadaId, onSeleccionar }: Props) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const indicadorRef = useRef<HTMLSpanElement>(null);
  const botonesRef = useRef<Array<HTMLButtonElement | null>>([]);
  const primeraVez = useRef(true);
  /** Recolocación vigente, consumida por los observadores de tamaño. */
  const colocarRef = useRef<(animar: boolean) => void>(() => {});

  /* El indicador es una cápsula absoluta que se desliza hasta la pestaña activa. */
  useGSAP(
    () => {
      const pista = pistaRef.current;
      const indicador = indicadorRef.current;
      const indiceActivo = empresas.findIndex((empresa) => empresa.id === seleccionadaId);
      const boton = botonesRef.current[indiceActivo];

      if (!pista || !indicador || !boton || indiceActivo < 0) return;

      const colocar = (animar: boolean) => {
        const rectPista = pista.getBoundingClientRect();
        const rectBoton = boton.getBoundingClientRect();
        const x = rectBoton.left - rectPista.left;
        const ancho = rectBoton.width;

        if (animar) {
          gsap.to(indicador, { x, width: ancho, duration: 0.5, ease: "power3.out" });
        } else {
          gsap.set(indicador, { x, width: ancho });
        }
      };

      colocarRef.current = colocar;

      // En el primer pintado se posiciona sin animación (no hay pestaña previa).
      colocar(!prefiereMenosMovimiento() && !primeraVez.current);
      primeraVez.current = false;
    },
    { scope: pistaRef, dependencies: [empresas, seleccionadaId], revertOnUpdate: true },
  );

  /* Los cambios de tamaño (fuente, rotación, resize) recolocan sin animar. */
  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;

    let primeraObservacion = true;
    const observador = new ResizeObserver(() => {
      if (primeraObservacion) {
        primeraObservacion = false;
        return;
      }
      colocarRef.current(false);
    });
    observador.observe(pista);

    const alRedimensionar = () => colocarRef.current(false);
    window.addEventListener("resize", alRedimensionar);

    return () => {
      observador.disconnect();
      window.removeEventListener("resize", alRedimensionar);
    };
  }, []);

  return (
    <div
      role="tablist"
      aria-label="Seleccionar empresa del Grupo TDM"
      data-anim="reveal"
      className="-mx-4 flex snap-x snap-mandatory overflow-x-auto rounded-none border-y border-slate-200/80 bg-white/60 px-4 py-1.5 backdrop-blur-xl sm:mx-0 sm:snap-none sm:rounded-2xl sm:border dark:border-white/10 dark:bg-white/[0.03] [&::-webkit-scrollbar]:hidden"
    >
      <div ref={pistaRef} role="presentation" className="relative flex w-full min-w-max gap-1.5">
        <span
          ref={indicadorRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 shadow-[0_12px_34px_-14px_rgba(79,70,229,0.95)] ring-1 ring-inset ring-white/25 will-change-transform dark:from-indigo-500/30 dark:via-indigo-500/20 dark:to-sky-500/20 dark:shadow-[0_0_28px_-10px_rgba(99,102,241,0.9)] dark:ring-white/15"
        />

        {empresas.map((empresa, indice) => {
          const activa = empresa.id === seleccionadaId;
          return (
            <button
              key={empresa.id}
              ref={(elemento) => {
                botonesRef.current[indice] = elemento;
              }}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => onSeleccionar(empresa.id)}
              className={cn(
                "group relative flex min-w-[178px] flex-1 snap-start items-center gap-2.5 rounded-full px-3 py-2.5 text-left transition-colors duration-200 sm:min-w-[196px] sm:px-3.5",
                activa
                  ? "text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition duration-300",
                  activa
                    ? "bg-white/20 text-white ring-1 ring-inset ring-white/30 backdrop-blur-md"
                    : "bg-slate-200/70 text-slate-500 ring-1 ring-inset ring-white/50 group-hover:bg-slate-300/70 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10 dark:group-hover:bg-white/10 dark:group-hover:text-slate-200",
                )}
              >
                <Building2 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "truncate text-sm font-semibold",
                      activa ? "text-white" : "text-slate-700 dark:text-slate-200",
                    )}
                  >
                    {empresa.nombreCorto}
                  </span>
                  {activa && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                  )}
                </span>
                <span
                  className={cn(
                    "block truncate font-mono text-[11px] tracking-tight transition-colors",
                    activa ? "text-white/75" : "text-slate-400 dark:text-slate-500",
                  )}
                >
                  RUC {empresa.ruc}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { Building2, ChevronDown, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface EmpresaActiva {
  id: string;
  ruc: string;
  nombreCorto: string;
  rol: "admin" | "emisor" | "lector";
}

interface Props {
  empresas: EmpresaActiva[];
  rucActivo: string | null;
  cargando: boolean;
  onCambiar: (ruc: string) => void;
}

const ETIQUETAS_ROL: Record<EmpresaActiva["rol"], string> = {
  admin: "Administrador",
  emisor: "Emisor",
  lector: "Lector",
};

/**
 * Selector multiempresa: la empresa elegida define el RUC de todas las
 * consultas (listado, importación y descargas). Solo se listan las empresas a
 * las que el usuario pertenece (lo filtra el backend con RLS).
 */
export function CompanySelector({ empresas, rucActivo, cargando, onCambiar }: Props) {
  const [abierto, setOpen] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);

  const activa = empresas.find((empresa) => empresa.ruc === rucActivo) ?? empresas[0];

  useEffect(() => {
    if (!abierto) return;
    const alClicFuera = (evento: PointerEvent) => {
      if (!raizRef.current?.contains(evento.target as Node)) setOpen(false);
    };
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", alClicFuera);
    window.addEventListener("keydown", alPresionar);
    return () => {
      window.removeEventListener("pointerdown", alClicFuera);
      window.removeEventListener("keydown", alPresionar);
    };
  }, [abierto]);

  return (
    <div
      ref={raizRef}
      data-anim="reveal"
      className="flex items-center gap-2.5 rounded-none border-y border-slate-200/80 bg-white/60 px-4 py-2.5 backdrop-blur-xl sm:rounded-2xl sm:border dark:border-white/10 dark:bg-white/[0.03]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 text-white shadow-[0_12px_34px_-14px_rgba(79,70,229,0.95)] ring-1 ring-inset ring-white/25">
        <Building2 className="h-5 w-5" />
      </span>

      {empresas.length === 0 && !cargando && (
        <span className="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400">
          No tienes empresas asignadas
        </span>
      )}

      {cargando && (
        <span className="min-w-0 flex-1 truncate text-sm text-slate-400 dark:text-slate-500">
          Cargando empresas…
        </span>
      )}

      {!cargando && activa && (
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((previo) => !previo)}
            aria-haspopup="listbox"
            aria-expanded={abierto}
            className="flex w-full items-center gap-2 rounded-xl px-1 py-0.5 text-left transition hover:bg-slate-100/70 active:scale-[0.99] dark:hover:bg-white/5"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                {activa.nombreCorto}
              </span>
              <span className="block truncate font-mono text-[11px] tracking-tight text-slate-400 dark:text-slate-500">
                RUC {activa.ruc}
              </span>
            </span>
            {empresas.length > 1 && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                  abierto && "rotate-180",
                )}
              />
            )}
          </button>

          {abierto && empresas.length > 1 && (
            <ul
              role="listbox"
              aria-label="Cambiar de empresa"
              className="absolute top-full left-0 z-40 mt-2 max-h-72 w-full min-w-[260px] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0b0e18]/95"
            >
              {empresas.map((empresa) => (
                <li key={empresa.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={empresa.ruc === activa.ruc}
                    onClick={() => {
                      setOpen(false);
                      if (empresa.ruc !== activa.ruc) onCambiar(empresa.ruc);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition",
                      empresa.ruc === activa.ruc
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">
                        {empresa.nombreCorto}
                      </span>
                      <span className="block font-mono text-[11px] text-slate-400">
                        RUC {empresa.ruc}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        empresa.rol === "lector"
                          ? "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
                      )}
                    >
                      {ETIQUETAS_ROL[empresa.rol]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activa && (
        <span
          title={`Tu rol en esta empresa: ${ETIQUETAS_ROL[activa.rol]}`}
          className={cn(
            "hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset sm:inline-flex",
            activa.rol === "lector"
              ? "bg-slate-100 text-slate-500 ring-slate-300/60 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10"
              : "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
          )}
        >
          <ShieldCheck className="h-3 w-3" />
          {ETIQUETAS_ROL[activa.rol]}
        </span>
      )}
    </div>
  );
}

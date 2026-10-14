import { Building2 } from "lucide-react";
import type { Empresa } from "@/lib/types";

interface Props {
  empresa: Empresa;
}

/**
 * Tarjeta estática de la empresa única del portal. A diferencia del antiguo
 * selector multi-empresa, aquí no hay pestañas ni cambio de RUC: el portal
 * opera siempre sobre `empresa.ruc`.
 */
export function CompanyBadge({ empresa }: Props) {
  return (
    <div
      data-anim="reveal"
      className="flex items-center gap-2.5 rounded-none border-y border-slate-200/80 bg-white/60 px-4 py-2.5 backdrop-blur-xl sm:rounded-2xl sm:border dark:border-white/10 dark:bg-white/[0.03]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 text-white shadow-[0_12px_34px_-14px_rgba(79,70,229,0.95)] ring-1 ring-inset ring-white/25">
        <Building2 className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
          {empresa.nombreCorto}
        </span>
        <span className="block truncate font-mono text-[11px] tracking-tight text-slate-400 dark:text-slate-500">
          RUC {empresa.ruc}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {empresa.estado}
      </span>
    </div>
  );
}

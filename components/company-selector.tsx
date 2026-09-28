import { Building2, Check } from "lucide-react";
import type { Empresa } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  empresas: Empresa[];
  seleccionadaId: string;
  onSeleccionar: (id: string) => void;
}

export function CompanySelector({ empresas, seleccionadaId, onSeleccionar }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Seleccionar empresa del Grupo TDM"
      className="-mx-4 flex snap-x snap-mandatory gap-1.5 overflow-x-auto rounded-none border-y border-slate-200 bg-slate-100/80 p-1.5 px-4 sm:mx-0 sm:snap-none sm:rounded-2xl sm:border dark:border-slate-800 dark:bg-slate-900/60 [&::-webkit-scrollbar]:hidden"
    >
      {empresas.map((empresa) => {
        const activa = empresa.id === seleccionadaId;
        return (
          <button
            key={empresa.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onSeleccionar(empresa.id)}
            className={cn(
              "group flex min-w-[175px] flex-1 snap-start items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition sm:min-w-[190px] sm:px-3.5",
              activa
                ? "bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                : "hover:bg-white/70 dark:hover:bg-slate-800/60",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
                activa
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-500 group-hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-slate-600",
              )}
            >
              <Building2 className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "truncate text-sm font-semibold",
                    activa ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400",
                  )}
                >
                  {empresa.nombreCorto}
                </span>
                {activa && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />}
              </span>
              <span className="block truncate font-mono text-[11px] tracking-tight text-slate-400 dark:text-slate-500">
                RUC {empresa.ruc}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

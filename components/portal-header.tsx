import { Receipt, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function PortalHeader({ cargando = false }: { cargando?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Marca */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-slate-900 text-white shadow-sm shadow-slate-900/20 sm:h-11 sm:w-11">
            <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-base lg:text-lg">
              Portal de Facturación Electrónica - Grupo TDM
            </h1>
            <p className="hidden truncate text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
              Gestión de comprobantes electrónicos · SUNAT
            </p>
          </div>
        </div>

        {/* Estado del sistema + tema + perfil */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25 sm:px-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="hidden md:inline">SUNAT conectado</span>
          </span>

          <ThemeToggle />

          <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:pr-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-blue-600">
              <UserRound className="h-4 w-4" />
            </span>
            <span className="hidden leading-tight xl:block">
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">
                Administrador de Facturación
              </span>
              <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                admin.facturacion@grupotdm.pe
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Barra de progreso indeterminada mientras se consultan datos */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-transparent"
      >
        {cargando && (
          <div className="h-full w-1/3 animate-[barraIndeterminada_1.1s_ease-in-out_infinite] bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500" />
        )}
      </div>
    </header>
  );
}

import { LogOut, Receipt, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface Props {
  cargando?: boolean;
  /** Correo del usuario con sesión activa (oculta el bloque si falta). */
  email?: string | null;
  /** Presente solo cuando hay sesión: muestra el botón de salida. */
  onSalir?: () => void;
}

export function PortalHeader({ cargando = false, email, onSalir }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-[#080a12]/70">
      <div
        data-anim="reveal"
        className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"
      >
        {/* Marca */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-slate-900 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-inset ring-white/25 sm:h-11 sm:w-11">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400/40 to-transparent opacity-60"
            />
            <Receipt className="relative h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm leading-tight font-bold tracking-tight text-slate-900 sm:text-base lg:text-lg dark:text-white">
              Portal de Facturación Electrónica
              <span className="texto-degradado"> · Grupo TDM</span>
            </h1>
          </div>
        </div>

        {/* Tema + perfil */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {email && (
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white/70 py-1 pr-1 pl-1 shadow-sm backdrop-blur-md xl:pr-3 dark:border-white/10 dark:bg-white/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-white ring-1 ring-inset ring-white/15 dark:from-indigo-500 dark:to-indigo-700 dark:ring-white/20">
                <UserRound className="h-4 w-4" />
              </span>
              <span className="hidden leading-tight xl:block">
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {email.split("@")[0]}
                </span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-400">
                  {email}
                </span>
              </span>
              {onSalir && (
                <button
                  type="button"
                  onClick={onSalir}
                  aria-label="Cerrar sesión"
                  title="Cerrar sesión"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Barra de progreso indeterminada mientras se consultan datos */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-transparent"
      >
        {cargando && (
          <div className="h-full w-1/3 animate-[barraIndeterminada_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 shadow-[0_0_12px_1px_rgba(99,102,241,0.8)]" />
        )}
      </div>
    </header>
  );
}

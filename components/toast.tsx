import { FileCheck2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type TonoToast = "ok" | "info" | "aviso";

export interface ToastState {
  id: number;
  titulo: string;
  detalle: string;
  tono: TonoToast;
}

/** Notificación sin `id`: el contenedor que la emite le asigna uno. */
export type NuevoToast = Omit<ToastState, "id">;

const ESTILOS: Record<TonoToast, { icono: typeof Info; clases: string; barra: string }> = {
  ok: {
    icono: FileCheck2,
    clases:
      "bg-emerald-50 text-emerald-600 ring-emerald-600/10 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25 dark:shadow-[0_0_30px_-8px_rgba(16,185,129,0.9)]",
    barra: "from-emerald-400 to-teal-400",
  },
  info: {
    icono: Info,
    clases:
      "bg-blue-50 text-blue-600 ring-blue-600/10 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/25 dark:shadow-[0_0_30px_-8px_rgba(59,130,246,0.9)]",
    barra: "from-indigo-400 to-sky-400",
  },
  aviso: {
    icono: TriangleAlert,
    clases:
      "bg-amber-50 text-amber-600 ring-amber-600/10 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25 dark:shadow-[0_0_30px_-8px_rgba(245,158,11,0.9)]",
    barra: "from-amber-400 to-orange-400",
  },
};

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;

  const { icono: Icono, clases, barra } = ESTILOS[toast.tono];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
    >
      <div
        key={toast.id}
        className="vidrio relative flex animate-[fadeInUp_.25s_ease-out_both] items-start gap-3 overflow-hidden rounded-2xl px-4 py-3.5"
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
            clases,
          )}
        >
          <Icono className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{toast.titulo}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-300">{toast.detalle}</p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[barraToast_3.4s_linear_both] bg-gradient-to-r",
            barra,
          )}
        />
      </div>
    </div>
  );
}

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

const ESTILOS: Record<TonoToast, { icono: typeof Info; clases: string }> = {
  ok: {
    icono: FileCheck2,
    clases:
      "bg-emerald-50 text-emerald-600 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
  },
  info: {
    icono: Info,
    clases:
      "bg-blue-50 text-blue-600 ring-blue-600/10 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20",
  },
  aviso: {
    icono: TriangleAlert,
    clases:
      "bg-amber-50 text-amber-600 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
  },
};

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;

  const { icono: Icono, clases } = ESTILOS[toast.tono];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
    >
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-xl shadow-slate-900/10 animate-[fadeInUp_.25s_ease-out_both] dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/40">
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
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{toast.detalle}</p>
        </div>
      </div>
    </div>
  );
}

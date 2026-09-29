import { cn } from "@/lib/utils";

/** Bloque base con barrido de brillo, usado por todos los skeletons. */
export function Pulso({
  className,
  tono = "base",
}: {
  className?: string;
  /** `claro` se usa sobre superficies oscuras (cabeceras de color). */
  tono?: "base" | "claro";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block overflow-hidden rounded-md",
        tono === "claro" ? "bg-white/20" : "bg-slate-200/80 dark:bg-white/10",
        className,
      )}
    >
      <span className="absolute inset-0 -translate-x-full animate-[brilloBarrido_1.9s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/15" />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Tarjetas KPI
 * ------------------------------------------------------------------ */

export function SkeletonKpis() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando indicadores"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, indice) => (
        <div key={indice} className="vidrio relative overflow-hidden rounded-2xl p-4 sm:p-5">
          <Pulso className="absolute inset-x-0 top-0 h-px w-full rounded-none" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2.5">
              <Pulso className="h-3 w-32" />
              <Pulso className="h-7 w-28" />
              <Pulso className="h-3 w-40" />
            </div>
            <Pulso className="h-10 w-10 shrink-0 rounded-xl" />
          </div>
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Filas de la tabla (escritorio)
 * ------------------------------------------------------------------ */

const ANCHOS_COLUMNA = [
  "w-4",
  "w-24",
  "w-28",
  "w-36",
  "w-16",
  "w-16",
  "w-44",
  "w-24",
  "w-16",
  "w-20",
  "w-20",
  "w-20",
  "w-24",
];

export function SkeletonFilasTabla({ filas = 6 }: { filas?: number }) {
  return (
    <>
      {Array.from({ length: filas }).map((_, indiceFila) => (
        <tr key={indiceFila} className="border-b border-slate-100/80 dark:border-white/5">
          {ANCHOS_COLUMNA.map((ancho, indiceColumna) => (
            <td key={indiceColumna} className="px-4 py-4">
              <Pulso className={cn("h-3.5", ancho)} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Tarjetas de comprobante (móvil)
 * ------------------------------------------------------------------ */

export function SkeletonTarjetas({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: cantidad }).map((_, indice) => (
        <div key={indice} className="vidrio space-y-3 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <Pulso className="h-4 w-28" />
            <Pulso className="h-6 w-24 rounded-full" />
          </div>
          <Pulso className="h-3.5 w-48" />
          <Pulso className="h-3 w-full" />
          <Pulso className="h-3 w-2/3" />
          <div className="flex items-center justify-between gap-3 pt-1">
            <Pulso className="h-6 w-24 rounded-full" />
            <Pulso className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Mensaje de carga reutilizable
 * ------------------------------------------------------------------ */

export function CargandoTexto({ mensaje = "Consultando a SUNAT…" }: { mensaje?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-300">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500 dark:border-white/20 dark:border-t-indigo-400" />
      {mensaje}
    </span>
  );
}

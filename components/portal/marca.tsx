import { cn } from "@/lib/utils";

/** Isotipo: una cinta de asfalto con su línea de eje, sobre fondo grafito. */
export function Isotipo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("h-8 w-8 shrink-0", className)}
      fill="none"
    >
      <rect width="32" height="32" rx="8" fill="#F5B301" />
      <path d="M9 25 14.2 7h3.6L23 25" stroke="#14171C" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M16 11v3M16 17v3M16 23v2" stroke="#14171C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Isotipo />
      {!compacta && (
        <div className="leading-tight">
          <p className="text-[14px] font-semibold tracking-tight text-side-fg">Portal TDM</p>
          <p className="text-[11px] text-side-fg-2">Facturación electrónica</p>
        </div>
      )}
    </div>
  );
}

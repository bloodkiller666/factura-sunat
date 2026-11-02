import { cn } from "@/lib/utils";

/**
 * Logo de TDM Asfaltos (círculo con degradado amarillo). Es un archivo propio en `public/`:
 * se carga con `<img>` para que su degradado interno no choque con otros SVG de la página.
 */
export function Isotipo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG estático: next/image no aporta nada
    <img
      src="/logo-tdm-asfaltos.svg"
      alt="TDM Asfaltos"
      width={40}
      height={40}
      className={cn("h-10 w-10 shrink-0", className)}
    />
  );
}

export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Isotipo />
      {!compacta && (
        <div className="leading-tight">
          <p className="text-[14px] font-semibold tracking-tight text-side-fg">Portal Holding TDM</p>
          <p className="text-[12px] text-side-fg-2">Facturación electrónica</p>
        </div>
      )}
    </div>
  );
}

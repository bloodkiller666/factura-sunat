import type { ButtonHTMLAttributes, ComponentType, SVGProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconoLucide = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

type Variante = "primario" | "acento" | "secundario" | "fantasma" | "peligro";
type Tamano = "sm" | "md";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-ink text-ink-fg shadow-ink hover:bg-ink-hover",
  acento: "bg-accent text-white shadow-ink hover:bg-accent-hover",
  secundario:
    "border border-line-strong bg-surface text-fg-2 shadow-sm hover:border-fg-4/60 hover:bg-surface-2 hover:text-fg",
  fantasma: "text-fg-3 hover:bg-surface-3 hover:text-fg",
  peligro: "border border-bad-line bg-bad-bg text-bad hover:border-bad hover:brightness-[0.97]",
};

const TAMANOS: Record<Tamano, { texto: string; solo: string }> = {
  // `pointer-coarse`: con el dedo (móvil/tableta) el área táctil sube a 44 px; con ratón no cambia.
  sm: {
    texto: "h-8 gap-1.5 px-2.5 text-[12.5px] pointer-coarse:h-11",
    solo: "h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11",
  },
  md: {
    texto: "h-9 gap-2 px-3.5 text-[13px] pointer-coarse:h-11",
    solo: "h-9 w-9 pointer-coarse:h-11 pointer-coarse:w-11",
  },
};

/** Respuesta al toque: se hunde un poco al presionar y vuelve con curva suave. */
const RESPUESTA =
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  icono?: IconoLucide;
  cargando?: boolean;
  /** Botón de solo icono: exige `etiqueta` para el lector de pantalla. */
  etiqueta?: string;
}

export function Boton({
  variante = "secundario",
  tamano = "md",
  icono: Icono,
  cargando = false,
  etiqueta,
  className,
  children,
  disabled,
  type = "button",
  ...resto
}: Props) {
  const soloIcono = Boolean(Icono) && !children;
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-label={etiqueta}
      title={etiqueta}
      aria-busy={cargando || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap select-none",
        RESPUESTA,
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTES[variante],
        soloIcono ? TAMANOS[tamano].solo : TAMANOS[tamano].texto,
        className,
      )}
      {...resto}
    >
      {cargando ? (
        <Loader2 className="h-4 w-4 animate-[giro_0.8s_linear_infinite]" aria-hidden />
      ) : (
        Icono && <Icono className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      )}
      {children}
    </button>
  );
}

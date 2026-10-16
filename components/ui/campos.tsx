"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IconoLucide } from "@/components/ui/boton";

const BASE_CAMPO =
  "h-9 w-full rounded-lg border border-line-strong bg-surface px-3 text-[13px] text-fg shadow-sm " +
  "placeholder:text-fg-4 transition-colors hover:border-fg-4 focus:border-accent " +
  "focus-visible:shadow-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60";

interface PropsInput extends InputHTMLAttributes<HTMLInputElement> {
  icono?: IconoLucide;
}

export const Campo = forwardRef<HTMLInputElement, PropsInput>(function Campo(
  { icono: Icono, className, ...resto },
  ref,
) {
  return (
    <div className="relative">
      {Icono && (
        <Icono
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-4"
          strokeWidth={1.75}
          aria-hidden
        />
      )}
      <input ref={ref} className={cn(BASE_CAMPO, Icono && "pl-9", className)} {...resto} />
    </div>
  );
});

export function CampoBusqueda(props: Omit<PropsInput, "icono">) {
  return <Campo icono={Search} type="search" {...props} />;
}

export function Seleccion({
  className,
  children,
  ...resto
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(BASE_CAMPO, "cursor-pointer appearance-none pr-8", className)}
        {...resto}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-fg-4"
        strokeWidth={1.75}
        aria-hidden
      />
    </div>
  );
}

/** Etiqueta + campo con texto de ayuda opcional. */
export function Grupo({
  etiqueta,
  ayuda,
  children,
  className,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[12px] font-medium text-fg-2">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-[12px] text-fg-4">{ayuda}</span>}
    </label>
  );
}

interface PropsCasilla {
  checked: boolean;
  onChange: () => void;
  etiqueta: string;
  indeterminada?: boolean;
  disabled?: boolean;
  className?: string;
}

const CHECK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 8.5l3 3 6-6.5'/%3E%3C/svg%3E\")";
const GUION =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 8h8'/%3E%3C/svg%3E\")";

export function Casilla({
  checked,
  onChange,
  etiqueta,
  indeterminada = false,
  disabled,
  className,
}: PropsCasilla) {
  const ref = useRef<HTMLInputElement>(null);

  // React no expone `indeterminate` como prop: se aplica sobre el nodo real.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminada;
  }, [indeterminada]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={etiqueta}
      style={{
        backgroundImage: indeterminada ? GUION : checked ? CHECK : undefined,
        backgroundSize: "100% 100%",
      }}
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-surface shadow-sm transition-colors",
        "hover:border-fg-4 checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    />
  );
}

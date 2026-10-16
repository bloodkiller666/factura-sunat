"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type { IconoLucide } from "@/components/ui/boton";

const CerrarMenu = createContext<() => void>(() => {});

interface Props {
  /** Render del disparador; recibe las props que debe esparcir sobre el botón. */
  disparador: (props: {
    onClick: () => void;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
  }) => ReactNode;
  children: ReactNode;
  alinear?: "inicio" | "fin";
  ancho?: number;
}

/**
 * Menú desplegable con posición fija: así no lo recorta el `overflow` de las
 * tablas. Se cierra con Escape, con clic fuera, al hacer scroll o al elegir.
 */
export function Menu({ disparador, children, alinear = "fin", ancho = 224 }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [ancla, setAncla] = useState<HTMLDivElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const cerrar = useCallback(() => setAbierto(false), []);

  const alternar = () => {
    if (abierto) return cerrar();
    const caja = ancla?.getBoundingClientRect();
    if (!caja) return;
    const izquierda = alinear === "fin" ? caja.right - ancho : caja.left;
    setPos({
      top: caja.bottom + 6,
      left: Math.max(8, Math.min(izquierda, window.innerWidth - ancho - 8)),
    });
    setAbierto(true);
  };

  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: PointerEvent) => {
      const destino = evento.target as Node;
      if (!ancla?.contains(destino) && !panel.current?.contains(destino)) cerrar();
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        cerrar();
        ancla?.querySelector<HTMLElement>("button")?.focus();
      }
      if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
        const items = Array.from(
          panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
        );
        if (items.length === 0) return;
        evento.preventDefault();
        const actual = items.indexOf(document.activeElement as HTMLElement);
        const paso = evento.key === "ArrowDown" ? 1 : -1;
        items[(actual + paso + items.length) % items.length]?.focus();
      }
    };
    window.addEventListener("pointerdown", fuera);
    window.addEventListener("keydown", tecla);
    window.addEventListener("scroll", cerrar, true);
    window.addEventListener("resize", cerrar);
    // Foco en el primer elemento al abrir.
    panel.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    return () => {
      window.removeEventListener("pointerdown", fuera);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto, cerrar, ancla]);

  return (
    <div ref={setAncla} className="relative inline-flex">
      {disparador({ onClick: alternar, "aria-haspopup": "menu", "aria-expanded": abierto })}
      {abierto && pos && (
        <CerrarMenu.Provider value={cerrar}>
          <div
            ref={panel}
            role="menu"
            style={{ top: pos.top, left: pos.left, width: ancho }}
            className="fixed z-[60] animate-[aparece_120ms_ease-out] rounded-xl border border-line bg-surface p-1 shadow-pop"
          >
            {children}
          </div>
        </CerrarMenu.Provider>
      )}
    </div>
  );
}

export function ItemMenu({
  icono: Icono,
  children,
  onClick,
  deshabilitado,
  peligro,
  ayuda,
}: {
  icono?: IconoLucide;
  children: ReactNode;
  onClick: () => void;
  deshabilitado?: boolean;
  peligro?: boolean;
  /** Texto secundario a la derecha (p. ej. un atajo o una nota). */
  ayuda?: string;
}) {
  const cerrar = useContext(CerrarMenu);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={deshabilitado}
      onClick={() => {
        cerrar();
        onClick();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] outline-none",
        "hover:bg-surface-3 focus-visible:bg-surface-3 focus-visible:shadow-none",
        "disabled:pointer-events-none disabled:opacity-45",
        peligro ? "text-bad" : "text-fg-2",
      )}
    >
      {Icono && <Icono className="h-4 w-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {ayuda && <span className="shrink-0 text-[11px] text-fg-4">{ayuda}</span>}
    </button>
  );
}

export function SeparadorMenu() {
  return <div role="separator" className="my-1 h-px bg-line" />;
}

export function TituloMenu({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-fg-4 uppercase">
      {children}
    </div>
  );
}

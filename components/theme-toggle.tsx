"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const CLAVE_TEMA = "tdm-tema";

/**
 * El tema vive en la clase `dark` de <html>, que aplica el script del layout
 * antes del primer pintado. Nos suscribimos a ese sistema externo con
 * MutationObserver en lugar de duplicar el estado en React.
 */
function suscribir(alCambiar: () => void): () => void {
  const observador = new MutationObserver(alCambiar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observador.disconnect();
}

function estaOscuro(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Snapshot de servidor acorde al tema por defecto del portal (dark-first). */
function estaOscuroEnServidor(): boolean {
  return true;
}

export function ThemeToggle() {
  const oscuro = useSyncExternalStore(suscribir, estaOscuro, estaOscuroEnServidor);

  function alternar() {
    const nuevoOscuro = !oscuro;
    document.documentElement.classList.toggle("dark", nuevoOscuro);
    try {
      window.localStorage.setItem(CLAVE_TEMA, nuevoOscuro ? "oscuro" : "claro");
    } catch {
      // Si el almacenamiento no está disponible, el tema igual se aplica.
    }
  }

  const etiqueta = oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      onClick={alternar}
      title={etiqueta}
      aria-label={etiqueta}
      aria-pressed={oscuro}
      className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/90 bg-white/80 text-slate-500 shadow-sm backdrop-blur-md transition duration-300 hover:border-indigo-300 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-400/60 dark:hover:text-indigo-300 dark:hover:shadow-[0_0_22px_-6px_rgba(99,102,241,0.9)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 opacity-0 transition-opacity duration-300 group-hover:from-indigo-500/10 group-hover:to-sky-400/10 group-hover:opacity-100"
      />
      {oscuro ? <Sun className="relative h-4 w-4" /> : <Moon className="relative h-4 w-4" />}
    </button>
  );
}

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

/** Durante el render en servidor no hay DOM: se asume modo claro. */
function estaOscuroEnServidor(): boolean {
  return false;
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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
    >
      {oscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

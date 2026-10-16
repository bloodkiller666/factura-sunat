"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Boton } from "@/components/ui/boton";

const CLAVE_TEMA = "tdm-tema";

/**
 * El tema vive en la clase `dark` de <html>, que aplica el script del layout antes
 * del primer pintado. Nos suscribimos a ese sistema externo con MutationObserver
 * en lugar de duplicar el estado en React.
 */
function suscribir(alCambiar: () => void): () => void {
  const observador = new MutationObserver(alCambiar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observador.disconnect();
}

const estaOscuro = () => document.documentElement.classList.contains("dark");

export function BotonTema({ sobreOscuro = false }: { sobreOscuro?: boolean }) {
  const oscuro = useSyncExternalStore(suscribir, estaOscuro, () => false);

  function alternar() {
    const siguiente = !oscuro;
    document.documentElement.classList.toggle("dark", siguiente);
    try {
      window.localStorage.setItem(CLAVE_TEMA, siguiente ? "oscuro" : "claro");
    } catch {
      // Sin almacenamiento el tema se aplica igual durante la sesión.
    }
  }

  return (
    <Boton
      variante="fantasma"
      tamano="sm"
      icono={oscuro ? Sun : Moon}
      etiqueta={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={oscuro}
      onClick={alternar}
      className={sobreOscuro ? "text-side-fg-2 hover:bg-side-2 hover:text-side-fg" : undefined}
    />
  );
}

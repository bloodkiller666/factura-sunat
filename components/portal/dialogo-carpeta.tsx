"use client";

import { useState } from "react";
import { Check, Copy, FolderOpen, HardDriveDownload, TriangleAlert, CircleX } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import type { CarpetaFallida } from "@/components/portal/use-portal";
import { cn } from "@/lib/utils";

interface Props {
  fallo: CarpetaFallida | null;
  /** Reintenta abrir la carpeta (un clic del usuario). */
  onAbrir: () => Promise<void>;
  /** Baja XML y PDF a la PC para tenerlos en carpeta. */
  onGuardarEnPc: () => void;
  guardandoPc: boolean;
  onCerrar: () => void;
}

/**
 * Ventana de ayuda cuando «Abrir carpeta» no pudo abrir el Explorador por sí solo. Un navegador no
 * puede lanzar el Explorador de Windows; solo el backend de la PC puede. Aquí el usuario ve la ruta,
 * la copia con un clic y puede reintentar (con un clic ya se abre cuando el backend corre en su PC).
 */
export function DialogoCarpeta({ fallo, onAbrir, onGuardarEnPc, guardandoPc, onCerrar }: Props) {
  // `key` por comprobante: la ventana empieza limpia cada vez que se abre.
  if (!fallo) return null;
  return (
    <Contenido
      key={`${fallo.comprobante.id}:${fallo.mensaje}`}
      fallo={fallo}
      onAbrir={onAbrir}
      onGuardarEnPc={onGuardarEnPc}
      guardandoPc={guardandoPc}
      onCerrar={onCerrar}
    />
  );
}

function Contenido({
  fallo,
  onAbrir,
  onGuardarEnPc,
  guardandoPc,
  onCerrar,
}: Props & { fallo: CarpetaFallida }) {
  const [copiada, setCopiada] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const rojo = fallo.gravedad === "error";
  const Icono = rojo ? CircleX : TriangleAlert;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(fallo.ruta);
      setCopiada(true);
    } catch {
      setCopiada(false); // sin permiso de portapapeles: la ruta está a la vista para copiarla a mano
    }
  }

  async function abrir() {
    setAbriendo(true);
    try {
      await onAbrir();
    } finally {
      setAbriendo(false);
    }
  }

  return (
    <Dialogo
      abierto
      onCerrar={onCerrar}
      titulo={`Abrir carpeta de ${fallo.comprobante.numero}`}
      descripcion="La carpeta no se abrió automáticamente."
      ancho="md"
      pie={
        <>
          <Boton icono={HardDriveDownload} cargando={guardandoPc} onClick={onGuardarEnPc}>
            Guardar en mi PC
          </Boton>
          <Boton variante="acento" icono={FolderOpen} cargando={abriendo} onClick={() => void abrir()}>
            Abrir carpeta
          </Boton>
        </>
      }
    >
      <div className="space-y-3 p-1">
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2.5 rounded-lg border p-3 text-[13px]",
            rojo ? "border-bad-line bg-bad-bg text-bad" : "border-warn-line bg-warn-bg text-warn",
          )}
        >
          <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{fallo.mensaje}</p>
        </div>

        <div>
          <p className="mb-1 text-[12px] font-medium text-fg-3">Carpeta del comprobante</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={fallo.ruta}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Ruta de la carpeta"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 font-mono text-[12px] text-fg-2"
            />
            <Boton icono={copiada ? Check : Copy} onClick={() => void copiar()}>
              {copiada ? "Copiada" : "Copiar ruta"}
            </Boton>
          </div>
        </div>

        <ol className="list-decimal space-y-1 pl-5 text-[12.5px] text-fg-3">
          <li>
            Pulsa <strong className="font-medium text-fg-2">Abrir carpeta</strong> para reintentar: se
            abre sola cuando el backend corre en tu PC.
          </li>
          <li>
            Si no, copia la ruta, abre el Explorador (<kbd>Win</kbd> + <kbd>E</kbd>), pega la ruta en
            la barra de direcciones y pulsa Enter.
          </li>
          <li>
            ¿No existe aún? <strong className="font-medium text-fg-2">Guardar en mi PC</strong> baja
            allí el XML y el PDF.
          </li>
        </ol>
      </div>
    </Dialogo>
  );
}

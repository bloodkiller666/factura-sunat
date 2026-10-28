"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileCode2, FileText } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { Esqueleto } from "@/components/ui/varios";
import { apiArchivos, apiDescargarArchivo } from "@/lib/api";
import { aviso } from "@/lib/avisos";
import {
  MAXIMO_XML_BYTES,
  archivosPrevisualizables,
  decodificarXml,
  moverIndice,
  type ArchivoPrevisualizable,
} from "@/lib/previsualizar";
import type { Comprobante } from "@/lib/types";

interface Props {
  comprobante: Comprobante | null;
  token: string | null;
  onCerrar: () => void;
}

type Contenido = { tipo: "pdf"; url: string } | { tipo: "xml"; texto: string; truncado: boolean };

/**
 * Previsualización de los PDF y XML archivados de un comprobante: el PDF en el visor del
 * navegador y el XML como texto plano. Con varios archivos, «Anterior/Siguiente» pasa de uno a otro.
 * Cada archivo se baja recién cuando se le muestra (una URL firmada por vez).
 */
export function DialogoPrevisualizar({ comprobante, token, onCerrar }: Props) {
  // `key`: cada comprobante empieza con su propio estado, sin reiniciarlo a mano en un efecto.
  if (!comprobante) return null;
  return <Previsualizacion key={comprobante.id} comprobante={comprobante} token={token} onCerrar={onCerrar} />;
}

function Previsualizacion({
  comprobante,
  token,
  onCerrar,
}: Props & { comprobante: Comprobante }) {
  const [archivos, setArchivos] = useState<ArchivoPrevisualizable[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const id = comprobante.id;

  // Lista de archivos al abrir.
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    apiArchivos(token, id)
      .then((lista) => {
        if (vigente) setArchivos(archivosPrevisualizables(lista));
      })
      .catch(() => {
        if (!vigente) return;
        setArchivos([]);
        setError("No se pudo leer la lista de archivos. Reintenta.");
        aviso.error("No se pudo previsualizar", "No se pudo leer la lista de archivos.");
      });
    return () => {
      vigente = false;
    };
  }, [token, id]);

  const actual = archivos?.[indice] ?? null;
  const total = archivos?.length ?? 0;

  return (
    <Dialogo
      abierto
      onCerrar={onCerrar}
      titulo={`Previsualización de ${comprobante.numero}`}
      ancho="lg"
      pie={
        total > 0 ? (
          <>
            <Boton
              icono={ChevronLeft}
              disabled={indice === 0}
              onClick={() => setIndice((i) => moverIndice(i, -1, total))}
            >
              Anterior
            </Boton>
            <span className="tnum text-[12.5px] text-fg-3" aria-live="polite">
              {indice + 1} de {total}
            </span>
            <Boton
              icono={ChevronRight}
              disabled={indice === total - 1}
              onClick={() => setIndice((i) => moverIndice(i, 1, total))}
            >
              Siguiente
            </Boton>
          </>
        ) : undefined
      }
    >
      <div className="p-4">
      {archivos === null && <Esqueleto className="h-[60vh] w-full" />}
      {archivos !== null && total === 0 && !error && (
        <p className="p-2 text-[13px] text-fg-3">
          Este comprobante no tiene PDF ni XML archivados para previsualizar.
        </p>
      )}
      {archivos !== null && total === 0 && error && <p className="text-[13px] text-bad">{error}</p>}
      {actual && <VisorArchivo key={actual.id} token={token} archivo={actual} />}
      </div>
    </Dialogo>
  );
}

/** Baja y muestra un archivo; `key` por archivo, así que cada uno arranca sin contenido. */
function VisorArchivo({ token, archivo: actual }: { token: string | null; archivo: ArchivoPrevisualizable }) {
  const [contenido, setContenido] = useState<Contenido | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let vigente = true;
    let urlObjeto: string | null = null;
    apiDescargarArchivo(token, actual)
      .then(async ({ blob }) => {
        if (actual.tipo === "pdf") {
          // El bucket puede responder con otro mime; sin `application/pdf` el visor no abre.
          urlObjeto = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
          if (vigente) setContenido({ tipo: "pdf", url: urlObjeto });
          return;
        }
        const truncado = blob.size > MAXIMO_XML_BYTES;
        const texto = decodificarXml(
          await (truncado ? blob.slice(0, MAXIMO_XML_BYTES) : blob).arrayBuffer(),
        );
        if (vigente) setContenido({ tipo: "xml", texto, truncado });
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        const detalle = e instanceof Error ? e.message : "Reintenta en un momento.";
        setError(detalle);
        aviso.error(`No se pudo previsualizar ${actual.nombre}`, detalle);
      });
    return () => {
      vigente = false;
      if (urlObjeto) URL.revokeObjectURL(urlObjeto);
    };
  }, [token, actual]);

  return (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
            {actual.tipo === "pdf" ? (
              <FileText className="h-4 w-4 text-fg-3" aria-hidden />
            ) : (
              <FileCode2 className="h-4 w-4 text-fg-3" aria-hidden />
            )}
            <span className="truncate">{actual.nombre}</span>
          </p>
          {error && <p className="text-[13px] text-bad">{error}</p>}
          {!error && !contenido && <Esqueleto className="h-[60vh] w-full" />}
          {contenido?.tipo === "pdf" && (
            <iframe
              src={contenido.url}
              title={actual.nombre}
              className="h-[65vh] w-full rounded-md border border-line bg-white"
            />
          )}
          {contenido?.tipo === "xml" && (
            <>
              <pre className="h-[65vh] overflow-auto rounded-md border border-line bg-surface-2 p-3 font-mono text-[12px] leading-5 break-all whitespace-pre-wrap text-fg-2">
                {contenido.texto}
              </pre>
              {contenido.truncado && (
                <p className="text-[12px] text-fg-3">
                  El XML es muy grande: se muestran los primeros 2 MB. Descárgalo para verlo
                  completo.
                </p>
              )}
            </>
          )}
    </div>
  );
}

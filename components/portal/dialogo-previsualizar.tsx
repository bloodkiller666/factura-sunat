"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileCode2,
  FileText,
  Mail,
  TriangleAlert,
} from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { Esqueleto } from "@/components/ui/varios";
import { apiPrevisualizacion, type ApiPrevisualizacionItem } from "@/lib/api";
import { aviso, gravedadDe } from "@/lib/avisos";
import { MAXIMO_XML_BYTES, decodificarXml, moverIndice } from "@/lib/previsualizar";
import type { Comprobante } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  comprobante: Comprobante | null;
  token: string | null;
  onCerrar: () => void;
}

/**
 * Previsualización de los PDF y XML archivados de un comprobante y, en las compras con correo, del
 * `correo.txt` (asunto, remitente, fecha, adjuntos y cuerpo).
 *
 * Los archivos salen del bucket privado de Cloudflare R2: el backend firma una URL temporal por
 * archivo (una sola petición con todos) y el navegador los lee directo de R2. El PDF se muestra en
 * el visor del navegador apuntando el `<iframe>` a esa URL (no se descarga a memoria antes) y los XML
 * se leen en segundo plano apenas se abre la ventana, así «Anterior/Siguiente» es instantáneo.
 */
export function DialogoPrevisualizar({ comprobante, token, onCerrar }: Props) {
  // `key`: cada comprobante empieza con su propio estado, sin reiniciarlo a mano en un efecto.
  if (!comprobante) return null;
  return (
    <Previsualizacion
      key={comprobante.id}
      comprobante={comprobante}
      token={token}
      onCerrar={onCerrar}
    />
  );
}

type Textos = Record<string, { texto: string; truncado: boolean } | "error">;

function Previsualizacion({
  comprobante,
  token,
  onCerrar,
}: Props & { comprobante: Comprobante }) {
  const [archivos, setArchivos] = useState<ApiPrevisualizacionItem[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [error, setError] = useState<{ mensaje: string; gravedad: "error" | "aviso" } | null>(
    null,
  );
  const [textos, setTextos] = useState<Textos>({});
  const pedidos = useRef(new Set<string>());
  const id = comprobante.id;

  // Una petición trae la lista con las URLs ya firmadas.
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    apiPrevisualizacion(token, id)
      .then((lista) => {
        if (vigente) setArchivos(lista);
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        const mensaje = e instanceof Error ? e.message : "Reintenta en un momento.";
        setArchivos([]);
        setError({ mensaje, gravedad: gravedadDe(e) });
        aviso.error("No se pudo previsualizar", mensaje, { gravedad: gravedadDe(e) });
      });
    return () => {
      vigente = false;
    };
  }, [token, id]);

  // Los XML se leen en segundo plano, el que se está viendo primero.
  const actual = archivos?.[indice] ?? null;
  useEffect(() => {
    if (!archivos) return;
    const orden = [...archivos].sort((a, b) => Number(b === actual) - Number(a === actual));
    for (const archivo of orden) {
      if (archivo.tipo !== "xml" || pedidos.current.has(archivo.id)) continue;
      pedidos.current.add(archivo.id);
      fetch(archivo.url)
        .then(async (respuesta) => {
          if (!respuesta.ok) throw new Error(String(respuesta.status));
          const blob = await respuesta.blob();
          const truncado = blob.size > MAXIMO_XML_BYTES;
          const bytes = await (truncado ? blob.slice(0, MAXIMO_XML_BYTES) : blob).arrayBuffer();
          setTextos((previo) => ({
            ...previo,
            [archivo.id]: { texto: decodificarXml(bytes), truncado },
          }));
        })
        .catch(() => {
          setTextos((previo) => ({ ...previo, [archivo.id]: "error" }));
          aviso.error(
            `No se pudo previsualizar ${archivo.nombre}`,
            "El navegador no pudo leer el XML del almacenamiento. Reintenta en un momento.",
          );
        });
    }
  }, [archivos, actual]);

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
        {archivos !== null && total === 0 && error && <Aviso {...error} />}
        {archivos !== null && total === 0 && !error && (
          <p className="p-2 text-[13px] text-fg-3">
            Este comprobante no tiene PDF ni XML archivados para previsualizar.
          </p>
        )}
        {actual && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
              {actual.tipo === "pdf" && <FileText className="h-4 w-4 text-fg-3" aria-hidden />}
              {actual.tipo === "xml" && <FileCode2 className="h-4 w-4 text-fg-3" aria-hidden />}
              {actual.tipo === "txt" && <Mail className="h-4 w-4 text-fg-3" aria-hidden />}
              <span className="truncate">{actual.nombre}</span>
            </p>
            {actual.tipo === "pdf" && <VisorPdf key={actual.id} archivo={actual} />}
            {actual.tipo === "xml" && <VisorXml texto={textos[actual.id]} />}
            {actual.tipo === "txt" && <VisorTexto texto={actual.texto ?? ""} />}
          </div>
        )}
      </div>
    </Dialogo>
  );
}

function Aviso({ mensaje, gravedad }: { mensaje: string; gravedad: "error" | "aviso" }) {
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-[13px]",
        gravedad === "error"
          ? "border-bad-line bg-bad-bg text-bad"
          : "border-warn-line bg-warn-bg text-warn",
      )}
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {mensaje}
    </p>
  );
}

/** PDF: el visor del navegador apuntado directo a la URL firmada; el esqueleto se ve hasta que carga. */
function VisorPdf({ archivo }: { archivo: ApiPrevisualizacionItem }) {
  const [cargado, setCargado] = useState(false);
  return (
    <div className="relative h-[65vh] w-full">
      {!cargado && <Esqueleto className="absolute inset-0 h-full w-full" />}
      <iframe
        src={archivo.url}
        title={archivo.nombre}
        onLoad={() => setCargado(true)}
        className={cn(
          "h-full w-full rounded-md border border-line bg-white transition-opacity",
          cargado ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

/** El `correo.txt`: texto plano que ya viene en la respuesta (no hay nada que descargar). */
function VisorTexto({ texto }: { texto: string }) {
  return (
    <pre className="h-[65vh] overflow-auto rounded-md border border-line bg-surface-2 p-3 font-mono text-[12px] leading-5 break-words whitespace-pre-wrap text-fg-2">
      {texto}
    </pre>
  );
}

function VisorXml({ texto }: { texto: Textos[string] | undefined }) {
  if (texto === "error") {
    return <Aviso gravedad="error" mensaje="No se pudo leer el XML del almacenamiento." />;
  }
  if (!texto) return <Esqueleto className="h-[65vh] w-full" />;
  return (
    <>
      <pre className="h-[65vh] overflow-auto rounded-md border border-line bg-surface-2 p-3 font-mono text-[12px] leading-5 break-all whitespace-pre-wrap text-fg-2">
        {texto.texto}
      </pre>
      {texto.truncado && (
        <p className="text-[12px] text-fg-3">
          El XML es muy grande: se muestran los primeros 2 MB. Descárgalo para verlo completo.
        </p>
      )}
    </>
  );
}

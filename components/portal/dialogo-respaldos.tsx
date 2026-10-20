"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudDownload,
  Loader2,
  MinusCircle,
  SearchX,
  Square,
} from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Grupo, Seleccion } from "@/components/ui/campos";
import { Dialogo } from "@/components/ui/dialogo";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Progreso } from "@/components/ui/varios";
import {
  ApiError,
  apiBizlinksRespaldos,
  type ApiBizlinksItem,
  type ApiBizlinksSync,
} from "@/lib/api";
import { describirItem, motivoDetencion, nombreItem, resumirRespaldos } from "@/lib/bizlinks";
import { describirRango } from "@/lib/calendario";
import { formatearEntero } from "@/lib/format";
import type { FiltrosState } from "@/lib/types";

interface Props {
  abierto: boolean;
  token: string | null;
  ruc: string | null;
  /** Filtros vigentes del listado: si acotan fechas, se respetan. */
  filtros: FiltrosState;
  onCerrar: () => void;
  /** Se llama al terminar si se archivó al menos un archivo. */
  onRecuperado: () => void;
}

/** Tope por llamada del backend (`LIMITE_MAXIMO` del servicio de respaldos). */
const LIMITES = [10, 25, 50, 100] as const;

/**
 * Pausa entre comprobantes (ms). El backend ya espacia las peticiones dentro de cada consulta;
 * esta espera extra evita ráfagas entre una consulta y la siguiente.
 */
const PAUSA_MIN_MS = 3000;
const PAUSA_MAX_MS = 6000;

const TONO_ETIQUETA = { ok: "ok", aviso: "aviso", error: "error" } as const;

/** Símbolo y color de cada resultado: ✓ listo, ½ parcial, lupa tachada no encontrado, ! error. */
function simbolo(item: ApiBizlinksItem) {
  switch (item.resultado) {
    case "completo":
      return { Icono: CheckCircle2, clase: "text-ok", rotulo: "Listo" };
    case "parcial":
      return { Icono: MinusCircle, clase: "text-warn", rotulo: "Parcial" };
    case "error":
      return { Icono: AlertCircle, clase: "text-bad", rotulo: "Error" };
    default:
      return { Icono: SearchX, clase: "text-fg-4", rotulo: "No se encuentra" };
  }
}

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

type Fase = "inicio" | "corriendo" | "fin";

export function DialogoRespaldos({ abierto, token, ruc, filtros, onCerrar, onRecuperado }: Props) {
  const [limite, setLimite] = useState<number>(25);
  const [fase, setFase] = useState<Fase>("inicio");
  const [items, setItems] = useState<ApiBizlinksItem[]>([]);
  const [meta, setMeta] = useState<{
    detenido_por: string | null;
    mensaje: string | null;
    cuota_restante: number | null;
    canal: ApiBizlinksSync["canal"];
  }>({ detenido_por: null, mensaje: null, cuota_restante: null, canal: "portal" });
  const [esperando, setEsperando] = useState(false);
  const [deteniendo, setDeteniendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detener = useRef(false);
  const lista = useRef<HTMLUListElement>(null);

  const rango = describirRango(filtros.desde, filtros.hasta);
  const corriendo = fase === "corriendo";

  // La lista se desplaza sola para que siempre se vea el último comprobante.
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [items.length, fase]);

  function cerrar() {
    if (corriendo) return; // no se cierra a mitad de una consulta
    setFase("inicio");
    setItems([]);
    setError(null);
    onCerrar();
  }

  async function traer() {
    if (!token || !ruc || corriendo) return;
    detener.current = false;
    setDeteniendo(false);
    setFase("corriendo");
    setItems([]);
    setError(null);
    setMeta({ detenido_por: null, mensaje: null, cuota_restante: null, canal: "portal" });

    let hechos = 0;
    let archivos = 0;
    try {
      // De a uno: cada resultado aparece apenas llega y se puede detener en cualquier momento.
      while (hechos < limite && !detener.current) {
        const r = await apiBizlinksRespaldos(token, ruc, {
          limit: 1,
          desde: filtros.desde || undefined,
          hasta: filtros.hasta || undefined,
        });
        setItems((previos) => [...previos, ...r.items]);
        setMeta({
          detenido_por: r.detenido_por,
          mensaje: r.mensaje,
          cuota_restante: r.cuota_restante,
          canal: r.canal,
        });
        archivos += r.xml_guardados + r.cdr_guardados;
        // Sin items: no queda nada por consultar, o hubo una detención (tope, bloqueo, etc.).
        if (r.items.length === 0 || r.detenido_por) break;
        hechos += r.items.length;
        if (hechos < limite && !detener.current) {
          setEsperando(true);
          await esperar(PAUSA_MIN_MS + Math.random() * (PAUSA_MAX_MS - PAUSA_MIN_MS));
          setEsperando(false);
        }
      }
    } catch (fallo) {
      setError(
        fallo instanceof ApiError || fallo instanceof Error
          ? fallo.message
          : "No se pudo consultar Bizlinks.",
      );
    } finally {
      setEsperando(false);
      setFase("fin");
      if (archivos > 0) onRecuperado();
    }
  }

  // Resumen acumulado con el mismo formato que una respuesta única del backend.
  const acumulado: ApiBizlinksSync = {
    ruc: ruc ?? "",
    canal: meta.canal,
    revisados: items.length,
    completos: items.filter((i) => i.resultado === "completo").length,
    parciales: items.filter((i) => i.resultado === "parcial").length,
    sin_resultado: items.filter((i) => i.resultado === "sin_resultado").length,
    fallidos: items.filter((i) => i.resultado === "error").length,
    xml_guardados: items.filter((i) => i.xml_guardado).length,
    cdr_guardados: items.filter((i) => i.cdr_guardado).length,
    detenido_por: meta.detenido_por,
    mensaje: meta.mensaje,
    cuota_restante: meta.cuota_restante,
    reanuda_at: null,
    items,
    consultado_at: "",
  };
  const resumen = fase === "fin" ? resumirRespaldos(acumulado) : null;
  const detenido = motivoDetencion(meta.detenido_por);

  return (
    <Dialogo
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Traer XML y CDR desde Bizlinks"
      descripcion="Recupera los archivos firmados de los comprobantes emitidos que aún no los tienen."
      ancho="lg"
      pie={
        fase === "inicio" ? (
          <>
            <Boton onClick={cerrar}>Cancelar</Boton>
            <Boton
              variante="primario"
              icono={CloudDownload}
              disabled={!token || !ruc}
              onClick={() => void traer()}
            >
              Traer XML y CDR
            </Boton>
          </>
        ) : corriendo ? (
          <Boton
            icono={Square}
            onClick={() => {
              detener.current = true;
              setDeteniendo(true);
            }}
            disabled={deteniendo}
          >
            {deteniendo ? "Deteniendo…" : "Detener tras este comprobante"}
          </Boton>
        ) : (
          <>
            <Boton
              onClick={() => {
                setFase("inicio");
                setItems([]);
              }}
            >
              Traer otro lote
            </Boton>
            <Boton variante="primario" onClick={cerrar}>
              Listo
            </Boton>
          </>
        )
      }
    >
      <div className="space-y-5 p-5">
        {fase === "inicio" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Grupo
                etiqueta="Cuántos comprobantes"
                ayuda="Solo se consultan los que no tienen XML o CDR archivado."
              >
                <Seleccion
                  value={String(limite)}
                  onChange={(e) => setLimite(Number(e.target.value))}
                >
                  {LIMITES.map((n) => (
                    <option key={n} value={n}>
                      Hasta {formatearEntero(n)} por vez
                    </option>
                  ))}
                </Seleccion>
              </Grupo>
              <Grupo etiqueta="Fechas" ayuda="Se toman del filtro del listado.">
                <div className="flex h-9 items-center rounded-lg border border-line bg-surface-2 px-3 text-[13px] text-fg-2">
                  {rango}
                </div>
              </Grupo>
            </div>

            <ul className="space-y-2 rounded-xl border border-line bg-surface-2 p-4 text-[12.5px] leading-5 text-fg-2">
              <li>
                <strong className="font-medium text-fg">Solo lectura:</strong> no modifica nada en
                SUNAT ni en el OSE, y se puede repetir sin duplicar archivos.
              </li>
              <li>
                <strong className="font-medium text-fg">Qué se archiva:</strong> el XML firmado y el
                CDR reales, en el almacenamiento privado, con su huella SHA-256. Si el comprobante
                vino de SIRE, el XML además completa sus ítems.
              </li>
              <li>
                <strong className="font-medium text-fg">Ritmo pausado:</strong> se consulta de a un
                comprobante, con pausas entre uno y otro, y se respeta el tope diario. Verás cada
                resultado a medida que llega.
              </li>
              <li>
                <strong className="font-medium text-fg">Reintentos:</strong> lo que el OSE no tiene
                no se vuelve a pedir en 24 h; los errores sí se reintentan.
              </li>
            </ul>
          </>
        )}

        {fase !== "inicio" && (
          <>
            <div className="space-y-2" role="status" aria-live="polite">
              <div className="flex flex-wrap items-center gap-2">
                <Etiqueta tono={resumen ? TONO_ETIQUETA[resumen.tono] : "neutro"}>
                  {meta.canal === "portal" ? "Portal público" : "API del OSE"}
                </Etiqueta>
                <span className="text-[12.5px] text-fg-3">
                  {formatearEntero(items.length)} de {formatearEntero(limite)} ·{" "}
                  {formatearEntero(acumulado.xml_guardados)} XML ·{" "}
                  {formatearEntero(acumulado.cdr_guardados)} CDR
                  {meta.cuota_restante !== null
                    ? ` · quedan ${formatearEntero(meta.cuota_restante)} hoy`
                    : ""}
                </span>
              </div>
              {corriendo && <Progreso valor={Math.min(1, items.length / limite)} tono="acento" />}
            </div>

            <ul
              ref={lista}
              className="max-h-[320px] divide-y divide-line overflow-y-auto rounded-xl border border-line"
            >
              {items.map((item) => {
                const { Icono, clase, rotulo } = simbolo(item);
                return (
                  <li
                    key={item.comprobante_id}
                    className="flex items-start gap-3 px-3.5 py-2.5 text-[13px]"
                  >
                    <Icono
                      className={`mt-0.5 h-4 w-4 shrink-0 ${clase}`}
                      aria-label={rotulo}
                      role="img"
                    />
                    <span className="w-[132px] shrink-0">
                      <span className="block font-mono font-medium text-fg">
                        {nombreItem(item)}
                      </span>
                      {item.cliente_ruc && (
                        <span className="block font-mono text-[11.5px] text-fg-3">
                          {item.cliente_ruc}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px] break-words text-fg-2">
                      {item.cliente && (
                        <span className="block truncate text-fg" title={item.cliente}>
                          {item.cliente}
                        </span>
                      )}
                      {describirItem(item)}
                    </span>
                  </li>
                );
              })}
              {corriendo && (
                <li className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px] text-fg-3">
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-[giro_0.8s_linear_infinite]"
                    aria-hidden
                  />
                  {esperando
                    ? "Pausa breve para no saturar a Bizlinks…"
                    : "Consultando el siguiente comprobante…"}
                </li>
              )}
              {!corriendo && items.length === 0 && (
                <li className="px-3.5 py-3 text-[12.5px] text-fg-3">
                  No había comprobantes por consultar.
                </li>
              )}
            </ul>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-bad-line bg-bad-bg px-3.5 py-2.5 text-[12.5px] text-bad"
              >
                {error}
              </p>
            )}

            {resumen && (
              <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
                <p className="text-[13px] font-medium text-fg">{resumen.titulo}</p>
                <p className="mt-0.5 text-[12.5px] leading-5 text-fg-3">{resumen.detalle}</p>
              </div>
            )}
            {fase === "fin" && detenido && (
              <p className="rounded-xl border border-warn-line bg-warn-bg px-3.5 py-2.5 text-[12.5px] text-warn">
                {detenido}
              </p>
            )}

            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fg-4">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-ok" aria-hidden /> Listo
              </span>
              <span className="inline-flex items-center gap-1">
                <SearchX className="h-3.5 w-3.5" aria-hidden /> No se encuentra
              </span>
              <span className="inline-flex items-center gap-1">
                <MinusCircle className="h-3.5 w-3.5 text-warn" aria-hidden /> Parcial
              </span>
              <span className="inline-flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-bad" aria-hidden /> Error
              </span>
            </p>
          </>
        )}
      </div>
    </Dialogo>
  );
}

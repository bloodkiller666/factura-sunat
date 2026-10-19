"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, CloudDownload, MinusCircle } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Grupo, Seleccion } from "@/components/ui/campos";
import { Dialogo } from "@/components/ui/dialogo";
import { Etiqueta } from "@/components/ui/etiqueta";
import { Progreso } from "@/components/ui/varios";
import { ApiError, apiBizlinksRespaldos, type ApiBizlinksSync } from "@/lib/api";
import {
  describirItem,
  motivoDetencion,
  nombreItem,
  resumirRespaldos,
  tonoItem,
} from "@/lib/bizlinks";
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

const TONO_ETIQUETA = { ok: "ok", aviso: "aviso", error: "error" } as const;

const ICONO = {
  ok: CheckCircle2,
  aviso: MinusCircle,
  error: AlertCircle,
} as const;

export function DialogoRespaldos({ abierto, token, ruc, filtros, onCerrar, onRecuperado }: Props) {
  const [limite, setLimite] = useState<number>(25);
  const [corriendo, setCorriendo] = useState(false);
  const [resultado, setResultado] = useState<ApiBizlinksSync | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rango = describirRango(filtros.desde, filtros.hasta);

  function cerrar() {
    if (corriendo) return; // no se cierra a mitad de una consulta
    setResultado(null);
    setError(null);
    onCerrar();
  }

  async function traer() {
    if (!token || !ruc || corriendo) return;
    setCorriendo(true);
    setError(null);
    setResultado(null);
    try {
      const sync = await apiBizlinksRespaldos(token, ruc, {
        limit: limite,
        desde: filtros.desde || undefined,
        hasta: filtros.hasta || undefined,
      });
      setResultado(sync);
      if (sync.xml_guardados + sync.cdr_guardados > 0) onRecuperado();
    } catch (fallo) {
      setError(
        fallo instanceof ApiError || fallo instanceof Error
          ? fallo.message
          : "No se pudo consultar Bizlinks.",
      );
    } finally {
      setCorriendo(false);
    }
  }

  const resumen = resultado ? resumirRespaldos(resultado) : null;
  const detenido = resultado ? motivoDetencion(resultado.detenido_por) : null;

  return (
    <Dialogo
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Traer XML y CDR desde Bizlinks"
      descripcion="Recupera los archivos firmados de los comprobantes emitidos que aún no los tienen."
      ancho="lg"
      pie={
        resultado === null ? (
          <>
            <Boton onClick={cerrar}>Cancelar</Boton>
            <Boton
              variante="primario"
              icono={CloudDownload}
              cargando={corriendo}
              disabled={!token || !ruc}
              onClick={() => void traer()}
            >
              {corriendo ? "Consultando Bizlinks…" : "Traer XML y CDR"}
            </Boton>
          </>
        ) : (
          <>
            <Boton onClick={() => setResultado(null)}>Traer otro lote</Boton>
            <Boton variante="primario" onClick={cerrar}>
              Listo
            </Boton>
          </>
        )
      }
    >
      <div className="space-y-5 p-5">
        {resultado === null ? (
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

            {error && (
              <p role="alert" className="rounded-xl border border-bad-line bg-bad-bg px-3.5 py-2.5 text-[12.5px] text-bad">
                {error}
              </p>
            )}

            {corriendo && (
              <div className="space-y-2">
                <p className="text-[12.5px] text-fg-3">
                  Consultando el OSE y archivando los archivos. Puede tardar unos segundos por
                  comprobante.
                </p>
                <Progreso valor={0.6} />
              </div>
            )}

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
                <strong className="font-medium text-fg">Reintentos:</strong> lo que el OSE no tiene
                no se vuelve a pedir en 24 h; los errores sí se reintentan.
              </li>
            </ul>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tono={resumen ? TONO_ETIQUETA[resumen.tono] : "neutro"}>
                {resultado.canal === "portal" ? "Portal público" : "API del OSE"}
              </Etiqueta>
              <span className="text-[12.5px] text-fg-3">
                {formatearEntero(resultado.revisados)} revisados ·{" "}
                {formatearEntero(resultado.xml_guardados)} XML ·{" "}
                {formatearEntero(resultado.cdr_guardados)} CDR
                {resultado.cuota_restante !== null
                  ? ` · quedan ${formatearEntero(resultado.cuota_restante)} hoy`
                  : ""}
              </span>
            </div>

            {resumen && (
              <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
                <p className="text-[13px] font-medium text-fg">{resumen.titulo}</p>
                <p className="mt-0.5 text-[12.5px] leading-5 text-fg-3">{resumen.detalle}</p>
              </div>
            )}
            {detenido && (
              <p className="rounded-xl border border-warn-line bg-warn-bg px-3.5 py-2.5 text-[12.5px] text-warn">
                {detenido}
              </p>
            )}

            {resultado.items.length > 0 && (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {resultado.items.map((item) => {
                  const Icono = ICONO[tonoItem(item)];
                  const clase = {
                    ok: "text-ok",
                    aviso: "text-fg-4",
                    error: "text-bad",
                  }[tonoItem(item)];
                  return (
                    <li key={item.comprobante_id} className="flex items-start gap-3 px-3.5 py-2.5 text-[13px]">
                      <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${clase}`} aria-hidden />
                      <span className="w-[130px] shrink-0 font-medium text-fg">
                        {nombreItem(item)}
                      </span>
                      <span className="min-w-0 flex-1 text-[12.5px] break-words text-fg-2">
                        {describirItem(item)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {!corriendo && resumen?.tono === "error" && (
              <p className="text-[12.5px] text-fg-3">
                Revisado el problema, pulsa «Traer otro lote»: los comprobantes con error se
                vuelven a consultar.
              </p>
            )}
          </>
        )}
      </div>
    </Dialogo>
  );
}

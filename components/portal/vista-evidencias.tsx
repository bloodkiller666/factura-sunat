"use client";

import { Download, RefreshCw, ShieldCheck } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { BotonCopiar, Esqueleto, EstadoVacio } from "@/components/ui/varios";
import { etiquetaPeriodo, formatearFechaHora, formatearTamano } from "@/lib/format";
import type { ArchivoGuardado } from "@/lib/types";

interface Props {
  evidencias: ArchivoGuardado[] | null;
  error: string | null;
  descargando: Set<string>;
  puedeOperar: boolean;
  onDescargar: (archivo: ArchivoGuardado) => void;
  onSire: () => void;
  onReintentar: () => void;
}

/** `…-RVIE-202609-…zip` → `2026-09`. */
export function periodoDeEvidencia(nombre: string): string | null {
  const coincidencia = /RVIE-(\d{4})(\d{2})/.exec(nombre);
  return coincidencia ? `${coincidencia[1]}-${coincidencia[2]}` : null;
}

export function VistaEvidencias({
  evidencias,
  error,
  descargando,
  puedeOperar,
  onDescargar,
  onSire,
  onReintentar,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-[13px] leading-5 text-fg-2">
          Cada vez que sincronizas un periodo, el portal guarda{" "}
          <strong className="font-medium text-fg">el archivo original que entrega SUNAT</strong>{" "}
          (registro de ventas) junto con su huella SHA-256. Sirve para demostrar, ante una
          auditoría, qué tenía registrado SUNAT de tu empresa en cada periodo y que el archivo no
          fue alterado.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {error ? (
          <EstadoVacio
            icono={ShieldCheck}
            titulo="No se pudieron cargar las evidencias"
            descripcion={error}
            accion={<Boton onClick={onReintentar}>Reintentar</Boton>}
          />
        ) : evidencias === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Esqueleto key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : evidencias.length === 0 ? (
          <EstadoVacio
            icono={ShieldCheck}
            titulo="Aún no hay evidencias guardadas"
            descripcion="Se generan al sincronizar un periodo desde SIRE."
            accion={
              puedeOperar ? (
                <Boton variante="primario" icono={RefreshCw} onClick={onSire}>
                  Sincronizar SIRE
                </Boton>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-surface-2 shadow-[0_1px_0_var(--line)]">
                <tr className="text-[11.5px] tracking-wide text-fg-3 uppercase">
                  <th className="px-4 py-2.5 font-medium">Periodo</th>
                  <th className="px-3 py-2.5 font-medium">Archivo</th>
                  <th className="px-3 py-2.5 text-right font-medium">Tamaño</th>
                  <th className="px-3 py-2.5 font-medium">SHA-256</th>
                  <th className="px-3 py-2.5 font-medium">Guardado</th>
                  <th className="w-[1%] px-4 py-2.5">
                    <span className="sr-only">Descargar</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {evidencias.map((evidencia) => {
                  const periodo = periodoDeEvidencia(evidencia.nombre);
                  return (
                    <tr key={evidencia.id} className="hover:bg-surface-2">
                      <td className="px-4 py-3 text-[13px] font-medium whitespace-nowrap text-fg">
                        {periodo ? etiquetaPeriodo(periodo) : "—"}
                      </td>
                      <td className="max-w-[320px] px-3 py-3">
                        <p className="truncate font-mono text-[12px] text-fg-2" title={evidencia.nombre}>
                          {evidencia.nombre}
                        </p>
                      </td>
                      <td className="tnum px-3 py-3 text-right text-[12.5px] whitespace-nowrap text-fg-3">
                        {formatearTamano(evidencia.tamano)}
                      </td>
                      <td className="px-3 py-3">
                        {evidencia.hashSha256 ? (
                          <span className="flex items-center gap-1 font-mono text-[11.5px] text-fg-3">
                            {evidencia.hashSha256.slice(0, 14)}…
                            <BotonCopiar texto={evidencia.hashSha256} etiqueta="Copiar SHA-256 completo" />
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="tnum px-3 py-3 text-[12.5px] whitespace-nowrap text-fg-3">
                        {formatearFechaHora(evidencia.creado)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Boton
                          tamano="sm"
                          icono={Download}
                          cargando={descargando.has(`ev:${evidencia.id}`)}
                          onClick={() => onDescargar(evidencia)}
                        >
                          Descargar
                        </Boton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

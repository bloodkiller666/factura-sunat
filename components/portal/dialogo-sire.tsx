"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, Loader2, MinusCircle, RefreshCw } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Grupo, Seleccion } from "@/components/ui/campos";
import { Dialogo } from "@/components/ui/dialogo";
import { Progreso } from "@/components/ui/varios";
import type { LibroSire } from "@/lib/api";
import { mesesEntre } from "@/lib/filtros";
import { etiquetaPeriodo, formatearEntero } from "@/lib/format";
import {
  PRIMER_PERIODO_SIRE,
  mesesDisponibles,
  resultadoInicial,
  resumirLote,
  sincronizarMeses,
  type EstadoMes,
  type ResultadoMes,
} from "@/lib/sire-lote";
import { cn } from "@/lib/utils";

interface Props {
  abierto: boolean;
  token: string | null;
  ruc: string | null;
  /** Qué registro de SIRE se trae: ventas (RVIE) o compras a proveedores (RCE). */
  libro: LibroSire;
  onCerrar: () => void;
  /** Se llama al terminar (o detener) con la cantidad de comprobantes nuevos. */
  onTerminado: (nuevos: number) => void;
}

function mesActual(): string {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
}

function mesAnterior(mes: string): string {
  const [anio, m] = mes.split("-").map(Number);
  return m === 1 ? `${anio - 1}-12` : `${anio}-${String(m - 1).padStart(2, "0")}`;
}

const ICONO: Record<EstadoMes, { icono: typeof CheckCircle2; clase: string }> = {
  pendiente: { icono: CircleDashed, clase: "text-fg-4" },
  en_curso: { icono: Loader2, clase: "animate-[giro_0.8s_linear_infinite] text-accent" },
  ok: { icono: CheckCircle2, clase: "text-ok" },
  sin_datos: { icono: MinusCircle, clase: "text-fg-4" },
  error: { icono: AlertCircle, clase: "text-bad" },
  omitido: { icono: MinusCircle, clase: "text-fg-4" },
};

function TextoResultado({ r }: { r: ResultadoMes }) {
  if (r.estado === "en_curso") return <span className="text-accent">Consultando SUNAT…</span>;
  if (r.estado === "pendiente") return <span className="text-fg-4">En espera</span>;
  if (r.estado === "omitido")
    return <span className="text-fg-4">{r.mensaje ?? "Omitido"}</span>;
  if (r.estado === "sin_datos") return <span className="text-fg-3">Sin comprobantes en SIRE</span>;
  if (r.estado === "error") return <span className="text-bad">{r.mensaje}</span>;
  return (
    <span className="tnum text-fg-2">
      <strong className="font-semibold text-fg">{formatearEntero(r.nuevos)}</strong> nuevos ·{" "}
      {formatearEntero(r.yaExistian)} ya estaban
      {r.anulados > 0 ? ` · ${formatearEntero(r.anulados)} anulados` : ""}
      {r.omitidos > 0 ? ` · ${formatearEntero(r.omitidos)} omitidos` : ""}
    </span>
  );
}

export function DialogoSire({ abierto, token, ruc, libro, onCerrar, onTerminado }: Props) {
  const compras = libro === "compras";
  const hoy = mesActual();
  const meses = useMemo(() => mesesDisponibles(hoy), [hoy]);
  const anterior = mesAnterior(hoy);

  const [desde, setDesde] = useState(anterior);
  const [hasta, setHasta] = useState(anterior);
  const [resultados, setResultados] = useState<ResultadoMes[] | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  const cancelado = useRef(false);

  const seleccion = desde <= hasta ? mesesEntre(desde, hasta) : [];
  const resumen = resultados ? resumirLote(resultados) : null;
  const hechos = resultados?.filter((r) => r.estado !== "pendiente" && r.estado !== "en_curso").length ?? 0;

  const rapido = (d: string, h: string) => {
    setDesde(d);
    setHasta(h);
  };

  async function iniciar() {
    if (!token || !ruc || seleccion.length === 0) return;
    cancelado.current = false;
    setCorriendo(true);
    setResultados(seleccion.map(resultadoInicial));
    const finales = await sincronizarMeses(token, ruc, seleccion, {
      libro,
      cancelado: () => cancelado.current,
      alCambiar: (resultado) =>
        setResultados((previos) =>
          (previos ?? []).map((r) => (r.mes === resultado.mes ? resultado : r)),
        ),
    });
    setCorriendo(false);
    onTerminado(resumirLote(finales).nuevos);
  }

  function cerrar() {
    if (corriendo) return; // no se cierra a mitad de una sincronización
    setResultados(null);
    onCerrar();
  }

  return (
    <Dialogo
      abierto={abierto}
      onCerrar={cerrar}
      titulo={compras ? "Sincronizar compras desde SIRE" : "Sincronizar ventas desde SIRE"}
      descripcion={
        compras
          ? "Trae de SUNAT los comprobantes que tus proveedores te emitieron."
          : "Trae de SUNAT los comprobantes que tiene registrados de tu empresa."
      }
      ancho="lg"
      pie={
        resultados === null ? (
          <>
            <Boton onClick={cerrar}>Cancelar</Boton>
            <Boton
              variante="primario"
              icono={RefreshCw}
              disabled={seleccion.length === 0 || !token}
              onClick={() => void iniciar()}
            >
              {seleccion.length <= 1
                ? "Sincronizar"
                : `Sincronizar ${seleccion.length} meses`}
            </Boton>
          </>
        ) : corriendo ? (
          <Boton
            onClick={() => {
              cancelado.current = true;
            }}
          >
            Detener tras este mes
          </Boton>
        ) : (
          <>
            <Boton onClick={() => setResultados(null)}>Sincronizar otros meses</Boton>
            <Boton variante="primario" onClick={cerrar}>
              Listo
            </Boton>
          </>
        )
      }
    >
      <div className="space-y-5 p-5">
        {resultados === null ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Grupo etiqueta="Desde">
                <Seleccion value={desde} onChange={(e) => setDesde(e.target.value)}>
                  {meses.map((mes) => (
                    <option key={mes} value={mes}>
                      {etiquetaPeriodo(mes)}
                    </option>
                  ))}
                </Seleccion>
              </Grupo>
              <Grupo etiqueta="Hasta">
                <Seleccion value={hasta} onChange={(e) => setHasta(e.target.value)}>
                  {meses.map((mes) => (
                    <option key={mes} value={mes}>
                      {etiquetaPeriodo(mes)}
                    </option>
                  ))}
                </Seleccion>
              </Grupo>
            </div>
            {desde > hasta && (
              <p className="text-[12.5px] text-bad">«Desde» no puede ser posterior a «Hasta».</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Boton tamano="sm" onClick={() => rapido(anterior, anterior)}>
                Mes anterior
              </Boton>
              <Boton tamano="sm" onClick={() => rapido(mesAnterior(mesAnterior(anterior)), anterior)}>
                Últimos 3 meses
              </Boton>
              <Boton tamano="sm" onClick={() => rapido(`${hoy.slice(0, 4)}-01`, hoy)}>
                Este año
              </Boton>
              <Boton tamano="sm" onClick={() => rapido(PRIMER_PERIODO_SIRE, hoy)}>
                Todo el histórico
              </Boton>
            </div>

            <ul className="space-y-2 rounded-xl border border-line bg-surface-2 p-4 text-[12.5px] leading-5 text-fg-2">
              <li>
                <strong className="font-medium text-fg">Solo lectura:</strong> no modifica nada en
                SUNAT, y se puede repetir sin duplicar comprobantes.
              </li>
              <li>
                <strong className="font-medium text-fg">Evidencia:</strong> cada mes guarda además
                el archivo original de SUNAT en el almacenamiento, con su hash.
              </li>
              <li>
                <strong className="font-medium text-fg">Alcance:</strong> SIRE entrega la cabecera
                del comprobante, sin XML ni ítems. Complétalos importando los XML
                {compras ? " que te envíen tus proveedores." : "."}
              </li>
              {seleccion.length > 6 && (
                <li className="text-warn">
                  Son {seleccion.length} meses: puede tardar varios minutos. Puedes detenerlo
                  cuando quieras.
                </li>
              )}
            </ul>
          </>
        ) : (
          <>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[12.5px] text-fg-3">
                <span>
                  {corriendo ? "Sincronizando…" : "Terminado"} · {hechos} de {resultados.length}{" "}
                  meses
                </span>
                {resumen && (
                  <span className="tnum font-medium text-fg">
                    {formatearEntero(resumen.nuevos)} comprobantes nuevos
                  </span>
                )}
              </div>
              <Progreso valor={resultados.length ? hechos / resultados.length : 0} tono="ok" />
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {resultados.map((r) => {
                const { icono: Icono, clase } = ICONO[r.estado];
                return (
                  <li key={r.mes} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                    <Icono className={cn("h-4 w-4 shrink-0", clase)} aria-hidden />
                    <span className="w-[130px] shrink-0 font-medium text-fg">
                      {etiquetaPeriodo(r.mes)}
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px] break-words">
                      <TextoResultado r={r} />
                    </span>
                  </li>
                );
              })}
            </ul>
            {!corriendo && resumen && resumen.errores > 0 && (
              <p className="text-[12.5px] text-fg-3">
                Los meses con error se pueden reintentar: lo ya importado no se duplica.
              </p>
            )}
          </>
        )}
      </div>
    </Dialogo>
  );
}

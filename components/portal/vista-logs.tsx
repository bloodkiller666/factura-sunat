"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FolderClock,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Etiqueta, type Tono } from "@/components/ui/etiqueta";
import { Esqueleto, EstadoVacio } from "@/components/ui/varios";
import {
  ApiError,
  apiLogsAutomatizacion,
  type ApiEstadoAutomatizacion,
  type ApiLogAutomatizacion,
} from "@/lib/api";
import { formatearEntero, formatearFechaHora } from "@/lib/format";
import {
  ETIQUETA_RESULTADO,
  FILTROS_LOGS,
  bloquesDeDetalle,
  duracionLegible,
  etiquetaDeCarpeta,
  etiquetaTarea,
  frasesDeNovedades,
  type FiltroLogs,
} from "@/lib/logs";
import { cn } from "@/lib/utils";

interface Props {
  token: string | null;
  ruc: string | null;
}

const TAMANO_PAGINA = 25;
const TONO: Record<ApiLogAutomatizacion["resultado"], Tono> = {
  ok: "neutro",
  con_novedades: "ok",
  con_errores: "error",
};

function Tarjeta({
  titulo,
  valor,
  ayuda,
  icono: Icono,
}: {
  titulo: string;
  valor: string;
  ayuda?: string;
  icono: typeof Clock;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3.5 shadow-sm">
      <p className="flex items-center gap-1.5 text-[12px] text-fg-3">
        <Icono className="h-3.5 w-3.5" aria-hidden />
        {titulo}
      </p>
      <p className="tnum mt-1 text-[18px] leading-6 font-semibold text-fg">{valor}</p>
      {ayuda && <p className="mt-0.5 text-[11.5px] leading-4 text-fg-3">{ayuda}</p>}
    </div>
  );
}

function Pendientes({ estado }: { estado: ApiEstadoAutomatizacion }) {
  const [abierto, setAbierto] = useState(false);
  const total = estado.carpetas_pendientes.length + estado.sueltos_pendientes.length;
  if (total === 0) return null;
  return (
    <section className="rounded-xl border border-warn-line bg-warn-bg p-3.5 text-[13px] text-warn">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 text-left font-medium"
      >
        {abierto ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
        {formatearEntero(estado.carpetas_pendientes.length)} compra
        {estado.carpetas_pendientes.length === 1 ? "" : "s"} por importar y{" "}
        {formatearEntero(estado.sueltos_pendientes.length)} carpeta
        {estado.sueltos_pendientes.length === 1 ? "" : "s"} con PDF sueltos por revisar
      </button>
      {abierto && (
        <div className="mt-2 grid gap-3 text-fg-2 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[12px] font-medium text-fg">Compras por importar</p>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto font-mono text-[12px]">
              {estado.carpetas_pendientes.map((c) => (
                <li key={c}>{etiquetaDeCarpeta(c)}</li>
              ))}
              {estado.carpetas_pendientes.length === 0 && <li className="font-sans">Ninguna.</li>}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-[12px] font-medium text-fg">PDF sueltos por revisar</p>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto font-mono text-[12px]">
              {estado.sueltos_pendientes.map((c) => (
                <li key={c}>{c}</li>
              ))}
              {estado.sueltos_pendientes.length === 0 && <li className="font-sans">Ninguno.</li>}
            </ul>
          </div>
          <p className="text-[11.5px] sm:col-span-2">
            Se reintentan solos en la siguiente corrida. Un PDF sin XML solo se une a una compra si su
            texto trae el RUC y la serie-número.
          </p>
        </div>
      )}
    </section>
  );
}

function Detalle({ log }: { log: ApiLogAutomatizacion }) {
  const bloques = bloquesDeDetalle(log.detalle);
  return (
    <div className="space-y-3 border-t border-line bg-surface-2 px-4 py-3 text-[12.5px] text-fg-2">
      {log.errores.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 font-medium text-bad">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Errores
          </p>
          <ul className="space-y-0.5 text-bad">
            {log.errores.map((e, i) => (
              <li key={i} className="break-words">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
      {log.advertencias.length > 0 && (
        <div>
          <p className="mb-1 font-medium text-warn">Advertencias</p>
          <ul className="space-y-0.5 text-warn">
            {log.advertencias.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {bloques.map((bloque) => (
        <div key={bloque.titulo}>
          <p className="mb-0.5 font-medium text-fg">{bloque.titulo}</p>
          {bloque.lineas.map((linea) => (
            <p key={linea} className="text-fg-3">
              {linea}
            </p>
          ))}
        </div>
      ))}
      {bloques.length === 0 && log.errores.length === 0 && log.advertencias.length === 0 && (
        <p className="text-fg-3">Esta corrida no dejó más detalle.</p>
      )}
    </div>
  );
}

export function VistaLogs({ token, ruc }: Props) {
  const [items, setItems] = useState<ApiLogAutomatizacion[] | null>(null);
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState<ApiEstadoAutomatizacion | null>(null);
  const [filtro, setFiltro] = useState<FiltroLogs>("todos");
  const [error, setError] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set());

  // Cambiar el número vuelve a pedir los datos (botones «Actualizar» y «Reintentar»).
  const [version, setVersion] = useState(0);
  const recargar = () => setVersion((v) => v + 1);

  // Se carga al entrar y cada vez que cambia el filtro o se pide actualizar (la empresa reinicia
  // la vista con `key`). Los estados se actualizan al llegar la respuesta, no dentro del efecto.
  useEffect(() => {
    if (!token || !ruc) return;
    let vigente = true;
    apiLogsAutomatizacion(token, ruc, {
      resultado: filtro === "todos" ? undefined : filtro,
      limit: TAMANO_PAGINA,
    })
      .then((pagina) => {
        if (!vigente) return;
        setError(null);
        setItems(pagina.items);
        setTotal(pagina.total);
        setEstado(pagina.estado);
      })
      .catch((e) => {
        if (!vigente) return;
        setItems(null);
        setError(e instanceof ApiError ? e.message : "No se pudieron cargar los logs. Reintenta.");
      });
    return () => {
      vigente = false;
    };
  }, [token, ruc, filtro, version]);

  async function cargarMas() {
    if (!token || !ruc || !items) return;
    setCargandoMas(true);
    try {
      const pagina = await apiLogsAutomatizacion(token, ruc, {
        resultado: filtro === "todos" ? undefined : filtro,
        limit: TAMANO_PAGINA,
        offset: items.length,
      });
      setItems([...items, ...pagina.items]);
      setTotal(pagina.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudieron cargar más corridas.");
    }
    setCargandoMas(false);
  }

  const alternar = (id: string) =>
    setAbiertos((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-[13px] leading-5 text-fg-2">
          Cada vez que corre la <strong className="font-medium text-fg">automatización diaria</strong>{" "}
          (SIRE una vez al día y el correo de proveedores tres veces) queda aquí su resumen: lo que
          se registró de nuevo, los errores y lo que aún falta importar. Es el mismo registro que la
          PC guarda en sus archivos locales (bitácora, estado y pendientes), visible desde el portal.
        </p>
      </div>

      {estado && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tarjeta
              icono={Clock}
              titulo="Última corrida"
              valor={formatearFechaHora(estado.ultima_corrida_at)}
              ayuda={estado.ultimo_resultado ? ETIQUETA_RESULTADO[estado.ultimo_resultado] : undefined}
            />
            <Tarjeta
              icono={RefreshCw}
              titulo="Última sincronización SIRE"
              valor={formatearFechaHora(estado.ultima_sire_ok)}
              ayuda="Ventas y compras, mes actual y anterior"
            />
            <Tarjeta
              icono={FolderClock}
              titulo="Pendientes de importar"
              valor={formatearEntero(estado.carpetas_pendientes.length)}
              ayuda={`${formatearEntero(estado.sueltos_pendientes.length)} carpetas con PDF sueltos`}
            />
            <Tarjeta
              icono={ScrollText}
              titulo="Corridas registradas"
              valor={formatearEntero(total)}
              ayuda={filtro === "todos" ? undefined : "con este filtro"}
            />
          </div>
          <Pendientes estado={estado} />
        </>
      )}

      <div role="group" aria-label="Filtrar corridas" className="flex flex-wrap gap-1.5">
        {FILTROS_LOGS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => {
              setFiltro(f.id);
              setItems(null); // vuelve a mostrar el esqueleto mientras llega el nuevo filtro
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
              filtro === f.id
                ? "border-accent-line bg-accent-soft text-accent"
                : "border-line text-fg-3 hover:text-fg",
            )}
          >
            {f.etiqueta}
          </button>
        ))}
        <Boton tamano="sm" icono={RefreshCw} className="ml-auto" onClick={recargar}>
          Actualizar
        </Boton>
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {error ? (
          <EstadoVacio
            icono={ScrollText}
            titulo="No se pudieron cargar los logs"
            descripcion={error}
            accion={<Boton onClick={recargar}>Reintentar</Boton>}
          />
        ) : items === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Esqueleto key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EstadoVacio
            icono={ScrollText}
            titulo={filtro === "todos" ? "Aún no hay corridas registradas" : "No hay corridas con este filtro"}
            descripcion={
              filtro === "todos"
                ? "Aparecen cuando la tarea programada de Windows corre por primera vez (scripts/registrar_tarea_windows.ps1)."
                : "Prueba con otro filtro."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-surface-2 text-[11.5px] font-medium tracking-wide text-fg-3 uppercase shadow-[0_1px_0_var(--line)]">
                  <tr>
                    <th className="w-8 py-2.5 pl-3">
                      <span className="sr-only">Detalle</span>
                    </th>
                    <th className="px-3 py-2.5">Fecha y hora</th>
                    <th className="px-3 py-2.5">Tareas</th>
                    <th className="px-3 py-2.5">Resultado</th>
                    <th className="px-3 py-2.5">Novedades</th>
                    <th className="px-3 py-2.5 text-right">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => {
                    const abierto = abiertos.has(log.id);
                    const frases = frasesDeNovedades(log.novedades);
                    return (
                      <FilaLog
                        key={log.id}
                        log={log}
                        abierto={abierto}
                        frases={frases}
                        onAlternar={() => alternar(log.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            {items.length < total && (
              <div className="border-t border-line p-3 text-center">
                <Boton cargando={cargandoMas} onClick={() => void cargarMas()}>
                  Ver más ({formatearEntero(total - items.length)} restantes)
                </Boton>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function FilaLog({
  log,
  abierto,
  frases,
  onAlternar,
}: {
  log: ApiLogAutomatizacion;
  abierto: boolean;
  frases: string[];
  onAlternar: () => void;
}) {
  return (
    <>
      <tr className="border-t border-line hover:bg-surface-2">
        <td className="py-3 pl-3">
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={abierto}
            aria-label={abierto ? "Ocultar detalle" : "Ver detalle"}
            className="flex h-6 w-6 items-center justify-center rounded text-fg-3 hover:text-fg"
          >
            {abierto ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
          </button>
        </td>
        <td className="tnum px-3 py-3 text-[13px] font-medium whitespace-nowrap text-fg">
          {formatearFechaHora(log.created_at)}
        </td>
        <td className="px-3 py-3">
          <span className="flex flex-wrap gap-1">
            {log.tareas.length === 0 ? (
              <span className="text-[12.5px] text-fg-4">—</span>
            ) : (
              log.tareas.map((t) => <Etiqueta key={t}>{etiquetaTarea(t)}</Etiqueta>)
            )}
          </span>
        </td>
        <td className="px-3 py-3">
          <Etiqueta tono={TONO[log.resultado]}>
            {log.resultado === "con_errores" ? (
              <AlertTriangle className="h-3 w-3" aria-hidden />
            ) : (
              <CheckCircle2 className="h-3 w-3" aria-hidden />
            )}
            {ETIQUETA_RESULTADO[log.resultado]}
            {log.errores.length > 0 && ` (${log.errores.length})`}
          </Etiqueta>
        </td>
        <td className="max-w-[360px] px-3 py-3 text-[12.5px] text-fg-2">
          {frases.length === 0 ? <span className="text-fg-4">—</span> : frases.join(" · ")}
        </td>
        <td className="tnum px-3 py-3 text-right text-[12.5px] whitespace-nowrap text-fg-3">
          {duracionLegible(log.duracion_segundos)}
        </td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={6} className="p-0">
            <Detalle log={log} />
          </td>
        </tr>
      )}
    </>
  );
}

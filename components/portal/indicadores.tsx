"use client";

import { Progreso } from "@/components/ui/varios";
import { Esqueleto } from "@/components/ui/varios";
import { formatearEntero, formatearMoneda, porcentaje } from "@/lib/format";
import type { Metricas } from "@/lib/filtros";
import type { EstadoSunat, FiltroRespaldo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  metricas: Metricas;
  cargando: boolean;
  onFiltrarEstado: (estado: EstadoSunat) => void;
  onFiltrarRespaldo: (filtro: FiltroRespaldo) => void;
}

/** En móvil las tarjetas forman un carrusel; desde `lg` pasan a una cuadrícula de tres. */
const CONTENEDOR =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0";

const SEGMENTOS: Array<{ estado: EstadoSunat; color: string; clave: keyof Metricas }> = [
  { estado: "Aprobado", color: "bg-ok", clave: "aprobados" },
  { estado: "Pendiente", color: "bg-warn", clave: "pendientes" },
  { estado: "Rechazado", color: "bg-bad", clave: "rechazados" },
  { estado: "Anulado", color: "bg-fg-4", clave: "anulados" },
];

function Tarjeta({
  titulo,
  subtitulo,
  children,
  className,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-[86%] shrink-0 snap-center flex-col rounded-xl border border-line bg-surface p-4 shadow-sm sm:min-w-[48%] lg:min-w-0",
        className,
      )}
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[12px] font-medium text-fg-3">{titulo}</h3>
        {subtitulo && <span className="truncate text-[11.5px] text-fg-4">{subtitulo}</span>}
      </header>
      {children}
    </section>
  );
}

function CargandoTarjeta() {
  return (
    <div className="min-w-[86%] shrink-0 space-y-3 rounded-xl border border-line bg-surface p-4 shadow-sm sm:min-w-[48%] lg:min-w-0">
      <Esqueleto className="h-3 w-28" />
      <Esqueleto className="h-8 w-44" />
      <Esqueleto className="h-3 w-full" />
    </div>
  );
}

export function Indicadores({ metricas, cargando, onFiltrarEstado, onFiltrarRespaldo }: Props) {
  if (cargando) {
    return (
      <div className={CONTENEDOR}>
        <CargandoTarjeta />
        <CargandoTarjeta />
        <CargandoTarjeta />
      </div>
    );
  }

  const { cobertura } = metricas;
  const total = metricas.totalComprobantes;
  const sinXml = cobertura.total - cobertura.conXml;
  const sinCdr = cobertura.total - cobertura.conCdr;
  const vigentes = total - metricas.anulados - metricas.rechazados;

  return (
    <div className={CONTENEDOR}>
      {/* Facturado */}
      <Tarjeta titulo="Facturado neto" subtitulo={metricas.etiquetaPeriodo}>
        <p className="tnum text-[26px] leading-8 font-semibold tracking-tight text-fg">
          {formatearMoneda(metricas.facturadoPen)}
        </p>
        {metricas.facturadoUsd !== 0 && (
          <p className="tnum mt-0.5 text-[14px] font-medium text-fg-2">
            + {formatearMoneda(metricas.facturadoUsd, "USD")}
          </p>
        )}
        <p
          className="mt-auto pt-3 text-[12px] text-fg-3"
          title="Las notas de crédito restan; no cuentan anulados ni rechazados"
        >
          {formatearEntero(vigentes)} comprobantes vigentes · neto de notas de crédito
        </p>
      </Tarjeta>

      {/* Estado SUNAT */}
      <Tarjeta titulo="Estado ante SUNAT" subtitulo={`${formatearEntero(total)} comprobantes`}>
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-surface-3"
          role="img"
          aria-label="Distribución por estado"
        >
          {SEGMENTOS.map(({ estado, color, clave }) => {
            const valor = metricas[clave] as number;
            return valor > 0 ? (
              <span
                key={estado}
                className={color}
                style={{ width: `${(valor / Math.max(total, 1)) * 100}%` }}
              />
            ) : null;
          })}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          {SEGMENTOS.map(({ estado, color, clave }) => {
            const valor = metricas[clave] as number;
            return (
              <li key={estado}>
                <button
                  type="button"
                  onClick={() => onFiltrarEstado(estado)}
                  disabled={valor === 0}
                  className="group flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-surface-3 disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", color)} aria-hidden />
                  <span className="flex-1 text-[12.5px] text-fg-2">{estado}s</span>
                  <span className="tnum text-[13px] font-semibold text-fg">
                    {formatearEntero(valor)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Tarjeta>

      {/* Respaldo */}
      <Tarjeta titulo="Respaldo para auditoría" subtitulo="XML, CDR y PDF archivados">
        <div className="space-y-2.5">
          {(
            [
              ["XML", cobertura.conXml],
              ["CDR", cobertura.conCdr],
              ["PDF", cobertura.conPdf],
            ] as const
          ).map(([nombre, cantidad]) => {
            const pct = porcentaje(cantidad, cobertura.total);
            return (
              <div key={nombre} className="flex items-center gap-3">
                <span className="w-8 font-mono text-[11px] font-semibold text-fg-3">{nombre}</span>
                <Progreso
                  valor={cobertura.total ? cantidad / cobertura.total : 0}
                  tono={pct === 100 ? "ok" : pct >= 50 ? "acento" : "aviso"}
                  className="flex-1"
                />
                <span className="tnum w-[88px] text-right text-[12px] text-fg-2">
                  {formatearEntero(cantidad)}/{formatearEntero(cobertura.total)}{" "}
                  <span className="text-fg-4">· {pct}%</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-[12px]">
          <button
            type="button"
            onClick={() => onFiltrarRespaldo("SIN_XML")}
            disabled={sinXml === 0}
            className="font-medium text-accent hover:underline disabled:pointer-events-none disabled:text-fg-4 disabled:no-underline"
          >
            {sinXml === 0 ? "Todos con XML" : `Ver ${formatearEntero(sinXml)} sin XML`}
          </button>
          <button
            type="button"
            onClick={() => onFiltrarRespaldo("SIN_CDR")}
            disabled={sinCdr === 0}
            className="font-medium text-accent hover:underline disabled:pointer-events-none disabled:text-fg-4 disabled:no-underline"
          >
            {sinCdr === 0 ? "Todos con CDR" : `Ver ${formatearEntero(sinCdr)} sin CDR`}
          </button>
        </div>
      </Tarjeta>
    </div>
  );
}

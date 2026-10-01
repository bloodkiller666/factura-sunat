"use client";

import { useEffect } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  FileWarning,
  ListChecks,
  Loader2,
  PlusCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import type { EstadoImportacion, ReporteImportacion } from "@/lib/importar-excel";
import { cn } from "@/lib/utils";

interface Props {
  estado: EstadoImportacion | null;
  onCerrar: () => void;
}

/**
 * Resultado del botón "Importar Excel": informa si las columnas del archivo
 * concuerdan con las columnas de datos de la tabla del portal.
 */
export function ImportarExcelModal({ estado, onCerrar }: Props) {
  // Cerrar con Escape + bloquear el scroll de fondo mientras está abierto.
  useEffect(() => {
    if (!estado) return;

    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [estado, onCerrar]);

  if (!estado) return null;

  return (
    <div
      role="presentation"
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/70 p-0 backdrop-blur-md sm:items-center sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Análisis de la importación de Excel"
        onClick={(evento) => evento.stopPropagation()}
        className="vidrio flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
      >
        <Cabecera archivo={estado.archivo} onCerrar={onCerrar} />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {estado.fase === "analizando" && <Analizando />}
          {estado.fase === "error" && <MensajeError mensaje={estado.mensaje} />}
          {estado.fase === "listo" && <Resultado reporte={estado.reporte} />}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200/70 bg-white/40 px-4 py-3 sm:px-5 dark:border-white/10 dark:bg-white/[0.02]">
          <p className="text-[11px] text-slate-400 dark:text-slate-400">
            Solo se validan las columnas: el portal no modifica sus datos.
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Cabecera({ archivo, onCerrar }: { archivo: string; onCerrar: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/70 bg-white/50 px-4 py-3.5 sm:px-5 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-inset ring-white/20">
          <FileSpreadsheet className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Análisis de importación Excel
          </h2>
          <p className="truncate text-xs text-slate-400 dark:text-slate-400" title={archivo}>
            {archivo}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar análisis"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function Analizando() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Leyendo el archivo y comparando columnas…
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
          Se contrastan los encabezados del Excel con las columnas de la tabla del portal.
        </p>
      </div>
    </div>
  );
}

function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50/80 p-4 dark:border-amber-400/30 dark:bg-amber-500/10">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300">
        <FileWarning className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
          No se pudo analizar el archivo
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-200/80">{mensaje}</p>
        <p className="mt-2 text-[11px] text-amber-700/80 dark:text-amber-200/60">
          Solo se admiten libros `.xlsx` y `.xlsm` con al menos una hoja de cálculo.
        </p>
      </div>
    </div>
  );
}

function Resultado({ reporte }: { reporte: ReporteImportacion }) {
  const { compatible, porcentaje, coincidencias, faltantes, extra } = reporte;

  return (
    <>
      {/* Veredicto */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border p-4",
          compatible
            ? "border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-400/30 dark:bg-emerald-500/10"
            : "border-amber-300/70 bg-amber-50/80 dark:border-amber-400/30 dark:bg-amber-500/10",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
            compatible
              ? "bg-emerald-100 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-amber-100 text-amber-600 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300",
          )}
        >
          {compatible ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "text-sm font-bold",
              compatible ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200",
            )}
          >
            {compatible
              ? "Las columnas concuerdan con la tabla del portal"
              : "El archivo tiene diferencias con la tabla del portal"}
          </p>
          <p
            className={cn(
              "mt-1 text-xs leading-relaxed",
              compatible
                ? "text-emerald-700 dark:text-emerald-200/80"
                : "text-amber-700 dark:text-amber-200/80",
            )}
          >
            {coincidencias.length} de {reporte.totalColumnas} columnas del portal se identificaron en el
            archivo.{" "}
            {faltantes.length === 0
              ? extra.length === 0
                ? "La estructura es idéntica, así que el archivo puede usarse como plantilla del portal."
                : "No falta ninguna columna requerida; solo trae columnas adicionales."
              : `Faltan ${faltantes.length} columna${faltantes.length === 1 ? "" : "s"} de la tabla.`}
          </p>
        </div>
      </div>

      {/* Medidor de coincidencia */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase dark:text-slate-400">
          <span>Coincidencia de columnas</span>
          <span className="tabular-nums">{porcentaje}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              compatible
                ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                : "bg-gradient-to-r from-amber-400 to-orange-500",
            )}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {/* Datos de la hoja */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica etiqueta="Columnas en el archivo" valor={String(reporte.columnasArchivo)} />
        <Metrica etiqueta="Filas con datos" valor={String(reporte.filasDatos)} />
        <Metrica etiqueta="Fila de encabezados" valor={`N° ${reporte.filaCabecera}`} />
        <Metrica etiqueta="Columnas del portal" valor={String(reporte.totalColumnas)} />
      </dl>

      {/* Detalle por columna */}
      <ListaColumnas
        titulo="Columnas coincidentes"
        icono={ListChecks}
        tono="ok"
        vacio="Ninguna columna del portal fue reconocida en el archivo."
        elementos={coincidencias.map((fila) => ({ principal: fila.portal, detalle: `Archivo: ${fila.archivo}` }))}
      />

      <ListaColumnas
        titulo="Faltan en el archivo"
        icono={CircleAlert}
        tono="aviso"
        vacio="No falta ninguna columna de la tabla del portal."
        elementos={faltantes.map((columna) => ({ principal: columna }))}
      />

      <ListaColumnas
        titulo="Columnas adicionales del archivo"
        icono={PlusCircle}
        tono="neutro"
        vacio="El archivo no trae columnas adicionales."
        elementos={extra.map((columna) => ({ principal: columna }))}
      />
    </>
  );
}

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
      <dt className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-400">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{valor}</dd>
    </div>
  );
}

const TONOS = {
  ok: "bg-emerald-100 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300",
  aviso: "bg-amber-100 text-amber-600 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300",
  neutro: "bg-slate-100 text-slate-500 ring-slate-400/20 dark:bg-white/10 dark:text-slate-300",
} as const;

function ListaColumnas({
  titulo,
  icono: Icono,
  tono,
  elementos,
  vacio,
}: {
  titulo: string;
  icono: typeof ListChecks;
  tono: keyof typeof TONOS;
  elementos: Array<{ principal: string; detalle?: string }>;
  vacio: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/50 p-3.5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]">
      <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-300">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg ring-1 ring-inset",
            TONOS[tono],
          )}
        >
          <Icono className="h-3.5 w-3.5" />
        </span>
        {titulo}
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 tabular-nums dark:bg-white/10 dark:text-slate-300">
          {elementos.length}
        </span>
      </h3>

      {elementos.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-400">{vacio}</p>
      ) : (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {elementos.map((elemento) => (
            <li
              key={`${elemento.principal}-${elemento.detalle ?? ""}`}
              className="rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-[11px] dark:border-white/10 dark:bg-white/5"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {elemento.principal}
              </span>
              {elemento.detalle && (
                <span className="block text-[10px] text-slate-400 dark:text-slate-400">
                  {elemento.detalle}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

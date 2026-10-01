"use client";

import { useEffect, useRef } from "react";
import { Archive, FileSpreadsheet, FileUp, Mail, Plus } from "lucide-react";
import { EXTENSIONES_EXCEL } from "@/lib/importar-excel";
import { cn } from "@/lib/utils";

interface Props {
  /** Comprobantes marcados dentro del conjunto visible. */
  seleccionados: number;
  /** Comprobantes visibles según los filtros actuales. */
  totalVisibles: number;
  todosSeleccionados: boolean;
  cargando: boolean;
  /** Hay un envío por correo en curso: bloquea las acciones que lo disparan. */
  enviandoCorreo: boolean;
  /** Hay un Excel en análisis: el botón de importar muestra su progreso. */
  importando: boolean;
  onAlternarTodos: () => void;
  onEmitir: () => void;
  onExportarExcel: () => void;
  onDescargarZip: () => void;
  onEnviarCorreo: () => void;
  onImportarExcel: (archivo: File) => void;
}

export function QuickActionsBar({
  seleccionados,
  totalVisibles,
  todosSeleccionados,
  cargando,
  enviandoCorreo,
  importando,
  onAlternarTodos,
  onEmitir,
  onExportarExcel,
  onDescargarZip,
  onEnviarCorreo,
  onImportarExcel,
}: Props) {
  const haySeleccion = seleccionados > 0;
  const sinRegistros = cargando || totalVisibles === 0;

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-white/40 px-4 py-3 backdrop-blur-md sm:px-5 xl:flex-row xl:items-center xl:justify-between dark:border-white/10 dark:bg-white/[0.02]">
      {/* Lado izquierdo: selección global + contador */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label
          className={cn(
            "flex items-center gap-2 text-[13px] font-semibold text-slate-600 select-none dark:text-slate-200",
            sinRegistros ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          )}
        >
          <CasillaSeleccion
            checked={todosSeleccionados}
            indeterminate={haySeleccion && !todosSeleccionados}
            disabled={sinRegistros}
            onChange={onAlternarTodos}
            etiqueta="Seleccionar todos los comprobantes visibles"
          />
          Seleccionar todo
        </label>

        <span
          aria-live="polite"
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-all duration-300",
            haySeleccion
              ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-400/30 dark:shadow-[0_0_24px_-8px_rgba(99,102,241,0.95)]"
              : "bg-slate-100 text-slate-500 ring-slate-300/60 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10",
          )}
        >
          {cargando
            ? "Cargando…"
            : `${seleccionados} seleccionado${seleccionados === 1 ? "" : "s"} de ${totalVisibles}`}
        </span>
      </div>

      {/* Lado derecho: acciones rápidas y exportación masiva */}
      <div className="flex flex-wrap items-center gap-2">
        <BotonAccionRapida
          icono={Plus}
          etiqueta="Emitir Comprobante"
          variante="principal"
          siempreConTexto
          onClick={onEmitir}
        />
        <BotonAccionRapida
          icono={FileSpreadsheet}
          etiqueta="Exportar a Excel"
          colorIcono="text-emerald-600 dark:text-emerald-400"
          onClick={onExportarExcel}
        />
        <BotonImportarExcel onArchivo={onImportarExcel} cargando={importando} />
        <BotonAccionRapida
          icono={Archive}
          etiqueta="Descargar Lote ZIP"
          colorIcono="text-indigo-600 dark:text-indigo-400"
          onClick={onDescargarZip}
        />
        <BotonAccionRapida
          icono={Mail}
          etiqueta="Enviar por Correo"
          colorIcono="text-blue-600 dark:text-blue-400"
          cargando={enviandoCorreo}
          onClick={onEnviarCorreo}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Piezas compartidas con la tabla
 * ------------------------------------------------------------------ */

export function CasillaSeleccion({
  checked,
  indeterminate = false,
  onChange,
  etiqueta,
  disabled = false,
  tono = "indigo",
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  etiqueta: string;
  disabled?: boolean;
  /** Color del control: índigo para selección, esmeralda para marcas editables. */
  tono?: "indigo" | "esmeralda";
  className?: string;
}) {
  const referencia = useRef<HTMLInputElement>(null);

  // React no expone `indeterminate` como prop: se aplica sobre el nodo real.
  useEffect(() => {
    if (referencia.current) referencia.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={referencia}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20",
        tono === "esmeralda"
          ? "accent-emerald-600 focus-visible:outline-emerald-500 dark:accent-emerald-500"
          : "accent-indigo-600 focus-visible:outline-indigo-500 dark:accent-indigo-500",
        className,
      )}
    />
  );
}

/**
 * Botón "Importar Excel": abre el selector de archivos y entrega el libro
 * elegido a la página, que lo analiza contra las columnas de la tabla.
 */
export function BotonImportarExcel({
  onArchivo,
  cargando = false,
}: {
  onArchivo: (archivo: File) => void;
  cargando?: boolean;
}) {
  const entradaRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <BotonAccionRapida
        icono={FileUp}
        etiqueta="Importar Excel"
        colorIcono="text-teal-600 dark:text-teal-400"
        cargando={cargando}
        onClick={() => entradaRef.current?.click()}
      />
      <input
        ref={entradaRef}
        type="file"
        accept={EXTENSIONES_EXCEL.join(",")}
        className="hidden"
        aria-label="Seleccionar archivo Excel para analizar"
        onChange={(evento) => {
          const archivo = evento.target.files?.[0];
          // Se limpia el valor para poder reelegir el mismo archivo después.
          evento.target.value = "";
          if (archivo) onArchivo(archivo);
        }}
      />
    </>
  );
}

export function BotonAccionRapida({
  icono: Icono,
  etiqueta,
  onClick,
  variante = "secundario",
  colorIcono,
  siempreConTexto = false,
  cargando = false,
}: {
  icono: typeof Plus;
  etiqueta: string;
  onClick: () => void;
  variante?: "principal" | "secundario";
  colorIcono?: string;
  siempreConTexto?: boolean;
  cargando?: boolean;
}) {
  const principal = variante === "principal";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={cargando}
      title={etiqueta}
      aria-label={etiqueta}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70",
        principal
          ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-inset ring-white/20 hover:from-indigo-400 hover:to-blue-500 hover:shadow-indigo-500/45"
          : "border border-slate-200/90 bg-white/70 text-slate-600 backdrop-blur-md hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200 dark:hover:shadow-[0_0_26px_-10px_rgba(99,102,241,0.95)]",
      )}
    >
      {cargando ? (
        <span
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 animate-spin rounded-full border-2",
            principal ? "border-white/40 border-t-white" : "border-indigo-300 border-t-indigo-600",
          )}
        />
      ) : (
        <Icono className={cn("h-4 w-4 shrink-0", principal ? "text-white" : colorIcono)} />
      )}
      <span className={cn("whitespace-nowrap", !siempreConTexto && "hidden md:inline")}>
        {etiqueta}
      </span>
    </button>
  );
}

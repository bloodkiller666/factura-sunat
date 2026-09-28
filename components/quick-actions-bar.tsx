"use client";

import { useEffect, useRef } from "react";
import { Archive, FileSpreadsheet, Mail, Plus } from "lucide-react";
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
  onAlternarTodos: () => void;
  onEmitir: () => void;
  onExportarExcel: () => void;
  onDescargarZip: () => void;
  onEnviarCorreo: () => void;
}

export function QuickActionsBar({
  seleccionados,
  totalVisibles,
  todosSeleccionados,
  cargando,
  enviandoCorreo,
  onAlternarTodos,
  onEmitir,
  onExportarExcel,
  onDescargarZip,
  onEnviarCorreo,
}: Props) {
  const haySeleccion = seleccionados > 0;
  const sinRegistros = cargando || totalVisibles === 0;

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
      {/* Lado izquierdo: selección global + contador */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label
          className={cn(
            "flex select-none items-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300",
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
            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors",
            haySeleccion
              ? "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/25"
              : "bg-slate-100 text-slate-500 ring-slate-300/60 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
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
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  etiqueta: string;
  disabled?: boolean;
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
        "h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600",
        className,
      )}
    />
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
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-wait disabled:opacity-70",
        principal
          ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
          : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/60 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
      )}
    >
      {cargando ? (
        <span
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 animate-spin rounded-full border-2",
            principal ? "border-white/40 border-t-white" : "border-blue-300 border-t-blue-600",
          )}
        />
      ) : (
        <Icono className={cn("h-4 w-4 shrink-0", principal ? "text-white" : colorIcono)} />
      )}
      <span
        className={cn(
          "whitespace-nowrap",
          !siempreConTexto && "hidden md:inline",
        )}
      >
        {etiqueta}
      </span>
    </button>
  );
}

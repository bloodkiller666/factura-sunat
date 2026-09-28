import { CalendarRange, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { CargandoTexto } from "@/components/skeletons";
import type { EstadoComercial, EstadoSunat, FiltrosState, TipoDocumento } from "@/lib/types";
import { cn } from "@/lib/utils";

export const FILTROS_INICIALES: FiltrosState = {
  q: "",
  tipo: "TODOS",
  estadoSunat: "TODOS",
  estadoComercial: "TODOS",
  desde: "",
  hasta: "",
};

export const TIPOS_DOCUMENTO: TipoDocumento[] = [
  "Factura",
  "Boleta de Venta",
  "Guía de Remisión",
  "Nota de Crédito",
  "Nota de Débito",
  "Comprobante de Retención",
];

export const ESTADOS_SUNAT: EstadoSunat[] = ["Aprobado", "Pendiente", "Anulado"];
export const ESTADOS_COMERCIALES: EstadoComercial[] = ["Pagado", "Pendiente", "Vencido"];

interface Props {
  filtros: FiltrosState;
  onCambiar: (parcial: Partial<FiltrosState>) => void;
  onLimpiar: () => void;
  resultados: number;
  total: number;
  cargando?: boolean;
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </span>
  );
}

const CLASES_CONTROL =
  "w-full rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/25 dark:disabled:opacity-50";

function Selector({
  etiqueta,
  valor,
  onChange,
  opciones,
  deshabilitado,
  textoInicial,
}: {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  opciones: string[];
  deshabilitado?: boolean;
  textoInicial: string;
}) {
  return (
    <div className="min-w-0">
      <Etiqueta>{etiqueta}</Etiqueta>
      <div className="relative">
        <select
          value={valor}
          disabled={deshabilitado}
          onChange={(evento) => onChange(evento.target.value)}
          className={cn(CLASES_CONTROL, "appearance-none py-2.5 pl-3 pr-9")}
        >
          <option value="TODOS">{textoInicial}</option>
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      </div>
    </div>
  );
}

export function FiltersPanel({
  filtros,
  onCambiar,
  onLimpiar,
  resultados,
  total,
  cargando = false,
}: Props) {
  const hayFiltros =
    filtros.q !== "" ||
    filtros.tipo !== "TODOS" ||
    filtros.estadoSunat !== "TODOS" ||
    filtros.estadoComercial !== "TODOS" ||
    filtros.desde !== "" ||
    filtros.hasta !== "";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-600/10 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Filtros avanzados
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Refina la búsqueda de comprobantes de la empresa seleccionada
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cargando ? (
            <CargandoTexto mensaje="Sincronizando comprobantes…" />
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {resultados} de {total} comprobantes
            </span>
          )}
          {hayFiltros && (
            <button
              type="button"
              onClick={onLimpiar}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* Búsqueda */}
        <div className="md:col-span-2 xl:col-span-4">
          <Etiqueta>Buscar por N° documento, cliente o RUC</Etiqueta>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={filtros.q}
              disabled={cargando}
              onChange={(evento) => onCambiar({ q: evento.target.value })}
              placeholder="Ej. F001-0004521, MINERA LOS ANDES, 20536489123"
              className={cn(
                CLASES_CONTROL,
                "py-2.5 pl-9 pr-9 placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-600",
              )}
            />
            {filtros.q !== "" && !cargando && (
              <button
                type="button"
                onClick={() => onCambiar({ q: "" })}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="xl:col-span-3">
          <Selector
            etiqueta="Tipo de documento"
            valor={filtros.tipo}
            onChange={(valor) => onCambiar({ tipo: valor as FiltrosState["tipo"] })}
            opciones={TIPOS_DOCUMENTO}
            textoInicial="Todos los documentos"
            deshabilitado={cargando}
          />
        </div>

        <div className="xl:col-span-2">
          <Selector
            etiqueta="Estado SUNAT"
            valor={filtros.estadoSunat}
            onChange={(valor) => onCambiar({ estadoSunat: valor as FiltrosState["estadoSunat"] })}
            opciones={ESTADOS_SUNAT}
            textoInicial="Todos"
            deshabilitado={cargando}
          />
        </div>

        <div className="xl:col-span-3">
          <Selector
            etiqueta="Estado de pago"
            valor={filtros.estadoComercial}
            onChange={(valor) =>
              onCambiar({ estadoComercial: valor as FiltrosState["estadoComercial"] })
            }
            opciones={ESTADOS_COMERCIALES}
            textoInicial="Todos"
            deshabilitado={cargando}
          />
        </div>

        {/* Rango de fechas */}
        <div className="md:col-span-2 xl:col-span-12">
          <Etiqueta>Rango de emisión</Etiqueta>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <CalendarRange className="hidden h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 sm:block" />
              <input
                type="date"
                value={filtros.desde}
                disabled={cargando}
                onChange={(evento) => onCambiar({ desde: evento.target.value })}
                className={cn(CLASES_CONTROL, "px-3 py-2.5 flex-1")}
                aria-label="Fecha desde"
              />
              <span className="hidden text-sm text-slate-400 dark:text-slate-500 sm:inline">al</span>
              <input
                type="date"
                value={filtros.hasta}
                disabled={cargando}
                onChange={(evento) => onCambiar({ hasta: evento.target.value })}
                className={cn(CLASES_CONTROL, "px-3 py-2.5 flex-1")}
                aria-label="Fecha hasta"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <AtajoFecha
                etiqueta="Últimos 7 días"
                deshabilitado={cargando}
                onAplicar={() => onCambiar({ desde: "2026-09-19", hasta: "2026-09-26" })}
              />
              <AtajoFecha
                etiqueta="Setiembre"
                deshabilitado={cargando}
                onAplicar={() => onCambiar({ desde: "2026-09-01", hasta: "2026-09-30" })}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AtajoFecha({
  etiqueta,
  onAplicar,
  deshabilitado,
}: {
  etiqueta: string;
  onAplicar: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onAplicar}
      disabled={deshabilitado}
      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
    >
      {etiqueta}
    </button>
  );
}

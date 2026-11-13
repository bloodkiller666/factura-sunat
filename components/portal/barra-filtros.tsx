"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Campo, CampoBusqueda, Seleccion } from "@/components/ui/campos";
import { SelectorFechas } from "@/components/ui/selector-fechas";
import { describirRango, type RangoVisible } from "@/lib/calendario";
import { MINIMO_BUSQUEDA, hayFiltrosActivos } from "@/lib/filtros";
import type { FiltrosState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  filtros: FiltrosState;
  onCambiar: (parcial: Partial<FiltrosState>) => void;
  onLimpiar: () => void;
  /** Fechas que muestra la tabla: el botón de emisión las dice en vez de «Todas las fechas». */
  fechasVisibles?: RangoVisible | null;
}

const ETIQUETA_RESPALDO: Record<FiltrosState["respaldo"], string> = {
  TODOS: "",
  SIN_XML: "Sin XML",
  SIN_CDR: "Sin CDR",
  COMPLETO: "Con XML y CDR",
  SOLO_XML: "Solo XML",
  SOLO_PDF: "Solo PDF",
  XML_PDF: "XML y PDF",
  NINGUNO: "Sin XML ni PDF",
};

const ETIQUETA_CORREO: Record<FiltrosState["correo"], string> = {
  TODOS: "",
  ENVIADO: "Enviado",
  NO_ENVIADO: "No enviado",
};

interface Chip {
  clave: string;
  texto: string;
  /** Lo que se restablece al quitar el chip. */
  quitar: Partial<FiltrosState>;
}

function chipsActivos(filtros: FiltrosState): Chip[] {
  const chips: Chip[] = [];
  if (filtros.q.trim()) {
    chips.push({ clave: "q", texto: `“${filtros.q.trim()}”`, quitar: { q: "" } });
  }
  if (filtros.desde || filtros.hasta) {
    chips.push({
      clave: "fechas",
      texto: describirRango(filtros.desde, filtros.hasta),
      quitar: { desde: "", hasta: "" },
    });
  }
  if (filtros.venceDesde || filtros.venceHasta) {
    chips.push({
      clave: "vence",
      texto: `Vence: ${describirRango(filtros.venceDesde, filtros.venceHasta)}`,
      quitar: { venceDesde: "", venceHasta: "" },
    });
  }
  if (filtros.tipo !== "TODOS") {
    chips.push({ clave: "tipo", texto: filtros.tipo, quitar: { tipo: "TODOS" } });
  }
  if (filtros.estadoSunat !== "TODOS") {
    chips.push({
      clave: "estadoSunat",
      texto: filtros.estadoSunat,
      quitar: { estadoSunat: "TODOS" },
    });
  }
  if (filtros.respaldo !== "TODOS") {
    chips.push({
      clave: "respaldo",
      texto: ETIQUETA_RESPALDO[filtros.respaldo],
      quitar: { respaldo: "TODOS" },
    });
  }
  if (filtros.correo !== "TODOS") {
    chips.push({
      clave: "correo",
      texto: ETIQUETA_CORREO[filtros.correo],
      quitar: { correo: "TODOS" },
    });
  }
  if (filtros.moneda !== "TODOS") {
    chips.push({
      clave: "moneda",
      texto: filtros.moneda === "PEN" ? "Soles" : "Dólares",
      quitar: { moneda: "TODOS" },
    });
  }
  if (filtros.numeroSap.trim()) {
    chips.push({
      clave: "numeroSap",
      texto: `N° de SAP ${filtros.numeroSap.trim()}`,
      quitar: { numeroSap: "" },
    });
  }
  return chips;
}

/** Resalta un filtro que ya no está en su valor por defecto: se ve de un vistazo cuáles están activos. */
const ACTIVO = "border-accent! bg-accent-soft/50!";

export function BarraFiltros({ filtros, onCambiar, onLimpiar, fechasVisibles = null }: Props) {
  const chips = chipsActivos(filtros);
  const busquedaCorta = filtros.q.trim().length > 0 && filtros.q.trim().length < MINIMO_BUSQUEDA;
  const compras = filtros.origen === "recibido";
  // En el móvil los filtros secundarios se pliegan: lo primero que se ve es la tabla, no ocho controles.
  const [abierto, setAbierto] = useState(false);
  const plegable = abierto ? "" : "max-md:hidden";

  return (
    <section
      aria-label="Filtros"
      className="space-y-3 rounded-xl border border-line bg-surface p-3 shadow-card"
    >
      {/* Una sola rejilla: búsqueda y fechas arriba, el resto de filtros debajo, alineados a las mismas columnas. */}
      <div
        className={cn(
          "grid grid-cols-2 gap-2 lg:grid-cols-3",
          compras ? "xl:grid-cols-6" : "xl:grid-cols-4",
        )}
      >
        <div className="col-span-2 flex gap-2 lg:col-span-3 xl:col-span-2">
          <div className="min-w-0 flex-1">
            <CampoBusqueda
              value={filtros.q}
              onChange={(e) => onCambiar({ q: e.target.value })}
              placeholder={
                compras ? "Buscar por N°, proveedor o RUC" : "Buscar por N°, cliente o RUC"
              }
              aria-label="Buscar comprobantes"
              aria-describedby={busquedaCorta ? "ayuda-busqueda" : undefined}
              className={cn(filtros.q.trim() && ACTIVO)}
            />
          </div>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium text-fg-2 shadow-sm hover:border-fg-4 pointer-coarse:h-11 md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Filtros
            {chips.length > 0 && (
              <span className="tnum rounded-full bg-accent px-1.5 text-[12px] leading-5 font-semibold text-white">
                {chips.length}
              </span>
            )}
            <ChevronDown
              className={cn("h-4 w-4 text-fg-4 transition-transform", abierto && "rotate-180")}
              aria-hidden
            />
          </button>
        </div>
        <SelectorFechas
          desde={filtros.desde}
          hasta={filtros.hasta}
          onChange={(rango) => onCambiar(rango)}
          rangoVisible={fechasVisibles}
          className={cn(
            "col-span-2 w-full lg:col-span-1",
            compras ? "xl:col-span-2" : "xl:col-span-1",
            plegable,
          )}
        />
        <SelectorFechas
          modo="vencimiento"
          desde={filtros.venceDesde}
          hasta={filtros.venceHasta}
          onChange={(rango) => onCambiar({ venceDesde: rango.desde, venceHasta: rango.hasta })}
          className={cn(
            "col-span-2 w-full lg:col-span-1",
            compras ? "xl:col-span-2" : "xl:col-span-1",
            plegable,
          )}
        />
        <div className={plegable}>
          <Seleccion
            aria-label="Tipo de documento"
            value={filtros.tipo}
            onChange={(e) => onCambiar({ tipo: e.target.value as FiltrosState["tipo"] })}
            className={cn(filtros.tipo !== "TODOS" && ACTIVO)}
          >
            <option value="TODOS">Todos los tipos</option>
            <option value="Factura">Facturas</option>
            <option value="Boleta de Venta">Boletas</option>
            <option value="Nota de Crédito">Notas de crédito</option>
            <option value="Nota de Débito">Notas de débito</option>
          </Seleccion>
        </div>
        <div className={plegable}>
          <Seleccion
            aria-label="Estado SUNAT"
            value={filtros.estadoSunat}
            onChange={(e) => onCambiar({ estadoSunat: e.target.value as FiltrosState["estadoSunat"] })}
            className={cn(filtros.estadoSunat !== "TODOS" && ACTIVO)}
          >
            <option value="TODOS">Estado SUNAT: todos</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Rechazado">Rechazado</option>
            <option value="Anulado">Anulado</option>
          </Seleccion>
        </div>
        {compras && (
          <div className={plegable}>
            <Seleccion
              aria-label="Estado correo"
              value={filtros.correo}
              onChange={(e) => onCambiar({ correo: e.target.value as FiltrosState["correo"] })}
              className={cn(filtros.correo !== "TODOS" && ACTIVO)}
            >
              <option value="TODOS">Estado correo: todos</option>
              <option value="ENVIADO">Enviado</option>
              <option value="NO_ENVIADO">No enviado</option>
            </Seleccion>
          </div>
        )}
        {compras && (
          <div className={plegable}>
            <Seleccion
              aria-label="Respaldo"
              value={filtros.respaldo}
              onChange={(e) => onCambiar({ respaldo: e.target.value as FiltrosState["respaldo"] })}
              className={cn(filtros.respaldo !== "TODOS" && ACTIVO)}
            >
              <option value="TODOS">Respaldo: todos</option>
              <option value="XML_PDF">XML y PDF</option>
              <option value="SOLO_XML">Solo XML</option>
              <option value="SOLO_PDF">Solo PDF</option>
              <option value="NINGUNO">Sin XML ni PDF</option>
            </Seleccion>
          </div>
        )}
        <div className={plegable}>
          <Seleccion
            aria-label="Moneda"
            value={filtros.moneda}
            onChange={(e) => onCambiar({ moneda: e.target.value as FiltrosState["moneda"] })}
            className={cn(filtros.moneda !== "TODOS" && ACTIVO)}
          >
            <option value="TODOS">Todas las monedas</option>
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dólares (US$)</option>
          </Seleccion>
        </div>
        <div className={plegable}>
          <Campo
            value={filtros.numeroSap}
            onChange={(e) => onCambiar({ numeroSap: e.target.value })}
            placeholder="N° de SAP"
            aria-label="Filtrar por N° de SAP"
            className={cn(filtros.numeroSap.trim() && ACTIVO)}
          />
        </div>
      </div>

      {busquedaCorta && (
        <p id="ayuda-busqueda" className="text-[12px] text-fg-3">
          Escribe al menos {MINIMO_BUSQUEDA} caracteres para buscar.
        </p>
      )}

      {hayFiltrosActivos(filtros) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-[12px] text-fg-3">Filtros:</span>
          {chips.map((chip) => (
            <button
              key={chip.clave}
              type="button"
              onClick={() => onCambiar(chip.quitar)}
              className="group inline-flex items-center gap-1 rounded-full border border-accent-line bg-accent-soft py-0.5 pr-1.5 pl-2.5 text-[12px] font-medium text-accent transition-colors hover:brightness-95"
              aria-label={`Quitar filtro ${chip.texto}`}
            >
              {chip.texto}
              <X className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={onLimpiar}
            className="ml-1 text-[12px] font-medium text-fg-3 hover:text-fg hover:underline"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </section>
  );
}

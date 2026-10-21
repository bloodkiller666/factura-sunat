"use client";

import { X } from "lucide-react";
import { Campo, CampoBusqueda, Seleccion } from "@/components/ui/campos";
import { SelectorFechas } from "@/components/ui/selector-fechas";
import { describirRango } from "@/lib/calendario";
import { MINIMO_BUSQUEDA, hayFiltrosActivos } from "@/lib/filtros";
import type { FiltrosState } from "@/lib/types";

interface Props {
  filtros: FiltrosState;
  onCambiar: (parcial: Partial<FiltrosState>) => void;
  onLimpiar: () => void;
}

const ETIQUETA_RESPALDO: Record<FiltrosState["respaldo"], string> = {
  TODOS: "",
  SIN_XML: "Sin XML",
  SIN_CDR: "Sin CDR",
  COMPLETO: "Con XML y CDR",
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

export function BarraFiltros({ filtros, onCambiar, onLimpiar }: Props) {
  const chips = chipsActivos(filtros);
  const busquedaCorta = filtros.q.trim().length > 0 && filtros.q.trim().length < MINIMO_BUSQUEDA;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1 basis-[260px]">
          <CampoBusqueda
            value={filtros.q}
            onChange={(e) => onCambiar({ q: e.target.value })}
            placeholder={
              filtros.origen === "recibido"
                ? "Buscar por N°, proveedor o RUC"
                : "Buscar por N°, cliente o RUC"
            }
            aria-label="Buscar comprobantes"
            aria-describedby={busquedaCorta ? "ayuda-busqueda" : undefined}
          />
        </div>
        <SelectorFechas
          desde={filtros.desde}
          hasta={filtros.hasta}
          onChange={(rango) => onCambiar(rango)}
          className="w-full sm:w-[190px]"
        />
        <SelectorFechas
          modo="vencimiento"
          desde={filtros.venceDesde}
          hasta={filtros.venceHasta}
          onChange={(rango) => onCambiar({ venceDesde: rango.desde, venceHasta: rango.hasta })}
          className="w-full sm:w-[190px]"
        />
        <div className="w-[148px]">
          <Seleccion
            aria-label="Tipo de documento"
            value={filtros.tipo}
            onChange={(e) => onCambiar({ tipo: e.target.value as FiltrosState["tipo"] })}
          >
            <option value="TODOS">Todos los tipos</option>
            <option value="Factura">Facturas</option>
            <option value="Boleta de Venta">Boletas</option>
            <option value="Nota de Crédito">Notas de crédito</option>
            <option value="Nota de Débito">Notas de débito</option>
          </Seleccion>
        </div>
        <div className="w-[156px]">
          <Seleccion
            aria-label="Estado SUNAT"
            value={filtros.estadoSunat}
            onChange={(e) => onCambiar({ estadoSunat: e.target.value as FiltrosState["estadoSunat"] })}
          >
            <option value="TODOS">Estado SUNAT: todos</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Rechazado">Rechazado</option>
            <option value="Anulado">Anulado</option>
          </Seleccion>
        </div>
        <div className="w-[132px]">
          <Seleccion
            aria-label="Moneda"
            value={filtros.moneda}
            onChange={(e) => onCambiar({ moneda: e.target.value as FiltrosState["moneda"] })}
          >
            <option value="TODOS">Todas las monedas</option>
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dólares (US$)</option>
          </Seleccion>
        </div>
        <div className="w-[132px]">
          <Campo
            value={filtros.numeroSap}
            onChange={(e) => onCambiar({ numeroSap: e.target.value })}
            placeholder="N° de SAP"
            aria-label="Filtrar por N° de SAP"
          />
        </div>
      </div>

      {busquedaCorta && (
        <p id="ayuda-busqueda" className="text-[12px] text-fg-3">
          Escribe al menos {MINIMO_BUSQUEDA} caracteres para buscar.
        </p>
      )}

      {hayFiltrosActivos(filtros) && (
        <div className="flex flex-wrap items-center gap-2">
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
    </div>
  );
}

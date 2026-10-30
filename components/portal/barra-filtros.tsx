"use client";

import { X } from "lucide-react";
import { Campo, CampoBusqueda, Seleccion } from "@/components/ui/campos";
import { SelectorFechas } from "@/components/ui/selector-fechas";
import { describirRango, type RangoVisible } from "@/lib/calendario";
import { MINIMO_BUSQUEDA, hayFiltrosActivos } from "@/lib/filtros";
import type { FiltrosState } from "@/lib/types";

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

export function BarraFiltros({ filtros, onCambiar, onLimpiar, fechasVisibles = null }: Props) {
  const chips = chipsActivos(filtros);
  const busquedaCorta = filtros.q.trim().length > 0 && filtros.q.trim().length < MINIMO_BUSQUEDA;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-12">
        <div className="sm:col-span-2 xl:col-span-4">
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
          rangoVisible={fechasVisibles}
          className="w-full xl:col-span-2"
        />
        <SelectorFechas
          modo="vencimiento"
          desde={filtros.venceDesde}
          hasta={filtros.venceHasta}
          onChange={(rango) => onCambiar({ venceDesde: rango.desde, venceHasta: rango.hasta })}
          className="w-full xl:col-span-2"
        />
        <div className="xl:col-span-2">
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
        <div className="xl:col-span-2">
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
        {filtros.origen === "recibido" && (
          <div className="xl:col-span-2">
            <Seleccion
              aria-label="Estado correo"
              value={filtros.correo}
              onChange={(e) => onCambiar({ correo: e.target.value as FiltrosState["correo"] })}
            >
              <option value="TODOS">Estado correo: todos</option>
              <option value="ENVIADO">Enviado</option>
              <option value="NO_ENVIADO">No enviado</option>
            </Seleccion>
          </div>
        )}
        {filtros.origen === "recibido" && (
          <div className="xl:col-span-2">
            <Seleccion
              aria-label="Respaldo"
              value={filtros.respaldo}
              onChange={(e) => onCambiar({ respaldo: e.target.value as FiltrosState["respaldo"] })}
            >
              <option value="TODOS">Respaldo: todos</option>
              <option value="XML_PDF">XML y PDF</option>
              <option value="SOLO_XML">Solo XML</option>
              <option value="SOLO_PDF">Solo PDF</option>
              <option value="NINGUNO">Sin XML ni PDF</option>
            </Seleccion>
          </div>
        )}
        <div className="xl:col-span-2">
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
        <div className="xl:col-span-2">
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

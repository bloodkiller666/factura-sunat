"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Campo, CampoBusqueda, Grupo, Seleccion } from "@/components/ui/campos";
import { TODOS_LOS_PERIODOS, etiquetaPeriodo, formatearFecha } from "@/lib/format";
import { FILTROS_INICIALES, hayFiltrosActivos } from "@/lib/filtros";
import type { FiltrosState } from "@/lib/types";

interface Props {
  filtros: FiltrosState;
  onCambiar: (parcial: Partial<FiltrosState>) => void;
  onLimpiar: () => void;
  periodos: string[];
  /** Si el periodo se pide al servidor, el selector no depende de lo cargado. */
  deshabilitado?: boolean;
}

const ETIQUETA_RESPALDO: Record<FiltrosState["respaldo"], string> = {
  TODOS: "",
  SIN_XML: "Sin XML",
  SIN_CDR: "Sin CDR",
  COMPLETO: "Con XML y CDR",
};

interface Chip {
  clave: keyof FiltrosState;
  texto: string;
}

function chipsActivos(filtros: FiltrosState): Chip[] {
  const chips: Chip[] = [];
  if (filtros.q.trim()) chips.push({ clave: "q", texto: `“${filtros.q.trim()}”` });
  if (filtros.mes !== TODOS_LOS_PERIODOS) {
    chips.push({ clave: "mes", texto: etiquetaPeriodo(filtros.mes) });
  }
  if (filtros.tipo !== "TODOS") chips.push({ clave: "tipo", texto: filtros.tipo });
  if (filtros.estadoSunat !== "TODOS") {
    chips.push({ clave: "estadoSunat", texto: filtros.estadoSunat });
  }
  if (filtros.respaldo !== "TODOS") {
    chips.push({ clave: "respaldo", texto: ETIQUETA_RESPALDO[filtros.respaldo] });
  }
  if (filtros.numeroSap.trim()) {
    chips.push({ clave: "numeroSap", texto: `SAP ${filtros.numeroSap.trim()}` });
  }
  if (filtros.checkSap !== "TODOS") {
    chips.push({
      clave: "checkSap",
      texto: filtros.checkSap === "CON" ? "Con Check SAP" : "Sin Check SAP",
    });
  }
  if (filtros.desde) chips.push({ clave: "desde", texto: `Desde ${formatearFecha(filtros.desde)}` });
  if (filtros.hasta) chips.push({ clave: "hasta", texto: `Hasta ${formatearFecha(filtros.hasta)}` });
  return chips;
}

export function BarraFiltros({ filtros, onCambiar, onLimpiar, periodos, deshabilitado }: Props) {
  const [masAbierto, setMasAbierto] = useState(false);
  const chips = chipsActivos(filtros);
  const extrasActivos = [
    filtros.numeroSap.trim(),
    filtros.checkSap !== "TODOS",
    filtros.desde,
    filtros.hasta,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1 basis-[260px]">
          <CampoBusqueda
            value={filtros.q}
            onChange={(e) => onCambiar({ q: e.target.value })}
            placeholder="Buscar por N°, cliente, RUC u orden de compra"
            aria-label="Buscar comprobantes"
          />
        </div>
        <div className="w-[168px]">
          <Seleccion
            aria-label="Periodo"
            value={filtros.mes}
            disabled={deshabilitado}
            onChange={(e) => onCambiar({ mes: e.target.value })}
          >
            <option value={TODOS_LOS_PERIODOS}>Todos los periodos</option>
            {periodos.map((periodo) => (
              <option key={periodo} value={periodo}>
                {etiquetaPeriodo(periodo)}
              </option>
            ))}
          </Seleccion>
        </div>
        <div className="w-[160px]">
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
        <div className="w-[148px]">
          <Seleccion
            aria-label="Estado SUNAT"
            value={filtros.estadoSunat}
            onChange={(e) => onCambiar({ estadoSunat: e.target.value as FiltrosState["estadoSunat"] })}
          >
            <option value="TODOS">Todo estado</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Rechazado">Rechazado</option>
            <option value="Anulado">Anulado</option>
          </Seleccion>
        </div>
        <div className="w-[168px]">
          <Seleccion
            aria-label="Respaldo"
            value={filtros.respaldo}
            onChange={(e) => onCambiar({ respaldo: e.target.value as FiltrosState["respaldo"] })}
          >
            <option value="TODOS">Todo respaldo</option>
            <option value="SIN_XML">Sin XML</option>
            <option value="SIN_CDR">Sin CDR</option>
            <option value="COMPLETO">Con XML y CDR</option>
          </Seleccion>
        </div>
        <Boton
          icono={SlidersHorizontal}
          onClick={() => setMasAbierto((previo) => !previo)}
          aria-expanded={masAbierto}
        >
          Más filtros
          {extrasActivos > 0 && (
            <span className="ml-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
              {extrasActivos}
            </span>
          )}
        </Boton>
      </div>

      {masAbierto && (
        <div className="grid gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <Grupo etiqueta="N° SAP">
            <Campo
              value={filtros.numeroSap}
              onChange={(e) => onCambiar({ numeroSap: e.target.value })}
              placeholder="Ej. 4500926001"
            />
          </Grupo>
          <Grupo etiqueta="Check SAP">
            <Seleccion
              value={filtros.checkSap}
              onChange={(e) => onCambiar({ checkSap: e.target.value as FiltrosState["checkSap"] })}
            >
              <option value="TODOS">Todos</option>
              <option value="CON">Marcados</option>
              <option value="SIN">Sin marcar</option>
            </Seleccion>
          </Grupo>
          <Grupo etiqueta="Emitidos desde">
            <Campo
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => onCambiar({ desde: e.target.value })}
            />
          </Grupo>
          <Grupo etiqueta="Emitidos hasta">
            <Campo
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => onCambiar({ hasta: e.target.value })}
            />
          </Grupo>
        </div>
      )}

      {hayFiltrosActivos(filtros) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-fg-3">Filtros:</span>
          {chips.map((chip) => (
            <button
              key={chip.clave}
              type="button"
              onClick={() => onCambiar({ [chip.clave]: FILTROS_INICIALES[chip.clave] })}
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

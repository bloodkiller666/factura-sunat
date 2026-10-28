"use client";

import { AlertTriangle } from "lucide-react";
import { BarraFiltros } from "@/components/portal/barra-filtros";
import { EncabezadoComprobantes } from "@/components/portal/encabezado-comprobantes";
import { Indicadores } from "@/components/portal/indicadores";
import { TablaComprobantes } from "@/components/portal/tabla-comprobantes";
import type { EstadoPortal } from "@/components/portal/use-portal";
import { Boton } from "@/components/ui/boton";

interface Props {
  p: EstadoPortal;
  /** `true` en la sección Compras; `false` en Ventas. */
  compras: boolean;
  onRespaldos: () => void;
  onImportar: () => void;
  onSap: () => void;
  onSire: () => void;
}

/** Sección Ventas o Compras: encabezado, aviso de error, indicadores, filtros y tabla. */
export function VistaComprobantes({ p, compras, onRespaldos, onImportar, onSap, onSire }: Props) {
  const mensajeError = p.errorEmpresas ?? p.errorCarga ?? p.errorResumen;

  return (
    <>
      <EncabezadoComprobantes
        empresa={p.empresa}
        compras={compras}
        puedeOperar={p.puedeOperar}
        actualizando={p.actualizando}
        sincronizando={p.sincronizando}
        exportando={p.exportando}
        guardandoPc={p.guardandoPc}
        descargaMasiva={p.descargaMasiva}
        onDescargarTodo={() => void p.descargarTodo()}
        onCancelarDescargaTodo={p.cancelarDescargaTodo}
        seleccionados={p.seleccion.length}
        total={p.total}
        onRespaldos={onRespaldos}
        onConsultarPendientes={() => void p.sincronizarPendientes()}
        onImportar={onImportar}
        onSap={onSap}
        onSire={onSire}
        onExportarExcel={() => void p.exportarExcel()}
        onLote={() => void p.generarLote()}
        onGuardarEnPc={() => void p.guardarEnPc(p.seleccion)}
      />

      {mensajeError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-[13px] text-warn"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{mensajeError}</span>
          {(p.errorCarga || p.errorResumen) && (
            <Boton tamano="sm" onClick={p.recargar}>
              Reintentar
            </Boton>
          )}
        </div>
      )}

      <Indicadores
        metricas={p.metricas}
        actualizando={p.actualizandoResumen}
        cargando={false}
        onFiltrarEstado={p.filtrarPorEstado}
        onFiltrarRespaldo={p.filtrarPorRespaldo}
        conRespaldo={!compras}
      />

      <BarraFiltros filtros={p.filtros} onCambiar={p.cambiarFiltros} onLimpiar={p.limpiarFiltros} />

      <TablaComprobantes
        comprobantes={p.comprobantes}
        total={p.total}
        pagina={p.pagina}
        tamano={p.tamano}
        hayMas={p.hayMas}
        orden={p.orden}
        cargando={p.cargando}
        actualizando={p.actualizando}
        hayFiltros={p.hayFiltros}
        contraparte={compras ? "Proveedor" : "Cliente"}
        seleccionados={p.seleccionados}
        consultando={p.consultando}
        puedeOperar={p.puedeOperar}
        onOrden={p.ordenarPor}
        onPagina={p.irAPagina}
        onTamano={p.cambiarTamano}
        onAlternar={p.alternarSeleccion}
        onAlternarVisibles={p.seleccionarVisibles}
        onLimpiarSeleccion={p.limpiarSeleccion}
        onAbrir={(c) => void p.abrirDetalle(c)}
        onDescargar={(c, tipo) => void p.descargar(c, tipo)}
        onConsultarEstado={(c) => void p.consultarEstado(c)}
        onExportarExcel={() => void p.exportarExcel()}
        onLote={() => void p.generarLote()}
        onLimpiarFiltros={p.limpiarFiltros}
        generandoLote={p.generandoLote}
      />
    </>
  );
}

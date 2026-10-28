"use client";

import { DetalleComprobante } from "@/components/portal/detalle-comprobante";
import { DialogoImportar, type PestanaImportar } from "@/components/portal/dialogo-importar";
import { DialogoRespaldos } from "@/components/portal/dialogo-respaldos";
import { DialogoSap } from "@/components/portal/dialogo-sap";
import { DialogoSire } from "@/components/portal/dialogo-sire";
import type { EstadoPortal } from "@/components/portal/use-portal";

export interface EstadoImportar {
  abierto: boolean;
  pestana: PestanaImportar;
}

interface Props {
  p: EstadoPortal;
  token: string;
  ruc: string | null;
  compras: boolean;
  /** Si la vista activa es Evidencias SIRE: tras sincronizar se recarga su lista. */
  enEvidencias: boolean;
  sireAbierto: boolean;
  onSire: (abierto: boolean) => void;
  respaldosAbierto: boolean;
  onRespaldos: (abierto: boolean) => void;
  sapAbierto: boolean;
  onSap: (abierto: boolean) => void;
  importar: EstadoImportar;
  onImportar: (cambio: (previo: EstadoImportar) => EstadoImportar) => void;
  onAbrirImportar: (pestana: PestanaImportar) => void;
}

/** El detalle del comprobante y los diálogos de sincronización e importación. */
export function DialogosPortal({
  p,
  token,
  ruc,
  compras,
  enEvidencias,
  sireAbierto,
  onSire,
  respaldosAbierto,
  onRespaldos,
  sapAbierto,
  onSap,
  importar,
  onImportar,
  onAbrirImportar,
}: Props) {
  return (
    <>
      <DetalleComprobante
        comprobante={p.detalle}
        empresa={p.empresa}
        cargandoDetalle={p.cargandoDetalle}
        puedeOperar={p.puedeOperar}
        descargando={p.descargando}
        consultando={p.detalle ? p.consultando.has(p.detalle.id) : false}
        onCerrar={p.cerrarDetalle}
        onDescargar={(c, tipo) => void p.descargar(c, tipo)}
        onConsultarCdr={(c) => void p.consultarCdr(c)}
        onImportarXml={(archivo) => void p.importarXmlDeComprobante(archivo)}
        onAbrirImportarCdr={() => {
          p.cerrarDetalle();
          onAbrirImportar("cdr");
        }}
        guardandoPc={p.guardandoPc}
        onGuardarEnPc={(c) => void p.guardarEnPc([c])}
        onAbrirCarpeta={(c) => void p.abrirCarpeta(c)}
        cargarArchivos={p.cargarArchivos}
      />

      <DialogoRespaldos
        abierto={respaldosAbierto}
        token={token}
        ruc={ruc}
        filtros={p.filtros}
        onCerrar={() => onRespaldos(false)}
        onRecuperado={p.recargar}
      />

      <DialogoSap
        abierto={sapAbierto}
        token={token}
        ruc={ruc}
        onCerrar={() => onSap(false)}
        onImportado={p.recargar}
      />

      <DialogoSire
        abierto={sireAbierto}
        token={token}
        ruc={ruc}
        libro={compras ? "compras" : "ventas"}
        onCerrar={() => onSire(false)}
        onTerminado={(nuevos) => {
          if (nuevos > 0) p.recargar();
          if (enEvidencias) void p.cargarEvidencias();
        }}
      />

      <DialogoImportar
        abierto={importar.abierto}
        pestana={importar.pestana}
        onPestana={(pestana) => onImportar((previo) => ({ ...previo, pestana }))}
        token={token}
        ruc={ruc}
        origen={p.filtros.origen}
        puedeOperar={p.puedeOperar}
        onCerrar={() => onImportar((previo) => ({ ...previo, abierto: false }))}
        onImportado={() => p.recargar()}
      />
    </>
  );
}

"use client";

import {
  ChevronDown,
  CloudDownload,
  Download,
  FileArchive,
  FileSearch,
  FolderDown,
  HardDriveDownload,
  Hash,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Etiqueta } from "@/components/ui/etiqueta";
import { ItemMenu, Menu, SeparadorMenu } from "@/components/ui/menu";
import { formatearEntero } from "@/lib/format";
import type { ProgresoDescargaMasiva } from "@/lib/lote";
import type { Empresa } from "@/lib/types";

interface Props {
  empresa: Empresa | null;
  compras: boolean;
  puedeOperar: boolean;
  actualizando: boolean;
  sincronizando: boolean;
  exportando: boolean;
  guardandoPc: boolean;
  /** `null` = nada en curso; `"preparando"` = trayendo la lista; si no, el avance por partes. */
  descargaMasiva: ProgresoDescargaMasiva | "preparando" | null;
  onDescargarTodo: () => void;
  onCancelarDescargaTodo: () => void;
  /** Filas marcadas en la tabla (el reporte y el lote usan la selección o, sin ella, el filtro). */
  seleccionados: number;
  total: number | null;
  onRespaldos: () => void;
  onConsultarPendientes: () => void;
  onImportar: () => void;
  onSap: () => void;
  onSire: () => void;
  onExportarExcel: () => void;
  onLote: () => void;
  onGuardarEnPc: () => void;
}

/** Título de la sección (Ventas o Compras) y sus acciones, agrupadas en menús. */
export function EncabezadoComprobantes({
  empresa,
  compras,
  puedeOperar,
  actualizando,
  sincronizando,
  exportando,
  guardandoPc,
  descargaMasiva,
  onDescargarTodo,
  onCancelarDescargaTodo,
  seleccionados,
  total,
  onRespaldos,
  onConsultarPendientes,
  onImportar,
  onSap,
  onSire,
  onExportarExcel,
  onLote,
  onGuardarEnPc,
}: Props) {
  const cuentaExportable =
    seleccionados > 0
      ? formatearEntero(seleccionados)
      : total === null
        ? undefined
        : formatearEntero(total);

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-medium text-fg-3">
          <span className="truncate">{empresa?.razonSocial ?? "Cargando empresa…"}</span>
          {empresa && !puedeOperar && <Etiqueta>Solo lectura</Etiqueta>}
          {actualizando && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 text-[12px] font-normal text-fg-4"
            >
              <Loader2 className="h-3.5 w-3.5 animate-[giro_0.8s_linear_infinite]" aria-hidden />
              Actualizando…
            </span>
          )}
        </p>
        <h1 className="mt-1 text-[28px] leading-9 font-semibold tracking-tight text-fg">
          {compras ? "Compras" : "Ventas"}
        </h1>
        <p className="mt-0.5 text-[13px] text-fg-3">
          {compras
            ? "Comprobantes que los proveedores emitieron a la empresa (SIRE)."
            : "Comprobantes que la empresa emitió a sus clientes."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {puedeOperar && !compras && (
          <Menu
            ancho={264}
            disparador={(props) => (
              <Boton icono={CloudDownload} cargando={sincronizando} {...props}>
                Respaldos
                <ChevronDown className="h-3.5 w-3.5 text-fg-4" aria-hidden />
              </Boton>
            )}
          >
            <ItemMenu icono={CloudDownload} onClick={onRespaldos}>
              Traer XML (Bizlinks)
            </ItemMenu>
            <ItemMenu icono={FileSearch} deshabilitado={sincronizando} onClick={onConsultarPendientes}>
              Consultar pendientes en SUNAT
            </ItemMenu>
          </Menu>
        )}
        {puedeOperar && (
          <Menu
            ancho={252}
            disparador={(props) => (
              <Boton icono={Upload} {...props}>
                Importar
                <ChevronDown className="h-3.5 w-3.5 text-fg-4" aria-hidden />
              </Boton>
            )}
          >
            <ItemMenu icono={Upload} onClick={onImportar}>
              Archivos XML, PDF o ZIP
            </ItemMenu>
            <ItemMenu icono={Hash} onClick={onSap}>
              N° SAP desde Excel
            </ItemMenu>
          </Menu>
        )}
        {descargaMasiva === null ? (
          <Boton
            icono={FolderDown}
            onClick={onDescargarTodo}
            title="Baja todos los XML (y PDF de las compras) en ZIP por partes, con sus carpetas AAAA/MM/RUC/SERIE-NÚMERO"
          >
            Descargar todo{cuentaExportable ? ` (${cuentaExportable})` : ""}
          </Boton>
        ) : (
          <>
            <Boton icono={FolderDown} cargando disabled>
              {descargaMasiva === "preparando"
                ? "Preparando…"
                : `Parte ${descargaMasiva.parte} de ${descargaMasiva.partes} · ${formatearEntero(descargaMasiva.hecho)}/${formatearEntero(descargaMasiva.total)}`}
            </Boton>
            <Boton icono={X} onClick={onCancelarDescargaTodo}>
              Cancelar
            </Boton>
          </>
        )}
        <Menu
          ancho={252}
          disparador={(props) => (
            <Boton icono={Download} {...props}>
              Exportar
              <ChevronDown className="h-3.5 w-3.5 text-fg-4" aria-hidden />
            </Boton>
          )}
        >
          <ItemMenu
            icono={Download}
            deshabilitado={exportando}
            onClick={onExportarExcel}
            ayuda={cuentaExportable}
          >
            Reporte Excel
          </ItemMenu>
          <ItemMenu icono={FileArchive} onClick={onLote} ayuda={cuentaExportable}>
            Lote de respaldo (ZIP)
          </ItemMenu>
          <ItemMenu
            icono={HardDriveDownload}
            deshabilitado={seleccionados === 0 || guardandoPc}
            onClick={onGuardarEnPc}
            ayuda={seleccionados > 0 ? formatearEntero(seleccionados) : undefined}
          >
            Guardar en mi PC (carpetas)
          </ItemMenu>
          <SeparadorMenu />
          <p className="px-2.5 py-1.5 text-[11.5px] leading-4 text-fg-4">
            Exporta la selección o, si no hay, todo lo filtrado. El lote incluye los XML (y
            PDF de las compras) reales con su huella SHA-256. «Guardar en mi PC» (con filas seleccionadas) los deja en
            Descargas/AAAA/MM/RUC/SERIE-NÚMERO. «Descargar todo» arma ZIP por partes con esa misma
            estructura, para llevarlos a otra PC o al celular.
          </p>
        </Menu>
        {puedeOperar && (
          <Boton variante="primario" icono={RefreshCw} onClick={onSire}>
            Sincronizar SIRE
          </Boton>
        )}
      </div>
    </div>
  );
}

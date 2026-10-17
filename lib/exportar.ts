/** Descargas del navegador y reporte Excel. Solo exporta datos reales del portal. */

import { formatearFecha } from "./format";
import type { Comprobante, Empresa } from "./types";
import { generarXlsx } from "./xlsx";

export type Emisor = Pick<Empresa, "ruc" | "razonSocial">;

export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const TIPO_ZIP = "application/zip";

/**
 * Columnas de datos del portal, en el orden en que se exportan al Excel.
 * Es la fuente única que también valida el botón «Importar Excel».
 */
export const CABECERAS_REPORTE = [
  "N° comprobante",
  "Tipo de documento",
  "RUC cliente",
  "Razón social cliente",
  "Fecha de emisión",
  "Fecha de vencimiento",
  "Descripción",
  "Base imponible",
  "IGV (18%)",
  "Total (con IGV)",
  "Estado SUNAT",
  "N° SAP",
  "Orden de compra",
  "Check SAP",
  "Forma de pago",
];

/** Una fila del reporte, en el mismo orden que `CABECERAS_REPORTE`. */
export function filaReporte(comprobante: Comprobante): (string | number)[] {
  return [
    comprobante.numero,
    comprobante.tipo,
    comprobante.cliente.ruc,
    comprobante.cliente.razonSocial,
    formatearFecha(comprobante.fechaEmision),
    formatearFecha(comprobante.fechaVencimiento),
    comprobante.cdrDescripcion ?? "",
    comprobante.baseImponible,
    comprobante.igv,
    comprobante.total,
    comprobante.estadoSunat,
    comprobante.numeroSap,
    comprobante.ordenCompra,
    comprobante.checkSap ? "Sí" : "No",
    comprobante.formaPago ?? "",
  ];
}

/**
 * Conjunto a exportar en las acciones masivas: con selección, solo lo marcado;
 * sin selección, todo lo que se ve en la tabla.
 */
export function documentosAExportar(
  seleccionados: Comprobante[],
  visibles: Comprobante[],
): Comprobante[] {
  return seleccionados.length > 0 ? seleccionados : visibles;
}

export function nombreArchivoExcel(cantidad: number, empresa: Emisor): string {
  return `reporte-comprobantes-${empresa.ruc}-${cantidad}.xlsx`;
}

export function construirReporteExcel(comprobantes: Comprobante[]): Uint8Array<ArrayBuffer> {
  return generarXlsx({
    nombre: "Comprobantes",
    cabeceras: CABECERAS_REPORTE,
    filas: comprobantes.map(filaReporte),
  });
}

/** Descarga un blob ya construido (reportes, ZIP, respuestas binarias del backend). */
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.rel = "noopener";
  enlace.style.display = "none";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // El objeto URL debe seguir vivo hasta que el navegador inicie la descarga.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function descargarExcel(comprobantes: Comprobante[], empresa: Emisor): string {
  const nombre = nombreArchivoExcel(comprobantes.length, empresa);
  descargarBlob(new Blob([construirReporteExcel(comprobantes)], { type: TIPO_XLSX }), nombre);
  return nombre;
}

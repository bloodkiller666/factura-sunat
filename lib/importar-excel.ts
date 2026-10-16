import { CABECERAS_REPORTE } from "./exportar";
import type { HojaXlsxLeida } from "./xlsx-lectura";

/**
 * Análisis de un Excel importado contra las columnas de datos del portal.
 *
 * El portal no guarda nada en el archivo: esta utilidad **valida** que la
 * estructura del Excel que sube el usuario concuerde con la tabla (columnas
 * coincidentes, faltantes y sobrantes) y explica el resultado.
 */

/* ------------------------------------------------------------------ *
 * Normalización y sinónimos de encabezados
 * ------------------------------------------------------------------ */

/** Encabezados alternativos aceptados por cada columna del portal. */
const SINONIMOS: Record<string, string[]> = {
  "N° comprobante": [
    "numero de comprobante",
    "numero comprobante",
    "nro comprobante",
    "n comprobante",
    "numero de documento",
    "nro documento",
    "numero documento",
    "comprobante",
    "serie y numero",
  ],
  "Tipo de documento": ["tipo comprobante", "tipo de comprobante", "tipo documento"],
  "RUC cliente": ["ruc", "ruc del cliente", "numero de ruc", "documento del cliente"],
  "Razón social cliente": [
    "razon social",
    "razon social del cliente",
    "nombre del cliente",
    "nombre cliente",
    "cliente",
  ],
  "Fecha de emisión": ["fecha emision", "fecha de emision", "emision", "fecha"],
  "Fecha de vencimiento": [
    "fecha vencimiento",
    "fecha de vencimiento",
    "vencimiento",
    "fecha de pago",
  ],
  Descripción: ["detalle", "concepto", "descripcion del comprobante", "glosa"],
  "Base imponible": ["base", "base gravada", "valor de venta", "subtotal", "op gravada"],
  "IGV (18%)": ["igv", "igv 18", "impuesto igv", "igv 18 %", "impuesto"],
  Total: ["importe total", "precio total", "total general", "total a pagar"],
  "Estado SUNAT": ["estado sunat", "estado del comprobante", "estado", "sunat"],
  "N° SAP": ["numero sap", "nro sap", "n sap", "sap", "documento sap"],
  "Orden de compra": [
    "orden compra",
    "n orden de compra",
    "numero de orden de compra",
    "nro orden de compra",
    "oc",
    "po",
    "orden de pedido",
    "pedido",
  ],
  "Check SAP": ["check sap", "sap check", "chequeado sap", "marcado sap", "verificado sap"],
  "Forma de pago": ["condicion de pago", "medio de pago", "forma de pago"],
};

/** Texto comparable: sin acentos, sin signos y en minúsculas. */
export function normalizarEncabezado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Índice inverso: encabezado normalizado (o sinónimo) -> columna del portal. */
const COLUMNA_POR_ENCABEZADO = (() => {
  const indice = new Map<string, string>();

  for (const columna of CABECERAS_REPORTE) {
    indice.set(normalizarEncabezado(columna), columna);
    for (const sinonimo of SINONIMOS[columna] ?? []) {
      const clave = normalizarEncabezado(sinonimo);
      if (!indice.has(clave)) indice.set(clave, columna);
    }
  }

  return indice;
})();

/* ------------------------------------------------------------------ *
 * Resultado del análisis
 * ------------------------------------------------------------------ */

export interface ColumnaCoincidente {
  /** Nombre canónico de la columna en el portal. */
  portal: string;
  /** Encabezado tal como aparece en el archivo del usuario. */
  archivo: string;
}

export interface ReporteImportacion {
  archivo: string;
  /** Fila del archivo usada como encabezado (1 = primera fila). */
  filaCabecera: number;
  /** Filas con datos, sin contar la de encabezados. */
  filasDatos: number;
  /** Columnas con nombre en el archivo. */
  columnasArchivo: number;
  totalColumnas: number;
  coincidencias: ColumnaCoincidente[];
  faltantes: string[];
  extra: string[];
  /** `true` cuando ninguna columna del portal falta en el archivo. */
  compatible: boolean;
  /** Porcentaje de columnas del portal presentes en el archivo. */
  porcentaje: number;
}

/** Estado completo de una importación, desde que se elige el archivo. */
export type EstadoImportacion =
  | { fase: "analizando"; archivo: string }
  | { fase: "listo"; archivo: string; reporte: ReporteImportacion }
  | { fase: "error"; archivo: string; mensaje: string };

/** Compara los encabezados de una fila con las columnas del portal. */
function comparar(fila: string[]): {
  coincidencias: ColumnaCoincidente[];
  faltantes: string[];
  extra: string[];
} {
  const coincidencias: ColumnaCoincidente[] = [];
  const extra: string[] = [];
  const usadas = new Set<string>();

  for (const celda of fila) {
    const encabezado = celda.trim();
    const clave = normalizarEncabezado(encabezado);
    if (clave === "") continue;

    const portal = COLUMNA_POR_ENCABEZADO.get(clave);

    // Un encabezado repetido (dos veces la misma columna) cuenta como sobrante.
    if (portal && !usadas.has(portal)) {
      usadas.add(portal);
      coincidencias.push({ portal, archivo: encabezado });
    } else {
      extra.push(encabezado);
    }
  }

  return {
    coincidencias,
    faltantes: CABECERAS_REPORTE.filter((columna) => !usadas.has(columna)),
    extra,
  };
}

/** Cuántas columnas del portal reconoce una fila (para hallar el encabezado). */
function puntaje(fila: string[]): number {
  return comparar(fila).coincidencias.length;
}

/** Filas iniciales donde se busca la cabecera (algunos reportes llevan título). */
const FILAS_EXPLORADAS = 8;

/**
 * Analiza la hoja leída: elige la fila de encabezados que más se parece a la
 * tabla del portal y devuelve el detalle de coincidencias, faltantes y sobrantes.
 */
export function analizarHoja(hoja: HojaXlsxLeida, archivo: string): ReporteImportacion {
  const filas = hoja.filas.filter((fila) => fila.some((celda) => celda.trim() !== ""));
  const limite = Math.min(filas.length, FILAS_EXPLORADAS);

  let indiceCabecera = 0;
  let mejorPuntaje = -1;

  for (let indice = 0; indice < limite; indice += 1) {
    const candidato = puntaje(filas[indice]);
    if (candidato > mejorPuntaje) {
      mejorPuntaje = candidato;
      indiceCabecera = indice;
    }
  }

  const cabeceras = filas[indiceCabecera] ?? [];
  const { coincidencias, faltantes, extra } = comparar(cabeceras);

  return {
    archivo,
    filaCabecera: indiceCabecera + 1,
    filasDatos: Math.max(0, filas.length - indiceCabecera - 1),
    columnasArchivo: cabeceras.filter((celda) => celda.trim() !== "").length,
    totalColumnas: CABECERAS_REPORTE.length,
    coincidencias,
    faltantes,
    extra,
    compatible: faltantes.length === 0 && coincidencias.length > 0,
    porcentaje: Math.round((coincidencias.length / CABECERAS_REPORTE.length) * 100),
  };
}

/** Extensiones que puede leer el importador (ZIP + OOXML). */
export const EXTENSIONES_EXCEL = [".xlsx", ".xlsm"];

/** `true` si el nombre del archivo tiene una extensión admitida. */
export function esExcelModerno(nombreArchivo: string): boolean {
  const nombre = nombreArchivo.toLowerCase();
  return EXTENSIONES_EXCEL.some((extension) => nombre.endsWith(extension));
}

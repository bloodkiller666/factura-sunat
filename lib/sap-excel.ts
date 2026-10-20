/**
 * Lectura del Excel de N° SAP que arma Contabilidad.
 *
 * El archivo solo necesita identificar el documento (serie-número, p. ej. `F001-123`) y traer
 * su N° SAP; el RUC es opcional y afina el emparejamiento. Aquí se detectan las columnas por
 * su encabezado (con sinónimos y sin importar tildes o mayúsculas) y se arman las filas que
 * recibe el servidor, que es quien las empareja con los comprobantes registrados.
 */

import type { FilaSapApi } from "./api";
import { normalizarEncabezado } from "./importar-excel";
import type { HojaXlsxLeida } from "./xlsx-lectura";

/** Encabezados de cada columna reconocida (ya normalizados al compararlos). */
const SINONIMOS = {
  sap: ["n sap", "nro sap", "numero sap", "n de sap", "sap", "documento sap", "doc sap", "nº sap"],
  documento: [
    "documento",
    "n documento",
    "nro documento",
    "numero documento",
    "numero de documento",
    "comprobante",
    "n comprobante",
    "nro comprobante",
    "numero comprobante",
    "numero de comprobante",
    "serie numero",
    "serie y numero",
    "factura",
    "doc",
    "referencia",
  ],
  serie: ["serie"],
  numero: ["numero", "nro", "n", "correlativo"],
  ruc: ["ruc", "ruc cliente", "ruc del cliente", "numero de ruc", "nro ruc", "ruc emisor"],
} as const;

type Columna = keyof typeof SINONIMOS;

/** Filas iniciales donde se busca el encabezado (algunos reportes llevan título). */
const FILAS_EXPLORADAS = 10;

export interface AnalisisSap {
  filas: FilaSapApi[];
  /** Fila del archivo usada como encabezado (1 = primera). */
  filaCabecera: number;
  /** Encabezados detectados, tal como están en el archivo. */
  columnas: { documento: string; sap: string; ruc: string | null };
}

function indiceDe(cabeceras: string[], columna: Columna): number {
  const aceptados = new Set<string>(SINONIMOS[columna].map(normalizarEncabezado));
  return cabeceras.findIndex((celda) => aceptados.has(normalizarEncabezado(celda)));
}

interface Mapa {
  sap: number;
  documento: number;
  serie: number;
  numero: number;
  ruc: number;
}

function mapear(fila: string[]): Mapa {
  return {
    sap: indiceDe(fila, "sap"),
    documento: indiceDe(fila, "documento"),
    serie: indiceDe(fila, "serie"),
    numero: indiceDe(fila, "numero"),
    ruc: indiceDe(fila, "ruc"),
  };
}

/** ¿La fila sirve de encabezado? Necesita el N° SAP y una forma de identificar el documento. */
function esCabecera(mapa: Mapa): boolean {
  return mapa.sap >= 0 && (mapa.documento >= 0 || (mapa.serie >= 0 && mapa.numero >= 0));
}

/** Excel guarda los enteros como `4500123456` o a veces `4500123456.0`: se limpia el sufijo. */
function limpiarNumero(valor: string): string {
  const texto = valor.trim();
  return /^\d+\.0+$/.test(texto) ? texto.replace(/\.0+$/, "") : texto;
}

/**
 * Convierte la hoja en filas para el servidor. Lanza un error con un mensaje listo para
 * mostrar si no encuentra las columnas necesarias.
 */
export function analizarHojaSap(hoja: HojaXlsxLeida): AnalisisSap {
  const limite = Math.min(hoja.filas.length, FILAS_EXPLORADAS);
  let indiceCabecera = -1;
  let mapa: Mapa | null = null;

  for (let i = 0; i < limite; i += 1) {
    const candidato = mapear(hoja.filas[i]);
    if (esCabecera(candidato)) {
      indiceCabecera = i;
      mapa = candidato;
      break;
    }
  }

  if (mapa === null) {
    throw new Error(
      "No encontré las columnas necesarias. El Excel debe tener el N° SAP (encabezado «N° SAP») " +
        "y el documento («Documento» o «N° comprobante», p. ej. F001-123).",
    );
  }

  const cabeceras = hoja.filas[indiceCabecera];
  const celda = (fila: string[], indice: number) => (indice >= 0 ? (fila[indice] ?? "").trim() : "");
  const filas: FilaSapApi[] = [];

  for (const fila of hoja.filas.slice(indiceCabecera + 1)) {
    const documento =
      mapa.documento >= 0
        ? celda(fila, mapa.documento)
        : `${celda(fila, mapa.serie)}-${limpiarNumero(celda(fila, mapa.numero))}`;
    const sap = limpiarNumero(celda(fila, mapa.sap));
    const ruc = limpiarNumero(celda(fila, mapa.ruc));
    // Una fila sin nada útil (renglones en blanco, totales) no se envía.
    if (!sap && (!documento || documento === "-")) continue;
    filas.push({ documento, n_sap: sap, ...(ruc ? { ruc } : {}) });
  }

  return {
    filas,
    filaCabecera: indiceCabecera + 1,
    columnas: {
      documento:
        mapa.documento >= 0
          ? cabeceras[mapa.documento]
          : `${cabeceras[mapa.serie]} + ${cabeceras[mapa.numero]}`,
      sap: cabeceras[mapa.sap],
      ruc: mapa.ruc >= 0 ? cabeceras[mapa.ruc] : null,
    },
  };
}

/** Tamaño de cada envío al servidor (el Excel completo puede tener miles de filas). */
export const FILAS_POR_ENVIO = 2000;

export function enLotes<T>(elementos: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < elementos.length; i += tamano) lotes.push(elementos.slice(i, i + tamano));
  return lotes;
}

/** Cabeceras de la plantilla descargable. */
export const CABECERAS_PLANTILLA_SAP = ["Documento", "RUC", "N° SAP"];

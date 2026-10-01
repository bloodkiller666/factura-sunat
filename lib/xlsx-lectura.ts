import { desescaparXml } from "./xml";
import { leerZip } from "./zip";

/**
 * Lector `.xlsx` mínimo y sin dependencias: descomprime el contenedor ZIP
 * (`leerZip`) y extrae el texto de la primera hoja del libro.
 *
 * No interpreta fórmulas, estilos ni formatos: devuelve cada fila como un array
 * de cadenas, que es todo lo que necesita el importador para comparar las
 * columnas del archivo con las del portal.
 */

export interface HojaXlsxLeida {
  /** Filas del archivo (incluida la de encabezados), indexadas desde 0. */
  filas: string[][];
}

/** Concadena el texto de todos los `<t>` de un fragmento (`<is>`, `<si>`…). */
function textoDeT(contenido: string): string {
  const partes = [...contenido.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(
    (coincidencia) => coincidencia[1],
  );
  return desescaparXml(partes.join(""));
}

/** Valor de una celda según su atributo `t` (shared string, inline, número…). */
function valorCelda(atributos: string, contenido: string, compartidas: string[]): string {
  const tipo = /t="([^"]+)"/.exec(atributos)?.[1] ?? "n";

  if (tipo === "inlineStr") return textoDeT(contenido);

  const bruto = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(contenido)?.[1] ?? "";

  if (tipo === "s") return compartidas[Number(bruto)] ?? "";
  if (tipo === "b") return bruto === "1" ? "Sí" : "No";

  return desescaparXml(bruto).trim();
}

/** "A1" -> 0, "C7" -> 2, "AA3" -> 26. */
function indiceColumna(referencia: string): number {
  const letras = /^[A-Z]+/.exec(referencia.toUpperCase())?.[0] ?? "A";
  let indice = 0;

  for (const letra of letras) {
    indice = indice * 26 + (letra.charCodeAt(0) - 64);
  }

  return indice - 1;
}

/** Tabla de cadenas compartidas (`xl/sharedStrings.xml`), si el libro la usa. */
function cadenasCompartidas(contenido: string | undefined): string[] {
  if (!contenido) return [];

  return [...contenido.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((coincidencia) =>
    textoDeT(coincidencia[1]),
  );
}

function filasDeHoja(contenido: string, compartidas: string[]): string[][] {
  // Las filas vacías vienen autocerradas (`<row r="9"/>`): no aportan datos y
  // romperían el emparejamiento de etiquetas, así que se descartan.
  const sinVacias = contenido.replace(/<row\b[^>]*\/>/g, "");
  const filas: string[][] = [];

  for (const fila of sinVacias.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const celdas: string[] = [];

    for (const celda of fila[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const referencia = /r="([A-Za-z]+\d+)"/.exec(celda[1])?.[1];
      // Sin referencia (raro) la celda se coloca en la siguiente posición libre.
      const indice = referencia ? indiceColumna(referencia) : celdas.length;
      celdas[indice] = valorCelda(celda[1], celda[2] ?? "", compartidas);
    }

    filas.push(Array.from(celdas, (valor) => valor ?? ""));
  }

  return filas;
}

/** Ruta de la primera hoja del libro; si no se puede determinar, la 1. */
function rutaPrimeraHoja(archivos: Map<string, Uint8Array<ArrayBuffer>>): string | undefined {
  const hojas = [...archivos.keys()].filter((nombre) => /^xl\/worksheets\/.*\.xml$/.test(nombre));

  if (hojas.length === 0) return undefined;
  return hojas.sort()[0];
}

function texto(archivos: Map<string, Uint8Array<ArrayBuffer>>, ruta: string): string | undefined {
  const contenido = archivos.get(ruta);
  return contenido ? new TextDecoder().decode(contenido) : undefined;
}

/**
 * Lee la primera hoja de un `.xlsx` / `.xlsm`. Lanza errores con mensajes
 * pensados para mostrarse tal cual en la interfaz.
 */
export async function leerHojaXlsx(datos: Uint8Array<ArrayBuffer>): Promise<HojaXlsxLeida> {
  const archivos = await leerZip(datos);
  const ruta = rutaPrimeraHoja(archivos);

  if (!ruta) {
    throw new Error("El archivo no contiene ninguna hoja de cálculo legible.");
  }

  const compartidas = cadenasCompartidas(texto(archivos, "xl/sharedStrings.xml"));
  const contenido = texto(archivos, ruta);

  if (!contenido) {
    throw new Error("No se pudo leer el contenido de la hoja de cálculo.");
  }

  const filas = filasDeHoja(contenido, compartidas);

  if (filas.length === 0) {
    throw new Error("La hoja está vacía: no se encontraron filas para analizar.");
  }

  return { filas };
}

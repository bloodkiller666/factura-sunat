/**
 * Previsualización de los archivos de una compra o venta: qué se puede mostrar y en qué orden.
 * Lógica pura, sin React (se prueba con vitest).
 */

export interface ArchivoPrevisualizable {
  id: string;
  tipo: "pdf" | "xml" | "cdr" | "zip";
  nombre: string;
}

/** Máximo de XML que se pinta como texto; más allá el navegador se traba y no es un XML de factura. */
export const MAXIMO_XML_BYTES = 2 * 1024 * 1024;

/**
 * Solo se ven PDF y XML (el CDR y los ZIP son binarios). Primero los PDF, que es lo que el
 * usuario quiere leer, y dentro de cada tipo el orden alfabético para que «siguiente/anterior»
 * sea predecible.
 */
export function archivosPrevisualizables<T extends ArchivoPrevisualizable>(archivos: T[]): T[] {
  const rango = { pdf: 0, xml: 1 } as const;
  return archivos
    .filter((a): a is T & { tipo: "pdf" | "xml" } => a.tipo === "pdf" || a.tipo === "xml")
    .sort((a, b) => rango[a.tipo] - rango[b.tipo] || a.nombre.localeCompare(b.nombre, "es"));
}

/** Índice vecino sin salirse de la lista: no da la vuelta, los botones se deshabilitan en el borde. */
export function moverIndice(actual: number, paso: 1 | -1, total: number): number {
  return Math.min(Math.max(actual + paso, 0), Math.max(total - 1, 0));
}

/**
 * Texto de un XML respetando su codificación declarada: muchos proveedores emiten en
 * ISO-8859-1 y leerlo como UTF-8 convierte las tildes y la «ñ» en «�». Sin declaración,
 * o con una que el navegador no conoce, se asume UTF-8.
 */
export function decodificarXml(bytes: ArrayBuffer): string {
  const cabecera = new TextDecoder("latin1").decode(bytes.slice(0, 200));
  const declarada = /<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i.exec(cabecera)?.[1];
  try {
    return new TextDecoder(declarada ?? "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

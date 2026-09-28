/**
 * Escritor ZIP mínimo y sin dependencias (método "store", sin compresión).
 *
 * Se usa para dos cosas: empaquetar los XML del lote descargable y construir el
 * contenedor OOXML de los reportes `.xlsx`. Al no comprimir, el formato queda
 * reducido a cabeceras + CRC32, que es fácil de auditar y no arrastra paquetes
 * de terceros. Los archivos que genera este prototipo pesan pocos KB.
 */

const FIRMA_ARCHIVO_LOCAL = 0x04034b50;
const FIRMA_DIRECTORIO_CENTRAL = 0x02014b50;
const FIRMA_FIN_DIRECTORIO = 0x06054b50;

/** Bits del campo de atributos generales: nombres codificados en UTF-8. */
const FLAG_UTF8 = 0x0800;

/** 1 de enero de 1980 en formato de fecha MS-DOS (la fecha mínima del formato). */
const FECHA_DOS_BASE = 0x0021;

const TABLA_CRC32 = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let valor = i;
    for (let bit = 0; bit < 8; bit += 1) {
      valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
    }
    tabla[i] = valor >>> 0;
  }
  return tabla;
})();

function crc32(datos: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < datos.length; i += 1) {
    crc = TABLA_CRC32[(crc ^ datos[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface EntradaZip {
  /** Ruta dentro del archivo (usa `/` para subcarpetas). */
  nombre: string;
  contenido: string | Uint8Array;
}

/**
 * Construye un archivo ZIP completo en memoria a partir de las entradas dadas.
 * Devuelve los bytes listos para envolver en un `Blob`.
 */
export function crearZip(entradas: EntradaZip[]): Uint8Array<ArrayBuffer> {
  const codificador = new TextEncoder();

  const preparadas = entradas.map((entrada) => {
    const nombre = codificador.encode(entrada.nombre);
    const datos =
      typeof entrada.contenido === "string" ? codificador.encode(entrada.contenido) : entrada.contenido;
    return { nombre, datos, crc: crc32(datos) };
  });

  const tamanoArchivos = preparadas.reduce(
    (total, entrada) => total + 30 + entrada.nombre.length + entrada.datos.length,
    0,
  );
  const tamanoCentral = preparadas.reduce(
    (total, entrada) => total + 46 + entrada.nombre.length,
    0,
  );

  const salida = new Uint8Array(tamanoArchivos + tamanoCentral + 22);
  const vista = new DataView(salida.buffer);
  const desplazamientos: number[] = [];
  let offset = 0;

  // Cabeceras locales + contenido de cada archivo
  for (const entrada of preparadas) {
    desplazamientos.push(offset);
    vista.setUint32(offset, FIRMA_ARCHIVO_LOCAL, true);
    vista.setUint16(offset + 4, 20, true); // versión necesaria para extraer
    vista.setUint16(offset + 6, FLAG_UTF8, true);
    vista.setUint16(offset + 8, 0, true); // método: store
    vista.setUint16(offset + 10, 0, true); // hora
    vista.setUint16(offset + 12, FECHA_DOS_BASE, true);
    vista.setUint32(offset + 14, entrada.crc, true);
    vista.setUint32(offset + 18, entrada.datos.length, true);
    vista.setUint32(offset + 22, entrada.datos.length, true);
    vista.setUint16(offset + 26, entrada.nombre.length, true);
    vista.setUint16(offset + 28, 0, true); // campo extra
    offset += 30;

    salida.set(entrada.nombre, offset);
    offset += entrada.nombre.length;
    salida.set(entrada.datos, offset);
    offset += entrada.datos.length;
  }

  const inicioCentral = offset;

  // Directorio central
  preparadas.forEach((entrada, indice) => {
    vista.setUint32(offset, FIRMA_DIRECTORIO_CENTRAL, true);
    vista.setUint16(offset + 4, 20, true); // versión que lo creó
    vista.setUint16(offset + 6, 20, true); // versión necesaria
    vista.setUint16(offset + 8, FLAG_UTF8, true);
    vista.setUint16(offset + 10, 0, true); // método
    vista.setUint16(offset + 12, 0, true); // hora
    vista.setUint16(offset + 14, FECHA_DOS_BASE, true);
    vista.setUint32(offset + 16, entrada.crc, true);
    vista.setUint32(offset + 20, entrada.datos.length, true);
    vista.setUint32(offset + 24, entrada.datos.length, true);
    vista.setUint16(offset + 28, entrada.nombre.length, true);
    vista.setUint16(offset + 30, 0, true); // campo extra
    vista.setUint16(offset + 32, 0, true); // comentario
    vista.setUint16(offset + 34, 0, true); // disco de inicio
    vista.setUint16(offset + 36, 0, true); // atributos internos
    vista.setUint32(offset + 38, 0, true); // atributos externos
    vista.setUint32(offset + 42, desplazamientos[indice], true);
    offset += 46;

    salida.set(entrada.nombre, offset);
    offset += entrada.nombre.length;
  });

  // Fin del directorio central
  vista.setUint32(offset, FIRMA_FIN_DIRECTORIO, true);
  vista.setUint16(offset + 4, 0, true); // número de este disco
  vista.setUint16(offset + 6, 0, true); // disco con el directorio central
  vista.setUint16(offset + 8, preparadas.length, true); // entradas en este disco
  vista.setUint16(offset + 10, preparadas.length, true); // entradas totales
  vista.setUint32(offset + 12, offset - inicioCentral, true); // tamaño del directorio
  vista.setUint32(offset + 16, inicioCentral, true); // offset del directorio
  vista.setUint16(offset + 20, 0, true); // longitud del comentario

  return salida;
}

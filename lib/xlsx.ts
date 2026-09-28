import { escaparXml, limpiarXml } from "./xml";
import { crearZip } from "./zip";

/**
 * Generador de reportes `.xlsx` reales (OOXML SpreadsheetML) sin dependencias.
 *
 * Escribe las seis partes mínimas que Excel necesita —tipos de contenido,
 * relaciones, libro, hoja y estilos— dentro de un contenedor ZIP. Usa cadenas
 * en línea (`inlineStr`) para no necesitar la tabla de cadenas compartidas.
 */

const DECLARACION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const NS_HOJA = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_RELACIONES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PAQUETE_RELACIONES = "http://schemas.openxmlformats.org/package/2006/relationships";
const NS_TIPOS = "http://schemas.openxmlformats.org/package/2006/content-types";

const TIPO_LIBRO = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
const TIPO_HOJA = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml";
const TIPO_ESTILOS = "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml";

/** Estilo 0 = normal, estilo 1 = cabecera en negrita. */
const ESTILO_CABECERA = 1;

const ANCHO_MAXIMO = 42;
const ANCHO_MINIMO = 10;

export interface HojaXlsx {
  /** Nombre de la pestaña del libro. */
  nombre: string;
  cabeceras: string[];
  filas: (string | number)[][];
}

/** 0 -> "A", 25 -> "Z", 26 -> "AA"… */
function letraColumna(indice: number): string {
  let letra = "";
  let numero = indice + 1;

  while (numero > 0) {
    const resto = (numero - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    numero = Math.floor((numero - 1) / 26);
  }

  return letra;
}

/** Excel no admite : \ / ? * [ ] ni más de 31 caracteres en el nombre de la hoja. */
function nombreHojaValido(nombre: string): string {
  const limpio = nombre.replace(/[:\\/?*[\]]/g, " ").trim();
  return (limpio || "Hoja1").slice(0, 31);
}

function celdaTexto(referencia: string, valor: string, estilo?: number): string {
  const atributoEstilo = estilo ? ` s="${estilo}"` : "";
  const texto = escaparXml(limpiarXml(valor));
  return `<c r="${referencia}"${atributoEstilo} t="inlineStr"><is><t xml:space="preserve">${texto}</t></is></c>`;
}

function celdaNumero(referencia: string, valor: number, estilo?: number): string {
  const atributoEstilo = estilo ? ` s="${estilo}"` : "";
  // `-0` y los no finitos romperían el reporte: se normalizan.
  const numero = Number.isFinite(valor) ? valor : 0;
  return `<c r="${referencia}"${atributoEstilo}><v>${numero}</v></c>`;
}

function bloqueCols(cabeceras: string[], filas: (string | number)[][]): string {
  const anchos = cabeceras.map((cabecera, indice) => {
    const largoContenido = filas.reduce((maximo, fila) => {
      const valor = fila[indice];
      if (typeof valor !== "string") return maximo;
      return Math.max(maximo, valor.length);
    }, cabecera.length);

    return Math.min(Math.max(largoContenido + 2, ANCHO_MINIMO), ANCHO_MAXIMO);
  });

  const columnas = anchos
    .map(
      (ancho, indice) =>
        `<col min="${indice + 1}" max="${indice + 1}" width="${ancho}" customWidth="1"/>`,
    )
    .join("");

  return `<cols>${columnas}</cols>`;
}

function bloqueHoja(hoja: HojaXlsx): string {
  const filaCabecera = [
    `<row r="1">`,
    ...hoja.cabeceras.map((cabecera, indice) =>
      celdaTexto(`${letraColumna(indice)}1`, cabecera, ESTILO_CABECERA),
    ),
    `</row>`,
  ].join("");

  const filasDatos = hoja.filas
    .map((fila, indiceFila) => {
      const numeroFila = indiceFila + 2;
      const celdas = hoja.cabeceras.map((_, indiceColumna) => {
        const referencia = `${letraColumna(indiceColumna)}${numeroFila}`;
        const valor = fila[indiceColumna];
        if (typeof valor === "number") return celdaNumero(referencia, valor);
        return celdaTexto(referencia, valor ?? "");
      });
      return `<row r="${numeroFila}">${celdas.join("")}</row>`;
    })
    .join("");

  return [
    DECLARACION,
    `<worksheet xmlns="${NS_HOJA}">`,
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`,
    bloqueCols(hoja.cabeceras, hoja.filas),
    `<sheetData>${filaCabecera}${filasDatos}</sheetData>`,
    `</worksheet>`,
  ].join("");
}

const PARTE_TIPOS = [
  DECLARACION,
  `<Types xmlns="${NS_TIPOS}">`,
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
  `<Default Extension="xml" ContentType="application/xml"/>`,
  `<Override PartName="/xl/workbook.xml" ContentType="${TIPO_LIBRO}"/>`,
  `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${TIPO_HOJA}"/>`,
  `<Override PartName="/xl/styles.xml" ContentType="${TIPO_ESTILOS}"/>`,
  `</Types>`,
].join("");

const PARTE_RELS = [
  DECLARACION,
  `<Relationships xmlns="${NS_PAQUETE_RELACIONES}">`,
  `<Relationship Id="rId1" Type="${NS_RELACIONES}/officeDocument" Target="xl/workbook.xml"/>`,
  `</Relationships>`,
].join("");

const PARTE_RELS_LIBRO = [
  DECLARACION,
  `<Relationships xmlns="${NS_PAQUETE_RELACIONES}">`,
  `<Relationship Id="rId1" Type="${NS_RELACIONES}/worksheet" Target="worksheets/sheet1.xml"/>`,
  `<Relationship Id="rId2" Type="${NS_RELACIONES}/styles" Target="styles.xml"/>`,
  `</Relationships>`,
].join("");

/** Fuente 0 normal y fuente 1 en negrita; los dos rellenos base son obligatorios. */
const PARTE_ESTILOS = [
  DECLARACION,
  `<styleSheet xmlns="${NS_HOJA}">`,
  `<fonts count="2">`,
  `<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>`,
  `<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/></font>`,
  `</fonts>`,
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>`,
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>`,
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`,
  `<cellXfs count="2">`,
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`,
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>`,
  `</cellXfs>`,
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`,
  `</styleSheet>`,
].join("");

function parteLibro(nombreHoja: string): string {
  return [
    DECLARACION,
    `<workbook xmlns="${NS_HOJA}" xmlns:r="${NS_RELACIONES}">`,
    `<sheets><sheet name="${escaparXml(nombreHoja)}" sheetId="1" r:id="rId1"/></sheets>`,
    `</workbook>`,
  ].join("");
}

/** Devuelve el `.xlsx` completo (contenedor ZIP) listo para descargar. */
export function generarXlsx(hoja: HojaXlsx): Uint8Array<ArrayBuffer> {
  return crearZip([
    { nombre: "[Content_Types].xml", contenido: PARTE_TIPOS },
    { nombre: "_rels/.rels", contenido: PARTE_RELS },
    { nombre: "xl/workbook.xml", contenido: parteLibro(nombreHojaValido(hoja.nombre)) },
    { nombre: "xl/_rels/workbook.xml.rels", contenido: PARTE_RELS_LIBRO },
    { nombre: "xl/styles.xml", contenido: PARTE_ESTILOS },
    { nombre: "xl/worksheets/sheet1.xml", contenido: bloqueHoja(hoja) },
  ]);
}

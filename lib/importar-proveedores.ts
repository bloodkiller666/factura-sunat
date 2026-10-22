/**
 * Importación de compras de proveedores con avance en vivo: lógica pura, sin React.
 *
 * El usuario elige una carpeta, uno o varios ZIP, o archivos sueltos (XML y PDF). Aquí se leen,
 * se reparten en GRUPOS (una carpeta = una compra con su XML, PDF y CDR) y, mientras la pantalla
 * los manda de a uno al servidor, cada archivo cambia de estado: en espera → importando →
 * resultado. Para el usuario hay cinco desenlaces: completada desde SIRE, nueva (no estaba en SIRE
 * ni en la tabla pero se registró), ya estaba, omitida (no se puede importar y no es un fallo) y
 * error.
 */

import type { ApiResultadoImportacion } from "./api";
import { leerZip } from "./zip";

/** El servidor acepta 60 archivos por llamada; se deja margen. */
export const MAX_ARCHIVOS_GRUPO = 40;
const EXTENSIONES_UTILES = new Set(["xml", "pdf"]);

export type ItemImportacion = ApiResultadoImportacion["items"][number];

export type TipoArchivo = "xml" | "pdf" | "cdr" | "otro";

export type EstadoArchivo =
  | "espera"
  | "importando"
  | "completada"
  | "nueva"
  | "ya_estaba"
  | "guardado"
  | "omitido"
  | "error";

/** Motivos por los que un archivo se deja de lado sin que sea un fallo (los define el servidor). */
const MOTIVOS_OMITIDOS = new Set([
  "conflict",
  "sin_xml",
  "guia",
  "cdr_sin_comprobante",
  "cdr_repetido",
  "xml_no_reconocido",
  "tipo_no_soportado",
  "sin_comprobante",
  "ambiguo",
  "xml_con_error",
]);

export interface EntradaImportacion {
  /** Ruta con carpetas, separadas por `/` (la de la carpeta elegida o la dentro del ZIP). */
  ruta: string;
  archivo: File;
}

export interface GrupoImportacion {
  id: string;
  etiqueta: string;
  archivos: File[];
}

export interface PreparadoImportacion {
  grupos: GrupoImportacion[];
  /** Archivos que no son XML ni PDF: no se envían. */
  ignorados: number;
}

export interface FilaImportacion {
  id: string;
  grupo: string;
  archivo: string;
  tipo: TipoArchivo;
  estado: EstadoArchivo;
  mensaje?: string;
  /** Número de la compra a la que quedó unido, si el servidor lo informó. */
  numero?: string;
}

export interface ResumenImportacion {
  total: number;
  procesados: number;
  /** Compras que SIRE ya traía y se completaron con su XML. */
  completadas: number;
  /** Compras que no estaban en SIRE ni en la tabla y se registraron con su XML. */
  nuevas: number;
  /** Compras que ya tenían su XML. */
  yaEstaban: number;
  pdfGuardados: number;
  cdrGuardados: number;
  /** Archivos que no se importaron pero no son un fallo (guías, PDF sin XML…). */
  omitidos: number;
  errores: number;
}

/* ------------------------------- Preparación ------------------------------- */

export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto < 0 ? "" : nombre.slice(punto + 1).toLowerCase();
}

function carpetaDe(ruta: string): string {
  const corte = ruta.lastIndexOf("/");
  return corte < 0 ? "" : ruta.slice(0, corte);
}

function nombreDe(ruta: string): string {
  return ruta.slice(ruta.lastIndexOf("/") + 1);
}

/** Las dos últimas carpetas (`RUC/SERIE-NÚMERO`) bastan para reconocer la compra en pantalla. */
function etiquetaDeCarpeta(carpeta: string): string {
  if (!carpeta) return "Archivos sueltos";
  return carpeta.split("/").slice(-2).join("/");
}

/**
 * Reparte las entradas en grupos por carpeta. Lo que no tiene carpeta (archivos sueltos) va junto,
 * en orden alfabético, para que el PDF quede al lado de su XML. Un grupo con más de
 * `MAX_ARCHIVOS_GRUPO` archivos se parte en varios.
 */
export function agruparEntradas(
  entradas: EntradaImportacion[],
  maximo = MAX_ARCHIVOS_GRUPO,
): PreparadoImportacion {
  const porCarpeta = new Map<string, File[]>();
  let ignorados = 0;
  for (const { ruta, archivo } of entradas) {
    if (!EXTENSIONES_UTILES.has(extensionDe(nombreDe(ruta)))) {
      ignorados += 1;
      continue;
    }
    const carpeta = carpetaDe(ruta);
    porCarpeta.set(carpeta, [...(porCarpeta.get(carpeta) ?? []), archivo]);
  }

  const grupos: GrupoImportacion[] = [];
  for (const carpeta of [...porCarpeta.keys()].sort((a, b) => a.localeCompare(b))) {
    const archivos = [...(porCarpeta.get(carpeta) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const partes = Math.ceil(archivos.length / maximo);
    for (let parte = 0; parte < partes; parte += 1) {
      grupos.push({
        id: `${carpeta}#${parte}`,
        etiqueta:
          etiquetaDeCarpeta(carpeta) + (partes > 1 ? ` (${parte + 1}/${partes})` : ""),
        archivos: archivos.slice(parte * maximo, (parte + 1) * maximo),
      });
    }
  }
  return { grupos, ignorados };
}

/** Archivos de un ZIP (solo XML y PDF), con su ruta interna. */
export async function entradasDeZip(zip: File): Promise<EntradaImportacion[]> {
  const entradas = await leerZip(new Uint8Array(await zip.arrayBuffer()));
  const resultado: EntradaImportacion[] = [];
  for (const [ruta, bytes] of entradas) {
    const limpia = ruta.replaceAll("\\", "/").replace(/^\/+/, "");
    if (!limpia || limpia.endsWith("/") || nombreDe(limpia).startsWith(".")) continue;
    if (limpia.split("/").includes("..")) continue; // nunca rutas fuera del ZIP
    resultado.push({
      ruta: limpia,
      archivo: new File([bytes], nombreDe(limpia), { type: tipoMime(limpia) }),
    });
  }
  return resultado;
}

function tipoMime(nombre: string): string {
  const ext = extensionDe(nombre);
  if (ext === "pdf") return "application/pdf";
  if (ext === "xml") return "application/xml";
  return "application/octet-stream";
}

/** Lee lo elegido por el usuario (carpeta, ZIP o archivos sueltos) y lo reparte en grupos. */
export async function prepararSeleccion(seleccion: File[]): Promise<PreparadoImportacion> {
  const entradas: EntradaImportacion[] = [];
  for (const archivo of seleccion) {
    const relativa = (archivo as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (extensionDe(archivo.name) === "zip") {
      const dentro = await entradasDeZip(archivo);
      // El nombre del ZIP evita que dos ZIP distintos mezclen sus carpetas.
      entradas.push(...dentro.map((e) => ({ ...e, ruta: `${archivo.name}/${e.ruta}` })));
    } else {
      entradas.push({ ruta: relativa || archivo.name, archivo });
    }
  }
  return agruparEntradas(entradas);
}

/* ------------------------------ Filas y estados ------------------------------ */

export function filasIniciales(grupos: GrupoImportacion[]): FilaImportacion[] {
  return grupos.flatMap((grupo) =>
    grupo.archivos.map((archivo, indice) => ({
      id: `${grupo.id}:${indice}`,
      grupo: grupo.id,
      archivo: archivo.name,
      tipo: extensionDe(archivo.name) === "pdf" ? ("pdf" as const) : ("xml" as const),
      estado: "espera" as const,
    })),
  );
}

export function estadoDeItem(item: ItemImportacion): EstadoArchivo {
  if (!item.ok) return item.code && MOTIVOS_OMITIDOS.has(item.code) ? "omitido" : "error";
  switch (item.situacion) {
    case "nueva":
      return "nueva";
    case "completada":
      return "completada";
    case "repetida":
    case "ya_estaba":
      return "ya_estaba";
    default:
      return "guardado"; // PDF o CDR guardado / unido
  }
}

function tipoDeItem(item: ItemImportacion, previo: TipoArchivo): TipoArchivo {
  return item.tipo === "xml" || item.tipo === "pdf" || item.tipo === "cdr" ? item.tipo : previo;
}

export function marcarGrupo(
  filas: FilaImportacion[],
  grupo: string,
  estado: EstadoArchivo,
  mensaje?: string,
): FilaImportacion[] {
  return filas.map((f) => (f.grupo === grupo ? { ...f, estado, mensaje } : f));
}

/**
 * Aplica la respuesta del servidor a las filas de un grupo. Cada archivo se busca por su nombre;
 * lo que el servidor informe y no esté en la lista (por ejemplo un nombre repetido al que añadió
 * un sufijo) se agrega al final del grupo.
 */
export function aplicarRespuesta(
  filas: FilaImportacion[],
  grupo: string,
  items: ItemImportacion[],
): FilaImportacion[] {
  const resultado = [...filas];
  const usadas = new Set<number>();
  for (const item of items) {
    const indice = resultado.findIndex(
      (f, i) =>
        f.grupo === grupo && !usadas.has(i) && f.archivo.toLowerCase() === item.archivo.toLowerCase(),
    );
    const nueva: FilaImportacion = {
      id: indice >= 0 ? resultado[indice].id : `${grupo}:extra:${resultado.length}`,
      grupo,
      archivo: item.archivo,
      tipo: tipoDeItem(item, indice >= 0 ? resultado[indice].tipo : "otro"),
      estado: estadoDeItem(item),
      mensaje: item.mensaje,
      numero: item.numero,
    };
    if (indice >= 0) {
      resultado[indice] = nueva;
      usadas.add(indice);
    } else {
      const ultimo = resultado.map((f) => f.grupo).lastIndexOf(grupo);
      resultado.splice(ultimo + 1, 0, nueva);
      usadas.add(ultimo + 1);
    }
  }
  // Lo que el servidor no mencionó no se queda «importando» para siempre.
  return resultado.map((f) =>
    f.grupo === grupo && f.estado === "importando"
      ? { ...f, estado: "omitido" as const, mensaje: "El servidor no informó este archivo" }
      : f,
  );
}

export function resumirFilas(filas: FilaImportacion[]): ResumenImportacion {
  const cuenta = (tipo: TipoArchivo, estado: EstadoArchivo) =>
    filas.filter((f) => f.tipo === tipo && f.estado === estado).length;
  return {
    total: filas.length,
    procesados: filas.filter((f) => f.estado !== "espera" && f.estado !== "importando").length,
    completadas: cuenta("xml", "completada"),
    nuevas: cuenta("xml", "nueva"),
    yaEstaban: cuenta("xml", "ya_estaba"),
    pdfGuardados: cuenta("pdf", "guardado"),
    cdrGuardados: cuenta("cdr", "guardado"),
    omitidos: filas.filter((f) => f.estado === "omitido").length,
    errores: filas.filter((f) => f.estado === "error").length,
  };
}

/** Errores tras los cuales seguir con el resto solo repetiría el fallo (sesión o conexión). */
export function detieneLaImportacion(estado: number, codigo: string): boolean {
  return estado === 0 || estado === 401 || estado === 403 || codigo === "forbidden";
}

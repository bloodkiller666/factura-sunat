/**
 * Lote de respaldo: un ZIP con los archivos REALES de cada comprobante (en ventas el XML y el
 * CDR; en compras el XML y el PDF, guardados en R2) más un manifiesto con el SHA-256 de cada archivo.
 *
 * Cada comprobante queda en su carpeta `AAAA/MES/RUC/SERIE-NÚMERO/`, la misma estructura que
 * usa «Guardar en mi PC» y la automatización del correo: así los ZIP se pueden descomprimir
 * todos en una misma carpeta (en otra PC o en el celular) y las partes se juntan solas.
 *
 * Nunca fabrica archivos: si un comprobante no tiene su XML (o su CDR / PDF) archivado,
 * el lote lo dice en el LEEME en lugar de inventarlo. Así el ZIP sirve como paquete de auditoría.
 *
 * Para muchos comprobantes, `descargarTodoPorPartes` los reparte en varios ZIP (el navegador
 * arma cada uno en memoria) y los entrega uno tras otro.
 */

import { apiArchivos, apiDescargarArchivo, type ApiArchivo } from "./api";
import { partesCarpeta } from "./carpeta-local";
import { formatearFecha } from "./format";
import type { Comprobante, Empresa } from "./types";
import { crearZip, type EntradaZip } from "./zip";

/** Tope por ZIP: se arma en memoria del navegador. */
export const MAX_COMPROBANTES_LOTE = 120;
/** Comprobantes por ZIP al descargar todo: cada parte pesa pocos MB y cabe en un celular. */
export const COMPROBANTES_POR_PARTE = 100;
/** Pausa entre dos descargas seguidas: el navegador descarta las que llegan pegadas. */
const ESPERA_ENTRE_PARTES_MS = 900;
const SIMULTANEOS = 3;
const SALTO = "\r\n";

export type TipoRespaldo = "XML" | "CDR" | "PDF";

export interface ProgresoLote {
  hecho: number;
  total: number;
}

export interface FaltanteLote {
  numero: string;
  faltan: TipoRespaldo[];
}

export interface ResultadoLote {
  zip: Uint8Array<ArrayBuffer>;
  comprobantes: number;
  archivos: number;
  faltantes: FaltanteLote[];
  nombre: string;
}

/** Qué parte de una descarga masiva es un ZIP (1 de N). */
export interface ParteLote {
  numero: number;
  total: number;
}

/** Operaciones de red que usa el lote; se inyectan para poder probarlo sin servidor. */
export interface DependenciasLote {
  listarArchivos: (token: string, comprobanteId: string) => Promise<ApiArchivo[]>;
  descargar: (
    token: string,
    archivo: { id: string; nombre: string },
  ) => Promise<{ blob: Blob; nombre: string }>;
}

const DEPENDENCIAS_REALES: DependenciasLote = {
  listarArchivos: apiArchivos,
  descargar: apiDescargarArchivo,
};

export function nombreBase(comprobante: Comprobante): string {
  return (comprobante.nombreArchivo || comprobante.numero).replace(/[\\/:*?"<>|]+/g, "-");
}

/** Carpeta del comprobante dentro del ZIP: `AAAA/MES/RUC/SERIE-NÚMERO`. */
export function carpetaDeLote(comprobante: Comprobante): string {
  return partesCarpeta(comprobante).join("/");
}

const dos = (n: number) => String(n).padStart(2, "0");

export function nombreLote(
  cantidad: number,
  empresa: Pick<Empresa, "ruc">,
  parte?: ParteLote,
): string {
  if (!parte || parte.total <= 1) return `respaldo-comprobantes-${empresa.ruc}-${cantidad}.zip`;
  return `respaldo-${empresa.ruc}-parte-${dos(parte.numero)}-de-${dos(parte.total)}.zip`;
}

async function sha256(datos: Uint8Array): Promise<string> {
  const copia = new Uint8Array(datos);
  const resumen = await crypto.subtle.digest("SHA-256", copia);
  return Array.from(new Uint8Array(resumen))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function escaparCsv(valor: string | number): string {
  const texto = String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function textoLeeme(
  empresa: Pick<Empresa, "ruc" | "razonSocial">,
  comprobantes: Comprobante[],
  faltantes: FaltanteLote[],
  parte?: ParteLote,
): string {
  const lineas = [
    "LOTE DE RESPALDO DE COMPROBANTES ELECTRÓNICOS",
    "",
    `Empresa: ${empresa.razonSocial}`,
    `RUC: ${empresa.ruc}`,
    `Generado: ${formatearFecha(new Date().toISOString().slice(0, 10))}`,
    ...(parte && parte.total > 1 ? [`Parte ${parte.numero} de ${parte.total}`] : []),
    `Comprobantes en el lote: ${comprobantes.length}`,
    "",
    "Contenido: una carpeta por comprobante (AAAA/MES/RUC/SERIE-NÚMERO) con su XML y, según el",
    "caso, su CDR (ventas) o su PDF (compras), tal como están archivados en el almacenamiento.",
    "El manifiesto trae el SHA-256 de cada archivo para verificar que no se alteró.",
    ...(parte && parte.total > 1
      ? [
          "",
          "Si descargaste varias partes, descomprímelas todas en la misma carpeta: cada una trae",
          "sus propias carpetas y no se pisan.",
        ]
      : []),
    "",
  ];
  if (faltantes.length === 0) {
    lineas.push("Todos los comprobantes del lote tienen sus archivos archivados.");
  } else {
    lineas.push(
      `Comprobantes con respaldo incompleto (${faltantes.length}):`,
      ...faltantes.map((f) => `- ${f.numero}: falta ${f.faltan.join(", ")}`),
      "",
      "Para completarlos: importa el XML y el CDR (o el PDF de las compras) desde el sistema que los emite.",
    );
  }
  return lineas.join(SALTO);
}

/** Reparte `elementos` en grupos de a lo más `tamano`, conservando el orden. */
export function dividirEnPartes<T>(elementos: T[], tamano: number): T[][] {
  if (tamano < 1) throw new Error("El tamaño de cada parte debe ser al menos 1");
  const partes: T[][] = [];
  for (let i = 0; i < elementos.length; i += tamano) partes.push(elementos.slice(i, i + tamano));
  return partes;
}

/** Ejecuta `tarea` sobre cada elemento con un máximo de `limite` a la vez. */
async function enParalelo<T>(
  elementos: T[],
  limite: number,
  tarea: (elemento: T) => Promise<void>,
): Promise<void> {
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.min(limite, elementos.length) }, async () => {
    while (siguiente < elementos.length) {
      const actual = elementos[siguiente++];
      await tarea(actual);
    }
  });
  await Promise.all(trabajadores);
}

export async function construirLoteRespaldo(
  token: string,
  empresa: Pick<Empresa, "ruc" | "razonSocial">,
  comprobantes: Comprobante[],
  alProgresar: (progreso: ProgresoLote) => void = () => {},
  deps: DependenciasLote = DEPENDENCIAS_REALES,
  parte?: ParteLote,
): Promise<ResultadoLote> {
  if (comprobantes.length > MAX_COMPROBANTES_LOTE) {
    throw new Error(
      `Un lote admite hasta ${MAX_COMPROBANTES_LOTE} comprobantes. Filtra o selecciona menos.`,
    );
  }

  const entradas: EntradaZip[] = [];
  const faltantes: FaltanteLote[] = [];
  const manifiesto: string[][] = [];
  const usadas = new Set<string>();
  let hecho = 0;

  await enParalelo(comprobantes, SIMULTANEOS, async (comprobante) => {
    // Dos comprobantes no comparten carpeta; si algún dato repetido las hiciera coincidir, la
    // segunda se distingue en vez de pisar los archivos de la primera.
    let carpeta = carpetaDeLote(comprobante);
    if (usadas.has(carpeta)) carpeta = `${carpeta} (${comprobante.id.slice(0, 6)})`;
    usadas.add(carpeta);

    const faltan: TipoRespaldo[] = [];
    const agregar = async (tipo: TipoRespaldo, nombre: string, blob: Blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      entradas.push({ nombre: `${carpeta}/${nombre}`, contenido: bytes });
      manifiesto.push([carpeta, nombre, tipo, String(bytes.length), await sha256(bytes)]);
    };

    // Ventas: XML y CDR. Compras: XML, PDF y el CDR si el proveedor lo mandó (en ventas no hay PDF).
    const esCompra = comprobante.origen === "recibido";
    const tipos: Array<readonly ["xml" | "cdr" | "pdf", TipoRespaldo]> = esCompra
      ? [
            ["xml", "XML"],
            ["pdf", "PDF"],
            ["cdr", "CDR"],
          ]
        : [
            ["xml", "XML"],
            ["cdr", "CDR"],
          ];

    try {
      const guardados = await deps.listarArchivos(token, comprobante.id);
      for (const [tipo, etiqueta] of tipos) {
        // El PDF de una compra puede ser varios (factura, guía de remisión, nota…): van todos.
        const delTipo = guardados.filter((candidato) => candidato.tipo === tipo);
        const aBajar = tipo === "pdf" || (tipo === "cdr" && esCompra) ? delTipo : delTipo.slice(0, 1);
        if (aBajar.length === 0) {
          // El CDR de una compra solo existe si el proveedor lo mandó: no es un faltante.
          if (!(tipo === "cdr" && esCompra)) faltan.push(etiqueta);
          continue;
        }
        // Un archivo que no baja no invalida al otro: solo ese figura como faltante.
        for (const archivo of aBajar) {
          try {
            const { blob, nombre } = await deps.descargar(token, archivo);
            await agregar(etiqueta, nombre, blob);
          } catch {
            if (!faltan.includes(etiqueta)) faltan.push(etiqueta);
          }
        }
      }
    } catch {
      faltan.push(
        ...tipos.filter(([tipo]) => !(tipo === "cdr" && esCompra)).map(([, etiqueta]) => etiqueta),
      );
    }

    if (faltan.length > 0) faltantes.push({ numero: comprobante.numero, faltan });
    hecho += 1;
    alProgresar({ hecho, total: comprobantes.length });
  });

  const archivos = entradas.length;
  const sufijo = parte && parte.total > 1 ? `-parte-${dos(parte.numero)}` : "";
  manifiesto.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const csv = [["carpeta", "archivo", "tipo", "bytes", "sha256"], ...manifiesto]
    .map((fila) => fila.map(escaparCsv).join(","))
    .join(SALTO);

  faltantes.sort((a, b) => a.numero.localeCompare(b.numero));
  entradas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  entradas.push(
    { nombre: `LEEME${sufijo}.txt`, contenido: textoLeeme(empresa, comprobantes, faltantes, parte) },
    { nombre: `manifiesto${sufijo}.csv`, contenido: csv },
  );

  return {
    zip: crearZip(entradas),
    comprobantes: comprobantes.length,
    archivos,
    faltantes,
    nombre: nombreLote(comprobantes.length, empresa, parte),
  };
}

/* ------------------------ Descarga masiva por partes ------------------------ */

export interface ProgresoDescargaMasiva {
  /** Parte que se está armando (1 = primera). */
  parte: number;
  partes: number;
  /** Comprobantes ya revisados de la parte actual. */
  hechoEnParte: number;
  totalEnParte: number;
  /** Comprobantes de las partes ya entregadas + los de la parte en curso. */
  hecho: number;
  total: number;
}

export interface ResumenDescargaMasiva {
  partes: number;
  entregadas: number;
  comprobantes: number;
  archivos: number;
  faltantes: FaltanteLote[];
  cancelada: boolean;
}

export interface OpcionesDescargaMasiva {
  /** Recibe cada ZIP terminado (en el navegador, dispara la descarga). */
  entregar: (zip: Blob, nombre: string) => void | Promise<void>;
  alProgresar?: (progreso: ProgresoDescargaMasiva) => void;
  porParte?: number;
  deps?: DependenciasLote;
  signal?: AbortSignal;
  /** Pausa entre partes; se inyecta para no esperar de verdad en las pruebas. */
  esperar?: (ms: number) => Promise<void>;
}

/**
 * Descarga TODOS los comprobantes dados, repartidos en ZIP de `porParte` comprobantes cada uno.
 * Lo que falte de cada comprobante se declara en el LEEME de su parte y se suma al resumen.
 */
export async function descargarTodoPorPartes(
  token: string,
  empresa: Pick<Empresa, "ruc" | "razonSocial">,
  comprobantes: Comprobante[],
  opciones: OpcionesDescargaMasiva,
): Promise<ResumenDescargaMasiva> {
  const {
    entregar,
    alProgresar = () => {},
    porParte = COMPROBANTES_POR_PARTE,
    deps = DEPENDENCIAS_REALES,
    signal,
    esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
  } = opciones;

  const grupos = dividirEnPartes(comprobantes, Math.min(porParte, MAX_COMPROBANTES_LOTE));
  const resumen: ResumenDescargaMasiva = {
    partes: grupos.length,
    entregadas: 0,
    comprobantes: 0,
    archivos: 0,
    faltantes: [],
    cancelada: false,
  };
  let completos = 0;

  for (const [indice, grupo] of grupos.entries()) {
    if (signal?.aborted) {
      resumen.cancelada = true;
      break;
    }
    const parte: ParteLote = { numero: indice + 1, total: grupos.length };
    const lote = await construirLoteRespaldo(
      token,
      empresa,
      grupo,
      ({ hecho }) =>
        alProgresar({
          parte: parte.numero,
          partes: parte.total,
          hechoEnParte: hecho,
          totalEnParte: grupo.length,
          hecho: completos + hecho,
          total: comprobantes.length,
        }),
      deps,
      parte,
    );
    await entregar(new Blob([lote.zip], { type: "application/zip" }), lote.nombre);
    completos += grupo.length;
    resumen.entregadas += 1;
    resumen.comprobantes += lote.comprobantes;
    resumen.archivos += lote.archivos;
    resumen.faltantes.push(...lote.faltantes);
    if (indice < grupos.length - 1) await esperar(ESPERA_ENTRE_PARTES_MS);
  }
  return resumen;
}

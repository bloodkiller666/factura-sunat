/**
 * Lote de respaldo: un ZIP con los archivos REALES de cada comprobante (el XML y el
 * CDR guardados en R2) más un manifiesto con el SHA-256 de cada archivo.
 *
 * Nunca fabrica XML: si un comprobante no tiene su XML o su CDR archivado, el lote lo
 * dice en el LEEME en lugar de inventarlo. Así el ZIP sirve como paquete de auditoría.
 */

import { apiArchivos, apiDescargarArchivo, type ApiArchivo } from "./api";
import { formatearFecha } from "./format";
import type { Comprobante, Empresa } from "./types";
import { crearZip, type EntradaZip } from "./zip";

/** Tope por lote: el ZIP se arma en memoria del navegador. */
export const MAX_COMPROBANTES_LOTE = 120;
const SIMULTANEOS = 3;
const SALTO = "\r\n";

export interface ProgresoLote {
  hecho: number;
  total: number;
}

export interface FaltanteLote {
  numero: string;
  faltan: Array<"XML" | "CDR">;
}

export interface ResultadoLote {
  zip: Uint8Array<ArrayBuffer>;
  comprobantes: number;
  archivos: number;
  faltantes: FaltanteLote[];
  nombre: string;
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

export function nombreLote(cantidad: number, empresa: Pick<Empresa, "ruc">): string {
  return `respaldo-comprobantes-${empresa.ruc}-${cantidad}.zip`;
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
): string {
  const lineas = [
    "LOTE DE RESPALDO DE COMPROBANTES ELECTRÓNICOS",
    "",
    `Empresa: ${empresa.razonSocial}`,
    `RUC: ${empresa.ruc}`,
    `Generado: ${formatearFecha(new Date().toISOString().slice(0, 10))}`,
    `Comprobantes en el lote: ${comprobantes.length}`,
    "",
    "Contenido: una carpeta por comprobante con su XML y su CDR (tal como están archivados",
    "en el almacenamiento). manifiesto.csv trae el SHA-256 de cada archivo para verificar",
    "que no se alteró.",
    "",
  ];
  if (faltantes.length === 0) {
    lineas.push("Todos los comprobantes del lote tienen XML y CDR archivados.");
  } else {
    lineas.push(
      `Comprobantes con respaldo incompleto (${faltantes.length}):`,
      ...faltantes.map((f) => `- ${f.numero}: falta ${f.faltan.join(", ")}`),
      "",
      "Para completarlos: importa el XML y el CDR desde el sistema que emite los comprobantes.",
    );
  }
  return lineas.join(SALTO);
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
): Promise<ResultadoLote> {
  if (comprobantes.length > MAX_COMPROBANTES_LOTE) {
    throw new Error(
      `Un lote admite hasta ${MAX_COMPROBANTES_LOTE} comprobantes. Filtra o selecciona menos.`,
    );
  }

  const entradas: EntradaZip[] = [];
  const faltantes: FaltanteLote[] = [];
  const manifiesto: string[][] = [];
  let hecho = 0;

  await enParalelo(comprobantes, SIMULTANEOS, async (comprobante) => {
    const base = nombreBase(comprobante);
    const faltan: FaltanteLote["faltan"] = [];
    const agregar = async (tipo: string, nombre: string, blob: Blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      entradas.push({ nombre: `${base}/${nombre}`, contenido: bytes });
      manifiesto.push([base, nombre, tipo, String(bytes.length), await sha256(bytes)]);
    };

    try {
      const guardados = await deps.listarArchivos(token, comprobante.id);
      for (const [tipo, etiqueta] of [
        ["xml", "XML"],
        ["cdr", "CDR"],
      ] as const) {
        const archivo = guardados.find((candidato) => candidato.tipo === tipo);
        if (!archivo) {
          faltan.push(etiqueta);
          continue;
        }
        // Un archivo que no baja no invalida al otro: solo ese figura como faltante.
        try {
          const { blob, nombre } = await deps.descargar(token, archivo);
          await agregar(etiqueta, nombre, blob);
        } catch {
          faltan.push(etiqueta);
        }
      }
    } catch {
      faltan.push("XML", "CDR");
    }

    if (faltan.length > 0) faltantes.push({ numero: comprobante.numero, faltan: [...new Set(faltan)] });
    hecho += 1;
    alProgresar({ hecho, total: comprobantes.length });
  });

  const archivos = entradas.length;
  manifiesto.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const csv = [["comprobante", "archivo", "tipo", "bytes", "sha256"], ...manifiesto]
    .map((fila) => fila.map(escaparCsv).join(","))
    .join(SALTO);

  faltantes.sort((a, b) => a.numero.localeCompare(b.numero));
  entradas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  entradas.push(
    { nombre: "LEEME.txt", contenido: textoLeeme(empresa, comprobantes, faltantes) },
    { nombre: "manifiesto.csv", contenido: csv },
  );

  return {
    zip: crearZip(entradas),
    comprobantes: comprobantes.length,
    archivos,
    faltantes,
    nombre: nombreLote(comprobantes.length, empresa),
  };
}

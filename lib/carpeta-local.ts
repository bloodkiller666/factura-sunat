/**
 * Guardado del XML y el CDR en una carpeta de la PC del usuario, con la estructura que pide
 * el área de Contabilidad: `Descargas / AAAA / MM / RUC / SERIE-NÚMERO`.
 *
 * Usa la File System Access API (Chrome y Edge): el usuario elige UNA vez su carpeta
 * Descargas y el navegador recuerda el permiso. Un navegador no puede abrir el Explorador
 * ni enlaces `file://`; para eso existe el botón «Abrir carpeta» (backend local).
 */

import { NOMBRES_MES } from "./calendario";
import type { Comprobante } from "./types";

const NO_PERMITIDO = /[\\/:*?"<>|\u0000-\u001f]+/g;

/** Un segmento de ruta válido en Windows (sin separadores ni caracteres reservados). */
export function segmentoSeguro(texto: string, vacio: string): string {
  return texto.replace(NO_PERMITIDO, "-").replace(/^[ .]+|[ .]+$/g, "") || vacio;
}

/** «10» → «10. OCTUBRE»: en la carpeta el mes lleva su número y su nombre, igual que en el
 * backend y el extractor (`app/core/meses.py`): nadie confunde un mes con un día y las carpetas
 * se ordenan como el año. */
export function nombreDeMes(mes: string): string {
  const n = Number(mes);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? `${n}. ${NOMBRES_MES[n - 1].toUpperCase()}` : "";
}

/** Año, mes (en letras), RUC de la contraparte (cliente en ventas, proveedor en compras) y
 * serie-número: un mismo RUC agrupa varios documentos. */
export function partesCarpeta(c: Pick<Comprobante, "fechaEmision" | "numero" | "cliente">): string[] {
  const [anio, mes] = c.fechaEmision.split("-");
  return [
    segmentoSeguro(anio ?? "", "sin-fecha"),
    segmentoSeguro(nombreDeMes(mes ?? ""), "sin-fecha"),
    segmentoSeguro(c.cliente.ruc, "sin-ruc"),
    segmentoSeguro(c.numero, "sin-numero"),
  ];
}

export function rutaRelativa(raiz: string, partes: string[]): string {
  return [raiz, ...partes].join("\\");
}

/* ---- Permisos y carpeta raíz recordada ---- */

type Modo = { mode: "readwrite" };
interface ManejadorConPermiso extends FileSystemDirectoryHandle {
  queryPermission?: (modo: Modo) => Promise<PermissionState>;
  requestPermission?: (modo: Modo) => Promise<PermissionState>;
}
type SelectorDeCarpeta = (opciones?: {
  id?: string;
  mode?: "read" | "readwrite";
  startIn?: string;
}) => Promise<FileSystemDirectoryHandle>;

function selector(): SelectorDeCarpeta | null {
  if (typeof window === "undefined") return null;
  const candidato = (window as unknown as { showDirectoryPicker?: SelectorDeCarpeta })
    .showDirectoryPicker;
  return typeof candidato === "function" ? candidato.bind(window) : null;
}

export function soportaCarpetaLocal(): boolean {
  return selector() !== null;
}

const BD = "portal-carpeta-local";
const ALMACEN = "raices";
const CLAVE = "descargas";

function abrirBd(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(BD, 1);
    peticion.onupgradeneeded = () => peticion.result.createObjectStore(ALMACEN);
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

async function leerRaizGuardada(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const bd = await abrirBd();
    return await new Promise((resolver) => {
      const peticion = bd.transaction(ALMACEN).objectStore(ALMACEN).get(CLAVE);
      peticion.onsuccess = () => resolver((peticion.result as FileSystemDirectoryHandle) ?? null);
      peticion.onerror = () => resolver(null);
    });
  } catch {
    return null;
  }
}

async function recordarRaiz(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const bd = await abrirBd();
    bd.transaction(ALMACEN, "readwrite").objectStore(ALMACEN).put(handle, CLAVE);
  } catch {
    // Sin IndexedDB (modo privado) se vuelve a pedir la carpeta la próxima vez.
  }
}

async function conPermiso(handle: ManejadorConPermiso): Promise<boolean> {
  const modo: Modo = { mode: "readwrite" };
  if (!handle.queryPermission || !handle.requestPermission) return true;
  if ((await handle.queryPermission(modo)) === "granted") return true;
  return (await handle.requestPermission(modo)) === "granted";
}

/**
 * La carpeta raíz (Descargas) ya elegida, con permiso vigente; si no hay o se perdió el
 * permiso, abre el selector. `null` si el usuario cancela. Debe llamarse desde un clic.
 */
export async function obtenerRaiz(opciones: { cambiar?: boolean } = {}): Promise<FileSystemDirectoryHandle | null> {
  const elegir = selector();
  if (!elegir) return null;
  if (!opciones.cambiar) {
    const guardada = await leerRaizGuardada();
    if (guardada && (await conPermiso(guardada))) return guardada;
  }
  try {
    const nueva = await elegir({ id: "respaldo-sunat", mode: "readwrite", startIn: "downloads" });
    await recordarRaiz(nueva);
    return nueva;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
}

/** Escribe los archivos en `raiz/AAAA/MES/RUC/SERIE-NÚMERO/`, creando lo que falte. */
export async function guardarArchivos(
  raiz: FileSystemDirectoryHandle,
  partes: string[],
  archivos: Array<{ nombre: string; blob: Blob }>,
): Promise<void> {
  let carpeta = raiz;
  for (const parte of partes) carpeta = await carpeta.getDirectoryHandle(parte, { create: true });
  for (const { nombre, blob } of archivos) {
    const archivo = await carpeta.getFileHandle(segmentoSeguro(nombre, "archivo"), { create: true });
    const escritor = await archivo.createWritable();
    await escritor.write(blob);
    await escritor.close();
  }
}

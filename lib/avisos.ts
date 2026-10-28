/**
 * Cola global de avisos (toasts). Cualquier módulo puede emitir uno sin pasar
 * callbacks por todo el árbol; el componente `Avisos` se suscribe con
 * `useSyncExternalStore`.
 */

export type TonoAviso = "ok" | "info" | "aviso";

export interface Aviso {
  id: number;
  titulo: string;
  detalle?: string;
  tono: TonoAviso;
}

type Oyente = () => void;

const DURACION_MS = 5000;
/** Un fallo se queda más tiempo en pantalla: hay que alcanzar a leerlo. */
const DURACION_ERROR_MS = 9000;
const MAXIMO_VISIBLES = 4;

let avisos: Aviso[] = [];
let siguienteId = 1;
const oyentes = new Set<Oyente>();

function emitir() {
  for (const oyente of oyentes) oyente();
}

export function suscribirAvisos(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function leerAvisos(): Aviso[] {
  return avisos;
}

export function descartarAviso(id: number): void {
  avisos = avisos.filter((aviso) => aviso.id !== id);
  emitir();
}

export function avisar(tono: TonoAviso, titulo: string, detalle?: string): number {
  const id = siguienteId++;
  avisos = [...avisos, { id, titulo, detalle, tono }].slice(-MAXIMO_VISIBLES);
  emitir();
  if (typeof window !== "undefined") {
    window.setTimeout(() => descartarAviso(id), tono === "aviso" ? DURACION_ERROR_MS : DURACION_MS);
  }
  return id;
}

/** Quién guarda los fallos mostrados al usuario (el portal lo conecta a «Logs» con su sesión). */
export type ReportadorDeFallos = (fallo: { accion: string; mensaje: string }) => void;

let reportador: ReportadorDeFallos | null = null;

/** Conecta (o desconecta con `null`) el registro de fallos; devuelve cómo desconectarlo. */
export function conectarReportadorDeFallos(nuevo: ReportadorDeFallos | null): () => void {
  reportador = nuevo;
  return () => {
    if (reportador === nuevo) reportador = null;
  };
}

/** Guarda un fallo en «Logs» sin avisar al usuario (p. ej. cuando ya se ve en la pantalla). */
export function registrarFallo(accion: string, mensaje: string): void {
  if (!reportador) return;
  try {
    reportador({ accion, mensaje: mensaje || accion });
  } catch {
    // Registrar el fallo nunca debe ocultar el aviso que el usuario necesita ver.
  }
}

/**
 * Un fallo se muestra al usuario Y queda en «Logs». Los avisos que solo orientan (no hay filas que
 * exportar, la web no puede abrir carpetas locales) pasan `registrar: false`: no son fallos.
 */
function avisarFallo(titulo: string, detalle?: string, opciones: { registrar?: boolean } = {}) {
  if (opciones.registrar !== false) registrarFallo(titulo, detalle ?? titulo);
  return avisar("aviso", titulo, detalle);
}

export const aviso = {
  ok: (titulo: string, detalle?: string) => avisar("ok", titulo, detalle),
  info: (titulo: string, detalle?: string) => avisar("info", titulo, detalle),
  error: avisarFallo,
};

/** Solo para pruebas: deja la cola vacía. */
export function reiniciarAvisos(): void {
  avisos = [];
  siguienteId = 1;
  emitir();
}

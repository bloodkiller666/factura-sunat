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
    window.setTimeout(() => descartarAviso(id), DURACION_MS);
  }
  return id;
}

export const aviso = {
  ok: (titulo: string, detalle?: string) => avisar("ok", titulo, detalle),
  info: (titulo: string, detalle?: string) => avisar("info", titulo, detalle),
  error: (titulo: string, detalle?: string) => avisar("aviso", titulo, detalle),
};

/** Solo para pruebas: deja la cola vacía. */
export function reiniciarAvisos(): void {
  avisos = [];
  siguienteId = 1;
  emitir();
}

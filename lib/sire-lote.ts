/**
 * Sincronización de varios meses desde SIRE, uno tras otro.
 *
 * SUNAT genera cada periodo con un ticket asíncrono: si tarda, el backend responde
 * `en_proceso` con el ticket y aquí se vuelve a preguntar con ese mismo ticket (sin
 * pedir otra propuesta). Un mes con error no detiene a los demás, salvo que el
 * problema sea de acceso o de conexión: seguir solo repetiría el fallo.
 */

import { ApiError, apiSireSync, type ApiSireSync, type LibroSire } from "./api";
import { mesesEntre } from "./filtros";
import { periodoSire } from "./format";
import {
  guardarTicket,
  leerTicket,
  olvidarTicket,
  type AlmacenTickets,
} from "./sire-tickets";

/** Primer periodo que SUNAT habilita en SIRE para TDM (julio de 2023). */
export const PRIMER_PERIODO_SIRE = "2023-07";
const MAX_REINTENTOS_TICKET = 8;

export type EstadoMes = "pendiente" | "en_curso" | "ok" | "sin_datos" | "error" | "omitido";

/** Avance de la espera mientras SUNAT genera el archivo (el motivo de que tarde). */
export interface EsperaSunat {
  /** Consulta actual y total de consultas que se harán antes de rendirse. */
  intento: number;
  maximo: number;
  ticket: string;
  /** `true` si se retomó un ticket de una solicitud anterior en vez de pedir uno nuevo. */
  retomado: boolean;
}

export interface ResultadoMes {
  mes: string;
  estado: EstadoMes;
  nuevos: number;
  yaExistian: number;
  anulados: number;
  omitidos: number;
  mensaje?: string;
  /** Solo mientras `estado` es `en_curso` y SUNAT sigue generando el archivo. */
  espera?: EsperaSunat;
}

/** Texto para el usuario cuando SUNAT sigue generando el archivo tras todas las consultas. */
export function mensajeSunatTarda(ticket: string): string {
  return (
    "SUNAT sigue generando el archivo: los reportes de SIRE pueden tardar varios minutos, y más " +
    "cuando el servicio está cargado. No hace falta repetir la solicitud: vuelve a pulsar " +
    `«Sincronizar» más tarde y se retomará el mismo ticket (${ticket}).`
  );
}

export interface OpcionesMes {
  /** Se avisa en cada consulta en que SUNAT aún no termina. */
  alEsperar?: (espera: EsperaSunat) => void;
  /** Dónde recordar el ticket (por defecto `localStorage`; `null` = no recordar). */
  almacen?: AlmacenTickets | null;
  /** Volver a consultar también los meses cerrados que ya están cargados (el backend los rechaza si no). */
  forzar?: boolean;
}

export type LlamadaSire = (
  token: string,
  ruc: string,
  periodo: string,
  ticket?: string,
  libro?: LibroSire,
  forzar?: boolean,
) => Promise<ApiSireSync>;

/** Errores tras los cuales no tiene sentido seguir con el resto de los meses. */
export function detieneElLote(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return (
    error.status === 0 ||
    error.status === 401 ||
    error.status === 403 ||
    error.code === "sunat_auth_error" ||
    error.code === "credentials_not_configured"
  );
}

export function mesesDisponibles(hasta: string): string[] {
  return mesesEntre(PRIMER_PERIODO_SIRE, hasta);
}

export function resultadoInicial(mes: string): ResultadoMes {
  return { mes, estado: "pendiente", nuevos: 0, yaExistian: 0, anulados: 0, omitidos: 0 };
}

export async function sincronizarMes(
  token: string,
  ruc: string,
  mes: string,
  llamar: LlamadaSire = apiSireSync,
  libro: LibroSire = "ventas",
  opciones: OpcionesMes = {},
): Promise<ResultadoMes> {
  const periodo = periodoSire(mes);
  const { almacen } = opciones;
  const leer = () =>
    almacen === undefined ? leerTicket(ruc, libro, periodo) : leerTicket(ruc, libro, periodo, almacen);
  const guardar = (t: string) =>
    almacen === undefined
      ? guardarTicket(ruc, libro, periodo, t)
      : guardarTicket(ruc, libro, periodo, t, almacen);
  const olvidar = () =>
    almacen === undefined ? olvidarTicket(ruc, libro, periodo) : olvidarTicket(ruc, libro, periodo, almacen);

  // Si una solicitud anterior quedó a medias, se retoma su ticket en vez de pedir otra propuesta.
  let ticket: string | undefined = leer();
  let retomado = ticket !== undefined;

  for (let intento = 0; intento <= MAX_REINTENTOS_TICKET; intento += 1) {
    let respuesta: ApiSireSync;
    try {
      respuesta = await llamar(token, ruc, periodo, ticket, libro, opciones.forzar);
    } catch (error) {
      // Un ticket recordado puede haber caducado en SUNAT: se descarta y se pide uno nuevo, una vez.
      if (retomado && intento === 0 && error instanceof ApiError && error.status !== 0) {
        olvidar();
        ticket = undefined;
        retomado = false;
        intento = -1;
        continue;
      }
      throw error;
    }
    if (respuesta.estado === "en_proceso" && respuesta.ticket) {
      ticket = respuesta.ticket;
      guardar(ticket);
      opciones.alEsperar?.({
        intento: intento + 1,
        maximo: MAX_REINTENTOS_TICKET + 1,
        ticket,
        retomado,
      });
      continue;
    }
    olvidar(); // terminó (con datos o sin ellos): el ticket ya no hace falta
    return {
      mes,
      estado: respuesta.estado === "sin_datos" ? "sin_datos" : "ok",
      nuevos: respuesta.nuevos,
      yaExistian: respuesta.ya_existian,
      anulados: respuesta.anulados,
      omitidos: Object.values(respuesta.omitidos).reduce((suma, n) => suma + n, 0),
      mensaje: respuesta.mensaje,
    };
  }
  return {
    ...resultadoInicial(mes),
    estado: "error",
    mensaje: mensajeSunatTarda(ticket ?? "sin ticket"),
  };
}

export async function sincronizarMeses(
  token: string,
  ruc: string,
  meses: string[],
  opciones: {
    alCambiar: (resultado: ResultadoMes) => void;
    cancelado: () => boolean;
    llamar?: LlamadaSire;
    libro?: LibroSire;
    almacen?: AlmacenTickets | null;
    forzar?: boolean;
  },
): Promise<ResultadoMes[]> {
  const resultados: ResultadoMes[] = [];
  let detenido = false;

  for (const mes of meses) {
    if (detenido || opciones.cancelado()) {
      const omitido: ResultadoMes = { ...resultadoInicial(mes), estado: "omitido" };
      resultados.push(omitido);
      opciones.alCambiar(omitido);
      continue;
    }
    opciones.alCambiar({ ...resultadoInicial(mes), estado: "en_curso" });
    let resultado: ResultadoMes;
    try {
      resultado = await sincronizarMes(token, ruc, mes, opciones.llamar, opciones.libro, {
        almacen: opciones.almacen,
        forzar: opciones.forzar,
        alEsperar: (espera) =>
          opciones.alCambiar({ ...resultadoInicial(mes), estado: "en_curso", espera }),
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "periodo_ya_cargado") {
        // Ya está en la base: no es un fallo ni detiene el resto de los meses.
        resultado = { ...resultadoInicial(mes), estado: "omitido", mensaje: error.message };
        resultados.push(resultado);
        opciones.alCambiar(resultado);
        continue;
      }
      resultado = {
        ...resultadoInicial(mes),
        estado: "error",
        mensaje: error instanceof Error ? error.message : "No se pudo sincronizar este mes.",
      };
      detenido = detieneElLote(error);
    }
    resultados.push(resultado);
    opciones.alCambiar(resultado);
  }
  return resultados;
}

export function resumirLote(resultados: ResultadoMes[]) {
  return {
    nuevos: resultados.reduce((suma, r) => suma + r.nuevos, 0),
    yaExistian: resultados.reduce((suma, r) => suma + r.yaExistian, 0),
    errores: resultados.filter((r) => r.estado === "error").length,
    completados: resultados.filter((r) => r.estado === "ok" || r.estado === "sin_datos").length,
  };
}

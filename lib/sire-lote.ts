/**
 * Sincronización de varios meses desde SIRE, uno tras otro.
 *
 * SUNAT genera cada periodo con un ticket asíncrono: si tarda, el backend responde
 * `en_proceso` con el ticket y aquí se vuelve a preguntar con ese mismo ticket (sin
 * pedir otra propuesta). Un mes con error no detiene a los demás, salvo que el
 * problema sea de acceso o de conexión: seguir solo repetiría el fallo.
 */

import { ApiError, apiSireSync, type ApiSireSync } from "./api";
import { mesesEntre } from "./filtros";
import { periodoSire } from "./format";

/** Primer periodo que SUNAT habilita en SIRE para TDM (julio de 2023). */
export const PRIMER_PERIODO_SIRE = "2023-07";
const MAX_REINTENTOS_TICKET = 8;

export type EstadoMes = "pendiente" | "en_curso" | "ok" | "sin_datos" | "error" | "omitido";

export interface ResultadoMes {
  mes: string;
  estado: EstadoMes;
  nuevos: number;
  yaExistian: number;
  anulados: number;
  omitidos: number;
  mensaje?: string;
}

export type LlamadaSire = (
  token: string,
  ruc: string,
  periodo: string,
  ticket?: string,
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
): Promise<ResultadoMes> {
  const periodo = periodoSire(mes);
  let ticket: string | undefined;

  for (let intento = 0; intento <= MAX_REINTENTOS_TICKET; intento += 1) {
    const respuesta = await llamar(token, ruc, periodo, ticket);
    if (respuesta.estado === "en_proceso" && respuesta.ticket) {
      ticket = respuesta.ticket;
      continue;
    }
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
    mensaje: "SUNAT sigue generando el archivo. Vuelve a intentarlo en unos minutos.",
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
      resultado = await sincronizarMes(token, ruc, mes, opciones.llamar);
    } catch (error) {
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

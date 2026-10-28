/**
 * Lectura de la respuesta del respaldo de Bizlinks (XML firmado).
 *
 * El backend ya decide qué comprobantes consultar; aquí solo se traduce el resultado a
 * algo que la persona pueda leer: cuántos se completaron, a quiénes les falta algo y por
 * qué se detuvo el lote. Nada de esto inventa datos: si un comprobante quedó sin respaldo,
 * se dice tal cual.
 */

import type { ApiBizlinksItem, ApiBizlinksSync } from "./api";
import { formatearEntero } from "./format";

export type TonoResultado = "ok" | "aviso" | "error";

export interface ResumenRespaldos {
  /** Texto corto para el aviso (toast). */
  titulo: string;
  detalle: string;
  tono: TonoResultado;
}

const MOTIVOS: Record<string, string> = {
  bizlinks_auth_error: "Bizlinks rechazó las credenciales de la empresa.",
  bizlinks_not_configured:
    "Bizlinks no está configurado en el servidor: faltan la URL del servicio o las credenciales.",
  bizlinks_unavailable: "Bizlinks no responde en este momento.",
  bizlinks_blocked:
    "Bizlinks bloqueó las consultas al portal. Se reanudan automáticamente cuando pase la pausa.",
  bizlinks_portal_changed:
    "El portal de Bizlinks cambió y la consulta automática ya no es válida. Avisa a soporte.",
  cuota_diaria_agotada: "Se alcanzó el tope diario de consultas al portal de Bizlinks.",
  bizlinks_cooldown: "Las consultas al portal de Bizlinks están en pausa tras un bloqueo.",
};

/** Motivo legible de una detención (`detenido_por`), o `null` si no se detuvo. */
export function motivoDetencion(codigo: string | null | undefined): string | null {
  if (!codigo) return null;
  return MOTIVOS[codigo] ?? `El lote se detuvo (${codigo}).`;
}

/** Nombre corto del comprobante para listarlo: serie y número. */
export function nombreItem(item: ApiBizlinksItem): string {
  if (item.numero) {
    // El backend puede devolver `RUC-01-F001-00000123` o `F001-00000123`.
    const partes = item.numero.split("-");
    return partes.length >= 2 ? partes.slice(-2).join("-") : item.numero;
  }
  return item.comprobante_id.slice(0, 8);
}

/** Comprobantes que no quedaron completos y merecen reintentarse o revisarse. */
export function pendientes(sync: ApiBizlinksSync): ApiBizlinksItem[] {
  return sync.items.filter((item) => item.resultado !== "completo");
}

/**
 * Resume una llamada al respaldo. `recuperados` cuenta los archivos que realmente se
 * archivaron, que es lo que le importa a quien pulsa el botón.
 */
export function resumirRespaldos(sync: ApiBizlinksSync): ResumenRespaldos {
  const archivos = sync.xml_guardados;
  const detenido = motivoDetencion(sync.detenido_por);

  if (sync.revisados === 0) {
    return {
      titulo: detenido ? "No se pudo consultar Bizlinks" : "Nada que recuperar",
      detalle:
        detenido ??
        sync.mensaje ??
        "Todos los comprobantes emitidos ya tienen su XML archivado.",
      tono: detenido ? "error" : "ok",
    };
  }

  if (archivos > 0) {
    return {
      titulo: `XML recuperados: ${formatearEntero(sync.xml_guardados)}`,
      detalle: detenido
        ? `${detenido} Se recuperaron ${formatearEntero(sync.completos)} completos antes de detenerse.`
        : `${formatearEntero(sync.completos)} completos, ${formatearEntero(sync.parciales)} parciales de ${formatearEntero(sync.revisados)} revisados.`,
      tono: "ok",
    };
  }

  if (sync.fallidos > 0) {
    const primero = sync.items.find((item) => item.mensaje)?.mensaje;
    return {
      titulo: "Bizlinks tiene los archivos, pero no se pudieron archivar",
      detalle:
        primero ??
        detenido ??
        "Revisa el almacenamiento (R2) del servidor y vuelve a intentarlo: el comprobante se reintentará.",
      tono: "error",
    };
  }

  return {
    titulo: "Bizlinks no tiene estos comprobantes",
    detalle:
      detenido ??
      sync.mensaje ??
      "Se volverán a consultar en la próxima sincronización (no se repiten durante 24 h).",
    tono: "aviso",
  };
}

/** Texto de una fila del detalle, según el resultado de ese comprobante. */
export function describirItem(item: ApiBizlinksItem): string {
  if (item.resultado === "completo") {
    return item.items_cargados > 0
      ? `XML archivado · ${formatearEntero(item.items_cargados)} ítems cargados`
      : "XML archivado";
  }
  if (item.resultado === "parcial") return "Solo se pudo archivar una parte";
  if (item.resultado === "error") return item.mensaje ?? "No se pudo completar";
  return item.mensaje ?? "Bizlinks no lo tiene";
}

/** Tono del resultado de un comprobante, para la lista del diálogo. */
export function tonoItem(item: ApiBizlinksItem): TonoResultado {
  if (item.resultado === "completo") return "ok";
  if (item.resultado === "error") return "error";
  return "aviso";
}

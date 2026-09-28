import type { Emisor } from "./comprobante-descargas";
import type { Cliente, Comprobante } from "./types";

/**
 * Correo de demostración: el prototipo no almacena datos de contacto reales,
 * así que se deriva un buzón determinista a partir del RUC del cliente.
 */
export function correoCliente(cliente: Cliente): string {
  return `facturacion@${cliente.ruc}.com.pe`;
}

export interface ResultadoEnvioCorreo {
  ok: boolean;
  /** Correos aceptados por el proveedor. */
  enviados: number;
  destinatarios: string[];
  /** Mensaje listo para mostrar en el toast. */
  mensaje: string;
}

interface RespuestaEnvio {
  ok?: boolean;
  enviados?: number;
  destinatarios?: string[];
  mensaje?: string;
}

/**
 * Envía los comprobantes seleccionados por correo electrónico real. El envío
 * ocurre en el servidor (`/api/enviar-comprobantes`) para no exponer la clave
 * del proveedor en el navegador.
 */
export async function enviarComprobantesPorCorreo(
  empresa: Emisor,
  comprobantes: Comprobante[],
): Promise<ResultadoEnvioCorreo> {
  try {
    const respuesta = await fetch("/api/enviar-comprobantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa, comprobantes }),
    });

    const datos = (await respuesta.json().catch(() => null)) as RespuestaEnvio | null;

    if (!respuesta.ok || !datos?.ok) {
      return {
        ok: false,
        enviados: 0,
        destinatarios: [],
        mensaje: datos?.mensaje ?? "No se pudo enviar el correo.",
      };
    }

    return {
      ok: true,
      enviados: datos.enviados ?? comprobantes.length,
      destinatarios: datos.destinatarios ?? [],
      mensaje: datos.mensaje ?? "Correo enviado.",
    };
  } catch {
    return {
      ok: false,
      enviados: 0,
      destinatarios: [],
      mensaje: "No se pudo contactar con el servicio de correo.",
    };
  }
}

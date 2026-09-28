import { NextResponse } from "next/server";
import type { Emisor } from "@/lib/comprobante-descargas";
import { generarXmlUbl, nombreArchivoXml } from "@/lib/comprobante-descargas";
import { correoCliente } from "@/lib/correo";
import type { Comprobante } from "@/lib/types";

/**
 * Envío real de comprobantes por correo electrónico a través de Resend.
 *
 * La clave del proveedor vive solo en el servidor (`RESEND_API_KEY`): el
 * navegador nunca la ve. El envío se hace con `fetch` directo a la API REST
 * para no añadir dependencias, y cada cliente recibe un único correo con el
 * XML de todos sus comprobantes adjuntos.
 */

export const runtime = "nodejs";

const API_RESEND = "https://api.resend.com/emails";

/** Límites defensivos: la ruta es pública aunque el prototipo no tenga auth. */
const MAX_COMPROBANTES = 50;
const MAX_CARACTERES_CUERPO = 2_000_000;
const MAX_LARGO_MENSAJE_ERROR = 200;

const MONEDA = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface CuerpoPeticion {
  empresa: Emisor;
  comprobantes: Comprobante[];
}

interface AdjuntoResend {
  filename: string;
  content: string;
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

/** Validación superficial del cuerpo: basta para un prototipo sin autenticación. */
function leerCuerpo(datos: unknown): CuerpoPeticion | null {
  if (typeof datos !== "object" || datos === null) return null;

  const { empresa, comprobantes } = datos as Partial<CuerpoPeticion>;

  if (
    typeof empresa !== "object" ||
    empresa === null ||
    !esTexto(empresa.ruc) ||
    !esTexto(empresa.razonSocial) ||
    !esTexto(empresa.domicilioFiscal)
  ) {
    return null;
  }

  if (!Array.isArray(comprobantes) || comprobantes.length === 0) return null;
  if (comprobantes.length > MAX_COMPROBANTES) return null;
  if (!comprobantes.every((c) => esTexto(c?.numero) && esTexto(c?.cliente?.razonSocial))) {
    return null;
  }

  return { empresa, comprobantes };
}

function plantillaCorreo(empresa: Emisor, comprobantes: Comprobante[]): string {
  const filas = comprobantes
    .map(
      (comprobante) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:13px;color:#0f172a;">${comprobante.numero}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${comprobante.tipo}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${comprobante.descripcion}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;text-align:right;white-space:nowrap;">${MONEDA.format(comprobante.total)}</td>
        </tr>`,
    )
    .join("");

  return `<div style="background:#f1f5f9;padding:24px;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f172a;padding:20px 24px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#93c5fd;">Comprobantes electrónicos</p>
      <h1 style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:19px;color:#ffffff;">${empresa.razonSocial}</h1>
      <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#cbd5e1;">RUC ${empresa.ruc}</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;color:#334155;">
        Adjuntamos ${comprobantes.length === 1 ? "el comprobante electrónico" : `los ${comprobantes.length} comprobantes electrónicos`} emitido${comprobantes.length === 1 ? "" : "s"} a su nombre, en formato XML (UBL 2.1).
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Comprobante</th>
            <th style="padding:10px 12px;text-align:left;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Tipo</th>
            <th style="padding:10px 12px;text-align:left;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Descripción</th>
            <th style="padding:10px 12px;text-align:right;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Total</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;">
        Domicilio fiscal: ${empresa.domicilioFiscal}
      </p>
      <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;">
        Prototipo de demostración · Información fiscal simulada, no válida ante SUNAT.
      </p>
    </div>
  </div>
</div>`;
}

async function enviarConResend(
  claveApi: string,
  emisor: string,
  destinatario: string,
  asunto: string,
  html: string,
  adjuntos: AdjuntoResend[],
): Promise<void> {
  const respuesta = await fetch(API_RESEND, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${claveApi}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emisor,
      to: [destinatario],
      subject: asunto,
      html,
      attachments: adjuntos,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(detalle.slice(0, MAX_LARGO_MENSAJE_ERROR) || `Resend respondió ${respuesta.status}`);
  }
}

export async function POST(request: Request) {
  const crudo = await request.text();

  if (crudo.length > MAX_CARACTERES_CUERPO) {
    return NextResponse.json(
      { ok: false, mensaje: "El lote seleccionado es demasiado grande." },
      { status: 413 },
    );
  }

  let datos: unknown;
  try {
    datos = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ ok: false, mensaje: "Cuerpo inválido." }, { status: 400 });
  }

  const cuerpo = leerCuerpo(datos);
  if (!cuerpo) {
    return NextResponse.json({ ok: false, mensaje: "Datos del lote inválidos." }, { status: 400 });
  }

  const claveApi = process.env.RESEND_API_KEY;
  if (!claveApi) {
    return NextResponse.json(
      {
        ok: false,
        mensaje: "Falta configurar RESEND_API_KEY en el servidor para enviar correos reales.",
      },
      { status: 503 },
    );
  }

  const { empresa, comprobantes } = cuerpo;
  const emisor = process.env.CORREO_EMISOR ?? "Portal TDM <onboarding@resend.dev>";
  /** Con esta variable todos los correos van a un único buzón (útil en pruebas). */
  const destinoPrueba = process.env.CORREO_DESTINO_PRUEBA;

  // Agrupa por cliente: un correo por destinatario con sus XML adjuntos.
  const porCliente = new Map<string, Comprobante[]>();
  for (const comprobante of comprobantes) {
    const clave = comprobante.cliente.ruc || comprobante.cliente.razonSocial;
    const acumulado = porCliente.get(clave) ?? [];
    acumulado.push(comprobante);
    porCliente.set(clave, acumulado);
  }

  const envios = await Promise.allSettled(
    [...porCliente.values()].map((grupo) => {
      const cliente = grupo[0].cliente;
      const destinatario = destinoPrueba || correoCliente(cliente);

      const adjuntos: AdjuntoResend[] = grupo.map((comprobante) => ({
        filename: nombreArchivoXml(comprobante, empresa),
        content: Buffer.from(generarXmlUbl(comprobante, empresa), "utf8").toString("base64"),
      }));

      const asunto =
        grupo.length === 1
          ? `Comprobante electrónico ${grupo[0].numero} · ${empresa.razonSocial}`
          : `${grupo.length} comprobantes electrónicos · ${empresa.razonSocial}`;

      return enviarConResend(
        claveApi,
        emisor,
        destinatario,
        asunto,
        plantillaCorreo(empresa, grupo),
        adjuntos,
      );
    }),
  );

  const destinatarios: string[] = [];
  let primerError: string | null = null;

  envios.forEach((resultado, indice) => {
    if (resultado.status === "fulfilled") {
      const grupo = [...porCliente.values()][indice];
      destinatarios.push(destinoPrueba || correoCliente(grupo[0].cliente));
      return;
    }

    const motivo =
      resultado.reason instanceof Error ? resultado.reason.message : "Error desconocido del proveedor";
    console.error("[enviar-comprobantes] falló el envío:", motivo);
    if (!primerError) primerError = motivo;
  });

  if (destinatarios.length === 0) {
    const detalle = process.env.NODE_ENV === "production" ? "" : ` (${primerError})`;
    return NextResponse.json(
      { ok: false, mensaje: `No se pudo enviar ningún correo${detalle}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    enviados: destinatarios.length,
    destinatarios,
    mensaje:
      destinatarios.length === comprobantes.length
        ? `Correo enviado a ${destinatarios[0]}`
        : `${destinatarios.length} de ${porCliente.size} clientes recibieron el correo`,
  });
}

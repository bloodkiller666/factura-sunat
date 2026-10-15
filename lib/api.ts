/**
 * Cliente de la API del backend (FastAPI) y mapeo al modelo del portal.
 *
 * El frontend nunca habla con SUNAT: todas las llamadas van a este backend con
 * el JWT de Supabase en el header Authorization. Los errores comparten un único
 * formato `{ error: { code, message, details } }`.
 */

import type { Comprobante, Empresa, EstadoSunat, ItemComprobante, TipoDocumento } from "./types";

/* ------------------------------------------------------------------ *
 * Configuración
 * ------------------------------------------------------------------ */

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/** `true` si hay una URL de backend configurada en el .env. */
export const apiConfigurado = API_BASE !== "";

/* ------------------------------------------------------------------ *
 * Tipos tal como los devuelve la API (snake_case)
 * ------------------------------------------------------------------ */

export interface ApiEmpresa {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  activo: boolean;
  sunat_ambiente: string | null;
  rol: "admin" | "emisor" | "lector";
}

export interface ApiComprobante {
  id: string;
  company_id: string;
  origen: "emitido" | "recibido";
  ruc_emisor: string;
  ruc_receptor: string | null;
  razon_social_emisor: string | null;
  razon_social_receptor: string | null;
  tipo_documento: string;
  serie: string;
  correlativo: number;
  numero: string;
  nombre_archivo: string;
  fecha_emision: string | null;
  fecha_vencimiento?: string | null;
  forma_pago?: string | null;
  moneda: string;
  monto_total: string | null;
  estado: string;
  estado_label: string;
  sunat_ambiente: string;
  n_sap: string | null;
  orden_compra: string | null;
  check_sap: boolean;
  cdr_codigo: string | null;
  cdr_descripcion: string | null;
}

export interface ApiItem {
  item_nro: number;
  descripcion: string;
  cantidad: string;
  unidad_medida: string | null;
  codigo: string | null;
  valor_unitario: string | null;
  precio_unitario: string | null;
  descuento: string;
  igv: string;
  isc: string;
  tip_afectacion_igv: string | null;
  total: string | null;
}

export interface ApiDetalle extends ApiComprobante {
  items: ApiItem[];
}

export interface ApiPagina {
  items: ApiComprobante[];
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ApiArchivo {
  id: string;
  tipo: "pdf" | "xml" | "cdr" | "zip";
  nombre: string;
  mime_type: string | null;
  size_bytes: number | null;
}

export interface ApiDescarga {
  archivo_id: string;
  nombre: string;
  url: string;
  expires_in: number;
}

export interface ApiResultadoImportacion {
  ruc: string;
  origen: string;
  total: number;
  importados: number;
  con_pdf: number;
  duplicados: number;
  con_error: number;
  items: Array<{
    archivo: string;
    ok: boolean;
    comprobante_id?: string;
    numero?: string;
    pdf?: boolean;
    code?: string;
    mensaje?: string;
  }>;
}

export interface ApiLoteRefresco {
  ruc: string;
  total: number;
  procesados: number;
  con_cambio: number;
  fallidos: number;
  detenido_por: string | null;
  items: Array<{
    numero: string;
    estado_anterior: string;
    estado_nuevo: string;
    estado_label: string;
    cambio_estado: boolean;
    ok: boolean;
    cdr_codigo?: string | null;
    mensaje?: string | null;
    error_code?: string;
  }>;
}

/* ------------------------------------------------------------------ *
 * Errores
 * ------------------------------------------------------------------ */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(mensaje: string, code: string, status: number) {
    super(mensaje);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function pedir<T>(
  ruta: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!respuesta.ok) {
    let code = "error_desconocido";
    let mensaje = respuesta.statusText;
    try {
      const cuerpo = (await respuesta.json()) as {
        error?: { code?: string; message?: string };
      };
      code = cuerpo.error?.code ?? code;
      mensaje = cuerpo.error?.message ?? mensaje;
    } catch {
      // Cuerpo no JSON (ej. 502 del proxy): se usa el statusText.
    }
    throw new ApiError(mensaje, code, respuesta.status);
  }

  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

/** Descarga binaria autenticada: devuelve el blob y el nombre de archivo. */
async function pedirBlob(
  ruta: string,
  token: string,
  nombrePorDefecto: string,
): Promise<{ blob: Blob; nombre: string }> {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!respuesta.ok) {
    throw new ApiError(`No se pudo descargar el archivo (${respuesta.status})`, "download_error", respuesta.status);
  }
  const disposicion = respuesta.headers.get("content-disposition") ?? "";
  const coincidencia = /filename="?([^";]+)"?/i.exec(disposicion);
  const blob = await respuesta.blob();
  return { blob, nombre: coincidencia?.[1] ?? nombrePorDefecto };
}

/* ------------------------------------------------------------------ *
 * Llamadas a la API
 * ------------------------------------------------------------------ */

/** Empresas del usuario (con el rol de cada una). */
export async function apiEmpresas(token: string): Promise<ApiEmpresa[]> {
  const cuerpo = await pedir<{ items: ApiEmpresa[] }>("/api/v1/companies", token);
  return cuerpo.items;
}

export interface FiltrosApi {
  estado?: string;
  origen?: "emitido" | "recibido";
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo_documento?: string;
  serie?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

function paramsDe(filtros: FiltrosApi): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== "") {
      params.set(clave, String(valor));
    }
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

/** Página de comprobantes de la empresa. */
export async function apiComprobantes(
  token: string,
  ruc: string,
  filtros: FiltrosApi = {},
): Promise<ApiPagina> {
  return pedir<ApiPagina>(
    `/api/v1/companies/${ruc}/comprobantes${paramsDe(filtros)}`,
    token,
  );
}

/** Detalle del comprobante con sus ítems. */
export async function apiDetalle(token: string, id: string): Promise<ApiDetalle> {
  return pedir<ApiDetalle>(`/api/v1/comprobantes/${id}`, token);
}

/** Archivos archivados del comprobante (XML, CDR, PDF). */
export async function apiArchivos(token: string, id: string): Promise<ApiArchivo[]> {
  const cuerpo = await pedir<{ items: ApiArchivo[] }>(
    `/api/v1/comprobantes/${id}/archivos`,
    token,
  );
  return cuerpo.items;
}

/** URL firmada temporal (15 min) para descargar un archivo del bucket. */
export async function apiUrlDescarga(token: string, archivoId: string): Promise<ApiDescarga> {
  return pedir<ApiDescarga>(`/api/v1/archivos/${archivoId}/download-url`, token, {
    method: "POST",
  });
}

/** Representación impresa en PDF, generada por el backend. */
export async function apiPdf(token: string, id: string, nombre: string): Promise<{ blob: Blob; nombre: string }> {
  return pedirBlob(`/api/v1/comprobantes/${id}/pdf`, token, nombre);
}

/** Descarga el XML original archivado en el bucket privado. */
export async function apiDescargarXml(
  token: string,
  id: string,
): Promise<{ blob: Blob; nombre: string }> {
  const archivos = await apiArchivos(token, id);
  const xml = archivos.find((archivo) => archivo.tipo === "xml");
  if (!xml) {
    throw new ApiError(
      "Este comprobante aún no tiene un XML archivado en el bucket",
      "archivo_no_encontrado",
      404,
    );
  }
  const { url } = await apiUrlDescarga(token, xml.id);
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new ApiError("La URL firmada dejó de ser válida; reintenta", "download_error", respuesta.status);
  }
  return { blob: await respuesta.blob(), nombre: xml.nombre };
}

/** Importa un XML UBL individual (admin/emisor). */
export async function apiImportarXml(
  token: string,
  ruc: string,
  archivo: File,
  origen: "emitido" | "recibido" = "emitido",
): Promise<ApiComprobante> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", archivo);
  cuerpo.append("origen", origen);
  return pedir<ApiComprobante>(`/api/v1/companies/${ruc}/comprobantes/import`, token, {
    method: "POST",
    body: cuerpo,
  });
}

/** Importa un ZIP con varios XML (+ PDF emparejados) (admin/emisor). */
export async function apiImportarPaquete(
  token: string,
  ruc: string,
  archivo: File,
  origen: "emitido" | "recibido" = "emitido",
): Promise<ApiResultadoImportacion> {
  const cuerpo = new FormData();
  cuerpo.append("paquete", archivo);
  cuerpo.append("origen", origen);
  return pedir<ApiResultadoImportacion>(
    `/api/v1/companies/${ruc}/comprobantes/import-paquete`,
    token,
    { method: "POST", body: cuerpo },
  );
}

/** Persiste el Check SAP de un comprobante (admin/emisor; `lector` recibe 403). */
export async function apiActualizarCheckSap(
  token: string,
  id: string,
  checkSap: boolean,
): Promise<ApiComprobante> {
  return pedir<ApiComprobante>(`/api/v1/comprobantes/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_sap: checkSap }),
  });
}

/** Sincroniza con SUNAT el estado de todos los pendientes (admin/emisor). */
export async function apiSincronizarPendientes(
  token: string,
  ruc: string,
  limit = 25,
): Promise<ApiLoteRefresco> {
  return pedir<ApiLoteRefresco>(
    `/api/v1/companies/${ruc}/comprobantes/refresh?limit=${limit}`,
    token,
    { method: "POST" },
  );
}

/* ------------------------------------------------------------------ *
 * Mapeo API → modelo del portal
 * ------------------------------------------------------------------ */

const TIPOS_POR_CODIGO: Record<string, TipoDocumento> = {
  "01": "Factura",
  "03": "Boleta de Venta",
  "07": "Nota de Crédito",
  "08": "Nota de Débito",
};

const ESTADOS_POR_CODIGO: Record<string, EstadoSunat> = {
  aprobado: "Aprobado",
  pendiente: "Pendiente",
  anulado: "Anulado",
  rechazado: "Rechazado",
};

const TASA_IGV = 0.18;

function aNumero(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

export function mapItem(api: ApiItem): ItemComprobante {
  return {
    descripcion: api.descripcion,
    cantidad: aNumero(api.cantidad),
    unidad: api.unidad_medida ?? "NIU",
    precioUnitario: aNumero(api.precio_unitario),
    baseImponible: aNumero(api.total),
  };
}

/**
 * Convierte un comprobante de la API al modelo del portal. Los campos que el
 * XML no declara (vencimiento, forma de pago) llevan valores por defecto;
 * base e IGV se derivan del total (IGV 18%) hasta que llega el detalle con
 * los ítems reales.
 */
export function mapComprobante(api: ApiComprobante): Comprobante {
  const esCompra = api.origen === "recibido";
  // En una compra, la "contraparte" visible es el proveedor (emisor del XML).
  const cliente = esCompra
    ? { ruc: api.ruc_emisor, razonSocial: api.razon_social_emisor ?? "—" }
    : { ruc: api.ruc_receptor ?? "", razonSocial: api.razon_social_receptor ?? "—" };

  const total = aNumero(api.monto_total);
  const base = Math.round((total / (1 + TASA_IGV)) * 100) / 100;

  return {
    id: api.id,
    numero: `${api.serie}-${api.numero}`,
    tipo: TIPOS_POR_CODIGO[api.tipo_documento] ?? "Factura",
    cliente,
    fechaEmision: api.fecha_emision ?? "",
    // Sin vencimiento en el XML se muestra la emisión (la UI no admite fecha vacía).
    fechaVencimiento: api.fecha_vencimiento ?? api.fecha_emision ?? "",
    descripcion: api.cdr_descripcion || api.nombre_archivo,
    items: [],
    baseImponible: base,
    igv: Math.round((total - base) * 100) / 100,
    total,
    estadoSunat: ESTADOS_POR_CODIGO[api.estado] ?? "Pendiente",
    numeroSap: api.n_sap ?? "",
    ordenCompra: api.orden_compra ?? "",
    checkSap: api.check_sap,
    formaPago: api.forma_pago ?? "—",
    moneda: api.moneda || "PEN",
    observacion: api.cdr_descripcion ?? undefined,
  };
}

/** Empresa de la API → modelo `Empresa` del portal (datos SUNAT pendientes). */
export function mapEmpresa(api: ApiEmpresa): Empresa {
  return {
    id: api.id,
    nombreCorto: api.nombre_comercial || api.razon_social,
    razonSocial: api.razon_social,
    ruc: api.ruc,
    estado: "ACTIVO",
    condicion: "HABIDO",
    domicilioFiscal: "",
    actividadPrincipal: "",
    comprobantesElectronicos: [],
    comprobantes: [],
  };
}

/** Recalcula base/IGV del comprobante a partir de su detalle real de ítems. */
export function conDetalle(comprobante: Comprobante, api: ApiDetalle): Comprobante {
  const items = api.items.map(mapItem);
  if (items.length === 0) return comprobante;

  const base = Math.round(items.reduce((suma, item) => suma + item.baseImponible, 0) * 100) / 100;
  const igv = Math.round((comprobante.total - base) * 100) / 100;
  return {
    ...comprobante,
    items,
    baseImponible: base,
    igv,
  };
}

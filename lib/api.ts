/**
 * Cliente de la API del backend (FastAPI) y mapeo al modelo del portal.
 *
 * El frontend nunca habla con SUNAT: todas las llamadas van a este backend con
 * el JWT de Supabase en el header Authorization. Los errores comparten un único
 * formato `{ error: { code, message, details } }`.
 */

import type {
  ArchivoGuardado,
  Comprobante,
  Empresa,
  EstadoSunat,
  ItemComprobante,
  RolEmpresa,
  TipoDocumento,
} from "./types";

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
  rol: RolEmpresa;
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
  fuente?: "xml" | "sire";
  tiene_xml?: boolean;
  tiene_cdr?: boolean;
  moneda: string;
  monto_total: string | null;
  estado: string;
  estado_label: string;
  sunat_ambiente: string;
  n_sap: string | null;
  orden_compra: string | null;
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
  /** Total del conjunto filtrado; ausente si se pidió `contar=false`. */
  total?: number | null;
}

/** Indicadores del conjunto filtrado, calculados en la base de datos. */
export interface ApiResumen {
  total: number;
  por_estado: Record<string, number>;
  /** Neto por moneda (decimales como texto): notas de crédito restan; sin anulados/rechazados. */
  facturado_neto: Record<string, string | number>;
  cobertura: { exigibles: number; con_xml: number; con_cdr: number };
}

export interface ApiArchivo {
  id: string;
  comprobante_id: string | null;
  tipo: "pdf" | "xml" | "cdr" | "zip";
  nombre: string;
  mime_type: string | null;
  size_bytes: number | null;
  hash_sha256: string | null;
  estado: string;
  subido_at: string | null;
  created_at: string | null;
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

export interface ApiResultadoCdr {
  ruc: string;
  total: number;
  asociados: number;
  ya_tenian: number;
  sin_comprobante: number;
  con_error: number;
  items: Array<{
    archivo: string;
    ok: boolean;
    comprobante_id?: string | null;
    numero?: string | null;
    estado?: string | null;
    code?: string | null;
    mensaje?: string | null;
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

export interface ApiConsultaCdr {
  comprobante_id: string;
  numero: string;
  estado_anterior: string;
  estado_nuevo: string;
  estado_label: string;
  cambio_estado: boolean;
  cdr: { codigo: string; descripcion: string } | null;
  mensaje: string | null;
}

export interface ApiSireSync {
  periodo: string;
  ticket: string | null;
  estado: "completado" | "en_proceso" | "sin_datos";
  total_filas: number;
  nuevos: number;
  ya_existian: number;
  anulados: number;
  omitidos: Record<string, number>;
  evidencias: ApiArchivo[];
  /** Solo si se pidió `traer_respaldos`: resultado de la consulta a Bizlinks. */
  respaldos?: ApiBizlinksSync | null;
  respaldos_error?: string | null;
  mensaje: string;
}

/* ------------------------------------------------------------------ *
 * Bizlinks (OSE): XML firmado y CDR
 * ------------------------------------------------------------------ */

export type ApiResultadoRespaldo = "completo" | "parcial" | "sin_resultado" | "error";

export interface ApiBizlinksItem {
  comprobante_id: string;
  numero: string | null;
  resultado: ApiResultadoRespaldo;
  xml_guardado: boolean;
  cdr_guardado: boolean;
  items_cargados: number;
  mensaje: string | null;
  error_code: string | null;
  cliente_ruc?: string | null;
  cliente?: string | null;
}

export interface ApiBizlinksSync {
  ruc: string;
  /** `api` es el web service del OSE; `portal`, la consulta anónima pública. */
  canal: "api" | "portal";
  revisados: number;
  completos: number;
  parciales: number;
  sin_resultado: number;
  fallidos: number;
  xml_guardados: number;
  cdr_guardados: number;
  /** Motivo por el que el lote se detuvo (bloqueo, cuota, credenciales…). */
  detenido_por: string | null;
  mensaje: string | null;
  /** Consultas que quedan hoy (solo canal `portal`). */
  cuota_restante: number | null;
  /** Cuándo se pueden reanudar las consultas tras un bloqueo. */
  reanuda_at: string | null;
  items: ApiBizlinksItem[];
  consultado_at: string;
}

/* ------------------------------------------------------------------ *
 * Errores y transporte
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

async function errorDeRespuesta(respuesta: Response): Promise<ApiError> {
  let code = "error_desconocido";
  let mensaje = respuesta.statusText || `Error ${respuesta.status}`;
  try {
    const cuerpo = (await respuesta.json()) as { error?: { code?: string; message?: string } };
    code = cuerpo.error?.code ?? code;
    mensaje = cuerpo.error?.message ?? mensaje;
  } catch {
    // Cuerpo no JSON (p. ej. 502 del proxy): se usa el texto de estado.
  }
  return new ApiError(mensaje, code, respuesta.status);
}

async function pedir<T>(ruta: string, token: string, init: RequestInit = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_BASE}${ruta}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Revisa tu conexión o inténtalo en un momento.",
      "sin_conexion",
      0,
    );
  }
  if (!respuesta.ok) throw await errorDeRespuesta(respuesta);
  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

/* ------------------------------------------------------------------ *
 * Llamadas a la API
 * ------------------------------------------------------------------ */

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
  n_sap?: string;
  vencimiento_desde?: string;
  vencimiento_hasta?: string;
  moneda?: string;
  respaldo?: "sin_xml" | "sin_cdr" | "completo";
  orden?: "fecha" | "numero" | "cliente" | "importe";
  direccion?: "asc" | "desc";
  limit?: number;
  offset?: number;
  /** Incluir `total` en la respuesta (el servidor cuenta; pídelo solo cuando haga falta). */
  contar?: boolean;
}

function paramsDe(filtros: FiltrosApi): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== "") params.set(clave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

export async function apiComprobantes(
  token: string,
  ruc: string,
  filtros: FiltrosApi = {},
): Promise<ApiPagina> {
  return pedir<ApiPagina>(`/api/v1/companies/${ruc}/comprobantes${paramsDe(filtros)}`, token);
}

/** Indicadores (estados, facturado neto, cobertura de respaldo) del conjunto filtrado. */
export async function apiResumen(
  token: string,
  ruc: string,
  filtros: FiltrosApi = {},
): Promise<ApiResumen> {
  return pedir<ApiResumen>(
    `/api/v1/companies/${ruc}/comprobantes/resumen${paramsDe(filtros)}`,
    token,
  );
}

export async function apiDetalle(token: string, id: string): Promise<ApiDetalle> {
  return pedir<ApiDetalle>(`/api/v1/comprobantes/${id}`, token);
}

/** Archivos archivados del comprobante (XML, CDR, PDF). */
export async function apiArchivos(token: string, id: string): Promise<ApiArchivo[]> {
  const cuerpo = await pedir<{ items: ApiArchivo[] }>(`/api/v1/comprobantes/${id}/archivos`, token);
  return cuerpo.items;
}

/** URL firmada temporal (15 min) para descargar un archivo del bucket. */
export async function apiUrlDescarga(token: string, archivoId: string): Promise<ApiDescarga> {
  return pedir<ApiDescarga>(`/api/v1/archivos/${archivoId}/download-url`, token, {
    method: "POST",
  });
}

/** Descarga un archivo del bucket privado a través de su URL firmada. */
export async function apiDescargarArchivo(
  token: string,
  archivo: { id: string; nombre: string },
): Promise<{ blob: Blob; nombre: string }> {
  const { url } = await apiUrlDescarga(token, archivo.id);
  let respuesta: Response;
  try {
    respuesta = await fetch(url);
  } catch {
    throw new ApiError(
      "El navegador no pudo leer el archivo del almacenamiento. Reintenta en un momento.",
      "descarga_bloqueada",
      0,
    );
  }
  if (!respuesta.ok) {
    throw new ApiError("La URL de descarga venció; reintenta.", "download_error", respuesta.status);
  }
  return { blob: await respuesta.blob(), nombre: archivo.nombre };
}

/** Descarga el primer archivo de un tipo (`xml`, `cdr`…) del comprobante. */
export async function apiDescargarTipo(
  token: string,
  comprobanteId: string,
  tipo: ApiArchivo["tipo"],
): Promise<{ blob: Blob; nombre: string }> {
  const archivos = await apiArchivos(token, comprobanteId);
  const archivo = archivos.find((candidato) => candidato.tipo === tipo);
  if (!archivo) {
    throw new ApiError(
      tipo === "xml"
        ? "Este comprobante no tiene el XML archivado. Impórtalo desde el sistema que lo emite."
        : "Este comprobante no tiene el CDR archivado.",
      "archivo_no_encontrado",
      404,
    );
  }
  return apiDescargarArchivo(token, archivo);
}

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

/** Carga masiva de CDR: un ZIP con `R-{RUC}-{tipo}-{serie}-{numero}.zip|xml`. */
export async function apiImportarCdr(
  token: string,
  ruc: string,
  archivo: File,
): Promise<ApiResultadoCdr> {
  const cuerpo = new FormData();
  cuerpo.append("paquete", archivo);
  return pedir<ApiResultadoCdr>(`/api/v1/companies/${ruc}/comprobantes/import-cdr`, token, {
    method: "POST",
    body: cuerpo,
  });
}

/** Sube un archivo (XML, CDR o PDF) al comprobante indicado. */
export async function apiSubirArchivo(
  token: string,
  comprobanteId: string,
  archivo: File,
  tipo?: ApiArchivo["tipo"],
): Promise<ApiArchivo> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", archivo);
  if (tipo) cuerpo.append("tipo", tipo);
  return pedir<ApiArchivo>(`/api/v1/comprobantes/${comprobanteId}/archivos`, token, {
    method: "POST",
    body: cuerpo,
  });
}

/** Una fila del Excel de N° SAP tal como viene (el servidor la normaliza). */
export interface FilaSapApi {
  documento: string;
  ruc?: string;
  n_sap: string;
}

export interface ApiResultadoSap {
  ruc: string;
  recibidas: number;
  actualizadas: number;
  /** Documentos que no están en el portal: se omiten sin error. */
  no_encontradas: number;
  /** Filas ilegibles (sin documento o sin N° SAP). */
  invalidas: number;
}

/** Asigna N° SAP en lote a los comprobantes ya registrados (admin/emisor). */
export async function apiImportarSap(
  token: string,
  ruc: string,
  filas: FilaSapApi[],
): Promise<ApiResultadoSap> {
  return pedir<ApiResultadoSap>(`/api/v1/companies/${ruc}/comprobantes/import-sap`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filas }),
  });
}

/** Consulta a SUNAT el estado de los comprobantes pendientes (admin/emisor). */
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

/** Consulta el estado y el CDR de un comprobante en SUNAT (admin/emisor). */
export async function apiConsultarCdr(token: string, id: string): Promise<ApiConsultaCdr> {
  return pedir<ApiConsultaCdr>(`/api/v1/comprobantes/${id}/refresh-cdr`, token, {
    method: "POST",
  });
}

/** Sincroniza las ventas de un periodo (`AAAAMM`) desde SIRE (admin/emisor). */
export async function apiSireSync(
  token: string,
  ruc: string,
  periodo: string,
  ticket?: string,
): Promise<ApiSireSync> {
  return pedir<ApiSireSync>(`/api/v1/companies/${ruc}/sire/ventas/sync`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticket ? { periodo, ticket } : { periodo }),
  });
}

/**
 * Recupera desde Bizlinks (el OSE) el XML firmado y el CDR que falten de los comprobantes
 * emitidos (admin/emisor). Es idempotente: lo ya archivado no se vuelve a pedir.
 */
export async function apiBizlinksRespaldos(
  token: string,
  ruc: string,
  opciones: { limit?: number; desde?: string; hasta?: string } = {},
): Promise<ApiBizlinksSync> {
  return pedir<ApiBizlinksSync>(
    `/api/v1/companies/${ruc}/bizlinks/respaldos/sync${paramsDe({
      limit: opciones.limit,
      fecha_desde: opciones.desde,
      fecha_hasta: opciones.hasta,
    })}`,
    token,
    { method: "POST" },
  );
}

/** ZIP originales de SIRE archivados como evidencia de auditoría. */
export async function apiEvidencias(token: string, ruc: string): Promise<ArchivoGuardado[]> {
  const cuerpo = await pedir<{ items: ApiArchivo[] }>(
    `/api/v1/companies/${ruc}/sire/evidencias`,
    token,
  );
  return cuerpo.items.map(mapArchivo);
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

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function mapArchivo(api: ApiArchivo): ArchivoGuardado {
  return {
    id: api.id,
    tipo: api.tipo,
    nombre: api.nombre,
    tamano: api.size_bytes,
    hashSha256: api.hash_sha256,
    creado: api.subido_at ?? api.created_at,
  };
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
 * Convierte un comprobante de la API al modelo del portal. Base e IGV se derivan
 * del total (IGV 18 %) hasta que llega el detalle con los ítems reales.
 */
export function mapComprobante(api: ApiComprobante): Comprobante {
  const esCompra = api.origen === "recibido";
  // En una compra, la contraparte visible es el proveedor (emisor del XML).
  const cliente = esCompra
    ? { ruc: api.ruc_emisor, razonSocial: api.razon_social_emisor ?? "—" }
    : { ruc: api.ruc_receptor ?? "", razonSocial: api.razon_social_receptor ?? "—" };

  const total = aNumero(api.monto_total);
  const base = redondear(total / (1 + TASA_IGV));

  return {
    id: api.id,
    numero: `${api.serie}-${api.numero}`,
    tipo: TIPOS_POR_CODIGO[api.tipo_documento] ?? "Factura",
    codigoTipo: api.tipo_documento,
    cliente,
    fechaEmision: api.fecha_emision ?? "",
    fechaVencimiento: api.fecha_vencimiento ?? null,
    items: [],
    baseImponible: base,
    igv: redondear(total - base),
    total,
    estadoSunat: ESTADOS_POR_CODIGO[api.estado] ?? "Pendiente",
    numeroSap: api.n_sap ?? "",
    ordenCompra: api.orden_compra ?? "",
    formaPago: api.forma_pago ?? null,
    moneda: api.moneda || "PEN",
    fuente: api.fuente ?? "xml",
    origen: api.origen,
    nombreArchivo: api.nombre_archivo,
    cdrCodigo: api.cdr_codigo,
    cdrDescripcion: api.cdr_descripcion,
    tieneXml: api.tiene_xml ?? false,
    tieneCdr: api.tiene_cdr ?? false,
  };
}

export function mapEmpresa(api: ApiEmpresa): Empresa {
  return {
    id: api.id,
    ruc: api.ruc,
    razonSocial: api.razon_social,
    nombreCorto: api.nombre_comercial || api.razon_social,
    rol: api.rol,
    ambiente: api.sunat_ambiente,
  };
}

/** Recalcula base/IGV del comprobante a partir de su detalle real de ítems. */
export function conDetalle(comprobante: Comprobante, api: ApiDetalle): Comprobante {
  const items = api.items.map(mapItem);
  const respaldos = {
    tieneXml: api.tiene_xml ?? comprobante.tieneXml,
    tieneCdr: api.tiene_cdr ?? comprobante.tieneCdr,
  };
  if (items.length === 0) return { ...comprobante, ...respaldos };

  const base = redondear(items.reduce((suma, item) => suma + item.baseImponible, 0));
  return { ...comprobante, ...respaldos, items, baseImponible: base, igv: redondear(comprobante.total - base) };
}

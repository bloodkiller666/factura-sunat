/**
 * Modelo de dominio del portal. Refleja lo que realmente entrega el backend:
 * nada aquí es dato inventado por el frontend.
 */

export type TipoDocumento = "Factura" | "Boleta de Venta" | "Nota de Crédito" | "Nota de Débito";

/** Estado del comprobante ante SUNAT. */
export type EstadoSunat = "Aprobado" | "Pendiente" | "Anulado" | "Rechazado";

/** De dónde salió el registro: su XML o la propuesta de SIRE (solo cabecera). */
export type Fuente = "xml" | "sire";

export type RolEmpresa = "admin" | "emisor" | "lector";

export interface Cliente {
  ruc: string;
  razonSocial: string;
}

export interface ItemComprobante {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  baseImponible: number;
}

export interface Comprobante {
  id: string;
  /** Serie y correlativo: `F001-00000123`. */
  numero: string;
  tipo: TipoDocumento;
  /** Código del catálogo 01 de SUNAT (`01`, `03`, `07`, `08`). */
  codigoTipo: string;
  cliente: Cliente;
  /** ISO `yyyy-mm-dd` (vacío si el registro no la trae). */
  fechaEmision: string;
  /** ISO `yyyy-mm-dd`; `null` cuando el comprobante no declara vencimiento. */
  fechaVencimiento: string | null;
  items: ItemComprobante[];
  baseImponible: number;
  igv: number;
  total: number;
  estadoSunat: EstadoSunat;
  numeroSap: string;
  ordenCompra: string;
  /** Marca manual del usuario: ya se verificó el comprobante en SAP. */
  checkSap: boolean;
  /** `Contado`, `Crédito N días`…; `null` si el XML no la declara. */
  formaPago: string | null;
  /** `PEN` o `USD`: los importes no se convierten entre monedas. */
  moneda: string;
  fuente: Fuente;
  origen: "emitido" | "recibido";
  nombreArchivo: string;
  cdrCodigo: string | null;
  cdrDescripcion: string | null;
  /** Qué respaldos hay archivados en R2 para este comprobante. */
  tieneXml: boolean;
  tieneCdr: boolean;
  tienePdf: boolean;
}

export interface Empresa {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreCorto: string;
  rol: RolEmpresa;
  /** Ambiente SUNAT fijado para la empresa, si lo tiene. */
  ambiente: string | null;
}

/** Filtro por cobertura de respaldo: clave para preparar una auditoría. */
export type FiltroRespaldo = "TODOS" | "SIN_XML" | "SIN_CDR" | "COMPLETO";

export type FiltroCheckSap = "TODOS" | "CON" | "SIN";

export interface FiltrosState {
  /** Búsqueda por N° de documento, cliente, RUC u orden de compra. */
  q: string;
  /** Periodo `yyyy-mm`, o `"TODOS"` para no acotar por mes. */
  mes: string;
  tipo: TipoDocumento | "TODOS";
  estadoSunat: EstadoSunat | "TODOS";
  respaldo: FiltroRespaldo;
  numeroSap: string;
  checkSap: FiltroCheckSap;
  desde: string;
  hasta: string;
}

/** Archivo guardado en R2 (XML, CDR, PDF o ZIP de SIRE). */
export interface ArchivoGuardado {
  id: string;
  tipo: "pdf" | "xml" | "cdr" | "zip";
  nombre: string;
  tamano: number | null;
  hashSha256: string | null;
  creado: string | null;
}

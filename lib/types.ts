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
  /** RUC; si el cliente no tiene, su documento (DNI o identificación del exterior). */
  ruc: string;
  razonSocial: string;
  /** Qué es `ruc` cuando no es un RUC: `DNI`, `Doc. exterior`… (`undefined` si es un RUC). */
  docEtiqueta?: string;
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
  /** `Contado`, `Crédito N días`…; `null` si el XML no la declara. */
  formaPago: string | null;
  /** `PEN` o `USD`: los importes no se convierten entre monedas. */
  moneda: string;
  fuente: Fuente;
  origen: "emitido" | "recibido";
  nombreArchivo: string;
  cdrCodigo: string | null;
  cdrDescripcion: string | null;
  /** Qué respaldos (XML y CDR) hay archivados en R2 para este comprobante. */
  tieneXml: boolean;
  tieneCdr: boolean;
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

export interface FiltrosState {
  /** Búsqueda por N° de documento, cliente, RUC u orden de compra. */
  q: string;
  tipo: TipoDocumento | "TODOS";
  estadoSunat: EstadoSunat | "TODOS";
  respaldo: FiltroRespaldo;
  /** Registro que se está viendo: ventas (`emitido`) o compras a proveedores (`recibido`). */
  origen: "emitido" | "recibido";
  /** `PEN` (soles) o `USD` (dólares); los importes no se convierten entre monedas. */
  moneda: "TODOS" | "PEN" | "USD";
  numeroSap: string;
  desde: string;
  hasta: string;
  /** Rango de fecha de vencimiento (ISO `yyyy-mm-dd`, vacío = sin acotar). */
  venceDesde: string;
  venceHasta: string;
}

/** Archivo guardado en R2 (XML, CDR o ZIP de SIRE; los PDF antiguos siguen listándose). */
export interface ArchivoGuardado {
  id: string;
  tipo: "pdf" | "xml" | "cdr" | "zip";
  nombre: string;
  tamano: number | null;
  hashSha256: string | null;
  creado: string | null;
}

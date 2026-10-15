/**
 * Modelo de dominio del Portal de Gestión de Facturación Electrónica SUNAT.
 * Solo frontend: los datos provienen de mocks, pero los tipos reflejan
 * la estructura real de un comprobante electrónico peruano.
 */

export type TipoDocumento =
  | "Factura"
  | "Boleta de Venta"
  | "Guía de Remisión"
  | "Nota de Crédito"
  | "Nota de Débito"
  | "Comprobante de Retención";

/**
 * Estado de validación del comprobante ante SUNAT.
 * `Rechazado`: SUNAT devolvió la CDR con observaciones y el comprobante no tiene validez.
 */
export type EstadoSunat = "Aprobado" | "Pendiente" | "Anulado" | "Rechazado";

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
  numero: string;
  tipo: TipoDocumento;
  cliente: Cliente;
  /** ISO date: yyyy-mm-dd */
  fechaEmision: string;
  /** ISO date: yyyy-mm-dd */
  fechaVencimiento: string;
  /** Descripción general mostrada en la tabla. */
  descripcion: string;
  /** Detalle de líneas mostrado en el modal de vista previa. */
  items: ItemComprobante[];
  baseImponible: number;
  igv: number;
  total: number;
  estadoSunat: EstadoSunat;
  /** Número SAP (orden/entrada de pedido) asociado al comprobante. */
  numeroSap: string;
  /** Orden de compra del cliente asociada al comprobante (`""` si no tiene). */
  ordenCompra: string;
  /** Marca manual del usuario: el comprobante ya fue verificado en SAP. */
  checkSap: boolean;
  formaPago: string;
  /** Moneda del comprobante (`PEN` o `USD`): los importes no se convierten. */
  moneda: string;
  observacion?: string;
}

/** Fila adicional de la consulta RUC de SUNAT mostrada en la ficha de la empresa. */
export interface DatoSunat {
  etiqueta: string;
  /** Texto del dato; los saltos de línea separan los valores de una lista. */
  valor: string;
}

export interface Empresa {
  id: string;
  nombreCorto: string;
  razonSocial: string;
  ruc: string;
  estado: "ACTIVO" | "BAJA DE OFICIO";
  condicion: "HABIDO" | "NO HABIDO";
  domicilioFiscal: string;
  actividadPrincipal: string;
  comprobantesElectronicos: TipoDocumento[];
  /** Detalle ampliado de la consulta RUC (opcional en las empresas del demo). */
  detalleSunat?: DatoSunat[];
  comprobantes: Comprobante[];
}

export interface FiltrosState {
  /** Búsqueda por N° documento o cliente/RUC. */
  q: string;
  /** Periodo de emisión en formato `yyyy-mm`, o `"TODOS"` (sin filtrar por mes). */
  mes: string;
  tipo: TipoDocumento | "TODOS";
  estadoSunat: EstadoSunat | "TODOS";
  /** Número SAP a buscar (coincidencia exacta). */
  numeroSap: string;
  /** Filtra por la marca manual "Check SAP" del comprobante. */
  checkSap: FiltroCheckSap;
  desde: string;
  hasta: string;
}

/** Valores del filtro "Check SAP". */
export type FiltroCheckSap = "TODOS" | "CON" | "SIN";

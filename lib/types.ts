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

/** Estado de validación del comprobante ante SUNAT. */
export type EstadoSunat = "Aprobado" | "Pendiente" | "Anulado";

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
  /** Número SAP (órden/entrada de pedido) asociado al comprobante. */
  numeroSap: string;
  formaPago: string;
  observacion?: string;
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
  comprobantes: Comprobante[];
}

export interface FiltrosState {
  /** Búsqueda por N° documento o cliente/RUC. */
  q: string;
  tipo: TipoDocumento | "TODOS";
  estadoSunat: EstadoSunat | "TODOS";
  /** Número SAP a buscar (coincidencia exacta). */
  numeroSap: string;
  desde: string;
  hasta: string;
}

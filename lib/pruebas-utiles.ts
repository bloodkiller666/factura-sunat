/** Fábrica de comprobantes para las pruebas: solo se indica lo que importa. */
import type { Comprobante } from "./types";

let contador = 0;

export function comprobante(parcial: Partial<Comprobante> = {}): Comprobante {
  contador += 1;
  const numero = parcial.numero ?? `F001-${String(contador).padStart(8, "0")}`;
  return {
    id: `id-${contador}`,
    numero,
    tipo: "Factura",
    codigoTipo: "01",
    cliente: { ruc: "20987654321", razonSocial: "CLIENTE EJEMPLO SAC" },
    fechaEmision: "2026-09-15",
    fechaVencimiento: null,
    items: [],
    baseImponible: 100,
    igv: 18,
    total: 118,
    estadoSunat: "Aprobado",
    numeroSap: "",
    ordenCompra: "",
    formaPago: null,
    moneda: "PEN",
    fuente: "sire",
    origen: "emitido",
    nombreArchivo: `20514831620-01-${numero}`,
    cdrCodigo: null,
    cdrDescripcion: null,
    tieneXml: false,
    tieneCdr: false,
    ...parcial,
  };
}

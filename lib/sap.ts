/**
 * EXTRACCIÓN SIMULADA del N° de SAP.
 *
 * La integración real con SAP (RFC/OData) está pendiente. Esta función simula la
 * consulta: deriva un número de documento SAP determinístico a partir del
 * comprobante — prefijo `45` (documento de facturación FI en SAP) + correlativo
 * a 6 dígitos —, p. ej. `F001-00015450` → `4500015450`.
 *
 * Sirve para demostrar el flujo completo (extraer → guardar → mostrar en el
 * portal). Al conectar el conector real de SAP, se reemplaza SOLO esta función;
 * el resto del portal no cambia.
 */
export function extraerNumeroSap(numero: string): string {
  const correlativo = Number.parseInt(numero.split("-")[1] ?? "", 10);
  const seguro = Number.isFinite(correlativo) && correlativo > 0 ? correlativo : 0;
  return `4500${String(seguro % 1_000_000).padStart(6, "0")}`;
}

import { formatearFecha } from "./format";
import type { Comprobante, Empresa, ItemComprobante, TipoDocumento } from "./types";
import { escaparXml as esc } from "./xml";
import { generarXlsx } from "./xlsx";
import { crearZip } from "./zip";

/**
 * Datos del emisor que realmente necesitan los generadores de archivos.
 * `Empresa` es compatible, de modo que la ruta de API del correo puede enviar
 * solo esta parte en lugar del objeto completo con todos sus comprobantes.
 */
export type Emisor = Pick<Empresa, "ruc" | "razonSocial" | "domicilioFiscal">;

/* ------------------------------------------------------------------ *
 * Catálogos SUNAT (versiones resumidas usadas por la simulación)
 * ------------------------------------------------------------------ */

/** Catálogo N° 01: tipo de documento. */
const CODIGO_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  Factura: "01",
  "Boleta de Venta": "03",
  "Nota de Crédito": "07",
  "Nota de Débito": "08",
  "Guía de Remisión": "09",
  "Comprobante de Retención": "20",
};

/** Catálogo N° 03: códigos de unidad de medida usados por los mocks. */
const CODIGO_UNIDAD: Record<string, string> = {
  Unidad: "NIU",
  Servicio: "ZZ",
  Día: "DAY",
  Viaje: "ZZ",
  Rollo: "NIU",
  Ton: "TNE",
  Cilindro: "NIU",
  Bolsa: "NIU",
  Varilla: "NIU",
  Plancha: "NIU",
  Tubo: "NIU",
};

/** Prefijo legible del nombre de archivo PDF por tipo de comprobante. */
const PREFIJO_PDF: Record<TipoDocumento, string> = {
  Factura: "Factura",
  "Boleta de Venta": "Boleta",
  "Guía de Remisión": "GuiaRemision",
  "Nota de Crédito": "NotaCredito",
  "Nota de Débito": "NotaDebito",
  "Comprobante de Retención": "Retencion",
};

/** Espacio de nombres UBL 2.1 según la raíz del documento. */
const URN = {
  Invoice: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  CreditNote: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
  DebitNote: "urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2",
} as const;

type RaizXml = keyof typeof URN;

const TASA_IGV = 0.18;

/** Tipo MIME del reporte Excel (contenedor OOXML). */
export const TIPO_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/* ------------------------------------------------------------------ *
 * Utilidades internas
 * ------------------------------------------------------------------ */

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function numero(valor: number): string {
  return valor.toFixed(2);
}

/** Departamentos del Perú: permiten reconocer el orden de los últimos tramos. */
const DEPARTAMENTOS = new Set([
  "AMAZONAS", "ANCASH", "APURIMAC", "AREQUIPA", "AYACUCHO", "CAJAMARCA", "CALLAO", "CUSCO",
  "HUANCAVELICA", "HUANUCO", "ICA", "JUNIN", "LA LIBERTAD", "LAMBAYEQUE", "LIMA", "LORETO",
  "MADRE DE DIOS", "MOQUEGUA", "PASCO", "PIURA", "PUNO", "SAN MARTIN", "TACNA", "TUMBES",
  "UCAYALI",
]);

/**
 * Extrae distrito y provincia del domicilio fiscal. SUNAT suele terminar el
 * domicilio en "… - DISTRITO - PROVINCIA", pero en algunos contribuyentes el
 * último tramo es el distrito ("… - LIMA - LIMA - CHORRILLOS"); si el último
 * tramo no es un departamento, se invierte la lectura.
 */
function partesDomicilio(domicilio: string): { distrito: string; provincia: string } {
  const partes = domicilio
    .split(" - ")
    .map((parte) => parte.trim())
    .filter(Boolean);

  const ultimo = partes[partes.length - 1] ?? "LIMA";
  const penultimo = partes[partes.length - 2] ?? ultimo;

  if (DEPARTAMENTOS.has(ultimo)) return { provincia: ultimo, distrito: penultimo };
  if (DEPARTAMENTOS.has(penultimo)) return { provincia: penultimo, distrito: ultimo };
  return { provincia: ultimo, distrito: penultimo };
}

/** Código de afectación al IGV según la operación. */
function datosImpuesto(gravado: boolean): {
  afectacion: string;
  codigoTributo: string;
  nombreTributo: string;
} {
  return gravado
    ? { afectacion: "S", codigoTributo: "1000", nombreTributo: "IGV" }
    : { afectacion: "E", codigoTributo: "9997", nombreTributo: "EXO" };
}

/* ------------------------------------------------------------------ *
 * Nombres de archivo
 * ------------------------------------------------------------------ */

export function codigoTipoDocumento(tipo: TipoDocumento): string {
  return CODIGO_TIPO_DOCUMENTO[tipo] ?? "00";
}

/** Estándar SUNAT: `[RUC]-[TIPO]-[SERIE]-[NUMERO].xml` → 20615209385-01-F001-0004521.xml */
export function nombreArchivoXml(comprobante: Comprobante, empresa: Emisor): string {
  return `${empresa.ruc}-${codigoTipoDocumento(comprobante.tipo)}-${comprobante.numero}.xml`;
}

/** `[TIPO]-[NUMERO]-[RUC].pdf` → Factura-F001-0004521-20615209385.pdf */
export function nombreArchivoPdf(comprobante: Comprobante, empresa: Emisor): string {
  const prefijo = PREFIJO_PDF[comprobante.tipo] ?? "Comprobante";
  return `${prefijo}-${comprobante.numero}-${empresa.ruc}.pdf`;
}

/* ------------------------------------------------------------------ *
 * Generador UBL 2.1 (simulación de factura electrónica SUNAT)
 * ------------------------------------------------------------------ */

function bloqueSubtotalImpuesto(
  sangria: string,
  base: number,
  igv: number,
  impuesto: { afectacion: string; codigoTributo: string; nombreTributo: string },
): string[] {
  return [
    `${sangria}<cac:TaxSubtotal>`,
    `${sangria}  <cbc:TaxableAmount currencyID="PEN">${numero(base)}</cbc:TaxableAmount>`,
    `${sangria}  <cbc:TaxAmount currencyID="PEN">${numero(igv)}</cbc:TaxAmount>`,
    `${sangria}  <cac:TaxCategory>`,
    `${sangria}    <cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">${impuesto.afectacion}</cbc:ID>`,
    `${sangria}    <cac:TaxScheme>`,
    `${sangria}      <cbc:ID>${impuesto.codigoTributo}</cbc:ID>`,
    `${sangria}      <cbc:Name>${impuesto.nombreTributo}</cbc:Name>`,
    `${sangria}      <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>`,
    `${sangria}    </cac:TaxScheme>`,
    `${sangria}  </cac:TaxCategory>`,
    `${sangria}</cac:TaxSubtotal>`,
  ];
}

function bloqueEmisor(empresa: Emisor): string[] {
  const { distrito, provincia } = partesDomicilio(empresa.domicilioFiscal);

  return [
    "  <cac:AccountingSupplierParty>",
    "    <cac:Party>",
    "      <cac:PartyIdentification>",
    `        <cbc:ID schemeID="6">${esc(empresa.ruc)}</cbc:ID>`,
    "      </cac:PartyIdentification>",
    "      <cac:PartyName>",
    `        <cbc:Name>${esc(empresa.razonSocial)}</cbc:Name>`,
    "      </cac:PartyName>",
    "      <cac:PartyLegalEntity>",
    `        <cbc:RegistrationName>${esc(empresa.razonSocial)}</cbc:RegistrationName>`,
    "        <cac:RegistrationAddress>",
    "          <cbc:ID>150101</cbc:ID>",
    "          <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>",
    `          <cbc:CityName>${esc(provincia)}</cbc:CityName>`,
    `          <cbc:CountrySubentity>${esc(provincia)}</cbc:CountrySubentity>`,
    `          <cbc:District>${esc(distrito)}</cbc:District>`,
    "          <cac:AddressLine>",
    `            <cbc:Line>${esc(empresa.domicilioFiscal)}</cbc:Line>`,
    "          </cac:AddressLine>",
    "          <cac:Country>",
    "            <cbc:IdentificationCode>PE</cbc:IdentificationCode>",
    "          </cac:Country>",
    "        </cac:RegistrationAddress>",
    "      </cac:PartyLegalEntity>",
    "    </cac:Party>",
    "  </cac:AccountingSupplierParty>",
  ];
}

function bloqueReceptor(comprobante: Comprobante): string[] {
  // Catálogo N° 06: 6 = RUC, 1 = DNI.
  const tipoDocumento = comprobante.cliente.ruc.length === 8 ? "1" : "6";

  return [
    "  <cac:AccountingCustomerParty>",
    "    <cac:Party>",
    "      <cac:PartyIdentification>",
    `        <cbc:ID schemeID="${tipoDocumento}">${esc(comprobante.cliente.ruc)}</cbc:ID>`,
    "      </cac:PartyIdentification>",
    "      <cac:PartyLegalEntity>",
    `        <cbc:RegistrationName>${esc(comprobante.cliente.razonSocial)}</cbc:RegistrationName>`,
    "      </cac:PartyLegalEntity>",
    "    </cac:Party>",
    "  </cac:AccountingCustomerParty>",
  ];
}

function bloqueLinea(
  indice: number,
  linea: ItemComprobante,
  etiquetas: { linea: string; cantidad: string },
  impuesto: { afectacion: string; codigoTributo: string; nombreTributo: string },
  gravado: boolean,
): string[] {
  const igv = gravado ? redondear(linea.baseImponible * TASA_IGV) : 0;
  const precioConIgv = redondear(linea.precioUnitario * (1 + TASA_IGV));

  return [
    `  <cac:${etiquetas.linea}>`,
    `    <cbc:ID>${indice}</cbc:ID>`,
    `    <cbc:${etiquetas.cantidad} unitCode="${CODIGO_UNIDAD[linea.unidad] ?? "NIU"}">${linea.cantidad}</cbc:${etiquetas.cantidad}>`,
    `    <cbc:LineExtensionAmount currencyID="PEN">${numero(linea.baseImponible)}</cbc:LineExtensionAmount>`,
    "    <cac:PricingReference>",
    "      <cac:AlternativeConditionPrice>",
    `        <cbc:PriceAmount currencyID="PEN">${numero(precioConIgv)}</cbc:PriceAmount>`,
    "        <cbc:PriceTypeCode>01</cbc:PriceTypeCode>",
    "      </cac:AlternativeConditionPrice>",
    "    </cac:PricingReference>",
    "    <cac:TaxTotal>",
    `      <cbc:TaxAmount currencyID="PEN">${numero(igv)}</cbc:TaxAmount>`,
    ...bloqueSubtotalImpuesto("      ", linea.baseImponible, igv, impuesto),
    "    </cac:TaxTotal>",
    "    <cac:Item>",
    `      <cbc:Description>${esc(linea.descripcion)}</cbc:Description>`,
    "    </cac:Item>",
    "    <cac:Price>",
    `      <cbc:PriceAmount currencyID="PEN">${numero(linea.precioUnitario)}</cbc:PriceAmount>`,
    "    </cac:Price>",
    `  </cac:${etiquetas.linea}>`,
  ];
}

/**
 * Construye en memoria una factura electrónica UBL 2.1 simulada con los datos
 * reales del comprobante. Se usa `<Invoice>` para facturas/boletas y las raíces
 * `CreditNote` / `DebitNote` para las notas, tal como exige SUNAT.
 */
export function generarXmlUbl(comprobante: Comprobante, empresa: Emisor): string {
  const esNotaCredito = comprobante.tipo === "Nota de Crédito";
  const esNotaDebito = comprobante.tipo === "Nota de Débito";
  const raiz: RaizXml = esNotaCredito ? "CreditNote" : esNotaDebito ? "DebitNote" : "Invoice";

  const etiquetaTipo =
    raiz === "CreditNote"
      ? "cbc:CreditNoteTypeCode"
      : raiz === "DebitNote"
        ? "cbc:DebitNoteTypeCode"
        : "cbc:InvoiceTypeCode";
  const etiquetas = {
    linea: raiz === "CreditNote" ? "CreditNoteLine" : raiz === "DebitNote" ? "DebitNoteLine" : "InvoiceLine",
    cantidad:
      raiz === "CreditNote"
        ? "CreditedQuantity"
        : raiz === "DebitNote"
          ? "DebitedQuantity"
          : "InvoicedQuantity",
  };

  const gravado = comprobante.igv !== 0;
  const impuesto = datosImpuesto(gravado);
  const referencia = comprobante.observacion?.match(/[A-Z]{1,2}\d{2}-\d{7}/)?.[0];

  const lineas = comprobante.items.map((linea, indice) =>
    bloqueLinea(indice + 1, linea, etiquetas, impuesto, gravado),
  );

  const contenido: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${raiz}`,
    `  xmlns="${URN[raiz]}"`,
    '  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
    '  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"',
    '  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"',
    '  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">',
    "  <ext:UBLExtensions>",
    "    <ext:UBLExtension>",
    "      <ext:ExtensionContent>",
    "        <!-- Firma digital simulada: este XML de demostración no está firmado. -->",
    "      </ext:ExtensionContent>",
    "    </ext:UBLExtension>",
    "  </ext:UBLExtensions>",
    "  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>",
    "  <cbc:CustomizationID>2.0</cbc:CustomizationID>",
    `  <cbc:ID>${esc(comprobante.numero)}</cbc:ID>`,
    `  <cbc:IssueDate>${esc(comprobante.fechaEmision)}</cbc:IssueDate>`,
    "  <cbc:IssueTime>00:00:00</cbc:IssueTime>",
    `  <${etiquetaTipo}>${codigoTipoDocumento(comprobante.tipo)}</${etiquetaTipo}>`,
  ];

  if (comprobante.observacion) {
    contenido.push(`  <cbc:Note>${esc(comprobante.observacion)}</cbc:Note>`);
  }

  contenido.push("  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>");

  if (referencia) {
    contenido.push(
      "  <cac:BillingReference>",
      "    <cac:InvoiceDocumentReference>",
      `      <cbc:ID>${esc(referencia)}</cbc:ID>`,
      "      <cbc:DocumentTypeCode>01</cbc:DocumentTypeCode>",
      "    </cac:InvoiceDocumentReference>",
      "  </cac:BillingReference>",
    );
  }

  contenido.push(
    ...bloqueEmisor(empresa),
    ...bloqueReceptor(comprobante),
    "  <cac:TaxTotal>",
    `    <cbc:TaxAmount currencyID="PEN">${numero(comprobante.igv)}</cbc:TaxAmount>`,
    ...bloqueSubtotalImpuesto("    ", comprobante.baseImponible, comprobante.igv, impuesto),
    "  </cac:TaxTotal>",
    "  <cac:LegalMonetaryTotal>",
    `    <cbc:LineExtensionAmount currencyID="PEN">${numero(comprobante.baseImponible)}</cbc:LineExtensionAmount>`,
    `    <cbc:TaxInclusiveAmount currencyID="PEN">${numero(comprobante.total)}</cbc:TaxInclusiveAmount>`,
    `    <cbc:PayableAmount currencyID="PEN">${numero(comprobante.total)}</cbc:PayableAmount>`,
    "  </cac:LegalMonetaryTotal>",
  );

  for (const linea of lineas) contenido.push(...linea);

  contenido.push(`</${raiz}>`);

  return contenido.join("\n");
}

/* ------------------------------------------------------------------ *
 * Descarga y exportación a PDF (solo navegador)
 * ------------------------------------------------------------------ */

/**
 * Descarga un contenido de texto sin salir de la página: crea un Blob, un
 * enlace `<a download>` transparente y simula el clic para que el navegador
 * abra su diálogo de guardado.
 */
export function descargarArchivo(
  nombreArchivo: string,
  contenido: string | Uint8Array<ArrayBuffer>,
  tipoMime: string,
): void {
  const blob = new Blob([contenido], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.rel = "noopener";
  enlace.style.display = "none";

  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  // El objeto URL debe seguir vivo hasta que el navegador inicie la descarga.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Genera el XML UBL 2.1 del comprobante y dispara su descarga. */
export function descargarXml(comprobante: Comprobante, empresa: Emisor): string {
  const nombreArchivo = nombreArchivoXml(comprobante, empresa);
  descargarArchivo(nombreArchivo, generarXmlUbl(comprobante, empresa), "application/xml;charset=utf-8");
  return nombreArchivo;
}

/**
 * Abre el diálogo nativo de impresión (que incluye "Guardar como PDF") con el
 * nombre de archivo sugerido `Factura-[N°]-[RUC].pdf`. El contenido exportado
 * es el que vive dentro de `.area-impresion` (ver `PrintSheet`).
 */
export function imprimirPdf(
  comprobante: Comprobante,
  empresa: Emisor,
  alTerminar: () => void,
): string {
  const tituloPrevio = document.title;
  const nombreArchivo = nombreArchivoPdf(comprobante, empresa);

  document.title = nombreArchivo;

  let finalizado = false;
  const restaurar = () => {
    if (finalizado) return;
    finalizado = true;
    document.title = tituloPrevio;
    window.removeEventListener("afterprint", restaurar);
    alTerminar();
  };

  window.addEventListener("afterprint", restaurar);
  // Respaldo para navegadores que no emiten `afterprint` (p. ej. Safari).
  window.setTimeout(restaurar, 3000);
  window.print();

  return nombreArchivo;
}

/* ------------------------------------------------------------------ *
 * Reporte Excel y lote ZIP
 * ------------------------------------------------------------------ */

const TIPO_ZIP = "application/zip";

/** Separador de línea del manifiesto: compatible con cualquier visor de Windows. */
const SALTO = "\r\n";

/**
 * Columnas de datos del portal, en el orden en que se exportan al Excel.
 * Es la fuente única que también valida el botón "Importar Excel".
 */
export const CABECERAS_REPORTE = [
  "N° comprobante",
  "Tipo de documento",
  "RUC cliente",
  "Razón social cliente",
  "Fecha de emisión",
  "Fecha de vencimiento",
  "Descripción",
  "Base imponible",
  "IGV (18%)",
  "Total",
  "Estado SUNAT",
  "N° SAP",
  "Orden de compra",
  "Check SAP",
  "Forma de pago",
];

/** Una fila del reporte, en el mismo orden que `CABECERAS_REPORTE`. */
function filaReporte(comprobante: Comprobante): (string | number)[] {
  return [
    comprobante.numero,
    comprobante.tipo,
    comprobante.cliente.ruc,
    comprobante.cliente.razonSocial,
    formatearFecha(comprobante.fechaEmision),
    formatearFecha(comprobante.fechaVencimiento),
    comprobante.descripcion,
    comprobante.baseImponible,
    comprobante.igv,
    comprobante.total,
    comprobante.estadoSunat,
    comprobante.numeroSap,
    comprobante.ordenCompra,
    comprobante.checkSap ? "Sí" : "No",
    comprobante.formaPago,
  ];
}

/**
 * Conjunto a exportar en las acciones masivas (Excel y lote ZIP):
 * si no hay comprobantes seleccionados se usa todo lo visible en la tabla;
 * con selección se exportan únicamente los marcados.
 */
export function documentosAExportar(seleccionados: Comprobante[], visibles: Comprobante[]): Comprobante[] {
  return seleccionados.length > 0 ? seleccionados : visibles;
}

export function nombreArchivoExcel(cantidad: number, empresa: Emisor): string {
  return `reporte-comprobantes-${empresa.ruc}-${cantidad}.xlsx`;
}

export function nombreArchivoZip(cantidad: number, empresa: Emisor): string {
  return `lote-comprobantes-${empresa.ruc}-${cantidad}.zip`;
}

/** Construye el reporte `.xlsx` en memoria, sin tocar el DOM. */
export function construirReporteExcel(comprobantes: Comprobante[]): Uint8Array<ArrayBuffer> {
  return generarXlsx({
    nombre: "Comprobantes",
    cabeceras: CABECERAS_REPORTE,
    filas: comprobantes.map(filaReporte),
  });
}

/** Genera y descarga un reporte `.xlsx` real con los comprobantes indicados. */
export function descargarExcel(comprobantes: Comprobante[], empresa: Emisor): string {
  const nombreArchivo = nombreArchivoExcel(comprobantes.length, empresa);
  descargarArchivo(nombreArchivo, construirReporteExcel(comprobantes), TIPO_XLSX);
  return nombreArchivo;
}

function textoLeeme(comprobantes: Comprobante[], empresa: Emisor): string {
  const archivos = comprobantes
    .map((comprobante) => `- ${nombreArchivoXml(comprobante, empresa)}`)
    .join(SALTO);

  return [
    "LOTE DE COMPROBANTES ELECTRÓNICOS",
    "",
    `Emisor: ${empresa.razonSocial}`,
    `RUC: ${empresa.ruc}`,
    `Comprobantes incluidos: ${comprobantes.length}`,
    "",
    "Archivos:",
    archivos,
    "",
    "Los XML siguen el formato UBL 2.1 (simulación SUNAT) con los datos reales",
    "de cada comprobante. Los PDF se generan desde el diálogo de impresión del",
    'navegador ("Guardar como PDF") y por eso no se incluyen en este lote.',
  ].join(SALTO);
}

/** Construye el lote `.zip` en memoria, sin tocar el DOM. */
export function construirLoteZip(
  comprobantes: Comprobante[],
  empresa: Emisor,
): Uint8Array<ArrayBuffer> {
  return crearZip([
    ...comprobantes.map((comprobante) => ({
      nombre: nombreArchivoXml(comprobante, empresa),
      contenido: generarXmlUbl(comprobante, empresa),
    })),
    { nombre: "LEEME.txt", contenido: textoLeeme(comprobantes, empresa) },
  ]);
}

/** Genera y descarga un `.zip` con el XML de cada comprobante y un manifiesto. */
export function descargarLoteZip(comprobantes: Comprobante[], empresa: Emisor): string {
  const nombreArchivo = nombreArchivoZip(comprobantes.length, empresa);
  descargarArchivo(nombreArchivo, construirLoteZip(comprobantes, empresa), TIPO_ZIP);
  return nombreArchivo;
}

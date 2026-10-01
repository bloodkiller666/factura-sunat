import type { Comprobante, Empresa, ItemComprobante, TipoDocumento } from "./types";

/* ------------------------------------------------------------------ *
 * Constructor de comprobantes: mantiene consistentes base, IGV y total
 * ------------------------------------------------------------------ */

const TASA_IGV = 0.18;

/** Consecutivo para derivar el número SAP de cada comprobante (solo demo). */
let consecutivoSap = 0;

/** Los documentos que no gravan IGV (guías y retenciones). */

const SIN_IGV: TipoDocumento[] = ["Guía de Remisión", "Comprobante de Retención"];

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function item(
  descripcion: string,
  cantidad: number,
  unidad: string,
  precioUnitario: number,
): ItemComprobante {
  return {
    descripcion,
    cantidad,
    unidad,
    precioUnitario,
    baseImponible: redondear(cantidad * precioUnitario),
  };
}

type EntradaComprobante = Omit<
  Comprobante,
  "id" | "descripcion" | "baseImponible" | "igv" | "total" | "numeroSap" | "ordenCompra" | "checkSap"
> & {
  id?: string;
  descripcion?: string;
  /** Orden de compra del cliente (opcional: sin ella, el campo queda vacío). */
  ordenCompra?: string;
  /** Estado inicial de la marca manual (opcional: sin ella, nace sin marcar). */
  checkSap?: boolean;
};

function describir(items: ItemComprobante[]): string {
  if (items.length === 0) return "Traslado de bienes";
  if (items.length === 1) return items[0].descripcion;
  return `${items[0].descripcion} (+${items.length - 1} ítem${items.length - 1 === 1 ? "" : "s"})`;
}

function documento(entrada: EntradaComprobante): Comprobante {
  const { descripcion, id, ordenCompra = "", checkSap = false, ...resto } = entrada;
  const baseImponible = redondear(resto.items.reduce((suma, i) => suma + i.baseImponible, 0));
  const igv = SIN_IGV.includes(resto.tipo) ? 0 : redondear(baseImponible * TASA_IGV);
  consecutivoSap += 1;
  return {
    ...resto,
    id: id ?? resto.numero,
    descripcion: descripcion ?? describir(resto.items),
    baseImponible,
    igv,
    total: redondear(baseImponible + igv),
    numeroSap: `4500926${String(consecutivoSap).padStart(3, "0")}`,
    ordenCompra,
    checkSap,
  };
}

/* ------------------------------------------------------------------ *
 * Periodos del demo (el selector de periodo y los KPIs usan estos meses)
 * ------------------------------------------------------------------ */

/** Periodos disponibles (`yyyy-mm`), del más reciente al más antiguo. */
export const PERIODOS_DEMO = ["2026-10", "2026-09"];

/* ------------------------------------------------------------------ *
 * Clientes recurrentes
 * ------------------------------------------------------------------ */

const CLIENTES = {
  andina: { ruc: "20600587880", razonSocial: "CONSTRUCTORA E INVERSIONES ANDINA S.A.C." },
  losAndes: { ruc: "20614496186", razonSocial: "ANDES MINERA GRUPO S.A.C." },
  vega: { ruc: "20516517744", razonSocial: "TRANSPORTE LOGISTICO VEGA SAC" },
  puertaDelSol: { ruc: "20478058137", razonSocial: "INMOBILIARIA PUERTA DEL SOL S.A.C." },
  miranda: { ruc: "20608110918", razonSocial: "INVERSIONES Y PROYECTOS MIRANDA SOCIEDAD ANONIMA CERRADA" },
  santaRita: { ruc: "20512441506", razonSocial: "MINERA SANTA RITA DE CASIA EIRL" },
  delNorte: { ruc: "20610627740", razonSocial: "CONSTRUCCION Y CONSERVACION DEL NORTE S.A.C." },
  valleVerde: { ruc: "20613628917", razonSocial: "AGRICOLA VALLE VERDE S.A.C." },
  vialLimaSur: { ruc: "20551564411", razonSocial: "CONSORCIO VIAL DEL SUR" },
  lurin: { ruc: "20131376767", razonSocial: "MUNICIPALIDAD DISTRITAL DE LURÍN" },
  horizonteAndino: { ruc: "20481857466", razonSocial: "CONSTRUCTORA HORIZONTE ANDINO S.A.C." },
} as const;

/* ------------------------------------------------------------------ *
 * EMPRESAS DEL GRUPO TDM
 * ------------------------------------------------------------------ */

export const EMPRESAS: Empresa[] = [
  {
    id: "servicios",
    nombreCorto: "TDM Servicios",
    razonSocial: "TDM SERVICIOS S.A.C.",
    ruc: "20615209385",
    estado: "ACTIVO",
    condicion: "HABIDO",
    domicilioFiscal:
      "ALM. LOS HORIZONTES NRO. 905 URB. LOS HUERTOS DE VILLA - CHORRILLOS - LIMA",
    actividadPrincipal:
      "Otras actividades especializadas de construcción / Inmobiliarias / Alquiler de maquinaria y equipo",
    comprobantesElectronicos: ["Factura", "Boleta de Venta"],
    comprobantes: [
      documento({
        numero: "F001-0004521",
        tipo: "Factura",
        cliente: CLIENTES.andina,
        fechaEmision: "2026-09-02",
        fechaVencimiento: "2026-09-17",
        items: [item("Alquiler de excavadora hidráulica 320D con operador", 1, "Servicio", 14800)],
        estadoSunat: "Aprobado",
        formaPago: "Transferencia bancaria",
        ordenCompra: "OC-2026-0148",
        checkSap: true,
      }),
      documento({
        numero: "F001-0004522",
        tipo: "Factura",
        cliente: CLIENTES.losAndes,
        fechaEmision: "2026-09-05",
        fechaVencimiento: "2026-09-20",
        items: [
          item("Servicio de instalación y montaje de estructura metálica en obra", 1, "Servicio", 22500),
        ],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0203",
        checkSap: true,
      }),
      documento({
        numero: "B001-0002318",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.vega,
        fechaEmision: "2026-09-08",
        fechaVencimiento: "2026-09-08",
        items: [
          item("Mantenimiento preventivo de maquinaria pesada (aceite y filtros)", 3, "Día", 1250),
        ],
        estadoSunat: "Aprobado",
        formaPago: "Efectivo",
      }),
      documento({
        numero: "F001-0004523",
        tipo: "Factura",
        cliente: CLIENTES.puertaDelSol,
        fechaEmision: "2026-09-11",
        fechaVencimiento: "2026-09-26",
        items: [
          item("Alquiler de plataforma de tijera eléctrica 12 m", 30, "Día", 185),
        ],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        observacion: "Cliente solicitó reprogramación de pago.",
        ordenCompra: "OC-2026-0261",
      }),
      documento({
        numero: "B001-0002319",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.miranda,
        fechaEmision: "2026-09-15",
        fechaVencimiento: "2026-09-15",
        items: [item("Servicio de demolición y habilitación de terreno — obra Chorrillos", 1, "Servicio", 8900)],
        estadoSunat: "Pendiente",
        formaPago: "Transferencia bancaria",
        observacion: "En espera de confirmación de la CDR por SUNAT.",
      }),
      documento({
        numero: "F001-0004524",
        tipo: "Factura",
        cliente: CLIENTES.losAndes,
        fechaEmision: "2026-09-19",
        fechaVencimiento: "2026-10-04",
        items: [
          item("Alquiler de retroexcavadora 416F2 con operador", 1, "Servicio", 9200),
          item("Traslado de maquinaria en plataforma", 2, "Viaje", 850),
        ],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0302",
        checkSap: true,
      }),
      documento({
        numero: "F001-0004525",
        tipo: "Factura",
        cliente: CLIENTES.andina,
        fechaEmision: "2026-09-23",
        fechaVencimiento: "2026-10-08",
        items: [item("Servicio de topografía y control de avance de obra — frente Huachipa", 1, "Servicio", 6400)],
        estadoSunat: "Anulado",
        formaPago: "Crédito 15 días",
        observacion: "Anulado por error en el RUC del adquirente.",
        ordenCompra: "OC-2026-0318",
      }),
      /* --- Octubre 2026 (6 comprobantes) -------------------------------- */
      documento({
        numero: "F001-0004526",
        tipo: "Factura",
        cliente: CLIENTES.andina,
        fechaEmision: "2026-10-02",
        fechaVencimiento: "2026-10-17",
        items: [item("Alquiler de excavadora hidráulica 320D con operador — frente Callao", 1, "Servicio", 15200)],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0405",
        checkSap: true,
      }),
      documento({
        numero: "B001-0002320",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.miranda,
        fechaEmision: "2026-10-06",
        fechaVencimiento: "2026-10-06",
        items: [item("Movimiento de tierras con cargador frontal — obra Pachacámac", 2, "Día", 1980)],
        estadoSunat: "Rechazado",
        formaPago: "Transferencia bancaria",
        observacion: "Rechazado por SUNAT (código 2011): el RUC del adquirente no está habido.",
      }),
      documento({
        numero: "F001-0004527",
        tipo: "Factura",
        cliente: CLIENTES.puertaDelSol,
        fechaEmision: "2026-10-08",
        fechaVencimiento: "2026-10-23",
        items: [item("Alquiler de grúa torre de 40 m con operador", 20, "Día", 420)],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0430",
        checkSap: true,
      }),
      documento({
        numero: "B001-0002321",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.vega,
        fechaEmision: "2026-10-12",
        fechaVencimiento: "2026-10-12",
        items: [item("Mantenimiento correctivo de maquinaria pesada en taller", 4, "Día", 1350)],
        estadoSunat: "Pendiente",
        formaPago: "Efectivo",
        observacion: "Pendiente de aceptación en el resumen diario de boletas.",
      }),
      documento({
        numero: "F001-0004528",
        tipo: "Factura",
        cliente: CLIENTES.losAndes,
        fechaEmision: "2026-10-15",
        fechaVencimiento: "2026-10-30",
        items: [
          item("Alquiler de excavadora hidráulica 320D con operador", 1, "Servicio", 15900),
          item("Traslado de maquinaria en cama baja", 1, "Viaje", 1450),
        ],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0455",
        checkSap: true,
      }),
      documento({
        numero: "F001-0004529",
        tipo: "Factura",
        cliente: CLIENTES.horizonteAndino,
        fechaEmision: "2026-10-22",
        fechaVencimiento: "2026-11-06",
        items: [item("Servicio de izaje con grúa de 60 t — obra San Juan de Lurigancho", 1, "Servicio", 12400)],
        estadoSunat: "Anulado",
        formaPago: "Crédito 30 días",
        observacion: "Anulada por cambio de cliente en la orden de trabajo.",
        ordenCompra: "OC-2026-0470",
      }),
    ],
  },
  {
    id: "geosinteticos",
    nombreCorto: "TDM Geosintéticos",
    razonSocial: "TDM GEOSINTETICOS S.A.",
    ruc: "20551198058",
    estado: "ACTIVO",
    condicion: "HABIDO",
    domicilioFiscal:
      "ALM. LOS HORIZONTES NRO. 905 URB. LOS HUERTOS DE VILLA - CHORRILLOS - LIMA",
    actividadPrincipal:
      "Venta al por menor no realizada en comercios / Fabricación de productos de plástico",
    comprobantesElectronicos: [
      "Factura",
      "Boleta de Venta",
      "Nota de Crédito",
      "Nota de Débito",
      "Guía de Remisión",
    ],
    comprobantes: [
      documento({
        numero: "F002-0005417",
        tipo: "Factura",
        cliente: CLIENTES.santaRita,
        fechaEmision: "2026-09-01",
        fechaVencimiento: "2026-09-16",
        items: [item("Geomembrana HDPE 1.5 mm — rollo 7.0 x 100 m", 12, "Rollo", 2480)],
        estadoSunat: "Aprobado",
        formaPago: "Transferencia bancaria",
        ordenCompra: "OC-2026-0075",
        checkSap: true,
      }),
      documento({
        numero: "F002-0005418",
        tipo: "Factura",
        cliente: CLIENTES.delNorte,
        fechaEmision: "2026-09-04",
        fechaVencimiento: "2026-09-19",
        items: [item("Geotextil no tejido para drenaje 200 g/m² — rollo 2 x 100 m", 40, "Rollo", 395)],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0091",
        checkSap: true,
      }),
      documento({
        numero: "B002-0002210",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.valleVerde,
        fechaEmision: "2026-09-09",
        fechaVencimiento: "2026-09-09",
        items: [item("Liner plastificado para reservorio — geomembrana PVC 1.0 mm", 5, "Unidad", 1120)],
        estadoSunat: "Aprobado",
        formaPago: "Efectivo",
      }),
      documento({
        numero: "FC02-0000193",
        tipo: "Nota de Crédito",
        cliente: CLIENTES.santaRita,
        fechaEmision: "2026-09-11",
        fechaVencimiento: "2026-09-26",
        items: [item("Descuento comercial sobre geomembrana HDPE (ref. F002-0005417)", 1, "Servicio", -1250)],
        estadoSunat: "Aprobado",
        formaPago: "Nota de crédito aplicada",
        observacion: "Modifica el importe total de la factura F002-0005417.",
        ordenCompra: "OC-2026-0075",
        checkSap: true,
      }),
      documento({
        numero: "FD02-0000072",
        tipo: "Nota de Débito",
        cliente: CLIENTES.delNorte,
        fechaEmision: "2026-09-14",
        fechaVencimiento: "2026-09-29",
        items: [item("Flete adicional por traslado a almacén Arequipa", 1, "Servicio", 980)],
        estadoSunat: "Pendiente",
        formaPago: "Crédito 15 días",
        observacion: "En espera de confirmación de la CDR por SUNAT.",
        ordenCompra: "OC-2026-0091",
      }),
      documento({
        numero: "T002-0001188",
        tipo: "Guía de Remisión",
        cliente: CLIENTES.delNorte,
        fechaEmision: "2026-09-16",
        fechaVencimiento: "2026-09-16",
        items: [],
        estadoSunat: "Aprobado",
        formaPago: "No aplica",
        observacion: "Traslado de geomembrana HDPE de planta Chorrillos a almacén Arequipa.",
        ordenCompra: "OC-2026-0091",
        checkSap: true,
      }),
      documento({
        numero: "F002-0005419",
        tipo: "Factura",
        cliente: CLIENTES.santaRita,
        fechaEmision: "2026-09-20",
        fechaVencimiento: "2026-10-05",
        items: [item("Geomalla biaxial de refuerzo 40 kN/m para estabilización de taludes", 8, "Rollo", 1730)],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0114",
      }),
      documento({
        numero: "F002-0005420",
        tipo: "Factura",
        cliente: CLIENTES.valleVerde,
        fechaEmision: "2026-09-24",
        fechaVencimiento: "2026-10-09",
        items: [
          item("Geomembrana HDPE 1.0 mm — rollo 5.8 x 50 m", 20, "Rollo", 1150),
          item("Cinta de sellado térmico para HDPE", 15, "Rollo", 85),
        ],
        estadoSunat: "Pendiente",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0137",
      }),
      /* --- Octubre 2026 (6 comprobantes) -------------------------------- */
      documento({
        numero: "F002-0005421",
        tipo: "Factura",
        cliente: CLIENTES.delNorte,
        fechaEmision: "2026-10-05",
        fechaVencimiento: "2026-10-20",
        items: [item("Geomembrana HDPE 1.5 mm — rollo 7.0 x 100 m", 18, "Rollo", 2480)],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0208",
        checkSap: true,
      }),
      documento({
        numero: "F002-0005422",
        tipo: "Factura",
        cliente: CLIENTES.santaRita,
        fechaEmision: "2026-10-09",
        fechaVencimiento: "2026-10-24",
        items: [item("Geodren de alto módulo para cobertura de relaves", 25, "Rollo", 640)],
        estadoSunat: "Pendiente",
        formaPago: "Crédito 15 días",
        observacion: "En espera de confirmación de la CDR por SUNAT.",
        ordenCompra: "OC-2026-0231",
      }),
      documento({
        numero: "B002-0002211",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.valleVerde,
        fechaEmision: "2026-10-03",
        fechaVencimiento: "2026-10-03",
        items: [item("Liner plastificado para reservorio — geomembrana PVC 1.0 mm", 8, "Unidad", 1120)],
        estadoSunat: "Aprobado",
        formaPago: "Efectivo",
      }),
      documento({
        numero: "FC02-0000194",
        tipo: "Nota de Crédito",
        cliente: CLIENTES.delNorte,
        fechaEmision: "2026-10-14",
        fechaVencimiento: "2026-10-29",
        items: [item("Descuento comercial sobre geomembrana HDPE (ref. F002-0005421)", 1, "Servicio", -1850)],
        estadoSunat: "Aprobado",
        formaPago: "Nota de crédito aplicada",
        observacion: "Modifica el importe total de la factura F002-0005421.",
        ordenCompra: "OC-2026-0208",
        checkSap: true,
      }),
      documento({
        numero: "T002-0001189",
        tipo: "Guía de Remisión",
        cliente: CLIENTES.santaRita,
        fechaEmision: "2026-10-20",
        fechaVencimiento: "2026-10-20",
        items: [],
        estadoSunat: "Anulado",
        formaPago: "No aplica",
        observacion: "Anulada: el destino de descarga cambió a la unidad minera de Oyón.",
        ordenCompra: "OC-2026-0231",
      }),
      documento({
        numero: "F002-0005423",
        tipo: "Factura",
        cliente: CLIENTES.santaRita,
        fechaEmision: "2026-10-27",
        fechaVencimiento: "2026-11-11",
        items: [item("Geomalla biaxial de refuerzo 40 kN/m — rollo 4 x 50 m", 12, "Rollo", 1790)],
        estadoSunat: "Rechazado",
        formaPago: "Crédito 15 días",
        observacion: "Rechazado por SUNAT (código 1034): el RUC del nombre del archivo no coincide con el del XML.",
        ordenCompra: "OC-2026-0256",
      }),
    ],
  },
  {
    /*
     * Ficha tomada de la consulta RUC de SUNAT: RUC 20123531389, nombre comercial
     * TDM, actividad principal 4663 (venta al por mayor de materiales de
     * construcción y ferretería) y secundaria 4390.
     */
    id: "materiales",
    nombreCorto: "TDM",
    razonSocial: "TECNOLOGIA DE MATERIALES S.A.",
    ruc: "20123531389",
    estado: "ACTIVO",
    condicion: "HABIDO",
    domicilioFiscal:
      "AV. ALAMEDA LOS HORIZONTES NRO. 905 URB. LOT.PRE URBA H. DE VILLA (MZ.I-01 LT.02-I URB. LOS HUERTOS DE VILLA) LIMA - LIMA - CHORRILLOS",
    actividadPrincipal:
      "4663 - Venta al por mayor de materiales de construcción, artículos de ferretería y equipo y materiales de fontanería y calefacción / 4390 - Otras actividades especializadas de construcción",
    comprobantesElectronicos: [
      "Factura",
      "Boleta de Venta",
      "Nota de Crédito",
      "Nota de Débito",
      "Guía de Remisión",
      "Comprobante de Retención",
    ],
    detalleSunat: [
      { etiqueta: "Tipo de contribuyente", valor: "SOCIEDAD ANONIMA" },
      { etiqueta: "Nombre comercial", valor: "TDM" },
      { etiqueta: "Fecha de inscripción", valor: "30/04/1993" },
      { etiqueta: "Fecha de inicio de actividades", valor: "01/10/1992" },
      { etiqueta: "Sistema de emisión de comprobante", valor: "MANUAL" },
      { etiqueta: "Actividad de comercio exterior", valor: "IMPORTADOR/EXPORTADOR" },
      { etiqueta: "Sistema de contabilidad", valor: "COMPUTARIZADO" },
      {
        etiqueta: "Actividades económicas",
        valor:
          "Principal — 4663: VENTA AL POR MAYOR DE MATERIALES DE CONSTRUCCIÓN, ARTÍCULOS DE FERRETERÍA Y EQUIPO Y MATERIALES DE FONTANERÍA Y CALEFACCIÓN\nSecundaria 1 — 4390: OTRAS ACTIVIDADES ESPECIALIZADAS DE CONSTRUCCIÓN",
      },
      {
        etiqueta: "Comprobantes de pago c/aut. de impresión (F. 806 u 816)",
        valor:
          "FACTURA\nBOLETA DE VENTA\nNOTA DE CREDITO\nNOTA DE DEBITO\nGUIA DE REMISION - REMITENTE\nCOMPROBANTE DE RETENCION\nCOMPROBANTE DE PERCEPCION VENTA INTERNA",
      },
      {
        etiqueta: "Sistema de emisión electrónica",
        valor:
          "FACTURA PORTAL DESDE 30/04/2019\nBOLETA PORTAL DESDE 29/07/2020\nDESDE LOS SISTEMAS DEL CONTRIBUYENTE. AUTORIZ DESDE 04/06/2015\nGUIA DE REMISION DESDE 09/05/2019",
      },
      { etiqueta: "Emisor electrónico desde", valor: "04/06/2015" },
      {
        etiqueta: "Comprobantes electrónicos",
        valor:
          "BOLETA (desde 04/06/2015)\nFACTURA (desde 04/06/2015)\nGUIA (desde 09/05/2019)",
      },
      { etiqueta: "Afiliado al PLE desde", valor: "20/12/2012" },
      {
        etiqueta: "Padrones",
        valor:
          "Incorporado al Régimen de Agentes de Retención de IGV (R.S. 037-2002) a partir del 01/06/2002\nExcluido del Régimen de Agentes de Percepción de IGV - Venta Interna a partir del 01/02/2016",
      },
    ],
    comprobantes: [
      documento({
        numero: "F003-0009034",
        tipo: "Factura",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-03",
        fechaVencimiento: "2026-09-18",
        items: [item("Cemento Portland Tipo I — bolsa 42.5 kg", 800, "Bolsa", 27.5)],
        estadoSunat: "Aprobado",
        formaPago: "Transferencia bancaria",
        ordenCompra: "OC-2026-0451",
        checkSap: true,
      }),
      documento({
        numero: "F003-0009035",
        tipo: "Factura",
        cliente: CLIENTES.lurin,
        fechaEmision: "2026-09-06",
        fechaVencimiento: "2026-09-21",
        items: [item("Varilla corrugada 1/2 pulg. x 9 m — grado 60", 600, "Varilla", 32.4)],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        observacion: "Orden de compra municipal N° 4471-2026.",
        ordenCompra: "OC-4471-2026",
        checkSap: true,
      }),
      documento({
        numero: "B003-0001490",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.horizonteAndino,
        fechaEmision: "2026-09-10",
        fechaVencimiento: "2026-09-10",
        items: [item("Servicio de transporte de materiales en camión grúa — Lima a Huancayo", 4, "Viaje", 2350)],
        estadoSunat: "Aprobado",
        formaPago: "Transferencia bancaria",
      }),
      documento({
        numero: "FC03-0000255",
        tipo: "Nota de Crédito",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-13",
        fechaVencimiento: "2026-09-28",
        items: [item("Devolución de cemento observado en obra (ref. F003-0009034)", 1, "Servicio", -1960)],
        estadoSunat: "Aprobado",
        formaPago: "Nota de crédito aplicada",
        ordenCompra: "OC-2026-0451",
        checkSap: true,
      }),
      documento({
        numero: "FD03-0000089",
        tipo: "Nota de Débito",
        cliente: CLIENTES.lurin,
        fechaEmision: "2026-09-15",
        fechaVencimiento: "2026-09-30",
        items: [item("Flete adicional por descarga fuera de horario en almacén Lurín", 1, "Servicio", 640)],
        estadoSunat: "Pendiente",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-4471-2026",
      }),
      documento({
        numero: "T003-0000771",
        tipo: "Guía de Remisión",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-17",
        fechaVencimiento: "2026-09-17",
        items: [],
        estadoSunat: "Anulado",
        formaPago: "No aplica",
        observacion: "Anulada por cambio de placa del vehículo transportista.",
        ordenCompra: "OC-2026-0451",
      }),
      documento({
        numero: "F003-0009036",
        tipo: "Factura",
        cliente: CLIENTES.horizonteAndino,
        fechaEmision: "2026-09-21",
        fechaVencimiento: "2026-10-06",
        items: [item("Plancha de acero estructural A36 — 1.20 x 2.40 m x 6 mm", 40, "Plancha", 780)],
        estadoSunat: "Aprobado",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0512",
        checkSap: true,
      }),
      documento({
        numero: "F003-0009037",
        tipo: "Factura",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-25",
        fechaVencimiento: "2026-10-10",
        items: [item("Servicio de transporte de materiales a obra — Lurín a Arequipa", 6, "Viaje", 3120)],
        estadoSunat: "Pendiente",
        formaPago: "Crédito 15 días",
        ordenCompra: "OC-2026-0451",
      }),
      documento({
        numero: "RE03-0000041",
        tipo: "Comprobante de Retención",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-26",
        fechaVencimiento: "2026-10-11",
        items: [item("Retención del 4% del IGV — ref. factura F003-0009034", 1, "Servicio", 3719.36)],
        estadoSunat: "Aprobado",
        formaPago: "Retención de IGV",
        observacion: "Régimen de retenciones del IGV — Agente de retención designado.",
        ordenCompra: "OC-2026-0451",
        checkSap: true,
      }),
      /* --- Octubre 2026 (6 comprobantes) -------------------------------- */
      documento({
        numero: "F003-0009038",
        tipo: "Factura",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-10-01",
        fechaVencimiento: "2026-10-16",
        items: [
          item("Fierro corrugado 3/8 pulg. x 9 m — grado 60", 900, "Varilla", 18.9),
          item("Alambre negro recocido N° 16 — rollo 100 kg", 5, "Rollo", 420),
        ],
        estadoSunat: "Aprobado",
        formaPago: "Transferencia bancaria",
        ordenCompra: "OC-2026-0640",
        checkSap: true,
      }),
      documento({
        numero: "F003-0009039",
        tipo: "Factura",
        cliente: CLIENTES.lurin,
        fechaEmision: "2026-10-07",
        fechaVencimiento: "2026-10-22",
        items: [item("Block de concreto 12 x 20 x 40 cm para muro pandereta", 4500, "Unidad", 3.85)],
        estadoSunat: "Rechazado",
        formaPago: "Crédito 30 días",
        observacion: "Rechazado por SUNAT (código 1033): el comprobante fue registrado previamente con otros datos.",
        ordenCompra: "OC-4471-2026",
      }),
      documento({
        numero: "B003-0001491",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.horizonteAndino,
        fechaEmision: "2026-10-09",
        fechaVencimiento: "2026-10-09",
        items: [item("Pintura látex lavable blanco — balde 5 gal", 12, "Unidad", 145)],
        estadoSunat: "Anulado",
        formaPago: "Efectivo",
        observacion: "Anulada por error en la dirección de entrega (comunicada en el resumen diario).",
      }),
      documento({
        numero: "F003-0009040",
        tipo: "Factura",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-10-13",
        fechaVencimiento: "2026-10-28",
        items: [
          item("Tubería PVC-SAP 4 pulg. x 3 m — desagüe", 120, "Tubo", 42.5),
          item("Pegamento para PVC — envase 1/4 gal", 24, "Unidad", 38),
        ],
        estadoSunat: "Aprobado",
        formaPago: "Transferencia bancaria",
        ordenCompra: "OC-2026-0698",
        checkSap: true,
      }),
      documento({
        numero: "F003-0009041",
        tipo: "Factura",
        cliente: CLIENTES.lurin,
        fechaEmision: "2026-10-19",
        fechaVencimiento: "2026-11-03",
        items: [item("Cerámica para piso 45 x 45 cm — caja 1.62 m²", 300, "Unidad", 32.9)],
        estadoSunat: "Pendiente",
        formaPago: "Crédito 30 días",
        observacion: "En espera de confirmación de la CDR por SUNAT.",
        ordenCompra: "OC-4471-2026",
      }),
      documento({
        numero: "RE03-0000042",
        tipo: "Comprobante de Retención",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-10-24",
        fechaVencimiento: "2026-11-08",
        items: [item("Retención del 4% del importe total — ref. factura F003-0009040", 1, "Servicio", 283.77)],
        estadoSunat: "Aprobado",
        formaPago: "Retención de IGV",
        observacion: "Régimen de retenciones del IGV — Agente de retención designado.",
        ordenCompra: "OC-2026-0698",
        checkSap: true,
      }),
    ],
  },
];

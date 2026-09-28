import type { Comprobante, Empresa, ItemComprobante, TipoDocumento } from "./types";

/* ------------------------------------------------------------------ *
 * Constructor de comprobantes: mantiene consistentes base, IGV y total
 * ------------------------------------------------------------------ */

const TASA_IGV = 0.18;

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

type EntradaComprobante = Omit<Comprobante, "id" | "descripcion" | "baseImponible" | "igv" | "total"> & {
  id?: string;
  descripcion?: string;
};

function describir(items: ItemComprobante[]): string {
  if (items.length === 0) return "Traslado de bienes";
  if (items.length === 1) return items[0].descripcion;
  return `${items[0].descripcion} (+${items.length - 1} ítem${items.length - 1 === 1 ? "" : "s"})`;
}

function documento(entrada: EntradaComprobante): Comprobante {
  const { descripcion, id, ...resto } = entrada;
  const baseImponible = redondear(resto.items.reduce((suma, i) => suma + i.baseImponible, 0));
  const igv = SIN_IGV.includes(resto.tipo) ? 0 : redondear(baseImponible * TASA_IGV);

  return {
    ...resto,
    id: id ?? resto.numero,
    descripcion: descripcion ?? describir(resto.items),
    baseImponible,
    igv,
    total: redondear(baseImponible + igv),
  };
}

/* ------------------------------------------------------------------ *
 * Periodo del demo (los KPIs "del mes" se calculan sobre este periodo)
 * ------------------------------------------------------------------ */

export const PERIODO_DEMO = { anio: 2026, mes: 9, etiqueta: "Setiembre 2026" };

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
        estadoComercial: "Pagado",
        formaPago: "Transferencia bancaria",
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
        estadoComercial: "Pendiente",
        formaPago: "Crédito 15 días",
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
        estadoComercial: "Pagado",
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
        estadoComercial: "Vencido",
        formaPago: "Crédito 15 días",
        observacion: "Cliente solicitó reprogramación de pago.",
      }),
      documento({
        numero: "B001-0002319",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.miranda,
        fechaEmision: "2026-09-15",
        fechaVencimiento: "2026-09-15",
        items: [item("Servicio de demolición y habilitación de terreno — obra Chorrillos", 1, "Servicio", 8900)],
        estadoSunat: "Pendiente",
        estadoComercial: "Pendiente",
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
        estadoComercial: "Pendiente",
        formaPago: "Crédito 15 días",
      }),
      documento({
        numero: "F001-0004525",
        tipo: "Factura",
        cliente: CLIENTES.andina,
        fechaEmision: "2026-09-23",
        fechaVencimiento: "2026-10-08",
        items: [item("Servicio de topografía y control de avance de obra — frente Huachipa", 1, "Servicio", 6400)],
        estadoSunat: "Anulado",
        estadoComercial: "Vencido",
        formaPago: "Crédito 15 días",
        observacion: "Anulado por error en el RUC del adquirente.",
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
        estadoComercial: "Pagado",
        formaPago: "Transferencia bancaria",
      }),
      documento({
        numero: "F002-0005418",
        tipo: "Factura",
        cliente: CLIENTES.delNorte,
        fechaEmision: "2026-09-04",
        fechaVencimiento: "2026-09-19",
        items: [item("Geotextil no tejido para drenaje 200 g/m² — rollo 2 x 100 m", 40, "Rollo", 395)],
        estadoSunat: "Aprobado",
        estadoComercial: "Pendiente",
        formaPago: "Crédito 15 días",
      }),
      documento({
        numero: "B002-0002210",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.valleVerde,
        fechaEmision: "2026-09-09",
        fechaVencimiento: "2026-09-09",
        items: [item("Liner plastificado para reservorio — geomembrana PVC 1.0 mm", 5, "Unidad", 1120)],
        estadoSunat: "Aprobado",
        estadoComercial: "Pagado",
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
        estadoComercial: "Pagado",
        formaPago: "Nota de crédito aplicada",
        observacion: "Modifica el importe total de la factura F002-0005417.",
      }),
      documento({
        numero: "FD02-0000072",
        tipo: "Nota de Débito",
        cliente: CLIENTES.delNorte,
        fechaEmision: "2026-09-14",
        fechaVencimiento: "2026-09-29",
        items: [item("Flete adicional por traslado a almacén Arequipa", 1, "Servicio", 980)],
        estadoSunat: "Pendiente",
        estadoComercial: "Pendiente",
        formaPago: "Crédito 15 días",
        observacion: "En espera de confirmación de la CDR por SUNAT.",
      }),
      documento({
        numero: "T002-0001188",
        tipo: "Guía de Remisión",
        cliente: CLIENTES.delNorte,
        fechaEmision: "2026-09-16",
        fechaVencimiento: "2026-09-16",
        items: [],
        estadoSunat: "Aprobado",
        estadoComercial: "Pagado",
        formaPago: "No aplica",
        observacion: "Traslado de geomembrana HDPE de planta Chorrillos a almacén Arequipa.",
      }),
      documento({
        numero: "F002-0005419",
        tipo: "Factura",
        cliente: CLIENTES.santaRita,
        fechaEmision: "2026-09-20",
        fechaVencimiento: "2026-10-05",
        items: [item("Geomalla biaxial de refuerzo 40 kN/m para estabilización de taludes", 8, "Rollo", 1730)],
        estadoSunat: "Aprobado",
        estadoComercial: "Pendiente",
        formaPago: "Crédito 15 días",
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
        estadoComercial: "Pendiente",
        formaPago: "Crédito 15 días",
      }),
    ],
  },
  {
    id: "asfaltos",
    nombreCorto: "TDM Asfaltos",
    razonSocial: "TDM ASFALTOS S.A.C.",
    ruc: "20514831620",
    estado: "ACTIVO",
    condicion: "HABIDO",
    domicilioFiscal: "MZA. A LOTE. 12 Z.I. LAS PRADERAS DE LURIN - LURIN - LIMA",
    actividadPrincipal:
      "Fabricación de productos minerales no metálicos / Servicios vinculados al transporte",
    comprobantesElectronicos: [
      "Factura",
      "Boleta de Venta",
      "Nota de Crédito",
      "Nota de Débito",
      "Guía de Remisión",
      "Comprobante de Retención",
    ],
    comprobantes: [
      documento({
        numero: "F003-0009034",
        tipo: "Factura",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-03",
        fechaVencimiento: "2026-09-18",
        items: [item("Asfalto modificado con polímeros PG 70-22 — suministro en planta", 80, "Ton", 985)],
        estadoSunat: "Aprobado",
        estadoComercial: "Pagado",
        formaPago: "Transferencia bancaria",
      }),
      documento({
        numero: "F003-0009035",
        tipo: "Factura",
        cliente: CLIENTES.lurin,
        fechaEmision: "2026-09-06",
        fechaVencimiento: "2026-09-21",
        items: [item("Emulsión asfáltica de rotura rápida CRS-2 — cilindro 55 gal", 60, "Cilindro", 412.5)],
        estadoSunat: "Aprobado",
        estadoComercial: "Pendiente",
        formaPago: "Crédito 15 días",
        observacion: "Orden de compra municipal N° 4471-2026.",
      }),
      documento({
        numero: "B003-0001490",
        tipo: "Boleta de Venta",
        cliente: CLIENTES.horizonteAndino,
        fechaEmision: "2026-09-10",
        fechaVencimiento: "2026-09-10",
        items: [item("Servicio de transporte de asfalto en cisterna — Lima a Huancayo", 4, "Viaje", 2350)],
        estadoSunat: "Aprobado",
        estadoComercial: "Pagado",
        formaPago: "Transferencia bancaria",
      }),
      documento({
        numero: "FC03-0000255",
        tipo: "Nota de Crédito",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-13",
        fechaVencimiento: "2026-09-28",
        items: [item("Volumen no atendido de emulsión CRS-2 (ref. F003-0009034)", 1, "Servicio", -1960)],
        estadoSunat: "Aprobado",
        estadoComercial: "Pagado",
        formaPago: "Nota de crédito aplicada",
      }),
      documento({
        numero: "FD03-0000089",
        tipo: "Nota de Débito",
        cliente: CLIENTES.lurin,
        fechaEmision: "2026-09-15",
        fechaVencimiento: "2026-09-30",
        items: [item("Mayor recorrido de cisterna por cambio de frente de obra", 1, "Servicio", 640)],
        estadoSunat: "Pendiente",
        estadoComercial: "Pendiente",
        formaPago: "Crédito 15 días",
      }),
      documento({
        numero: "T003-0000771",
        tipo: "Guía de Remisión",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-17",
        fechaVencimiento: "2026-09-17",
        items: [],
        estadoSunat: "Anulado",
        estadoComercial: "Pagado",
        formaPago: "No aplica",
        observacion: "Anulada por cambio de placa del vehículo transportista.",
      }),
      documento({
        numero: "F003-0009036",
        tipo: "Factura",
        cliente: CLIENTES.horizonteAndino,
        fechaEmision: "2026-09-21",
        fechaVencimiento: "2026-10-06",
        items: [item("Asfalto en caliente AC-20 — suministro y colocación en obra", 45, "Ton", 870)],
        estadoSunat: "Aprobado",
        estadoComercial: "Vencido",
        formaPago: "Crédito 15 días",
      }),
      documento({
        numero: "F003-0009037",
        tipo: "Factura",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-25",
        fechaVencimiento: "2026-10-10",
        items: [item("Servicio de transporte de emulsión asfáltica — Lurín a Arequipa", 6, "Viaje", 3120)],
        estadoSunat: "Pendiente",
        estadoComercial: "Pendiente",
        formaPago: "Crédito 15 días",
      }),
      documento({
        numero: "RE03-0000041",
        tipo: "Comprobante de Retención",
        cliente: CLIENTES.vialLimaSur,
        fechaEmision: "2026-09-26",
        fechaVencimiento: "2026-10-11",
        items: [item("Retención del 4% del IGV — ref. factura F003-0009034", 1, "Servicio", 3719.36)],
        estadoSunat: "Aprobado",
        estadoComercial: "Pendiente",
        formaPago: "Retención de IGV",
        observacion: "Régimen de retenciones del IGV — Agente de retención designado.",
      }),
    ],
  },
];

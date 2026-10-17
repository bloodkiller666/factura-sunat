import { describe, expect, it } from "vitest";
import {
  CABECERAS_REPORTE,
  construirReporteExcel,
  documentosAExportar,
  filaReporte,
  nombreArchivoExcel,
} from "./exportar";
import { analizarHoja } from "./importar-excel";
import { comprobante } from "./pruebas-utiles";
import { leerHojaXlsx } from "./xlsx-lectura";

describe("reporte Excel", () => {
  const c = comprobante({
    numero: "F001-00000007",
    total: 118,
    baseImponible: 100,
    igv: 18,
    numeroSap: "4500926001",
    checkSap: true,
    fechaVencimiento: "2026-11-04",
    formaPago: "Crédito 30 días",
  });

  it("cada fila tiene una celda por columna del reporte", () => {
    expect(filaReporte(c)).toHaveLength(CABECERAS_REPORTE.length);
  });

  it("la fila expone los datos reales del comprobante", () => {
    const fila = Object.fromEntries(CABECERAS_REPORTE.map((nombre, i) => [nombre, filaReporte(c)[i]]));
    expect(fila).toMatchObject({
      "N° comprobante": "F001-00000007",
      "Tipo de documento": "Factura",
      "Fecha de emisión": "15/09/2026",
      "Fecha de vencimiento": "04/11/2026",
      "Base imponible": 100,
      "IGV (18%)": 18,
      "Total (con IGV)": 118,
      "Estado SUNAT": "Aprobado",
      "N° SAP": "4500926001",
      "Check SAP": "Sí",
      "Forma de pago": "Crédito 30 días",
    });
  });

  it("sin vencimiento ni forma de pago no inventa valores", () => {
    const fila = filaReporte(comprobante({ fechaVencimiento: null, formaPago: null }));
    expect(fila[CABECERAS_REPORTE.indexOf("Fecha de vencimiento")]).toBe("—");
    expect(fila[CABECERAS_REPORTE.indexOf("Forma de pago")]).toBe("");
  });

  it("genera un .xlsx válido que el importador reconoce como compatible", async () => {
    const bytes = construirReporteExcel([c, comprobante({})]);
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");

    const hoja = await leerHojaXlsx(bytes);
    expect(hoja.filas[0]).toEqual(CABECERAS_REPORTE);
    expect(hoja.filas).toHaveLength(3);

    const reporte = analizarHoja(hoja, "reporte.xlsx");
    expect(reporte.compatible).toBe(true);
    expect(reporte.faltantes).toEqual([]);
    expect(reporte.filasDatos).toBe(2);
  });

  it("documentosAExportar prefiere la selección y, sin ella, lo visible", () => {
    const visibles = [comprobante({}), comprobante({})];
    expect(documentosAExportar([], visibles)).toBe(visibles);
    expect(documentosAExportar([visibles[1]], visibles)).toEqual([visibles[1]]);
  });

  it("nombre del archivo con RUC y cantidad", () => {
    expect(nombreArchivoExcel(3, { ruc: "20514831620", razonSocial: "x" })).toBe(
      "reporte-comprobantes-20514831620-3.xlsx",
    );
  });
});

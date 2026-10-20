import { describe, expect, it } from "vitest";
import { analizarHojaSap, enLotes } from "./sap-excel";

const hoja = (filas: string[][]) => ({ filas });

describe("analizarHojaSap", () => {
  it("detecta documento, RUC y N° SAP por su encabezado", () => {
    const r = analizarHojaSap(
      hoja([
        ["Documento", "RUC", "N° SAP"],
        ["F001-123", "20100000001", "4500001"],
        ["F001-124", "", "4500002"],
      ]),
    );
    expect(r.filaCabecera).toBe(1);
    expect(r.columnas).toEqual({ documento: "Documento", sap: "N° SAP", ruc: "RUC" });
    expect(r.filas).toEqual([
      { documento: "F001-123", ruc: "20100000001", n_sap: "4500001" },
      { documento: "F001-124", n_sap: "4500002" },
    ]);
  });

  it("acepta sinónimos, tildes y mayúsculas, y salta un título sobre el encabezado", () => {
    const r = analizarHojaSap(
      hoja([
        ["Reporte de facturación"],
        [""],
        ["NÚMERO DE COMPROBANTE", "Nro SAP"],
        ["F001-9", "11"],
      ]),
    );
    expect(r.filaCabecera).toBe(3);
    expect(r.filas).toEqual([{ documento: "F001-9", n_sap: "11" }]);
  });

  it("une serie y número cuando vienen en columnas separadas", () => {
    const r = analizarHojaSap(
      hoja([
        ["Serie", "Número", "N° SAP"],
        ["F001", "00000123", "4500001"],
        ["B002", "7", "4500002"],
      ]),
    );
    expect(r.columnas.documento).toBe("Serie + Número");
    expect(r.filas.map((f) => f.documento)).toEqual(["F001-00000123", "B002-7"]);
  });

  it("limpia el `.0` que Excel agrega a los enteros", () => {
    const r = analizarHojaSap(hoja([["Documento", "N° SAP"], ["F001-1", "4500001234.0"]]));
    expect(r.filas[0].n_sap).toBe("4500001234");
  });

  it("no envía renglones vacíos pero sí filas incompletas (el servidor las cuenta)", () => {
    const r = analizarHojaSap(
      hoja([
        ["Documento", "N° SAP"],
        ["", ""],
        ["F001-1", ""],
        ["", "4500"],
      ]),
    );
    expect(r.filas).toEqual([
      { documento: "F001-1", n_sap: "" },
      { documento: "", n_sap: "4500" },
    ]);
  });

  it("explica qué falta si no hay columnas reconocibles", () => {
    expect(() => analizarHojaSap(hoja([["Cliente", "Monto"], ["x", "1"]]))).toThrow(/N° SAP/);
    // Solo RUC y N° SAP no alcanza: un RUC no identifica un documento.
    expect(() => analizarHojaSap(hoja([["RUC", "N° SAP"], ["20100000001", "1"]]))).toThrow(
      /documento/i,
    );
  });
});

describe("enLotes", () => {
  it("parte la lista sin perder filas", () => {
    expect(enLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(enLotes([], 3)).toEqual([]);
  });
});

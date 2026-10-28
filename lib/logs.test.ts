import { describe, expect, it } from "vitest";
import type { ApiLogAutomatizacion } from "./api";
import {
  bloquesDeDetalle,
  consultaDeFiltroLogs,
  duracionLegible,
  etiquetaDeCarpeta,
  etiquetaTarea,
  frasesDeNovedades,
} from "./logs";

describe("duracionLegible", () => {
  it("usa segundos, minutos y deja el guion sin dato", () => {
    expect(duracionLegible(53)).toBe("53 s");
    expect(duracionLegible(60)).toBe("1 min");
    expect(duracionLegible(125)).toBe("2 min 5 s");
    expect(duracionLegible(null)).toBe("—");
    expect(duracionLegible(undefined)).toBe("—");
  });
});

describe("frasesDeNovedades", () => {
  it("solo cuenta lo que es mayor que cero", () => {
    expect(frasesDeNovedades({ "PDF unidos": 3, "compras nuevas": 1 })).toEqual([
      "3 PDF unidos",
      "1 compras nuevas",
    ]);
    expect(frasesDeNovedades({ a: 0 })).toEqual([]);
  });
});

describe("etiquetaTarea y etiquetaDeCarpeta", () => {
  it("nombra las tareas y reconoce la compra en su carpeta", () => {
    expect(etiquetaTarea("sire")).toBe("SIRE");
    expect(etiquetaTarea("correo")).toBe("Correo");
    expect(etiquetaTarea("otra")).toBe("otra");
    expect(etiquetaDeCarpeta("2026/10/20999999999/F010-00000456")).toBe("F010-00000456 · 20999999999");
    expect(etiquetaDeCarpeta("solo")).toBe("solo");
  });
});

describe("bloquesDeDetalle", () => {
  it("resume lo que hizo cada tarea y tolera datos faltantes", () => {
    const detalle: ApiLogAutomatizacion["detalle"] = {
      sire: { meses: ["202610", "202609"], ventas_nuevas: 2, compras_nuevas: 5 },
      correo: { revisados: 979, con_facturas: 7, comprobantes_de_la_empresa: 2 },
      importacion: { completadas: 4, nuevas: 1, repetidas: 3, pdf_guardados: 6 },
    };

    const bloques = bloquesDeDetalle(detalle);

    expect(bloques.map((b) => b.titulo)).toEqual(["SIRE", "Correo", "Importación al portal"]);
    expect(bloques[0].lineas[0]).toBe("Meses consultados: 202610, 202609");
    expect(bloques[0].lineas[1]).toBe("Ventas nuevas: 2 · Compras nuevas: 5");
    expect(bloques[2].lineas[1]).toContain("PDF sueltos unidos: 0");
    expect(bloquesDeDetalle({})).toEqual([]);
  });
});

describe("fallos del portal", () => {
  it("el chip «Fallos del portal» pide el origen y los demás el resultado", () => {
    expect(consultaDeFiltroLogs("todos")).toEqual({});
    expect(consultaDeFiltroLogs("portal")).toEqual({ origen: "portal" });
    expect(consultaDeFiltroLogs("con_errores")).toEqual({ resultado: "con_errores" });
  });

  it("etiqueta la tarea y detalla la acción del fallo", () => {
    expect(etiquetaTarea("portal")).toBe("Portal");
    const bloques = bloquesDeDetalle({
      portal: { accion: "Abrir carpeta", contexto: { documento: "E001-278" } },
    });
    expect(bloques).toEqual([
      {
        titulo: "Fallo mostrado en el portal",
        lineas: ["Acción: Abrir carpeta", "documento: E001-278"],
      },
    ]);
  });
});

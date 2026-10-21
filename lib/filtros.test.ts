import { describe, expect, it } from "vitest";
import type { ApiResumen } from "./api";
import {
  FILTROS_INICIALES,
  ORDEN_INICIAL,
  alternarOrden,
  claveDeConjunto,
  claveDeFiltros,
  consultaDePagina,
  consultaDeResumen,
  filtrosParaApi,
  hayFiltrosActivos,
  mesesEntre,
  metricasDeResumen,
} from "./filtros";

const con = (parcial: Partial<typeof FILTROS_INICIALES>) => ({ ...FILTROS_INICIALES, ...parcial });

describe("hayFiltrosActivos", () => {
  it("sin cambios no hay filtros", () => {
    expect(hayFiltrosActivos(FILTROS_INICIALES)).toBe(false);
  });

  it("cualquier cambio cuenta, incluido el rango de fechas", () => {
    expect(hayFiltrosActivos(con({ q: "abc" }))).toBe(true);
    expect(hayFiltrosActivos(con({ desde: "2026-09-01" }))).toBe(true);
    expect(hayFiltrosActivos(con({ respaldo: "SIN_XML" }))).toBe(true);
    expect(hayFiltrosActivos(con({ venceHasta: "2026-10-18" }))).toBe(true);
  });
});

describe("alternarOrden", () => {
  it("la misma columna invierte el sentido", () => {
    expect(alternarOrden({ campo: "fecha", direccion: "desc" }, "fecha").direccion).toBe("asc");
    expect(alternarOrden({ campo: "fecha", direccion: "asc" }, "fecha").direccion).toBe("desc");
  });

  it("una columna nueva arranca en su sentido natural", () => {
    expect(alternarOrden(ORDEN_INICIAL, "cliente")).toEqual({ campo: "cliente", direccion: "asc" });
    expect(alternarOrden(ORDEN_INICIAL, "numero")).toEqual({ campo: "numero", direccion: "asc" });
    expect(alternarOrden({ campo: "cliente", direccion: "asc" }, "importe")).toEqual({
      campo: "importe",
      direccion: "desc",
    });
  });
});

describe("filtrosParaApi", () => {
  it("sin filtros no envía nada", () => {
    expect(filtrosParaApi(FILTROS_INICIALES)).toEqual({});
  });

  it("traduce cada filtro al parámetro del servidor", () => {
    expect(
      filtrosParaApi(
        con({
          q: "  alfa  ",
          tipo: "Nota de Crédito",
          estadoSunat: "Aprobado",
          respaldo: "SIN_CDR",
          moneda: "USD",
          numeroSap: " 4500 ",
          desde: "2026-09-01",
          hasta: "2026-09-30",
          venceDesde: "2026-10-01",
          venceHasta: "2026-10-31",
        }),
      ),
    ).toEqual({
      q: "alfa",
      tipo_documento: "07",
      estado: "aprobado",
      respaldo: "sin_cdr",
      moneda: "USD",
      n_sap: "4500",
      fecha_desde: "2026-09-01",
      fecha_hasta: "2026-09-30",
      vencimiento_desde: "2026-10-01",
      vencimiento_hasta: "2026-10-31",
    });
  });

  it("el vencimiento acepta rangos abiertos y no afecta a los indicadores", () => {
    expect(filtrosParaApi(con({ venceHasta: "2026-10-18" }))).toEqual({
      vencimiento_hasta: "2026-10-18",
    });
    expect(consultaDeResumen(con({ venceDesde: "2026-10-01" }))).toEqual({});
  });

  it("una búsqueda de un solo carácter no se envía (el servidor la rechazaría)", () => {
    expect(filtrosParaApi(con({ q: "a" }))).toEqual({});
    expect(filtrosParaApi(con({ q: "  a " }))).toEqual({});
    expect(filtrosParaApi(con({ q: "ab" })).q).toBe("ab");
  });

  it("cada tipo de documento usa su código del catálogo 01", () => {
    const codigo = (tipo: Parameters<typeof con>[0]["tipo"]) =>
      filtrosParaApi(con({ tipo })).tipo_documento;
    expect(codigo("Factura")).toBe("01");
    expect(codigo("Boleta de Venta")).toBe("03");
    expect(codigo("Nota de Débito")).toBe("08");
  });
});

describe("consultaDePagina", () => {
  it("calcula el desplazamiento a partir de la página y el tamaño", () => {
    const consulta = consultaDePagina(FILTROS_INICIALES, ORDEN_INICIAL, {
      pagina: 3,
      tamano: 50,
      contar: false,
    });
    expect(consulta).toMatchObject({ limit: 50, offset: 150, contar: false });
  });

  it("envía el orden y pide el total solo si se indica", () => {
    const consulta = consultaDePagina(
      con({ estadoSunat: "Anulado" }),
      { campo: "importe", direccion: "asc" },
      { pagina: 0, tamano: 25, contar: true },
    );
    expect(consulta).toMatchObject({
      estado: "anulado",
      orden: "importe",
      direccion: "asc",
      offset: 0,
      contar: true,
    });
  });
});

describe("consultaDeResumen", () => {
  it("los indicadores solo dependen del rango de fechas", () => {
    expect(
      consultaDeResumen(
        con({
          q: "x1",
          tipo: "Factura",
          estadoSunat: "Aprobado",
          desde: "2026-09-01",
          hasta: "2026-09-30",
        }),
      ),
    ).toEqual({ fecha_desde: "2026-09-01", fecha_hasta: "2026-09-30" });
    expect(consultaDeResumen(FILTROS_INICIALES)).toEqual({});
  });
});

describe("claves de caché", () => {
  it("el conjunto de filtros no depende del orden ni del tamaño de página", () => {
    const filtros = con({ q: "abc" });
    expect(claveDeFiltros(filtros)).toBe(claveDeFiltros({ ...filtros }));
  });

  it("la clave del conjunto cambia con el orden, el tamaño y los filtros", () => {
    const base = claveDeConjunto(FILTROS_INICIALES, ORDEN_INICIAL, 50);
    expect(
      claveDeConjunto(FILTROS_INICIALES, { campo: "cliente", direccion: "asc" }, 50),
    ).not.toBe(base);
    expect(claveDeConjunto(FILTROS_INICIALES, ORDEN_INICIAL, 25)).not.toBe(base);
    expect(claveDeConjunto(con({ tipo: "Factura" }), ORDEN_INICIAL, 50)).not.toBe(base);
    expect(claveDeConjunto(FILTROS_INICIALES, ORDEN_INICIAL, 50)).toBe(base);
  });
});

describe("metricasDeResumen", () => {
  const api: ApiResumen = {
    total: 720,
    por_estado: { pendiente: 1, aprobado: 686, rechazado: 0, anulado: 33 },
    facturado_neto: { PEN: "44224155.32", USD: "2971065.88" },
    cobertura: { exigibles: 687, con_xml: 10, con_cdr: 4 },
  };

  it("mapea estados, cobertura y facturado por moneda", () => {
    const m = metricasDeResumen(api, { desde: "2026-09-01", hasta: "2026-09-30" });
    expect(m).toMatchObject({
      totalComprobantes: 720,
      aprobados: 686,
      pendientes: 1,
      anulados: 33,
      rechazados: 0,
      facturadoPen: 44224155.32,
      facturadoUsd: 2971065.88,
      etiquetaRango: "Setiembre 2026",
    });
    expect(m.cobertura).toEqual({ total: 687, conXml: 10, conCdr: 4 });
  });

  it("una moneda ausente cuenta como cero", () => {
    const m = metricasDeResumen({ ...api, facturado_neto: { PEN: 100 } }, { desde: "", hasta: "" });
    expect(m.facturadoUsd).toBe(0);
    expect(m.etiquetaRango).toBe("Todas las fechas");
  });

  it("un estado ausente cuenta como cero", () => {
    const m = metricasDeResumen({ ...api, por_estado: {} }, { desde: "", hasta: "" });
    expect(m.aprobados).toBe(0);
  });
});

describe("mesesEntre", () => {
  it("incluye ambos extremos, en orden cronológico", () => {
    expect(mesesEntre("2026-08", "2026-10")).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("cruza el cambio de año", () => {
    expect(mesesEntre("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("un solo mes", () => {
    expect(mesesEntre("2026-09", "2026-09")).toEqual(["2026-09"]);
  });
});

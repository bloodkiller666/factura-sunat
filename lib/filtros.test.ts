import { describe, expect, it } from "vitest";
import {
  FILTROS_INICIALES,
  aplicarFiltros,
  calcularMetricas,
  checkVigente,
  coincideMes,
  derivarPeriodos,
  hayFiltrosActivos,
  mesesEntre,
  ordenar,
} from "./filtros";
import { comprobante } from "./pruebas-utiles";

const con = (parcial: Partial<typeof FILTROS_INICIALES>) => ({ ...FILTROS_INICIALES, ...parcial });

describe("aplicarFiltros", () => {
  const lista = [
    comprobante({ numero: "F001-00000001", cliente: { ruc: "20111111111", razonSocial: "ALFA SAC" } }),
    comprobante({
      numero: "B001-00000002",
      tipo: "Boleta de Venta",
      cliente: { ruc: "", razonSocial: "BETA EIRL" },
      ordenCompra: "OC-7788",
      estadoSunat: "Pendiente",
      fechaEmision: "2026-10-03",
    }),
    comprobante({
      numero: "FF01-00000003",
      estadoSunat: "Anulado",
      numeroSap: "4500926001",
      checkSap: true,
      tieneXml: true,
      tieneCdr: true,
    }),
  ];

  it("sin filtros devuelve todo", () => {
    expect(aplicarFiltros(lista, FILTROS_INICIALES)).toHaveLength(3);
  });

  it("busca por número, cliente, RUC y orden de compra sin distinguir mayúsculas", () => {
    expect(aplicarFiltros(lista, con({ q: "f001-0000" }))).toHaveLength(1);
    expect(aplicarFiltros(lista, con({ q: "beta" }))).toHaveLength(1);
    expect(aplicarFiltros(lista, con({ q: "20111111111" }))).toHaveLength(1);
    expect(aplicarFiltros(lista, con({ q: "oc-7788" }))).toHaveLength(1);
    expect(aplicarFiltros(lista, con({ q: "  alfa  " }))).toHaveLength(1);
    expect(aplicarFiltros(lista, con({ q: "no existe" }))).toHaveLength(0);
  });

  it("filtra por periodo, tipo y estado", () => {
    expect(aplicarFiltros(lista, con({ mes: "2026-10" }))).toHaveLength(1);
    expect(aplicarFiltros(lista, con({ mes: "2026-09" }))).toHaveLength(2);
    expect(aplicarFiltros(lista, con({ tipo: "Boleta de Venta" }))).toHaveLength(1);
    expect(aplicarFiltros(lista, con({ estadoSunat: "Anulado" }))).toHaveLength(1);
  });

  it("filtra por N° SAP parcial", () => {
    expect(aplicarFiltros(lista, con({ numeroSap: "4500" }))).toHaveLength(1);
  });

  it("el rango de emisión incluye ambos extremos", () => {
    const filtrados = aplicarFiltros(lista, con({ desde: "2026-09-15", hasta: "2026-10-03" }));
    expect(filtrados).toHaveLength(3);
    expect(aplicarFiltros(lista, con({ desde: "2026-10-04" }))).toHaveLength(0);
    expect(aplicarFiltros(lista, con({ hasta: "2026-09-14" }))).toHaveLength(0);
  });

  it("el filtro de respaldo distingue sin XML, sin CDR y completo", () => {
    expect(aplicarFiltros(lista, con({ respaldo: "SIN_XML" }))).toHaveLength(2);
    expect(aplicarFiltros(lista, con({ respaldo: "SIN_CDR" }))).toHaveLength(2);
    expect(aplicarFiltros(lista, con({ respaldo: "COMPLETO" }))).toHaveLength(1);
  });

  it("el Check SAP pendiente de guardar manda sobre el valor del servidor", () => {
    const [alfa, , anulado] = lista;
    expect(aplicarFiltros(lista, con({ checkSap: "CON" }))).toEqual([anulado]);
    // Se marcó «alfa» en pantalla y se desmarcó «anulado», aún sin respuesta del servidor.
    const pendientes = { [alfa.id]: true, [anulado.id]: false };
    const marcados = aplicarFiltros(lista, con({ checkSap: "CON" }), pendientes);
    expect(marcados).toEqual([alfa]);
    expect(aplicarFiltros(lista, con({ checkSap: "SIN" }), pendientes)).toHaveLength(2);
  });

  it("combina varios filtros a la vez", () => {
    expect(aplicarFiltros(lista, con({ mes: "2026-09", estadoSunat: "Anulado", q: "ff01" }))).toHaveLength(1);
    expect(aplicarFiltros(lista, con({ mes: "2026-10", estadoSunat: "Anulado" }))).toHaveLength(0);
  });
});

describe("checkVigente / hayFiltrosActivos / coincideMes", () => {
  it("checkVigente prioriza el cambio optimista", () => {
    const c = comprobante({ checkSap: false });
    expect(checkVigente(c, {})).toBe(false);
    expect(checkVigente(c, { [c.id]: true })).toBe(true);
  });

  it("hayFiltrosActivos detecta cualquier desvío del valor inicial", () => {
    expect(hayFiltrosActivos(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltrosActivos(con({ respaldo: "SIN_CDR" }))).toBe(true);
    expect(hayFiltrosActivos(con({ q: "x" }))).toBe(true);
  });

  it("coincideMes", () => {
    expect(coincideMes("2026-09-30", "2026-09")).toBe(true);
    expect(coincideMes("2026-10-01", "2026-09")).toBe(false);
    expect(coincideMes("2026-10-01", "TODOS")).toBe(true);
  });
});

describe("calcularMetricas", () => {
  it("suma soles y dólares por separado, resta notas de crédito y excluye anulados/rechazados", () => {
    const lista = [
      comprobante({ total: 1000 }),
      comprobante({ total: 500, tipo: "Nota de Crédito", codigoTipo: "07" }),
      comprobante({ total: 200, tipo: "Nota de Débito", codigoTipo: "08" }),
      comprobante({ total: 300, moneda: "USD" }),
      comprobante({ total: 999, estadoSunat: "Anulado" }),
      comprobante({ total: 888, estadoSunat: "Rechazado" }),
      comprobante({ total: 50, estadoSunat: "Pendiente" }),
    ];
    const m = calcularMetricas(lista, "TODOS");
    expect(m.facturadoPen).toBe(750); // 1000 − 500 + 200 + 50
    expect(m.facturadoUsd).toBe(300);
    expect(m.totalComprobantes).toBe(7);
    expect(m).toMatchObject({ aprobados: 4, pendientes: 1, anulados: 1, rechazados: 1 });
  });

  it("redondea a dos decimales sin arrastrar errores de punto flotante", () => {
    const lista = [comprobante({ total: 0.1 }), comprobante({ total: 0.2 })];
    expect(calcularMetricas(lista, "TODOS").facturadoPen).toBe(0.3);
  });

  it("la cobertura de respaldo no exige nada a los anulados", () => {
    const lista = [
      comprobante({ tieneXml: true, tieneCdr: true, tienePdf: true }),
      comprobante({ tieneXml: true }),
      comprobante({}),
      comprobante({ estadoSunat: "Anulado" }),
    ];
    expect(calcularMetricas(lista, "TODOS").cobertura).toEqual({
      total: 3,
      conXml: 2,
      conCdr: 1,
      conPdf: 1,
    });
  });

  it("acota por periodo y etiqueta el resultado", () => {
    const lista = [
      comprobante({ total: 10, fechaEmision: "2026-09-01" }),
      comprobante({ total: 20, fechaEmision: "2026-10-01" }),
    ];
    const m = calcularMetricas(lista, "2026-10");
    expect(m.facturadoPen).toBe(20);
    expect(m.etiquetaPeriodo).toBe("Octubre 2026");
  });

  it("sin comprobantes todo es cero", () => {
    const m = calcularMetricas([], "TODOS");
    expect(m.facturadoPen).toBe(0);
    expect(m.cobertura.total).toBe(0);
  });
});

describe("derivarPeriodos y mesesEntre", () => {
  it("derivarPeriodos: únicos y del más nuevo al más viejo", () => {
    const lista = [
      comprobante({ fechaEmision: "2026-09-01" }),
      comprobante({ fechaEmision: "2026-10-05" }),
      comprobante({ fechaEmision: "2026-09-30" }),
      comprobante({ fechaEmision: "" }),
    ];
    expect(derivarPeriodos(lista)).toEqual(["2026-10", "2026-09"]);
  });

  it("mesesEntre cruza años y es inclusivo", () => {
    expect(mesesEntre("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(mesesEntre("2026-09", "2026-09")).toEqual(["2026-09"]);
  });

  it("mesesEntre con rango invertido no devuelve nada", () => {
    expect(mesesEntre("2026-10", "2026-09")).toEqual([]);
  });
});

describe("ordenar", () => {
  const lista = [
    comprobante({ numero: "F001-00000002", fechaEmision: "2026-09-02", total: 50, cliente: { ruc: "1", razonSocial: "zeta" } }),
    comprobante({ numero: "F001-00000001", fechaEmision: "2026-09-02", total: 500, cliente: { ruc: "2", razonSocial: "Alfa" } }),
    comprobante({ numero: "F001-00000003", fechaEmision: "2026-09-10", total: 100, tipo: "Nota de Crédito", cliente: { ruc: "3", razonSocial: "media" } }),
  ];

  it("por fecha descendente, desempatando por número", () => {
    expect(ordenar(lista, { campo: "fecha", direccion: "desc" }).map((c) => c.numero)).toEqual([
      "F001-00000003",
      "F001-00000002",
      "F001-00000001",
    ]);
  });

  it("por importe trata la nota de crédito como negativa", () => {
    expect(ordenar(lista, { campo: "importe", direccion: "asc" }).map((c) => c.total)).toEqual([
      100, // la NC resta
      50,
      500,
    ]);
  });

  it("por cliente ignora mayúsculas", () => {
    expect(ordenar(lista, { campo: "cliente", direccion: "asc" }).map((c) => c.cliente.razonSocial)).toEqual([
      "Alfa",
      "media",
      "zeta",
    ]);
  });

  it("no modifica la lista original", () => {
    const copia = [...lista];
    ordenar(lista, { campo: "numero", direccion: "asc" });
    expect(lista).toEqual(copia);
  });
});

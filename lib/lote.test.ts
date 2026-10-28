import { describe, expect, it, vi } from "vitest";
import type { ApiArchivo } from "./api";
import {
  COMPROBANTES_POR_PARTE,
  MAX_COMPROBANTES_LOTE,
  carpetaDeLote,
  construirLoteRespaldo,
  descargarTodoPorPartes,
  dividirEnPartes,
  nombreBase,
  nombreLote,
  textoLeeme,
  type DependenciasLote,
} from "./lote";
import { comprobante } from "./pruebas-utiles";
import { leerZip } from "./zip";

const empresa = { ruc: "20514831620", razonSocial: "TDM ASFALTOS S.A.C." };

function archivo(tipo: ApiArchivo["tipo"], nombre: string): ApiArchivo {
  return {
    id: `id-${nombre}`,
    comprobante_id: null,
    tipo,
    nombre,
    mime_type: null,
    size_bytes: null,
    hash_sha256: null,
    estado: "subido",
    subido_at: null,
    created_at: null,
  };
}

const texto = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/** Dependencias simuladas: el servidor tiene lo indicado. */
function deps(
  archivosPorComprobante: Record<string, ApiArchivo[]>,
  extra: Partial<DependenciasLote> = {},
): DependenciasLote {
  return {
    listarArchivos: async (_t, id) => archivosPorComprobante[id] ?? [],
    descargar: async (_t, a) => ({ blob: new Blob([`contenido de ${a.nombre}`]), nombre: a.nombre }),
    ...extra,
  };
}

const compra = (parcial: Parameters<typeof comprobante>[0] = {}) =>
  comprobante({
    origen: "recibido",
    cliente: { ruc: "20999999999", razonSocial: "PROVEEDOR SAC" },
    ...parcial,
  });

describe("construirLoteRespaldo", () => {
  it("arma AAAA/MM/RUC/SERIE-NÚMERO por comprobante con sus archivos reales y un manifiesto con hashes", async () => {
    const venta = comprobante({ numero: "F001-00000001", nombreArchivo: "20514831620-01-F001-00000001" });
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [venta],
      () => {},
      deps({
        [venta.id]: [
          archivo("xml", "20514831620-01-F001-00000001.xml"),
          archivo("cdr", "R-20514831620-01-F001-00000001.zip"),
        ],
      }),
    );

    expect(resultado).toMatchObject({ comprobantes: 1, archivos: 2, faltantes: [] });
    expect(resultado.nombre).toBe("respaldo-comprobantes-20514831620-1.zip");

    const zip = await leerZip(resultado.zip);
    expect([...zip.keys()].sort()).toEqual([
      "2026/09/20987654321/F001-00000001/20514831620-01-F001-00000001.xml",
      "2026/09/20987654321/F001-00000001/R-20514831620-01-F001-00000001.zip",
      "LEEME.txt",
      "manifiesto.csv",
    ]);
    expect(
      texto(zip.get("2026/09/20987654321/F001-00000001/20514831620-01-F001-00000001.xml")!),
    ).toBe("contenido de 20514831620-01-F001-00000001.xml");

    const filas = texto(zip.get("manifiesto.csv")!).split("\r\n");
    expect(filas[0]).toBe("carpeta,archivo,tipo,bytes,sha256");
    expect(filas).toHaveLength(3);
    // Cada archivo lleva su SHA-256 (verificable con cualquier herramienta).
    expect(filas[1].split(",")[4]).toMatch(/^[0-9a-f]{64}$/);
    expect(texto(zip.get("LEEME.txt")!)).toContain("Todos los comprobantes del lote tienen sus archivos");
  });

  it("en compras lleva el XML y el PDF; el CDR no se pide ni se incluye", async () => {
    const c = compra({ numero: "F010-00000456" });
    const pedidos: string[] = [];
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [c],
      () => {},
      deps(
        {
          [c.id]: [
            archivo("xml", "f.xml"),
            archivo("pdf", "f.pdf"),
            // Un CDR que se archivó antes: sigue en el bucket pero el lote no lo toma.
            archivo("zip", "R-f.zip"),
          ],
        },
        {
          descargar: async (_t, a) => {
            pedidos.push(a.nombre);
            return { blob: new Blob([a.nombre]), nombre: a.nombre };
          },
        },
      ),
    );

    expect(pedidos.sort()).toEqual(["f.pdf", "f.xml"]);
    const zip = await leerZip(resultado.zip);
    expect([...zip.keys()].sort()).toEqual([
      "2026/09/20999999999/F010-00000456/f.pdf",
      "2026/09/20999999999/F010-00000456/f.xml",
      "LEEME.txt",
      "manifiesto.csv",
    ]);
  });

  it("en ventas lleva el XML y el CDR; el PDF no se pide aunque exista", async () => {
    const venta = comprobante({ numero: "F001-00000007" });
    const pedidos: string[] = [];
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [venta],
      () => {},
      deps(
        { [venta.id]: [archivo("xml", "v.xml"), archivo("cdr", "v.zip"), archivo("pdf", "v.pdf")] },
        {
          descargar: async (_t, a) => {
            pedidos.push(a.nombre);
            return { blob: new Blob([a.nombre]), nombre: a.nombre };
          },
        },
      ),
    );

    expect(pedidos.sort()).toEqual(["v.xml", "v.zip"]);
    expect(resultado.archivos).toBe(2);
    expect(resultado.faltantes).toEqual([]);
  });

  it("nunca inventa un archivo: lo que falta se declara en el LEEME", async () => {
    const sireSolo = comprobante({ numero: "FF01-00000009" });
    const soloXml = compra({ numero: "FF01-00000010" });
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [sireSolo, soloXml],
      () => {},
      deps({ [soloXml.id]: [archivo("xml", "x.xml")] }),
    );

    expect(resultado.faltantes).toEqual([
      { numero: "FF01-00000009", faltan: ["XML", "CDR"] },
      { numero: "FF01-00000010", faltan: ["PDF"] },
    ]);
    const zip = await leerZip(resultado.zip);
    const nombres = [...zip.keys()];
    expect(nombres.some((n) => n.endsWith(".xml") && n.includes("FF01-00000009"))).toBe(false);
    const leeme = texto(zip.get("LEEME.txt")!);
    expect(leeme).toContain("FF01-00000009: falta XML, CDR");
    expect(leeme).toContain("FF01-00000010: falta PDF");
  });

  it("si la red de un archivo falla, el lote sigue con los demás", async () => {
    const a = compra({ numero: "F001-00000001" });
    const b = compra({ numero: "F001-00000002" });
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [a, b],
      () => {},
      deps(
        {
          [a.id]: [archivo("xml", "a.xml"), archivo("pdf", "a.pdf")],
          [b.id]: [archivo("xml", "b.xml"), archivo("pdf", "b.pdf")],
        },
        {
          descargar: async (_t, arch) => {
            if (arch.nombre === "a.pdf") throw new Error("red caída");
            return { blob: new Blob([arch.nombre]), nombre: arch.nombre };
          },
        },
      ),
    );
    expect(resultado.faltantes).toEqual([{ numero: "F001-00000001", faltan: ["PDF"] }]);
    expect(resultado.archivos).toBe(3);
  });

  it("si la lista de archivos falla, el comprobante figura sin sus archivos", async () => {
    const c = compra({});
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [c],
      () => {},
      deps({}, { listarArchivos: async () => { throw new Error("caído"); } }),
    );
    expect(resultado.faltantes[0].faltan).toEqual(["XML", "PDF"]);
  });

  it("dos comprobantes que caen en la misma carpeta no se pisan", async () => {
    const a = comprobante({ numero: "F001-00000001" });
    const b = comprobante({ numero: "F001-00000001" });
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [a, b],
      () => {},
      deps({ [a.id]: [archivo("xml", "a.xml")], [b.id]: [archivo("xml", "b.xml")] }),
    );

    expect(resultado.archivos).toBe(2);
    const zip = await leerZip(resultado.zip);
    expect([...zip.keys()].filter((n) => n.endsWith(".xml"))).toHaveLength(2);
  });

  it("una fecha o un RUC vacíos no rompen la carpeta", async () => {
    const raro = comprobante({
      fechaEmision: "",
      cliente: { ruc: "", razonSocial: "SIN DATOS" },
      numero: "F001-00000003",
    });
    expect(carpetaDeLote(raro)).toBe("sin-fecha/sin-fecha/sin-ruc/F001-00000003");
  });

  it("informa el avance", async () => {
    const lista = [comprobante({}), comprobante({}), comprobante({})];
    const avance = vi.fn();
    await construirLoteRespaldo("T", empresa, lista, avance, deps({}));
    expect(avance).toHaveBeenCalledTimes(3);
    expect(avance).toHaveBeenLastCalledWith({ hecho: 3, total: 3 });
  });

  it(`rechaza más de ${MAX_COMPROBANTES_LOTE} comprobantes (el ZIP se arma en memoria)`, async () => {
    const lista = Array.from({ length: MAX_COMPROBANTES_LOTE + 1 }, () => comprobante({}));
    await expect(construirLoteRespaldo("T", empresa, lista, () => {}, deps({}))).rejects.toThrow(/hasta/);
  });
});

describe("descargarTodoPorPartes", () => {
  const sinEspera = async () => {};

  it("reparte en ZIP de a lo más N comprobantes, nombrados parte X de Y", async () => {
    const lista = Array.from({ length: 5 }, () => comprobante({}));
    const entregas: Array<{ nombre: string; blob: Blob }> = [];

    const resumen = await descargarTodoPorPartes("T", empresa, lista, {
      porParte: 2,
      deps: deps({}),
      esperar: sinEspera,
      entregar: (blob, nombre) => {
        entregas.push({ nombre, blob });
      },
    });

    expect(entregas.map((e) => e.nombre)).toEqual([
      "respaldo-20514831620-parte-01-de-03.zip",
      "respaldo-20514831620-parte-02-de-03.zip",
      "respaldo-20514831620-parte-03-de-03.zip",
    ]);
    expect(resumen).toMatchObject({ partes: 3, entregadas: 3, comprobantes: 5, cancelada: false });
    // Cada parte trae su propio LEEME y manifiesto, para que al juntarlas no se pisen.
    const zip = await leerZip(new Uint8Array(await entregas[1].blob.arrayBuffer()));
    expect([...zip.keys()].filter((n) => !n.includes("/")).sort()).toEqual([
      "LEEME-parte-02.txt",
      "manifiesto-parte-02.csv",
    ]);
    expect(texto(zip.get("LEEME-parte-02.txt")!)).toContain("Parte 2 de 3");
  });

  it("con un solo grupo entrega un único ZIP con el nombre de siempre", async () => {
    const nombres: string[] = [];
    await descargarTodoPorPartes("T", empresa, [comprobante({}), comprobante({})], {
      deps: deps({}),
      esperar: sinEspera,
      entregar: (_b, n) => {
        nombres.push(n);
      },
    });
    expect(nombres).toEqual(["respaldo-comprobantes-20514831620-2.zip"]);
  });

  it("sin comprobantes no entrega nada", async () => {
    const entregar = vi.fn();
    const resumen = await descargarTodoPorPartes("T", empresa, [], { deps: deps({}), entregar });
    expect(entregar).not.toHaveBeenCalled();
    expect(resumen).toMatchObject({ partes: 0, entregadas: 0, comprobantes: 0 });
  });

  it("suma los archivos y los faltantes de todas las partes", async () => {
    const con = compra({ numero: "F001-00000001" });
    const sin = compra({ numero: "F001-00000002" });
    const resumen = await descargarTodoPorPartes("T", empresa, [con, sin], {
      porParte: 1,
      deps: deps({ [con.id]: [archivo("xml", "a.xml"), archivo("pdf", "a.pdf")] }),
      esperar: sinEspera,
      entregar: () => {},
    });

    expect(resumen.archivos).toBe(2);
    expect(resumen.faltantes).toEqual([{ numero: "F001-00000002", faltan: ["XML", "PDF"] }]);
  });

  it("informa el avance global y el de la parte en curso", async () => {
    const lista = Array.from({ length: 3 }, () => comprobante({}));
    const avance = vi.fn();
    await descargarTodoPorPartes("T", empresa, lista, {
      porParte: 2,
      deps: deps({}),
      esperar: sinEspera,
      entregar: () => {},
      alProgresar: avance,
    });

    expect(avance).toHaveBeenLastCalledWith({
      parte: 2,
      partes: 2,
      hechoEnParte: 1,
      totalEnParte: 1,
      hecho: 3,
      total: 3,
    });
  });

  it("se puede cancelar: no arma las partes que faltan", async () => {
    const lista = Array.from({ length: 4 }, () => comprobante({}));
    const control = new AbortController();
    const entregadas: string[] = [];

    const resumen = await descargarTodoPorPartes("T", empresa, lista, {
      porParte: 2,
      deps: deps({}),
      esperar: sinEspera,
      signal: control.signal,
      entregar: (_b, nombre) => {
        entregadas.push(nombre);
        control.abort(); // el usuario pulsa «Cancelar» tras la primera parte
      },
    });

    expect(entregadas).toHaveLength(1);
    expect(resumen).toMatchObject({ partes: 2, entregadas: 1, cancelada: true });
  });

  it("espera entre una descarga y la siguiente, pero no después de la última", async () => {
    const esperar = vi.fn(async () => {});
    await descargarTodoPorPartes("T", empresa, Array.from({ length: 3 }, () => comprobante({})), {
      porParte: 1,
      deps: deps({}),
      esperar,
      entregar: () => {},
    });
    expect(esperar).toHaveBeenCalledTimes(2);
  });

  it("nunca excede el tope por ZIP aunque se pida una parte más grande", async () => {
    const lista = Array.from({ length: MAX_COMPROBANTES_LOTE + 5 }, () => comprobante({}));
    const resumen = await descargarTodoPorPartes("T", empresa, lista, {
      porParte: 10_000,
      deps: deps({}),
      esperar: async () => {},
      entregar: () => {},
    });
    expect(resumen.partes).toBe(2);
  });

  it("el tamaño por defecto cabe en el tope de un ZIP", () => {
    expect(COMPROBANTES_POR_PARTE).toBeLessThanOrEqual(MAX_COMPROBANTES_LOTE);
  });
});

describe("utilidades del lote", () => {
  it("nombreBase limpia caracteres que no valen en rutas de ZIP", () => {
    expect(nombreBase(comprobante({ nombreArchivo: "a/b\\c:d*e", numero: "X" }))).toBe("a-b-c-d-e");
    expect(nombreBase(comprobante({ nombreArchivo: "", numero: "F001-1" }))).toBe("F001-1");
  });

  it("nombreLote y textoLeeme", () => {
    expect(nombreLote(12, empresa)).toBe("respaldo-comprobantes-20514831620-12.zip");
    expect(nombreLote(12, empresa, { numero: 1, total: 1 })).toBe(
      "respaldo-comprobantes-20514831620-12.zip",
    );
    expect(nombreLote(100, empresa, { numero: 3, total: 12 })).toBe(
      "respaldo-20514831620-parte-03-de-12.zip",
    );
    const leeme = textoLeeme(empresa, [comprobante({})], []);
    expect(leeme).toContain("RUC: 20514831620");
    expect(leeme).toContain("SHA-256");
    expect(leeme).toContain("CDR (ventas)");
  });

  it("dividirEnPartes conserva el orden y no pierde elementos", () => {
    expect(dividirEnPartes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(dividirEnPartes([], 3)).toEqual([]);
    expect(dividirEnPartes([1, 2], 5)).toEqual([[1, 2]]);
    expect(() => dividirEnPartes([1], 0)).toThrow();
  });
});

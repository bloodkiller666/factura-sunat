import { describe, expect, it, vi } from "vitest";
import type { ApiArchivo } from "./api";
import {
  MAX_COMPROBANTES_LOTE,
  construirLoteRespaldo,
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
function deps(archivosPorComprobante: Record<string, ApiArchivo[]>, extra: Partial<DependenciasLote> = {}): DependenciasLote {
  return {
    listarArchivos: async (_t, id) => archivosPorComprobante[id] ?? [],
    descargar: async (_t, a) => ({ blob: new Blob([`contenido de ${a.nombre}`]), nombre: a.nombre }),
    ...extra,
  };
}

describe("construirLoteRespaldo", () => {
  it("arma una carpeta por comprobante con sus archivos reales y un manifiesto con hashes", async () => {
    const completo = comprobante({ numero: "F001-00000001", nombreArchivo: "20514831620-01-F001-00000001" });
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [completo],
      () => {},
      deps({
        [completo.id]: [
          archivo("xml", "20514831620-01-F001-00000001.xml"),
          archivo("cdr", "R-20514831620-01-F001-00000001.zip"),
        ],
      }),
    );

    expect(resultado).toMatchObject({ comprobantes: 1, archivos: 2, faltantes: [] });
    expect(resultado.nombre).toBe("respaldo-comprobantes-20514831620-1.zip");

    const zip = await leerZip(resultado.zip);
    expect([...zip.keys()].sort()).toEqual([
      "20514831620-01-F001-00000001/20514831620-01-F001-00000001.xml",
      "20514831620-01-F001-00000001/R-20514831620-01-F001-00000001.zip",
      "LEEME.txt",
      "manifiesto.csv",
    ]);
    expect(texto(zip.get("20514831620-01-F001-00000001/20514831620-01-F001-00000001.xml")!)).toBe(
      "contenido de 20514831620-01-F001-00000001.xml",
    );

    const filas = texto(zip.get("manifiesto.csv")!).split("\r\n");
    expect(filas[0]).toBe("comprobante,archivo,tipo,bytes,sha256");
    expect(filas).toHaveLength(3);
    // Cada archivo lleva su SHA-256 (verificable con cualquier herramienta).
    expect(filas[1].split(",")[4]).toMatch(/^[0-9a-f]{64}$/);
    expect(texto(zip.get("LEEME.txt")!)).toContain("Todos los comprobantes del lote tienen XML y CDR");
  });

  it("nunca inventa un XML: lo que falta se declara en el LEEME", async () => {
    const sireSolo = comprobante({ numero: "FF01-00000009" });
    const soloXml = comprobante({ numero: "FF01-00000010" });
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [sireSolo, soloXml],
      () => {},
      deps({ [soloXml.id]: [archivo("xml", "x.xml")] }),
    );

    expect(resultado.faltantes).toEqual([
      { numero: "FF01-00000009", faltan: ["XML", "CDR"] },
      { numero: "FF01-00000010", faltan: ["CDR"] },
    ]);
    const zip = await leerZip(resultado.zip);
    const nombres = [...zip.keys()];
    expect(nombres.some((n) => n.endsWith(".xml") && n.includes("FF01-00000009"))).toBe(false);
    const leeme = texto(zip.get("LEEME.txt")!);
    expect(leeme).toContain("FF01-00000009: falta XML, CDR");
    expect(leeme).toContain("FF01-00000010: falta CDR");
  });

  it("si la red de un comprobante falla, el lote sigue con los demás", async () => {
    const a = comprobante({ numero: "F001-00000001" });
    const b = comprobante({ numero: "F001-00000002" });
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [a, b],
      () => {},
      deps(
        { [a.id]: [archivo("xml", "a.xml"), archivo("cdr", "a.zip")], [b.id]: [archivo("xml", "b.xml"), archivo("cdr", "b.zip")] },
        {
          descargar: async (_t, arch) => {
            if (arch.nombre === "a.zip") throw new Error("red caída");
            return { blob: new Blob([arch.nombre]), nombre: arch.nombre };
          },
        },
      ),
    );
    expect(resultado.faltantes).toEqual([{ numero: "F001-00000001", faltan: ["CDR"] }]);
    expect(resultado.archivos).toBe(3);
  });

  it("si la lista de archivos falla, el comprobante figura sin XML ni CDR", async () => {
    const c = comprobante({});
    const resultado = await construirLoteRespaldo(
      "T",
      empresa,
      [c],
      () => {},
      deps({}, { listarArchivos: async () => { throw new Error("caído"); } }),
    );
    expect(resultado.faltantes[0].faltan).toEqual(["XML", "CDR"]);
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

describe("utilidades del lote", () => {
  it("nombreBase limpia caracteres que no valen en rutas de ZIP", () => {
    expect(nombreBase(comprobante({ nombreArchivo: "a/b\\c:d*e", numero: "X" }))).toBe("a-b-c-d-e");
    expect(nombreBase(comprobante({ nombreArchivo: "", numero: "F001-1" }))).toBe("F001-1");
  });

  it("nombreLote y textoLeeme", () => {
    expect(nombreLote(12, empresa)).toBe("respaldo-comprobantes-20514831620-12.zip");
    const leeme = textoLeeme(empresa, [comprobante({})], []);
    expect(leeme).toContain("RUC: 20514831620");
    expect(leeme).toContain("manifiesto.csv");
  });
});

import { describe, expect, it } from "vitest";
import { guardarArchivos, partesCarpeta, rutaRelativa, segmentoSeguro } from "./carpeta-local";

const doc = { fechaEmision: "2026-09-05", numero: "FF01-00000123", cliente: { ruc: "20100000001", razonSocial: "X" } };

describe("partesCarpeta", () => {
  it("arma año / mes / documento / RUC", () => {
    expect(partesCarpeta(doc)).toEqual(["2026", "09", "20100000001", "FF01-00000123"]);
    expect(rutaRelativa("Descargas", partesCarpeta(doc))).toBe(
      "Descargas\\2026\\09\\20100000001\\FF01-00000123",
    );
  });

  it("no inventa datos: sin fecha o sin RUC usa un marcador", () => {
    expect(partesCarpeta({ ...doc, fechaEmision: "", cliente: { ruc: "", razonSocial: "" } })).toEqual([
      "sin-fecha",
      "sin-fecha",
      "sin-ruc",
      "FF01-00000123",
    ]);
  });
});

describe("segmentoSeguro", () => {
  it("quita separadores y caracteres reservados de Windows", () => {
    expect(segmentoSeguro("..\\a/b:c", "x")).toBe("-a-b-c");
    expect(segmentoSeguro("  ..  ", "x")).toBe("x");
  });
});

/** Directorio en memoria con la forma mínima de FileSystemDirectoryHandle. */
interface Falsa {
  nombre: string;
  hijos: Map<string, Falsa>;
  archivos: Map<string, string>;
  getDirectoryHandle(n: string): Promise<Falsa>;
  getFileHandle(n: string): Promise<unknown>;
}

function carpetaFalsa(nombre = "raiz"): Falsa {
  const hijos = new Map<string, Falsa>();
  const archivos = new Map<string, string>();
  return {
    nombre,
    hijos,
    archivos,
    async getDirectoryHandle(n: string) {
      if (!hijos.has(n)) hijos.set(n, carpetaFalsa(n));
      return hijos.get(n)!;
    },
    async getFileHandle(n: string) {
      return {
        async createWritable() {
          return {
            async write(b: Blob) {
              archivos.set(n, await b.text());
            },
            async close() {},
          };
        },
      };
    },
  };
}

describe("guardarArchivos", () => {
  it("crea la estructura y escribe el XML y el CDR dentro de la carpeta del RUC", async () => {
    const raiz = carpetaFalsa();
    await guardarArchivos(raiz as unknown as FileSystemDirectoryHandle, partesCarpeta(doc), [
      { nombre: "F.xml", blob: new Blob(["<xml/>"]) },
      { nombre: "R-F.zip", blob: new Blob(["cdr"]) },
    ]);
    const hoja = raiz.hijos.get("2026")!.hijos.get("09")!.hijos.get("20100000001")!.hijos.get("FF01-00000123")!;
    expect([...hoja.archivos.entries()]).toEqual([
      ["F.xml", "<xml/>"],
      ["R-F.zip", "cdr"],
    ]);
  });
});

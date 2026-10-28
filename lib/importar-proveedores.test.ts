import { describe, expect, it } from "vitest";
import {
  agruparEntradas,
  aplicarRespuesta,
  detieneLaImportacion,
  entradasDeZip,
  estadoDeItem,
  filasIniciales,
  marcarGrupo,
  prepararSeleccion,
  resumirFilas,
  type EntradaImportacion,
  type ItemImportacion,
} from "./importar-proveedores";
import { crearZip } from "./zip";

const archivo = (nombre: string) => new File(["x"], nombre);
const entrada = (ruta: string): EntradaImportacion => ({
  ruta,
  archivo: archivo(ruta.split("/").pop() ?? ruta),
});

describe("agruparEntradas", () => {
  it("una carpeta es una compra: su XML y PDF viajan juntos", () => {
    const { grupos, ignorados } = agruparEntradas([
      entrada("2026/10/20999999999/F010-00000456/b.pdf"),
      entrada("2026/10/20999999999/F010-00000456/a.xml"),
      entrada("2026/10/20999999999/F010-00000457/c.xml"),
      entrada("2026/10/20999999999/F010-00000457/hoja.xlsx"),
    ]);

    expect(grupos.map((g) => g.etiqueta)).toEqual([
      "20999999999/F010-00000456",
      "20999999999/F010-00000457",
    ]);
    expect(grupos[0].archivos.map((a) => a.name)).toEqual(["a.xml", "b.pdf"]);
    expect(ignorados).toBe(1);
  });

  it("los archivos sueltos van en un solo grupo, ordenados por nombre", () => {
    const { grupos } = agruparEntradas([entrada("b.pdf"), entrada("a.xml"), entrada("a.pdf")]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].etiqueta).toBe("Archivos sueltos");
    expect(grupos[0].archivos.map((a) => a.name)).toEqual(["a.pdf", "a.xml", "b.pdf"]);
  });

  it("un grupo demasiado grande se parte sin perder archivos", () => {
    const entradas = Array.from({ length: 5 }, (_, i) => entrada(`doc${i}.pdf`));

    const { grupos } = agruparEntradas(entradas, 2);

    expect(grupos.map((g) => g.archivos.length)).toEqual([2, 2, 1]);
    expect(grupos[0].etiqueta).toBe("Archivos sueltos (1/3)");
  });
});

describe("leer ZIP y carpetas", () => {
  it("de un ZIP salen sus XML y PDF con su ruta, y se ignora el resto", async () => {
    const zip = crearZip([
      { nombre: "20999999999/F010-1/f.xml", contenido: new TextEncoder().encode("<xml/>") },
      { nombre: "20999999999/F010-1/f.pdf", contenido: new TextEncoder().encode("%PDF") },
      { nombre: "20999999999/F010-1/notas.txt", contenido: new TextEncoder().encode("hola") },
    ]);
    const archivoZip = new File([zip], "lote-001.zip");

    const dentro = await entradasDeZip(archivoZip);
    const { grupos, ignorados } = await prepararSeleccion([archivoZip]);

    expect(dentro.map((e) => e.ruta)).toContain("20999999999/F010-1/f.xml");
    expect(grupos).toHaveLength(1);
    expect(grupos[0].etiqueta).toBe("20999999999/F010-1");
    expect(grupos[0].archivos.map((a) => a.name)).toEqual(["f.pdf", "f.xml"]);
    expect(ignorados).toBe(1);
  });

  it("de una carpeta elegida se usa la ruta relativa que da el navegador", async () => {
    const f = archivo("a.xml");
    Object.defineProperty(f, "webkitRelativePath", { value: "Facturas/2026/10/2099/F1/a.xml" });

    const { grupos } = await prepararSeleccion([f]);

    expect(grupos[0].etiqueta).toBe("2099/F1");
  });
});

const item = (parcial: Partial<ItemImportacion>): ItemImportacion => ({
  archivo: "f.xml",
  ok: true,
  ...parcial,
});

describe("estadoDeItem", () => {
  it("distingue completada desde SIRE, nueva, ya estaba, guardado, omitido y error", () => {
    expect(estadoDeItem(item({ situacion: "completada" }))).toBe("completada");
    expect(estadoDeItem(item({ situacion: "nueva" }))).toBe("nueva");
    expect(estadoDeItem(item({ situacion: "repetida" }))).toBe("ya_estaba");
    expect(estadoDeItem(item({ situacion: "ya_estaba" }))).toBe("ya_estaba");
    expect(estadoDeItem(item({ situacion: "guardado" }))).toBe("guardado");
    expect(estadoDeItem(item({ situacion: "unido" }))).toBe("guardado");
    expect(estadoDeItem(item({ ok: false, code: "guia" }))).toBe("omitido");
    expect(estadoDeItem(item({ ok: false, code: "sin_xml" }))).toBe("omitido");
    expect(estadoDeItem(item({ ok: false, code: "invalid_document" }))).toBe("error");
    expect(estadoDeItem(item({ ok: false }))).toBe("error");
  });
});

describe("aplicarRespuesta y resumirFilas", () => {
  const grupos = [
    { id: "g1", etiqueta: "A", archivos: [archivo("f.xml"), archivo("f.pdf"), archivo("r.xml")] },
    { id: "g2", etiqueta: "B", archivos: [archivo("g.xml")] },
  ];

  it("cada archivo toma el resultado que le corresponde y el resumen cuenta cada desenlace", () => {
    let filas = filasIniciales(grupos);
    filas = marcarGrupo(filas, "g1", "importando");
    filas = aplicarRespuesta(filas, "g1", [
      item({ archivo: "f.xml", tipo: "xml", situacion: "nueva", numero: "F010-00000456" }),
      item({ archivo: "f.pdf", tipo: "pdf", situacion: "guardado" }),
      item({
        archivo: "r.xml",
        tipo: "xml",
        ok: false,
        situacion: "omitido",
        code: "cdr_ignorado",
        mensaje: "El portal no guarda CDR",
      }),
    ]);
    filas = aplicarRespuesta(filas, "g2", [
      item({ archivo: "g.xml", tipo: "xml", ok: false, code: "invalid_document", mensaje: "No válido" }),
    ]);

    expect(filas.map((f) => [f.archivo, f.tipo, f.estado])).toEqual([
      ["f.xml", "xml", "nueva"],
      ["f.pdf", "pdf", "guardado"],
      ["r.xml", "xml", "omitido"],
      ["g.xml", "xml", "error"],
    ]);
    expect(resumirFilas(filas)).toMatchObject({
      total: 4,
      procesados: 4,
      nuevas: 1,
      completadas: 0,
      pdfGuardados: 1,
      errores: 1,
      omitidos: 1, // el CDR se ignora y se informa, no es un error
    });
  });

  it("un archivo que el servidor no mencionó no se queda importando para siempre", () => {
    let filas = marcarGrupo(filasIniciales(grupos), "g1", "importando");
    filas = aplicarRespuesta(filas, "g1", [item({ archivo: "f.xml", tipo: "xml", situacion: "completada" })]);

    expect(filas.filter((f) => f.grupo === "g1").map((f) => f.estado)).toEqual([
      "completada",
      "omitido",
      "omitido",
    ]);
  });

  it("lo que el servidor informa y no estaba en la lista se agrega al final de su grupo", () => {
    const filas = aplicarRespuesta(filasIniciales(grupos), "g1", [
      item({ archivo: "f (2).pdf", tipo: "pdf", situacion: "guardado" }),
    ]);

    expect(filas.map((f) => f.archivo)).toEqual(["f.xml", "f.pdf", "r.xml", "f (2).pdf", "g.xml"]);
  });
});

describe("detieneLaImportacion", () => {
  it("se detiene ante problemas de sesión o de conexión, no ante un archivo malo", () => {
    expect(detieneLaImportacion(0, "sin_conexion")).toBe(true);
    expect(detieneLaImportacion(401, "")).toBe(true);
    expect(detieneLaImportacion(403, "")).toBe(true);
    expect(detieneLaImportacion(422, "invalid_document")).toBe(false);
  });
});

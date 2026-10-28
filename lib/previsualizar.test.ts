import { describe, expect, it } from "vitest";
import { archivosPrevisualizables, decodificarXml, moverIndice } from "./previsualizar";

const a = (id: string, tipo: "pdf" | "xml" | "cdr" | "zip", nombre: string) => ({ id, tipo, nombre });

describe("archivosPrevisualizables", () => {
  it("deja solo PDF y XML, con los PDF primero y cada tipo por nombre", () => {
    const lista = [
      a("1", "xml", "F001-1.xml"),
      a("2", "cdr", "R-F001-1.zip"),
      a("3", "pdf", "guia.pdf"),
      a("4", "zip", "todo.zip"),
      a("5", "pdf", "factura.pdf"),
    ];
    expect(archivosPrevisualizables(lista).map((x) => x.id)).toEqual(["5", "3", "1"]);
  });

  it("una lista vacía o sin PDF/XML no da nada que ver", () => {
    expect(archivosPrevisualizables([])).toEqual([]);
    expect(archivosPrevisualizables([a("1", "cdr", "r.zip")])).toEqual([]);
  });
});

describe("moverIndice", () => {
  it("avanza y retrocede sin salirse de los bordes", () => {
    expect(moverIndice(0, 1, 3)).toBe(1);
    expect(moverIndice(2, 1, 3)).toBe(2);
    expect(moverIndice(0, -1, 3)).toBe(0);
    expect(moverIndice(2, -1, 3)).toBe(1);
    expect(moverIndice(0, 1, 0)).toBe(0);
  });
});

describe("decodificarXml", () => {
  it("lee un XML ISO-8859-1 sin romper las tildes", () => {
    const bytes = Uint8Array.from([
      ...new TextEncoder().encode('<?xml version="1.0" encoding="ISO-8859-1"?><n>'),
      0xd1, // Ñ en latin1
      0xe9, // é en latin1
      ...new TextEncoder().encode("</n>"),
    ]);
    expect(decodificarXml(bytes.buffer)).toContain("<n>Ñé</n>");
  });

  it("sin declaración o con una desconocida usa UTF-8", () => {
    const utf8 = new TextEncoder().encode("<n>Ñandú</n>");
    expect(decodificarXml(utf8.buffer as ArrayBuffer)).toBe("<n>Ñandú</n>");
    const rara = new TextEncoder().encode('<?xml version="1.0" encoding="no-existe"?><n>ok</n>');
    expect(decodificarXml(rara.buffer as ArrayBuffer)).toContain("<n>ok</n>");
  });
});

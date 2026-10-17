import { describe, expect, it } from "vitest";
import {
  ORDEN_EVIDENCIA_INICIAL,
  alternarOrdenEvidencia,
  ordenarEvidencias,
  periodoDeEvidencia,
} from "./evidencias";
import type { ArchivoGuardado } from "./types";

function evidencia(parcial: Partial<ArchivoGuardado> & { id: string }): ArchivoGuardado {
  return {
    tipo: "zip",
    nombre: "20514831620-RVIE-202609-1.zip",
    tamano: 1000,
    hashSha256: "aaaa",
    creado: "2026-10-01T10:00:00Z",
    ...parcial,
  };
}

const lista = [
  evidencia({
    id: "a",
    nombre: "20514831620-RVIE-202608-1.zip",
    tamano: 500,
    hashSha256: "ccc",
    creado: "2026-10-02T10:00:00Z",
  }),
  evidencia({
    id: "b",
    nombre: "20514831620-RVIE-202610-1.zip",
    tamano: 9000,
    hashSha256: "aaa",
    creado: "2026-10-05T10:00:00Z",
  }),
  evidencia({
    id: "c",
    nombre: "20514831620-RVIE-202609-1.zip",
    tamano: 2500,
    hashSha256: "bbb",
    creado: "2026-10-03T10:00:00Z",
  }),
];

const ids = (orden: Parameters<typeof ordenarEvidencias>[1]) =>
  ordenarEvidencias(lista, orden).map((e) => e.id);

describe("periodoDeEvidencia", () => {
  it("lo extrae del nombre del archivo de SIRE", () => {
    expect(periodoDeEvidencia("20514831620-RVIE-202609-20260300000083-1.zip")).toBe("2026-09");
    expect(periodoDeEvidencia("otro.zip")).toBeNull();
  });
});

describe("ordenarEvidencias", () => {
  it("por periodo, de menor a mayor y de mayor a menor", () => {
    expect(ids({ campo: "periodo", direccion: "asc" })).toEqual(["a", "c", "b"]);
    expect(ids({ campo: "periodo", direccion: "desc" })).toEqual(["b", "c", "a"]);
  });

  it("por tamaño", () => {
    expect(ids({ campo: "tamano", direccion: "asc" })).toEqual(["a", "c", "b"]);
    expect(ids({ campo: "tamano", direccion: "desc" })).toEqual(["b", "c", "a"]);
  });

  it("por archivo (alfabético) y por SHA-256", () => {
    expect(ids({ campo: "archivo", direccion: "asc" })).toEqual(["a", "c", "b"]);
    expect(ids({ campo: "hash", direccion: "asc" })).toEqual(["b", "c", "a"]);
    expect(ids({ campo: "hash", direccion: "desc" })).toEqual(["a", "c", "b"]);
  });

  it("por fecha de guardado", () => {
    expect(ids({ campo: "guardado", direccion: "asc" })).toEqual(["a", "c", "b"]);
    expect(ids(ORDEN_EVIDENCIA_INICIAL)).toEqual(["b", "c", "a"]);
  });

  it("los valores vacíos van al final en cualquier sentido", () => {
    const conVacio = [...lista, evidencia({ id: "z", tamano: null, hashSha256: null })];
    const asc = ordenarEvidencias(conVacio, { campo: "tamano", direccion: "asc" });
    const desc = ordenarEvidencias(conVacio, { campo: "tamano", direccion: "desc" });
    expect(asc.at(-1)?.id).toBe("z");
    expect(desc.at(-1)?.id).toBe("z");
  });

  it("no modifica la lista original", () => {
    const copia = lista.map((e) => e.id);
    ordenarEvidencias(lista, { campo: "tamano", direccion: "desc" });
    expect(lista.map((e) => e.id)).toEqual(copia);
  });
});

describe("alternarOrdenEvidencia", () => {
  it("la misma columna invierte el sentido", () => {
    expect(
      alternarOrdenEvidencia({ campo: "tamano", direccion: "desc" }, "tamano").direccion,
    ).toBe("asc");
  });

  it("una columna nueva arranca en su sentido natural", () => {
    const actual = { campo: "guardado", direccion: "desc" } as const;
    expect(alternarOrdenEvidencia(actual, "archivo")).toEqual({
      campo: "archivo",
      direccion: "asc",
    });
    expect(alternarOrdenEvidencia(actual, "periodo")).toEqual({
      campo: "periodo",
      direccion: "desc",
    });
  });
});

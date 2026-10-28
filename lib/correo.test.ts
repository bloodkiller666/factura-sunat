import { describe, expect, it } from "vitest";
import { estadoCorreo } from "./correo";

const correo = (asunto: string) => ({ correo: { asunto, remitente: null, recibido: null } });

describe("estadoCorreo", () => {
  it("es SUBIDO cuando el asunto del correo está cargado", () => {
    expect(estadoCorreo(correo("FACTURA E001-278"))).toBe("SUBIDO");
  });

  it("es NO ENCONTRADO sin correo vinculado", () => {
    expect(estadoCorreo({ correo: null })).toBe("NO ENCONTRADO");
  });

  it("un asunto en blanco no cuenta como cargado", () => {
    expect(estadoCorreo(correo("   "))).toBe("NO ENCONTRADO");
    expect(estadoCorreo(correo(""))).toBe("NO ENCONTRADO");
  });
});

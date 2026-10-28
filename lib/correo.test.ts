import { describe, expect, it } from "vitest";
import { estadoCorreo } from "./correo";

const correo = (asunto: string) => ({ correo: { asunto, remitente: null, recibido: null } });

describe("estadoCorreo", () => {
  it("es «Correo enviado» cuando el asunto del correo está cargado", () => {
    expect(estadoCorreo(correo("FACTURA E001-278"))).toBe("Correo enviado");
  });

  it("es «Correo no enviado» sin correo vinculado", () => {
    expect(estadoCorreo({ correo: null })).toBe("Correo no enviado");
  });

  it("un asunto en blanco no cuenta como cargado", () => {
    expect(estadoCorreo(correo("   "))).toBe("Correo no enviado");
    expect(estadoCorreo(correo(""))).toBe("Correo no enviado");
  });
});

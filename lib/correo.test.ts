import { describe, expect, it } from "vitest";
import { estadoCorreo } from "./correo";

const correo = (asunto: string) => ({ correo: { asunto, remitente: null, recibido: null } });

describe("estadoCorreo", () => {
  it("es «Enviado» cuando el asunto del correo está cargado", () => {
    expect(estadoCorreo(correo("FACTURA E001-278"))).toBe("Enviado");
  });

  it("es «No enviado» sin correo vinculado", () => {
    expect(estadoCorreo({ correo: null })).toBe("No enviado");
  });

  it("un asunto en blanco no cuenta como cargado", () => {
    expect(estadoCorreo(correo("   "))).toBe("No enviado");
    expect(estadoCorreo(correo(""))).toBe("No enviado");
  });
});

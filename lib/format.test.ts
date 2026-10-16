import { describe, expect, it } from "vitest";
import {
  etiquetaPeriodo,
  formatearFecha,
  formatearFechaLarga,
  formatearMoneda,
  formatearTamano,
  iniciales,
  periodoSire,
  porcentaje,
  simboloMoneda,
} from "./format";

/** Intl usa espacios no separables: se normalizan para comparar. */
const limpio = (texto: string) => texto.replace(/\s/g, " ");

describe("formatearMoneda", () => {
  it("soles y dólares con dos decimales", () => {
    expect(limpio(formatearMoneda(1234.5))).toBe("S/ 1,234.50");
    expect(limpio(formatearMoneda(1234.5, "USD"))).toBe("USD 1,234.50");
  });

  it("importes negativos (notas de crédito)", () => {
    expect(limpio(formatearMoneda(-59))).toBe("-S/ 59.00");
  });

  it("símbolos", () => {
    expect(simboloMoneda("PEN")).toBe("S/");
    expect(simboloMoneda("USD")).toBe("US$");
  });
});

describe("fechas", () => {
  it("formatearFecha", () => {
    expect(formatearFecha("2026-09-02")).toBe("02/09/2026");
    expect(formatearFecha(null)).toBe("—");
    expect(formatearFecha("")).toBe("—");
    expect(formatearFecha("basura")).toBe("—");
  });

  it("formatearFechaLarga usa «setiembre»", () => {
    expect(formatearFechaLarga("2026-09-02")).toBe("2 de setiembre de 2026");
    expect(formatearFechaLarga(undefined)).toBe("—");
  });

  it("etiquetaPeriodo y periodoSire", () => {
    expect(etiquetaPeriodo("2026-10")).toBe("Octubre 2026");
    expect(etiquetaPeriodo("TODOS")).toBe("Todos los periodos");
    expect(periodoSire("2026-09")).toBe("202609");
  });
});

describe("utilidades", () => {
  it("formatearTamano", () => {
    expect(formatearTamano(null)).toBe("—");
    expect(formatearTamano(512)).toBe("512 B");
    expect(formatearTamano(8599)).toBe("8,4 KB");
    expect(formatearTamano(3 * 1024 * 1024)).toBe("3,0 MB");
  });

  it("porcentaje no divide por cero", () => {
    expect(porcentaje(1, 0)).toBe(0);
    expect(porcentaje(1, 3)).toBe(33);
    expect(porcentaje(3, 3)).toBe(100);
  });

  it("iniciales", () => {
    expect(iniciales("TDM ASFALTOS S.A.C.")).toBe("TA");
    expect(iniciales("demo")).toBe("D");
    expect(iniciales("—")).toBe("?");
  });
});

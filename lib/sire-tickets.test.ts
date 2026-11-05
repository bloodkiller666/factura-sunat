import { describe, expect, it } from "vitest";
import {
  VIGENCIA_TICKET_MS,
  guardarTicket,
  leerTicket,
  olvidarTicket,
  type AlmacenTickets,
} from "./sire-tickets";

function memoria(): AlmacenTickets & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

describe("tickets de SIRE recordados", () => {
  it("guarda y devuelve el ticket de ese periodo y libro", () => {
    const a = memoria();
    guardarTicket("205", "compras", "202610", "T-157", a, 1000);
    expect(leerTicket("205", "compras", "202610", a, 2000)).toBe("T-157");
  });

  it("no mezcla periodos, libros ni empresas", () => {
    const a = memoria();
    guardarTicket("205", "compras", "202610", "T-157", a, 1000);
    expect(leerTicket("205", "compras", "202611", a, 1000)).toBeUndefined();
    expect(leerTicket("205", "ventas", "202610", a, 1000)).toBeUndefined();
    expect(leerTicket("999", "compras", "202610", a, 1000)).toBeUndefined();
  });

  it("un ticket vencido se descarta y se borra", () => {
    const a = memoria();
    guardarTicket("205", "compras", "202610", "T-157", a, 0);
    expect(leerTicket("205", "compras", "202610", a, VIGENCIA_TICKET_MS + 1)).toBeUndefined();
    expect(a.datos.size).toBe(0);
  });

  it("olvidarTicket lo borra", () => {
    const a = memoria();
    guardarTicket("205", "compras", "202610", "T-157", a, 1000);
    olvidarTicket("205", "compras", "202610", a);
    expect(leerTicket("205", "compras", "202610", a, 1000)).toBeUndefined();
  });

  it("un valor guardado dañado se ignora sin fallar", () => {
    const a = memoria();
    a.setItem("sire-ticket:205:compras:202610", "{no es json");
    expect(leerTicket("205", "compras", "202610", a, 1000)).toBeUndefined();
  });

  it("sin almacén disponible no falla", () => {
    expect(() => guardarTicket("205", "compras", "202610", "T", null)).not.toThrow();
    expect(leerTicket("205", "compras", "202610", null)).toBeUndefined();
  });
});

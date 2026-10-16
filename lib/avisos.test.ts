import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aviso, descartarAviso, leerAvisos, reiniciarAvisos, suscribirAvisos } from "./avisos";

describe("avisos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout });
    reiniciarAvisos();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("emite avisos con su tono y notifica a los suscriptores", () => {
    const oyente = vi.fn();
    const baja = suscribirAvisos(oyente);

    aviso.ok("Listo", "detalle");
    aviso.error("Falló");

    expect(leerAvisos().map((a) => [a.tono, a.titulo])).toEqual([
      ["ok", "Listo"],
      ["aviso", "Falló"],
    ]);
    expect(oyente).toHaveBeenCalledTimes(2);
    baja();
    aviso.info("Otro");
    expect(oyente).toHaveBeenCalledTimes(2);
  });

  it("se descartan solos pasado un tiempo", () => {
    aviso.info("Pasajero");
    expect(leerAvisos()).toHaveLength(1);
    vi.advanceTimersByTime(5100);
    expect(leerAvisos()).toHaveLength(0);
  });

  it("se pueden cerrar a mano y solo caben unos pocos a la vez", () => {
    const id = aviso.ok("a");
    for (const n of [1, 2, 3, 4, 5]) aviso.ok(`b${n}`);
    expect(leerAvisos()).toHaveLength(4);
    expect(leerAvisos().some((a) => a.id === id)).toBe(false);
    descartarAviso(leerAvisos()[0].id);
    expect(leerAvisos()).toHaveLength(3);
  });
});

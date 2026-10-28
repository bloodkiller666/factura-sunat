import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aviso,
  conectarReportadorDeFallos,
  descartarAviso,
  leerAvisos,
  reiniciarAvisos,
  suscribirAvisos,
} from "./avisos";

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

  it("un fallo se muestra y se registra; un aviso de orientación solo se muestra", () => {
    const reportador = vi.fn();
    const desconectar = conectarReportadorDeFallos(reportador);

    aviso.error("No se pudo abrir la carpeta", "Esa carpeta aún no existe");
    aviso.error("No hay comprobantes para exportar", "Ajusta los filtros", { registrar: false });
    aviso.ok("Listo");

    expect(leerAvisos()).toHaveLength(3);
    expect(reportador).toHaveBeenCalledTimes(1);
    expect(reportador).toHaveBeenCalledWith({
      accion: "No se pudo abrir la carpeta",
      mensaje: "Esa carpeta aún no existe",
    });
    desconectar();
    aviso.error("Otro fallo");
    expect(reportador).toHaveBeenCalledTimes(1);
  });

  it("si registrar el fallo revienta, el aviso igual se muestra", () => {
    const desconectar = conectarReportadorDeFallos(() => {
      throw new Error("sin red");
    });

    expect(() => aviso.error("No se pudo importar el XML", "Revisa el archivo.")).not.toThrow();
    expect(leerAvisos().map((a) => a.titulo)).toEqual(["No se pudo importar el XML"]);
    desconectar();
  });

  it("los fallos se quedan en pantalla más que los avisos normales", () => {
    aviso.error("Falló");
    aviso.info("Pasajero");
    vi.advanceTimersByTime(5100);
    expect(leerAvisos().map((a) => a.titulo)).toEqual(["Falló"]);
    vi.advanceTimersByTime(4000);
    expect(leerAvisos()).toHaveLength(0);
  });
});

import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiSireSync } from "./api";
import {
  PRIMER_PERIODO_SIRE,
  detieneElLote,
  mesesDisponibles,
  resumirLote,
  sincronizarMes,
  sincronizarMeses,
  type ResultadoMes,
} from "./sire-lote";

const respuesta = (parcial: Partial<ApiSireSync> = {}): ApiSireSync => ({
  periodo: "202609",
  ticket: "20260300000001",
  estado: "completado",
  total_filas: 10,
  nuevos: 8,
  ya_existian: 2,
  anulados: 1,
  omitidos: { tipo_no_soportado: 1 },
  evidencias: [],
  mensaje: "ok",
  ...parcial,
});

describe("sincronizarMes", () => {
  it("pide el periodo en formato SUNAT (AAAAMM) y resume el resultado", async () => {
    const llamar = vi.fn().mockResolvedValue(respuesta());
    const r = await sincronizarMes("T", "205", "2026-09", llamar);
    expect(llamar).toHaveBeenCalledWith("T", "205", "202609", undefined, "ventas");
    expect(r).toMatchObject({ mes: "2026-09", estado: "ok", nuevos: 8, yaExistian: 2, anulados: 1, omitidos: 1 });
  });

  it("con el libro de compras pide el registro RCE", async () => {
    const llamar = vi.fn().mockResolvedValue(respuesta());
    await sincronizarMes("T", "205", "2026-09", llamar, "compras");
    expect(llamar).toHaveBeenCalledWith("T", "205", "202609", undefined, "compras");
  });

  it("si SUNAT tarda, retoma con el mismo ticket sin pedir otra propuesta", async () => {
    const llamar = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ estado: "en_proceso", ticket: "T-1" }))
      .mockResolvedValueOnce(respuesta({ estado: "en_proceso", ticket: "T-1" }))
      .mockResolvedValueOnce(respuesta());
    const r = await sincronizarMes("T", "205", "2026-09", llamar);
    expect(r.estado).toBe("ok");
    expect(llamar.mock.calls.map((c) => c[3])).toEqual([undefined, "T-1", "T-1"]);
  });

  it("un periodo sin comprobantes no es un error", async () => {
    const llamar = vi.fn().mockResolvedValue(respuesta({ estado: "sin_datos", nuevos: 0, ya_existian: 0, omitidos: {} }));
    expect((await sincronizarMes("T", "205", "2026-01", llamar)).estado).toBe("sin_datos");
  });

  it("se rinde con un error claro si el ticket nunca termina", async () => {
    const llamar = vi.fn().mockResolvedValue(respuesta({ estado: "en_proceso", ticket: "T-9" }));
    const r = await sincronizarMes("T", "205", "2026-09", llamar);
    expect(r.estado).toBe("error");
    expect(r.mensaje).toMatch(/sigue generando/);
    expect(llamar.mock.calls.length).toBeLessThanOrEqual(10);
  });
});

describe("sincronizarMeses", () => {
  it("un periodo ya cargado se marca como omitido y no detiene los demás", async () => {
    const llamar = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("El periodo 202608 ya está cargado", "periodo_ya_cargado", 409))
      .mockResolvedValue(respuesta());
    const r = await sincronizarMeses("T", "205", ["2026-08", "2026-09"], {
      llamar,
      cancelado: () => false,
      alCambiar: () => {},
    });
    expect(r.map((x) => x.estado)).toEqual(["omitido", "ok"]);
    expect(r[0].mensaje).toMatch(/ya está cargado/);
  });

  const meses = ["2026-07", "2026-08", "2026-09"];

  it("avanza mes a mes y notifica cada cambio", async () => {
    const llamar = vi.fn().mockResolvedValue(respuesta());
    const vistos: string[] = [];
    const resultados = await sincronizarMeses("T", "205", meses, {
      llamar,
      cancelado: () => false,
      alCambiar: (r) => vistos.push(`${r.mes}:${r.estado}`),
    });
    expect(resultados.map((r) => r.estado)).toEqual(["ok", "ok", "ok"]);
    expect(vistos.slice(0, 2)).toEqual(["2026-07:en_curso", "2026-07:ok"]);
  });

  it("un mes con error no detiene a los demás", async () => {
    const llamar = vi
      .fn()
      .mockResolvedValueOnce(respuesta())
      .mockRejectedValueOnce(new ApiError("SUNAT rechazó la solicitud", "sunat_fault", 502))
      .mockResolvedValueOnce(respuesta());
    const resultados = await sincronizarMeses("T", "205", meses, { llamar, cancelado: () => false, alCambiar: () => {} });
    expect(resultados.map((r) => r.estado)).toEqual(["ok", "error", "ok"]);
    expect(resultados[1].mensaje).toBe("SUNAT rechazó la solicitud");
  });

  it("un error de acceso o de red detiene el resto: repetirlo solo multiplicaría el fallo", async () => {
    for (const error of [
      new ApiError("denegado", "sunat_auth_error", 502),
      new ApiError("sin permiso", "forbidden", 403),
      new ApiError("sin red", "sin_conexion", 0),
      new ApiError("token", "unauthenticated", 401),
    ]) {
      const llamar = vi.fn().mockRejectedValue(error);
      const resultados = await sincronizarMeses("T", "205", meses, { llamar, cancelado: () => false, alCambiar: () => {} });
      expect(resultados.map((r) => r.estado)).toEqual(["error", "omitido", "omitido"]);
      expect(llamar).toHaveBeenCalledTimes(1);
    }
  });

  it("se puede detener entre un mes y el siguiente", async () => {
    let n = 0;
    const llamar = vi.fn().mockResolvedValue(respuesta());
    const resultados = await sincronizarMeses("T", "205", meses, {
      llamar,
      cancelado: () => n++ >= 1,
      alCambiar: () => {},
    });
    expect(resultados.map((r) => r.estado)).toEqual(["ok", "omitido", "omitido"]);
  });
});

describe("utilidades", () => {
  it("detieneElLote solo para ApiError de acceso/red", () => {
    expect(detieneElLote(new Error("x"))).toBe(false);
    expect(detieneElLote(new ApiError("x", "sunat_fault", 502))).toBe(false);
    expect(detieneElLote(new ApiError("x", "sunat_auth_error", 502))).toBe(true);
    expect(detieneElLote(new ApiError("x", "credentials_not_configured", 409))).toBe(true);
  });

  it("resumirLote suma lo nuevo y cuenta errores", () => {
    const base = { yaExistian: 0, anulados: 0, omitidos: 0 };
    const rs: ResultadoMes[] = [
      { mes: "a", estado: "ok", nuevos: 5, ...base, yaExistian: 1 },
      { mes: "b", estado: "error", nuevos: 0, ...base },
      { mes: "c", estado: "sin_datos", nuevos: 0, ...base },
    ];
    expect(resumirLote(rs)).toEqual({ nuevos: 5, yaExistian: 1, errores: 1, completados: 2 });
  });

  it("mesesDisponibles arranca en julio de 2023", () => {
    const meses = mesesDisponibles("2026-10");
    expect(meses[0]).toBe(PRIMER_PERIODO_SIRE);
    expect(meses.at(-1)).toBe("2026-10");
    expect(meses).toHaveLength(40);
  });
});

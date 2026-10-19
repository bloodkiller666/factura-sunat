import { describe, expect, it } from "vitest";
import type { ApiBizlinksItem, ApiBizlinksSync } from "./api";
import {
  describirItem,
  motivoDetencion,
  nombreItem,
  pendientes,
  resumirRespaldos,
  tonoItem,
} from "./bizlinks";

const item = (parcial: Partial<ApiBizlinksItem> = {}): ApiBizlinksItem => ({
  comprobante_id: "cd487bd4-e84f-4ed7-8728-0f077504a37a",
  numero: "20514831620-01-FF04-00000600",
  resultado: "completo",
  xml_guardado: true,
  cdr_guardado: true,
  items_cargados: 1,
  mensaje: null,
  error_code: null,
  ...parcial,
});

const sync = (parcial: Partial<ApiBizlinksSync> = {}): ApiBizlinksSync => ({
  ruc: "20514831620",
  canal: "portal",
  revisados: 1,
  completos: 1,
  parciales: 0,
  sin_resultado: 0,
  fallidos: 0,
  xml_guardados: 1,
  cdr_guardados: 1,
  detenido_por: null,
  mensaje: null,
  cuota_restante: 49,
  reanuda_at: null,
  items: [item()],
  consultado_at: "2026-10-19T15:48:05Z",
  ...parcial,
});

describe("resumirRespaldos", () => {
  it("informa los archivos que realmente se archivaron", () => {
    const r = resumirRespaldos(sync());
    expect(r.tono).toBe("ok");
    expect(r.titulo).toBe("Respaldos recuperados: 1 XML · 1 CDR");
    expect(r.detalle).toContain("1 completos");
  });

  it("sin candidatos lo dice tal cual, sin alarmar", () => {
    const r = resumirRespaldos(sync({ revisados: 0, items: [], xml_guardados: 0, cdr_guardados: 0 }));
    expect(r).toMatchObject({ tono: "ok", titulo: "Nada que recuperar" });
  });

  it("un fallo de almacenamiento se distingue de «Bizlinks no lo tiene»", () => {
    const r = resumirRespaldos(
      sync({
        completos: 0,
        fallidos: 1,
        xml_guardados: 0,
        cdr_guardados: 0,
        items: [item({ resultado: "error", mensaje: "No se pudo archivar el XML", xml_guardado: false })],
      }),
    );
    expect(r.tono).toBe("error");
    expect(r.titulo).toContain("no se pudieron archivar");
    expect(r.detalle).toBe("No se pudo archivar el XML");
  });

  it("sin resultado avisa que se reintentará y no se repite en 24 h", () => {
    const r = resumirRespaldos(
      sync({
        completos: 0,
        sin_resultado: 1,
        xml_guardados: 0,
        cdr_guardados: 0,
        items: [item({ resultado: "sin_resultado", mensaje: "No corresponde a ningún documento" })],
      }),
    );
    expect(r.tono).toBe("aviso");
    expect(r.detalle).toContain("24 h");
  });

  it("explica por qué se detuvo el lote (credenciales, bloqueo, cuota)", () => {
    const r = resumirRespaldos(
      sync({ revisados: 0, items: [], detenido_por: "bizlinks_blocked", xml_guardados: 0, cdr_guardados: 0 }),
    );
    expect(r.tono).toBe("error");
    expect(r.titulo).toBe("No se pudo consultar Bizlinks");
    expect(r.detalle).toContain("bloqueó");
  });

  it("un motivo desconocido se muestra con su código", () => {
    expect(motivoDetencion("algo_nuevo")).toBe("El lote se detuvo (algo_nuevo).");
    expect(motivoDetencion(null)).toBeNull();
  });
});

describe("detalle por comprobante", () => {
  it("acorta el número a serie-correlativo", () => {
    expect(nombreItem(item())).toBe("FF04-00000600");
    expect(nombreItem(item({ numero: "F001-00000001" }))).toBe("F001-00000001");
    expect(nombreItem(item({ numero: null }))).toBe("cd487bd4");
  });

  it("describe el resultado y su tono", () => {
    expect(describirItem(item())).toContain("1 ítems cargados");
    expect(describirItem(item({ items_cargados: 0 }))).toBe("XML y CDR archivados");
    expect(describirItem(item({ resultado: "parcial" }))).toContain("parte");
    expect(describirItem(item({ resultado: "error", mensaje: "falló" }))).toBe("falló");
    expect(describirItem(item({ resultado: "sin_resultado", mensaje: null }))).toBe(
      "Bizlinks no lo tiene",
    );
    expect(tonoItem(item())).toBe("ok");
    expect(tonoItem(item({ resultado: "error" }))).toBe("error");
    expect(tonoItem(item({ resultado: "sin_resultado" }))).toBe("aviso");
  });

  it("lista solo los que no quedaron completos", () => {
    const items = [item(), item({ resultado: "parcial" }), item({ resultado: "error" })];
    expect(pendientes(sync({ items }))).toHaveLength(2);
  });
});

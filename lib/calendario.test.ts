import { describe, expect, it } from "vitest";
import {
  atajosDeRango,
  describirRango,
  diaDeSemana,
  diasDelMes,
  enRango,
  esFechaIso,
  hoyIso,
  mesCompleto,
  ordenarRango,
  semanasDelMes,
  sumarDias,
  sumarMeses,
  ultimoDiaDelMes,
} from "./calendario";

describe("aritmética de fechas", () => {
  it("días del mes, con bisiestos", () => {
    expect(diasDelMes(2026, 2)).toBe(28);
    expect(diasDelMes(2028, 2)).toBe(29);
    expect(diasDelMes(2026, 9)).toBe(30);
    expect(diasDelMes(2026, 12)).toBe(31);
  });

  it("valida fechas ISO reales", () => {
    expect(esFechaIso("2026-09-30")).toBe(true);
    expect(esFechaIso("2026-02-29")).toBe(false);
    expect(esFechaIso("2026-13-01")).toBe(false);
    expect(esFechaIso("26-9-1")).toBe(false);
    expect(esFechaIso("")).toBe(false);
  });

  it("suma días cruzando mes y año", () => {
    expect(sumarDias("2026-09-30", 1)).toBe("2026-10-01");
    expect(sumarDias("2026-01-01", -1)).toBe("2025-12-31");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("suma meses ajustando el día al último del mes de destino", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2026-10-15", -10)).toBe("2025-12-15");
    expect(sumarMeses("2026-12-01", 1)).toBe("2027-01-01");
    expect(sumarMeses("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("el día de la semana empieza en lunes", () => {
    expect(diaDeSemana("2026-10-12")).toBe(0); // lunes
    expect(diaDeSemana("2026-10-18")).toBe(6); // domingo
  });

  it("hoyIso usa la fecha local, no UTC", () => {
    expect(hoyIso(new Date(2026, 9, 17, 23, 30))).toBe("2026-10-17");
  });

  it("último día del mes", () => {
    expect(ultimoDiaDelMes("2026-09-10")).toBe("2026-09-30");
    expect(ultimoDiaDelMes("2028-02-01")).toBe("2028-02-29");
  });
});

describe("semanasDelMes", () => {
  it("setiembre 2026 empieza en martes y cabe en 5 semanas de 7 celdas", () => {
    const semanas = semanasDelMes(2026, 9);
    expect(semanas).toHaveLength(5);
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas[0].slice(0, 2)).toEqual([null, "2026-09-01"]);
    expect(semanas[4].at(-1)).toBeNull();
    const dias = semanas.flat().filter(Boolean);
    expect(dias).toHaveLength(30);
    expect(dias[0]).toBe("2026-09-01");
    expect(dias.at(-1)).toBe("2026-09-30");
  });

  it("un mes que empieza en lunes no tiene huecos iniciales", () => {
    expect(semanasDelMes(2026, 6)[0][0]).toBe("2026-06-01");
  });

  it("febrero de 28 días que empieza en domingo ocupa 5 semanas", () => {
    // 1 feb 2026 es domingo.
    expect(semanasDelMes(2026, 2)).toHaveLength(5);
    expect(semanasDelMes(2026, 2)[0][6]).toBe("2026-02-01");
  });
});

describe("rangos", () => {
  it("ordena los extremos aunque se marquen al revés", () => {
    expect(ordenarRango("2026-09-20", "2026-09-05")).toEqual({
      desde: "2026-09-05",
      hasta: "2026-09-20",
    });
  });

  it("enRango incluye ambos extremos", () => {
    const rango = { desde: "2026-09-05", hasta: "2026-09-20" };
    expect(enRango("2026-09-05", rango)).toBe(true);
    expect(enRango("2026-09-20", rango)).toBe(true);
    expect(enRango("2026-09-21", rango)).toBe(false);
  });

  it("reconoce un mes completo", () => {
    expect(mesCompleto("2026-09-01", "2026-09-30")).toBe("2026-09");
    expect(mesCompleto("2026-09-01", "2026-09-29")).toBeNull();
    expect(mesCompleto("2026-09-02", "2026-09-30")).toBeNull();
    expect(mesCompleto("", "")).toBeNull();
  });

  it("describe el rango para el botón", () => {
    expect(describirRango("", "")).toBe("Todas las fechas");
    expect(describirRango("2026-09-01", "2026-09-30")).toBe("Setiembre 2026");
    expect(describirRango("2026-09-05", "2026-09-20")).toBe("05/09/2026 – 20/09/2026");
    expect(describirRango("2026-09-05", "2026-09-05")).toBe("05/09/2026");
    expect(describirRango("2026-09-05", "")).toBe("Desde 05/09/2026");
    expect(describirRango("", "2026-09-20")).toBe("Hasta 20/09/2026");
  });
});

describe("atajosDeRango", () => {
  const atajos = Object.fromEntries(atajosDeRango("2026-10-17").map((a) => [a.id, a.rango]));

  it("este mes y mes anterior", () => {
    expect(atajos["mes"]).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
    expect(atajos["mes-anterior"]).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
  });

  it("últimos 7 y 30 días incluyen hoy", () => {
    expect(atajos["7d"]).toEqual({ desde: "2026-10-11", hasta: "2026-10-17" });
    expect(atajos["30d"]).toEqual({ desde: "2026-09-18", hasta: "2026-10-17" });
  });

  it("el mes anterior de enero es diciembre del año previo", () => {
    const enero = Object.fromEntries(atajosDeRango("2026-01-15").map((a) => [a.id, a.rango]));
    expect(enero["mes-anterior"]).toEqual({ desde: "2025-12-01", hasta: "2025-12-31" });
  });

  it("'todas las fechas' no acota", () => {
    expect(atajos["todo"]).toBeNull();
  });
});

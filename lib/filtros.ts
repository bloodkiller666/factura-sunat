/** Filtros y métricas del listado: lógica pura, sin React (se prueba con vitest). */

import { TODOS_LOS_PERIODOS, etiquetaPeriodo } from "./format";
import type { Comprobante, FiltrosState } from "./types";

export const FILTROS_INICIALES: FiltrosState = {
  q: "",
  mes: TODOS_LOS_PERIODOS,
  tipo: "TODOS",
  estadoSunat: "TODOS",
  respaldo: "TODOS",
  numeroSap: "",
  checkSap: "TODOS",
  desde: "",
  hasta: "",
};

/** ¿Hay algún filtro distinto del valor por defecto? */
export function hayFiltrosActivos(filtros: FiltrosState): boolean {
  return (Object.keys(FILTROS_INICIALES) as Array<keyof FiltrosState>).some(
    (clave) => filtros[clave] !== FILTROS_INICIALES[clave],
  );
}

/** ¿El comprobante cae dentro del periodo elegido? `"TODOS"` no acota por mes. */
export function coincideMes(iso: string, periodo: string): boolean {
  if (periodo === TODOS_LOS_PERIODOS) return true;
  const [anio, mes] = periodo.split("-").map(Number);
  const [a, m] = iso.split("-").map(Number);
  return anio === a && mes === m;
}

/** Valor vigente del Check SAP: el cambio optimista pendiente manda sobre el guardado. */
export function checkVigente(
  comprobante: Comprobante,
  pendientes: Record<string, boolean>,
): boolean {
  return pendientes[comprobante.id] ?? comprobante.checkSap;
}

export function aplicarFiltros(
  comprobantes: Comprobante[],
  filtros: FiltrosState,
  checksPendientes: Record<string, boolean> = {},
): Comprobante[] {
  const consulta = filtros.q.trim().toLowerCase();
  const filtroSap = filtros.numeroSap.trim().toLowerCase();

  return comprobantes.filter((comprobante) => {
    if (consulta !== "") {
      const coincide =
        comprobante.numero.toLowerCase().includes(consulta) ||
        comprobante.tipo.toLowerCase().includes(consulta) ||
        comprobante.cliente.razonSocial.toLowerCase().includes(consulta) ||
        comprobante.ordenCompra.toLowerCase().includes(consulta) ||
        comprobante.cliente.ruc.includes(consulta);
      if (!coincide) return false;
    }
    if (!coincideMes(comprobante.fechaEmision, filtros.mes)) return false;
    if (filtros.tipo !== "TODOS" && comprobante.tipo !== filtros.tipo) return false;
    if (filtros.estadoSunat !== "TODOS" && comprobante.estadoSunat !== filtros.estadoSunat) {
      return false;
    }
    if (filtroSap !== "" && !comprobante.numeroSap.toLowerCase().includes(filtroSap)) {
      return false;
    }

    const marcado = checkVigente(comprobante, checksPendientes);
    if (filtros.checkSap === "CON" && !marcado) return false;
    if (filtros.checkSap === "SIN" && marcado) return false;

    if (filtros.respaldo === "SIN_XML" && comprobante.tieneXml) return false;
    if (filtros.respaldo === "SIN_CDR" && comprobante.tieneCdr) return false;
    if (filtros.respaldo === "COMPLETO" && !(comprobante.tieneXml && comprobante.tieneCdr)) {
      return false;
    }

    if (filtros.desde !== "" && comprobante.fechaEmision < filtros.desde) return false;
    if (filtros.hasta !== "" && comprobante.fechaEmision > filtros.hasta) return false;
    return true;
  });
}

export interface Cobertura {
  /** Comprobantes que deberían tener respaldo (todos menos los anulados). */
  total: number;
  conXml: number;
  conCdr: number;
  conPdf: number;
}

export interface Metricas {
  totalComprobantes: number;
  aprobados: number;
  pendientes: number;
  anulados: number;
  rechazados: number;
  /** Facturado neto en soles: las notas de crédito restan; sin anulados ni rechazados. */
  facturadoPen: number;
  /** Facturado neto en dólares, aparte: no se convierte a soles. */
  facturadoUsd: number;
  cobertura: Cobertura;
  periodo: string;
  etiquetaPeriodo: string;
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Métricas del periodo elegido; alimentan la franja de indicadores. */
export function calcularMetricas(comprobantes: Comprobante[], periodo: string): Metricas {
  const delPeriodo = comprobantes.filter((c) => coincideMes(c.fechaEmision, periodo));

  // Solo cuenta lo vigente. Cada moneda se suma por separado: no hay tipo de
  // cambio para mezclar soles con dólares.
  const vigentes = delPeriodo.filter(
    (c) => c.estadoSunat !== "Anulado" && c.estadoSunat !== "Rechazado",
  );
  const neto = (moneda: string) =>
    redondear(
      vigentes
        .filter((c) => c.moneda === moneda)
        .reduce((suma, c) => suma + (c.tipo === "Nota de Crédito" ? -c.total : c.total), 0),
    );

  const exigibles = delPeriodo.filter((c) => c.estadoSunat !== "Anulado");

  return {
    totalComprobantes: delPeriodo.length,
    aprobados: delPeriodo.filter((c) => c.estadoSunat === "Aprobado").length,
    pendientes: delPeriodo.filter((c) => c.estadoSunat === "Pendiente").length,
    anulados: delPeriodo.filter((c) => c.estadoSunat === "Anulado").length,
    rechazados: delPeriodo.filter((c) => c.estadoSunat === "Rechazado").length,
    facturadoPen: neto("PEN"),
    facturadoUsd: neto("USD"),
    cobertura: {
      total: exigibles.length,
      conXml: exigibles.filter((c) => c.tieneXml).length,
      conCdr: exigibles.filter((c) => c.tieneCdr).length,
      conPdf: exigibles.filter((c) => c.tienePdf).length,
    },
    periodo,
    etiquetaPeriodo: etiquetaPeriodo(periodo),
  };
}

/** Periodos `yyyy-mm` presentes en los comprobantes, del más nuevo al más viejo. */
export function derivarPeriodos(comprobantes: Comprobante[]): string[] {
  const periodos = new Set<string>();
  for (const comprobante of comprobantes) {
    if (comprobante.fechaEmision.length >= 7) periodos.add(comprobante.fechaEmision.slice(0, 7));
  }
  return [...periodos].sort().reverse();
}

/** Meses `yyyy-mm` desde `desde` hasta `hasta` (ambos inclusive), del más antiguo al más nuevo. */
export function mesesEntre(desde: string, hasta: string): string[] {
  const [a0, m0] = desde.split("-").map(Number);
  const [a1, m1] = hasta.split("-").map(Number);
  const meses: string[] = [];
  let anio = a0;
  let mes = m0;
  while (anio < a1 || (anio === a1 && mes <= m1)) {
    meses.push(`${anio}-${String(mes).padStart(2, "0")}`);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
  return meses;
}

export type CampoOrden = "fecha" | "numero" | "cliente" | "importe";
export interface Orden {
  campo: CampoOrden;
  direccion: "asc" | "desc";
}

export const ORDEN_INICIAL: Orden = { campo: "fecha", direccion: "desc" };

/** Importe con signo: las notas de crédito restan, así que ordenan como negativas. */
function importeConSigno(comprobante: Comprobante): number {
  return comprobante.tipo === "Nota de Crédito" ? -comprobante.total : comprobante.total;
}

/** Copia ordenada. El desempate por número hace el orden estable y predecible. */
export function ordenar(comprobantes: Comprobante[], orden: Orden): Comprobante[] {
  const sentido = orden.direccion === "asc" ? 1 : -1;
  const clave = (c: Comprobante): number | string => {
    switch (orden.campo) {
      case "fecha":
        return c.fechaEmision;
      case "numero":
        return c.numero;
      case "cliente":
        return c.cliente.razonSocial.toLowerCase();
      case "importe":
        return importeConSigno(c);
    }
  };
  return [...comprobantes].sort((a, b) => {
    const ka = clave(a);
    const kb = clave(b);
    if (ka < kb) return -1 * sentido;
    if (ka > kb) return 1 * sentido;
    return a.numero < b.numero ? 1 : a.numero > b.numero ? -1 : 0;
  });
}

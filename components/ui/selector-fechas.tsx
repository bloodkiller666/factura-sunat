"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  DIAS_SEMANA,
  NOMBRES_MES,
  atajosDeRango,
  atajosDeVencimiento,
  describirRango,
  enRango,
  hoyIso,
  ordenarRango,
  partes,
  primerDiaDelMes,
  semanasDelMes,
  sumarDias,
  sumarMeses,
  ultimoDiaDelMes,
  type Rango,
} from "@/lib/calendario";
import { formatearFechaLarga } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  desde: string;
  hasta: string;
  onChange: (rango: Rango) => void;
  deshabilitado?: boolean;
  className?: string;
  /**
   * Qué fecha se filtra: `emision` (por defecto) o `vencimiento`, que ofrece atajos hacia
   * adelante («Próximos 7 días», «Ya vencidos») y otro rótulo.
   */
  modo?: "emision" | "vencimiento";
}

const ANCHO_PANEL = 548;
const ANCHO_MOVIL = 640;

/**
 * Selector de rango de fechas: un calendario en lugar de dos campos día/mes/año.
 *
 * - Dos clics marcan el rango (en cualquier orden); un clic en "Este mes", "Mes anterior",
 *   etc. lo aplica de inmediato, y el título del mes abre un selector de mes y año.
 * - En pantallas angostas el panel sube como una hoja desde abajo con botones grandes.
 * - Teclado: flechas mueven el día, RePág/AvPág cambian de mes, Enter marca, Esc cierra.
 */
export function SelectorFechas({
  desde,
  hasta,
  onChange,
  deshabilitado,
  className,
  modo = "emision",
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [movil, setMovil] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [vista, setVista] = useState<"dias" | "meses">("dias");
  const [mesVisible, setMesVisible] = useState(() => primerDiaDelMes(hoyIso()));
  const [anioMeses, setAnioMeses] = useState(() => partes(hoyIso()).anio);
  const [inicio, setInicio] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [foco, setFoco] = useState<string>(hoyIso());
  const ancla = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const hoy = hoyIso();
  const hayRango = Boolean(desde || hasta);
  const atajos = useMemo(
    () => (modo === "vencimiento" ? atajosDeVencimiento(hoy) : atajosDeRango(hoy)),
    [hoy, modo],
  );
  const rotulo = modo === "vencimiento" ? "Vencimiento" : "Fechas de emisión";

  const cerrar = useCallback(() => setAbierto(false), []);

  const abrir = () => {
    const esMovil = window.innerWidth < ANCHO_MOVIL;
    const base = desde || hoyIso();
    setMovil(esMovil);
    setMesVisible(primerDiaDelMes(base));
    setAnioMeses(partes(base).anio);
    setFoco(base);
    setInicio(null);
    setSobre(null);
    setVista("dias");
    if (!esMovil) {
      const caja = ancla.current?.getBoundingClientRect();
      if (caja) {
        setPos({
          top: caja.bottom + 6,
          left: Math.max(8, Math.min(caja.left, window.innerWidth - ANCHO_PANEL - 8)),
        });
      }
    }
    setAbierto(true);
  };

  const aplicar = (rango: Rango | null) => {
    onChange(rango ?? { desde: "", hasta: "" });
    cerrar();
  };

  const elegirDia = (dia: string) => {
    if (inicio === null) {
      setInicio(dia);
      setSobre(dia);
      return;
    }
    aplicar(ordenarRango(inicio, dia));
  };

  /* Cierre con Escape y clic fuera; la hoja móvil bloquea el scroll del fondo. */
  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: PointerEvent) => {
      const destino = evento.target as Node;
      if (!ancla.current?.contains(destino) && !panel.current?.contains(destino)) cerrar();
    };
    const tecla = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === "Escape") {
        cerrar();
        ancla.current?.querySelector<HTMLElement>("button")?.focus();
      }
    };
    const alRedimensionar = () => {
      if (!movil) cerrar();
    };
    window.addEventListener("pointerdown", fuera);
    window.addEventListener("keydown", tecla);
    window.addEventListener("resize", alRedimensionar);
    const desbordeAnterior = document.body.style.overflow;
    if (movil) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("pointerdown", fuera);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", alRedimensionar);
      document.body.style.overflow = desbordeAnterior;
    };
  }, [abierto, movil, cerrar]);

  /* El foco real sigue al día "enfocado" mientras se navega con el teclado. */
  useEffect(() => {
    if (!abierto || vista !== "dias") return;
    panel.current?.querySelector<HTMLElement>(`[data-fecha="${foco}"]`)?.focus({ preventScroll: true });
  }, [abierto, vista, foco, mesVisible]);

  const moverFoco = (nuevo: string) => {
    setFoco(nuevo);
    setMesVisible(primerDiaDelMes(nuevo));
    if (inicio !== null) setSobre(nuevo);
  };

  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>) => {
    const pasos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (evento.key in pasos) {
      evento.preventDefault();
      moverFoco(sumarDias(foco, pasos[evento.key]));
    } else if (evento.key === "PageUp" || evento.key === "PageDown") {
      evento.preventDefault();
      moverFoco(sumarMeses(foco, evento.key === "PageUp" ? -1 : 1));
    } else if (evento.key === "Home") {
      evento.preventDefault();
      moverFoco(primerDiaDelMes(foco));
    } else if (evento.key === "End") {
      evento.preventDefault();
      moverFoco(ultimoDiaDelMes(foco));
    }
  };

  const { anio, mes } = partes(mesVisible);
  const semanas = useMemo(() => semanasDelMes(anio, mes), [anio, mes]);
  // Mientras se elige el segundo extremo, el rango se previsualiza al pasar sobre los días.
  const previa: Rango | null =
    inicio !== null ? ordenarRango(inicio, sobre ?? inicio) : desde && hasta ? { desde, hasta } : null;

  const etiqueta = describirRango(desde, hasta);
  const textoBoton = hayRango || modo === "emision" ? etiqueta : "Vencimiento: todos";

  const contenido = (
    <div
      ref={panel}
      role="dialog"
      aria-label={`Elegir ${rotulo.toLowerCase()}`}
      style={movil ? undefined : { top: pos?.top, left: pos?.left, width: ANCHO_PANEL }}
      className={cn(
        "fixed z-[70] border border-line bg-surface shadow-pop",
        movil
          ? "inset-x-0 bottom-0 max-h-[92dvh] animate-[sube_160ms_ease-out] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
          : "animate-[aparece_120ms_ease-out] rounded-xl",
      )}
    >
      <div className={cn("flex", movil ? "flex-col" : "flex-row")}>
        {/* Atajos */}
        <div
          className={cn(
            movil
              ? "flex gap-2 overflow-x-auto border-b border-line px-3 py-3"
              : "flex w-[172px] shrink-0 flex-col gap-0.5 border-r border-line p-2",
          )}
        >
          {atajos.map((atajo) => {
            const activo = atajo.rango
              ? atajo.rango.desde === desde && atajo.rango.hasta === hasta
              : !hayRango;
            return (
              <button
                key={atajo.id}
                type="button"
                onClick={() => aplicar(atajo.rango)}
                className={cn(
                  "rounded-lg text-left text-[13px] transition-colors",
                  movil
                    ? "shrink-0 border px-3 py-2 whitespace-nowrap"
                    : "px-2.5 py-1.5 hover:bg-surface-3",
                  activo
                    ? movil
                      ? "border-accent-line bg-accent-soft font-medium text-accent"
                      : "bg-accent-soft font-medium text-accent"
                    : movil
                      ? "border-line-strong text-fg-2"
                      : "text-fg-2",
                )}
              >
                {atajo.etiqueta}
              </button>
            );
          })}
        </div>

        {/* Calendario */}
        <div className="min-w-0 flex-1 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label={vista === "dias" ? "Mes anterior" : "Año anterior"}
              onClick={() =>
                vista === "dias"
                  ? setMesVisible(sumarMeses(mesVisible, -1))
                  : setAnioMeses((a) => a - 1)
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-3 hover:bg-surface-3 hover:text-fg"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-live="polite"
              onClick={() => {
                setAnioMeses(anio);
                setVista((v) => (v === "dias" ? "meses" : "dias"));
              }}
              className="rounded-lg px-2.5 py-1.5 text-[14px] font-semibold text-fg hover:bg-surface-3"
            >
              {vista === "dias" ? `${NOMBRES_MES[mes - 1]} ${anio}` : anioMeses}
            </button>
            <button
              type="button"
              aria-label={vista === "dias" ? "Mes siguiente" : "Año siguiente"}
              onClick={() =>
                vista === "dias"
                  ? setMesVisible(sumarMeses(mesVisible, 1))
                  : setAnioMeses((a) => a + 1)
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-3 hover:bg-surface-3 hover:text-fg"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {vista === "meses" ? (
            <div className="grid grid-cols-3 gap-1.5 py-1">
              {NOMBRES_MES.map((nombre, i) => {
                const actual = anioMeses === anio && i + 1 === mes;
                return (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => {
                      const destino = `${anioMeses}-${String(i + 1).padStart(2, "0")}-01`;
                      setMesVisible(destino);
                      setFoco(destino);
                      setVista("dias");
                    }}
                    className={cn(
                      "h-11 rounded-lg text-[13px] font-medium transition-colors",
                      actual
                        ? "bg-accent text-white"
                        : "text-fg-2 hover:bg-surface-3 hover:text-fg",
                    )}
                  >
                    {nombre.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div role="grid" aria-label={`${NOMBRES_MES[mes - 1]} ${anio}`} onKeyDown={alTeclear}>
              <div role="row" className="mb-1 grid grid-cols-7 text-center">
                {DIAS_SEMANA.map((dia, i) => (
                  <span
                    key={dia + i}
                    role="columnheader"
                    className="py-1 text-[11.5px] font-medium text-fg-4"
                  >
                    {dia}
                  </span>
                ))}
              </div>
              {semanas.map((semana, i) => (
                <div role="row" key={i} className="grid grid-cols-7">
                  {semana.map((dia, j) => {
                    if (dia === null) return <span key={j} role="gridcell" aria-hidden />;
                    const dentro = previa !== null && enRango(dia, previa);
                    const extremo = previa !== null && (dia === previa.desde || dia === previa.hasta);
                    return (
                      <div
                        key={dia}
                        role="gridcell"
                        className={cn(
                          "flex justify-center py-0.5",
                          dentro && "bg-accent-soft",
                          previa !== null && dia === previa.desde && "rounded-l-full",
                          previa !== null && dia === previa.hasta && "rounded-r-full",
                        )}
                      >
                        <button
                          type="button"
                          data-fecha={dia}
                          tabIndex={dia === foco ? 0 : -1}
                          aria-label={formatearFechaLarga(dia)}
                          aria-pressed={extremo}
                          onClick={() => elegirDia(dia)}
                          onMouseEnter={() => inicio !== null && setSobre(dia)}
                          className={cn(
                            "tnum flex h-10 w-10 items-center justify-center rounded-full text-[13px] transition-colors sm:h-9 sm:w-9",
                            extremo
                              ? "bg-accent font-semibold text-white"
                              : dentro
                                ? "text-accent hover:bg-accent-soft"
                                : "text-fg hover:bg-surface-3",
                            dia === hoy && !extremo && "font-semibold ring-1 ring-accent-line",
                          )}
                        >
                          {partes(dia).dia}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
            <p className="text-[12px] text-fg-3" aria-live="polite">
              {inicio !== null ? "Elige el día final" : "Elige el día inicial y el final"}
            </p>
            <button
              type="button"
              onClick={() =>
                aplicar({ desde: mesVisible, hasta: ultimoDiaDelMes(mesVisible) })
              }
              className="rounded-md px-1.5 py-1 text-[12.5px] font-medium text-accent hover:underline"
            >
              Todo {NOMBRES_MES[mes - 1].toLowerCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={ancla} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        disabled={deshabilitado}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={`${rotulo}: ${etiqueta}`}
        className={cn(
          "inline-flex h-9 w-full min-w-[190px] items-center gap-2 rounded-lg border bg-surface pl-3 text-left text-[13px] shadow-sm transition-colors",
          "hover:border-fg-4 focus-visible:shadow-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60",
          hayRango ? "border-accent-line pr-9 text-fg" : "border-line-strong pr-3 text-fg-2",
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-fg-4" strokeWidth={1.75} aria-hidden />
        <span className="tnum min-w-0 flex-1 truncate">
          {hayRango && modo === "vencimiento" ? `Vence: ${etiqueta}` : textoBoton}
        </span>
      </button>
      {hayRango && !deshabilitado && (
        <button
          type="button"
          aria-label={`Quitar filtro de ${rotulo.toLowerCase()}`}
          onClick={() => onChange({ desde: "", hasta: "" })}
          className="absolute top-1/2 right-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-fg-4 hover:bg-surface-3 hover:text-fg"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}

      {abierto && (
        <>
          {movil && <div className="fixed inset-0 z-[65] bg-black/40" aria-hidden />}
          {contenido}
        </>
      )}
    </div>
  );
}

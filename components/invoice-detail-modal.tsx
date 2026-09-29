"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { FileCode2, Printer, X } from "lucide-react";
import { BotonDescarga } from "@/components/boton-descarga";
import { InvoicePaper, TITULOS } from "@/components/invoice-paper";
import type { Comprobante, Empresa } from "@/lib/types";
import { type FormatoDescarga, claveDescarga } from "@/lib/utils";

interface Props {
  comprobante: Comprobante | null;
  empresa: Empresa;
  descargaEnCurso: string | null;
  onCerrar: () => void;
  onDescargar: (comprobante: Comprobante, formato: FormatoDescarga) => void;
}

/** Ángulo máximo (grados) del micro-tilt 3D del comprobante. */
const TILT_MAX = 9;

export function InvoiceDetailModal({
  comprobante,
  empresa,
  descargaEnCurso,
  onCerrar,
  onDescargar,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const papelRef = useRef<HTMLDivElement>(null);
  /** Clave de la última descarga lanzada, para detectar cuándo termina. */
  const descargaPrevia = useRef<string | null>(null);
  const [descargaCompletada, setDescargaCompletada] = useState<FormatoDescarga | null>(null);

  // Cerrar con Escape + bloquear el scroll de fondo mientras está abierto
  useEffect(() => {
    if (!comprobante) return;

    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [comprobante, onCerrar]);

  // Cuando la descarga en curso termina, la etiqueta pasa a "¡Descargado!".
  useEffect(() => {
    const anterior = descargaPrevia.current;
    descargaPrevia.current = descargaEnCurso;

    if (!anterior || descargaEnCurso !== null || !comprobante) return;

    const esPdf = anterior === claveDescarga(comprobante.id, "PDF");
    const esXml = anterior === claveDescarga(comprobante.id, "XML");
    if (!esPdf && !esXml) return;

    setDescargaCompletada(esPdf ? "PDF" : "XML");
    const temporizador = setTimeout(() => setDescargaCompletada(null), 1200);
    return () => clearTimeout(temporizador);
  }, [descargaEnCurso, comprobante]);

  // Apertura animada: fundido del telón + escala con rebote suave del panel.
  useGSAP(
    () => {
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      if (!overlay || !panel) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          overlay,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, ease: "power2.out", clearProps: "opacity" },
        );
        gsap.fromTo(
          panel,
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.55,
            ease: "back.out(1.6)",
            clearProps: "opacity,transform",
          },
        );
      });

      return () => mm.revert();
    },
    { scope: panelRef, dependencies: [comprobante?.id], revertOnUpdate: true },
  );

  // Micro-tilt 3D: el comprobante reacciona al cursor como una hoja sobre la mesa.
  useGSAP(
    (_contexto, contextSafe) => {
      const papel = papelRef.current;
      if (!papel) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.matchMedia("(hover: none)").matches) return;

      gsap.set(papel, { transformPerspective: 1200, transformOrigin: "50% 50%" });

      const girarY = gsap.quickTo(papel, "rotationY", { duration: 0.7, ease: "power3.out" });
      const girarX = gsap.quickTo(papel, "rotationX", { duration: 0.7, ease: "power3.out" });

      // El rectángulo se cachea y solo se vuelve a medir al entrar o al hacer scroll.
      let area = papel.getBoundingClientRect();
      const medir = () => {
        area = papel.getBoundingClientRect();
      };

      const alMover = contextSafe!((evento: PointerEvent) => {
        if (area.width === 0 || area.height === 0) return;
        const desplazamientoX = gsap.utils.clamp(
          -1,
          1,
          (evento.clientX - area.left) / area.width - 0.5,
        );
        const desplazamientoY = gsap.utils.clamp(
          -1,
          1,
          (evento.clientY - area.top) / area.height - 0.5,
        );
        girarY(desplazamientoX * TILT_MAX);
        girarX(desplazamientoY * -(TILT_MAX * 0.75));
      });

      const alCentrar = contextSafe!(() => {
        girarY(0);
        girarX(0);
      });

      papel.addEventListener("pointerenter", medir);
      papel.addEventListener("pointermove", alMover);
      papel.addEventListener("pointerleave", alCentrar);
      window.addEventListener("scroll", medir, { passive: true, capture: true });

      return () => {
        papel.removeEventListener("pointerenter", medir);
        papel.removeEventListener("pointermove", alMover);
        papel.removeEventListener("pointerleave", alCentrar);
        window.removeEventListener("scroll", medir, { capture: true });
      };
    },
    { dependencies: [comprobante?.id], revertOnUpdate: true },
  );

  if (!comprobante) return null;

  const cargandoPdf = descargaEnCurso === claveDescarga(comprobante.id, "PDF");
  const cargandoXml = descargaEnCurso === claveDescarga(comprobante.id, "XML");

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/70 p-0 backdrop-blur-md sm:items-center sm:p-6"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle del comprobante ${comprobante.numero}`}
        onClick={(evento) => evento.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a0d17] shadow-[0_40px_120px_-40px_rgba(2,6,23,0.95)] sm:rounded-3xl"
      >
        {/* Barra superior (chrome de la app) */}
        <div className="relative flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-[#0d1120] via-[#0d1222] to-[#101a35] px-4 py-3.5 sm:px-5">
          <div
            aria-hidden="true"
            className="aura-corporativa pointer-events-none absolute inset-0 opacity-40"
          />
          <div className="relative flex min-w-0 items-center gap-3">
            <span className="rounded-md bg-amber-400/15 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-300 uppercase ring-1 ring-inset ring-amber-400/30">
              Borrador
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">Vista previa del comprobante</p>
              <p className="truncate text-[11px] text-slate-400">
                Representación impresa simulada · {TITULOS[comprobante.tipo] ?? comprobante.tipo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar detalle"
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mesa de trabajo: el comprobante es una hoja blanca siempre (también al imprimir) */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-200/80 dark:bg-slate-950/60">
          <div className="p-3 sm:p-6">
            <div
              ref={papelRef}
              className="will-change-transform overflow-hidden rounded-xl bg-white text-slate-900 shadow-[0_28px_70px_-28px_rgba(15,23,42,0.6)] ring-1 ring-black/5"
            >
              <InvoicePaper comprobante={comprobante} empresa={empresa} />
            </div>

            {/* Acciones */}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
              >
                Cerrar
              </button>
              <BotonDescarga
                variante="suave"
                icono={<FileCode2 className="h-4 w-4" />}
                etiqueta="Descargar XML"
                textoProgreso="Generando XML…"
                cargando={cargandoXml}
                completado={descargaCompletada === "XML"}
                onClick={() => onDescargar(comprobante, "XML")}
              />
              <BotonDescarga
                variante="primario"
                icono={<Printer className="h-4 w-4" />}
                etiqueta="Imprimir / PDF"
                textoProgreso="Generando PDF…"
                cargando={cargandoPdf}
                completado={descargaCompletada === "PDF"}
                onClick={() => onDescargar(comprobante, "PDF")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

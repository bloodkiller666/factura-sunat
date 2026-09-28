"use client";

import { useEffect } from "react";
import { FileCode2, Printer, X } from "lucide-react";
import { InvoicePaper, TITULOS } from "@/components/invoice-paper";
import type { Comprobante, Empresa } from "@/lib/types";
import { type FormatoDescarga, claveDescarga, cn } from "@/lib/utils";

interface Props {
  comprobante: Comprobante | null;
  empresa: Empresa;
  descargaEnCurso: string | null;
  onCerrar: () => void;
  onDescargar: (comprobante: Comprobante, formato: FormatoDescarga) => void;
}

export function InvoiceDetailModal({
  comprobante,
  empresa,
  descargaEnCurso,
  onCerrar,
  onDescargar,
}: Props) {
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

  if (!comprobante) return null;

  const cargandoPdf = descargaEnCurso === claveDescarga(comprobante.id, "PDF");
  const cargandoXml = descargaEnCurso === claveDescarga(comprobante.id, "XML");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle del comprobante ${comprobante.numero}`}
        onClick={(evento) => evento.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-4xl animate-[fadeInUp_.28s_ease-out_both] flex-col overflow-hidden rounded-t-2xl bg-slate-900 shadow-2xl sm:rounded-2xl"
      >
        {/* Barra superior (chrome de la app) */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-slate-900 px-4 py-3.5 dark:border-slate-800 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-md bg-amber-400/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-400/30">
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Papel: siempre blanco, como una representación impresa real */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="bg-white text-slate-900">
            <InvoicePaper comprobante={comprobante} empresa={empresa} />

            {/* Acciones */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:justify-end sm:px-8">
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => onDescargar(comprobante, "XML")}
                disabled={cargandoXml}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-70"
              >
                {cargandoXml ? <SpinnerOscuro /> : <FileCode2 className="h-4 w-4" />}
                Descargar XML
              </button>
              <button
                type="button"
                onClick={() => onDescargar(comprobante, "PDF")}
                disabled={cargandoPdf}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-80"
              >
                {cargandoPdf ? <SpinnerOscuro claro /> : <Printer className="h-4 w-4" />}
                Imprimir / PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpinnerOscuro({ claro = false }: { claro?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-4 w-4 animate-spin rounded-full border-2",
        claro ? "border-white/40 border-t-white" : "border-indigo-300 border-t-indigo-700",
      )}
    />
  );
}

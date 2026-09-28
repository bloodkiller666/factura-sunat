"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CompanyInfoCard } from "@/components/company-info-card";
import { CompanySelector } from "@/components/company-selector";
import { FILTROS_INICIALES, FiltersPanel } from "@/components/filters-panel";
import { InvoiceDetailModal } from "@/components/invoice-detail-modal";
import { InvoicesTable } from "@/components/invoices-table";
import { KpiCards, type Metricas } from "@/components/kpi-cards";
import { PortalHeader } from "@/components/portal-header";
import { PrintSheet } from "@/components/print-sheet";
import { SkeletonKpis } from "@/components/skeletons";
import { type NuevoToast, Toast, type ToastState } from "@/components/toast";
import { descargarXml, imprimirPdf, nombreArchivoPdf } from "@/lib/comprobante-descargas";
import { coincidePeriodo } from "@/lib/format";
import { EMPRESAS, PERIODO_DEMO } from "@/lib/mock-data";
import type { Comprobante, FiltrosState } from "@/lib/types";
import { type FormatoDescarga, claveDescarga } from "@/lib/utils";

/** Documentos que representan venta (las guías no generan importe facturado). */
const TIPOS_FACTURABLES = new Set(["Factura", "Boleta de Venta", "Nota de Crédito", "Nota de Débito"]);

/** Duración simulada de la "consulta a SUNAT" al cambiar de empresa. */
const MS_CARGA_EMPRESA = 700;
/** Duración del indicador de progreso mientras se entrega el archivo. */
const MS_DESCARGA = 900;

function aplicarFiltros(comprobantes: Comprobante[], filtros: FiltrosState): Comprobante[] {
  const consulta = filtros.q.trim().toLowerCase();

  return comprobantes.filter((comprobante) => {
    const coincideTexto =
      consulta === "" ||
      comprobante.numero.toLowerCase().includes(consulta) ||
      comprobante.descripcion.toLowerCase().includes(consulta) ||
      comprobante.tipo.toLowerCase().includes(consulta) ||
      comprobante.cliente.razonSocial.toLowerCase().includes(consulta) ||
      comprobante.cliente.ruc.includes(consulta);

    const coincideTipo = filtros.tipo === "TODOS" || comprobante.tipo === filtros.tipo;
    const coincideSunat =
      filtros.estadoSunat === "TODOS" || comprobante.estadoSunat === filtros.estadoSunat;
    const coincideComercial =
      filtros.estadoComercial === "TODOS" ||
      comprobante.estadoComercial === filtros.estadoComercial;
    const coincideDesde = filtros.desde === "" || comprobante.fechaEmision >= filtros.desde;
    const coincideHasta = filtros.hasta === "" || comprobante.fechaEmision <= filtros.hasta;

    return (
      coincideTexto &&
      coincideTipo &&
      coincideSunat &&
      coincideComercial &&
      coincideDesde &&
      coincideHasta
    );
  });
}

function calcularMetricas(comprobantes: Comprobante[]): Metricas {
  const totalFacturado = comprobantes
    .filter(
      (comprobante) =>
        TIPOS_FACTURABLES.has(comprobante.tipo) &&
        coincidePeriodo(comprobante.fechaEmision, PERIODO_DEMO.anio, PERIODO_DEMO.mes),
    )
    .reduce((suma, comprobante) => suma + comprobante.total, 0);

  return {
    totalFacturado: Math.round(totalFacturado * 100) / 100,
    aprobados: comprobantes.filter((c) => c.estadoSunat === "Aprobado").length,
    pendientes: comprobantes.filter((c) => c.estadoSunat === "Pendiente").length,
    anulados: comprobantes.filter((c) => c.estadoSunat === "Anulado").length,
    totalComprobantes: comprobantes.length,
    mesEtiqueta: PERIODO_DEMO.etiqueta,
  };
}

export default function Page() {
  const [empresaId, setEmpresaId] = useState<string>(EMPRESAS[0].id);
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIALES);
  const [detalle, setDetalle] = useState<Comprobante | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  /** Comprobante que se está exportando a PDF en la hoja de impresión. */
  const [imprimiendo, setImprimiendo] = useState<Comprobante | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargaEnCurso, setDescargaEnCurso] = useState<string | null>(null);
  /** Se incrementa en cada cambio de empresa para reiniciar el temporizador de carga. */
  const [solicitudCarga, setSolicitudCarga] = useState(0);

  const temporizadorDescarga = useRef<ReturnType<typeof setTimeout> | null>(null);

  const empresa = useMemo(
    () => EMPRESAS.find((item) => item.id === empresaId) ?? EMPRESAS[0],
    [empresaId],
  );

  const comprobantesFiltrados = useMemo(
    () => (cargando ? [] : aplicarFiltros(empresa.comprobantes, filtros)),
    [cargando, empresa, filtros],
  );

  const metricas = useMemo(() => calcularMetricas(empresa.comprobantes), [empresa]);

  /**
   * Simula la consulta a SUNAT. El estado de carga se activa en el manejador
   * del evento (no dentro del efecto) y este efecto solo programa el cierre.
   */
  useEffect(() => {
    const temporizador = setTimeout(() => setCargando(false), MS_CARGA_EMPRESA);
    return () => clearTimeout(temporizador);
  }, [solicitudCarga]);

  // Autocierre del toast
  useEffect(() => {
    if (!toast) return;
    const temporizador = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(temporizador);
  }, [toast]);

  // Limpieza del temporizador de descarga al desmontar
  useEffect(
    () => () => {
      if (temporizadorDescarga.current) clearTimeout(temporizadorDescarga.current);
    },
    [],
  );

  /**
   * Exportación a PDF: el comprobante se monta primero en `PrintSheet` y, ya
   * con el DOM listo, se abre el diálogo nativo de impresión, que permite
   * guardar como PDF eligiendo carpeta y nombre de archivo.
   */
  useEffect(() => {
    if (!imprimiendo) return;

    const marco = requestAnimationFrame(() => {
      imprimirPdf(imprimiendo, empresa, () => setImprimiendo(null));
    });

    return () => cancelAnimationFrame(marco);
  }, [imprimiendo, empresa]);

  /** Notificación genérica: la usan la tabla y sus acciones masivas. */
  function notificar(nuevo: NuevoToast) {
    setToast({ id: Date.now(), ...nuevo });
  }

  function seleccionarEmpresa(id: string) {
    if (id === empresaId) return;
    setEmpresaId(id);
    setFiltros(FILTROS_INICIALES);
    setDetalle(null);
    setCargando(true);
    setSolicitudCarga((solicitud) => solicitud + 1);
  }

  function descargar(comprobante: Comprobante, formato: FormatoDescarga) {
    const clave = claveDescarga(comprobante.id, formato);
    if (descargaEnCurso) return;

    setDescargaEnCurso(clave);
    if (temporizadorDescarga.current) clearTimeout(temporizadorDescarga.current);

    if (formato === "XML") {
      // Genera el UBL 2.1 en memoria y dispara la descarga del archivo .xml.
      const nombreArchivo = descargarXml(comprobante, empresa);
      setToast({
        id: Date.now(),
        titulo: "XML descargado",
        detalle: `${nombreArchivo} · ${comprobante.cliente.razonSocial}`,
        tono: "info",
      });
    } else {
      // Monta la hoja de impresión; el efecto abre el diálogo nativo de PDF.
      setImprimiendo(comprobante);
      setToast({
        id: Date.now(),
        titulo: "Elige la carpeta para guardar el PDF",
        detalle: `${nombreArchivoPdf(comprobante, empresa)}`,
        tono: "ok",
      });
    }

    temporizadorDescarga.current = setTimeout(() => setDescargaEnCurso(null), MS_DESCARGA);
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <PortalHeader cargando={cargando} />

      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <CompanySelector
          empresas={EMPRESAS}
          seleccionadaId={empresa.id}
          onSeleccionar={seleccionarEmpresa}
        />

        <CompanyInfoCard empresa={empresa} cargando={cargando} />

        {cargando ? <SkeletonKpis /> : <KpiCards metricas={metricas} />}

        <FiltersPanel
          filtros={filtros}
          onCambiar={(parcial) => setFiltros((previos) => ({ ...previos, ...parcial }))}
          onLimpiar={() => setFiltros(FILTROS_INICIALES)}
          resultados={comprobantesFiltrados.length}
          total={empresa.comprobantes.length}
          cargando={cargando}
        />

        <InvoicesTable
          comprobantes={comprobantesFiltrados}
          empresa={empresa}
          totalEmpresa={empresa.comprobantes.length}
          cargando={cargando}
          descargaEnCurso={descargaEnCurso}
          onVerDetalle={setDetalle}
          onDescargar={descargar}
          onNotificar={notificar}
        />
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-10 text-center text-xs text-slate-400 dark:text-slate-500 sm:px-6 lg:px-8">
        Prototipo de interfaz · Grupo TDM · Información fiscal y comprobantes simulados con fines de
        demostración. No realiza operaciones reales ante SUNAT.
      </footer>

      <InvoiceDetailModal
        comprobante={detalle}
        empresa={empresa}
        descargaEnCurso={descargaEnCurso}
        onCerrar={() => setDetalle(null)}
        onDescargar={descargar}
      />

      {/* Hoja exclusiva de impresión: solo se renderiza (y se imprime) al exportar a PDF. */}
      <PrintSheet comprobante={imprimiendo} empresa={empresa} />

      <Toast toast={toast} />
    </div>
  );
}

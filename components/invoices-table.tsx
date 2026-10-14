"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Eye,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Inbox,
  Printer,
  Send,
} from "lucide-react";
import { BotonDescarga } from "@/components/boton-descarga";
import { CasillaSeleccion, QuickActionsBar } from "@/components/quick-actions-bar";
import { SkeletonFilasTabla, SkeletonTarjetas } from "@/components/skeletons";
import { SunatBadge } from "@/components/status-badge";
import type { NuevoToast } from "@/components/toast";
import {
  type Emisor,
  documentosAExportar,
  descargarExcel,
  descargarLoteZip,
} from "@/lib/comprobante-descargas";
import { correoCliente, enviarComprobantesPorCorreo } from "@/lib/correo";
import { esSinImporte, formatearFecha, formatearMoneda } from "@/lib/format";
import type { Comprobante } from "@/lib/types";
import { type FormatoDescarga, claveDescarga, cn } from "@/lib/utils";

interface Props {
  comprobantes: Comprobante[];
  /** Empresa emisora: da nombre a los archivos y firma el correo. */
  empresa: Emisor;
  totalEmpresa: number;
  cargando: boolean;
  descargaEnCurso: string | null;
  /** Hay un Excel en análisis: bloquea el botón de importar. */
  importando: boolean;
  /** Hay una sincronización con SUNAT en curso. */
  sincronizando?: boolean;
  /** El rol permite importar/sincronizar (admin/emisor). */
  puedeOperar?: boolean;
  onVerDetalle: (comprobante: Comprobante) => void;
  onDescargar: (comprobante: Comprobante, formato: FormatoDescarga) => void;
  onNotificar: (toast: NuevoToast) => void;
  /** Alterna la marca manual "Check SAP" del comprobante. */
  onAlternarCheckSap: (id: string) => void;
  /** Entrega el Excel elegido para que la página lo analice. */
  onImportarExcel: (archivo: File) => void;
  /** Abre el selector de XML/ZIP (importación real al backend). */
  onImportarXml: () => void;
  /** Consulta a SUNAT el estado de los pendientes. */
  onSincronizar: () => void;
}

const CLASES_TH =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400";

const ICONOS_TIPO: Record<string, string> = {
  Factura: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  "Boleta de Venta": "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Guía de Remisión": "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300",
  "Nota de Crédito": "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  "Nota de Débito": "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  "Comprobante de Retención": "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
};

export function InvoicesTable({
  comprobantes,
  empresa,
  totalEmpresa,
  cargando,
  descargaEnCurso,
  importando,
  sincronizando = false,
  puedeOperar = false,
  onVerDetalle,
  onDescargar,
  onNotificar,
  onAlternarCheckSap,
  onImportarExcel,
  onImportarXml,
  onSincronizar,
}: Props) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(() => new Set());
  const [idsPrevios, setIdsPrevios] = useState<string[]>([]);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  /** Clave de la última descarga terminada: alimenta la etiqueta "¡Descargado!". */
  const [descargaCompletada, setDescargaCompletada] = useState<string | null>(null);

  const seccionRef = useRef<HTMLElement>(null);
  const cuerpoRef = useRef<HTMLTableSectionElement>(null);
  const listaMovilRef = useRef<HTMLDivElement>(null);
  /** Clave de la descarga previa, para detectar cuándo finaliza. */
  const descargaPrevia = useRef<string | null>(null);

  const idsVisibles = useMemo(() => comprobantes.map((comprobante) => comprobante.id), [comprobantes]);

  /*
   * Ajuste de estado durante el render (patrón recomendado por React): al
   * cambiar los filtros o la empresa se descartan los registros ya no visibles,
   * de modo que el contador siempre cuadre con lo que se muestra en la tabla.
   */
  if (idsPrevios !== idsVisibles) {
    setIdsPrevios(idsVisibles);
    setSeleccionados((previos) => {
      if (previos.size === 0) return previos;
      const visibles = new Set(idsVisibles);
      const siguientes = new Set([...previos].filter((id) => visibles.has(id)));
      return siguientes.size === previos.size ? previos : siguientes;
    });
  }

  const seleccionadosVisibles = useMemo(
    () => comprobantes.filter((comprobante) => seleccionados.has(comprobante.id)),
    [comprobantes, seleccionados],
  );

  const todosSeleccionados =
    comprobantes.length > 0 && seleccionadosVisibles.length === comprobantes.length;

  /* Cuando la descarga en curso termina, el botón muestra "¡Descargado!" un momento. */
  useEffect(() => {
    const anterior = descargaPrevia.current;
    descargaPrevia.current = descargaEnCurso;

    if (!anterior || descargaEnCurso !== null) return;

    setDescargaCompletada(anterior);
    const temporizador = setTimeout(() => setDescargaCompletada(null), 1200);
    return () => clearTimeout(temporizador);
  }, [descargaEnCurso]);

  /* Entrada escalonada de las filas cada vez que cambia el conjunto visible. */
  useGSAP(
    () => {
      const filas = cuerpoRef.current?.querySelectorAll<HTMLTableRowElement>("tr[data-fila]");
      if (!filas || filas.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(filas, {
          opacity: 0,
          y: 12,
          duration: 0.42,
          ease: "power2.out",
          stagger: { each: 0.03, from: "start" },
          clearProps: "opacity,transform",
        });
      });
      return () => mm.revert();
    },
    { scope: seccionRef, dependencies: [comprobantes, cargando], revertOnUpdate: true },
  );

  /* Entrada escalonada de las tarjetas en móvil. */
  useGSAP(
    () => {
      const tarjetas = listaMovilRef.current?.querySelectorAll<HTMLElement>("[data-tarjeta]");
      if (!tarjetas || tarjetas.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(tarjetas, {
          opacity: 0,
          y: 14,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.06,
          clearProps: "opacity,transform",
        });
      });
      return () => mm.revert();
    },
    { scope: seccionRef, dependencies: [comprobantes, cargando], revertOnUpdate: true },
  );

  /* Hover de fila: elevación sutil y retorno suave (delegado en el tbody). */
  useGSAP(() => {
    const cuerpo = cuerpoRef.current;
    if (!cuerpo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const alEntrar = (evento: Event) => {
      const fila = (evento.target as HTMLElement).closest<HTMLTableRowElement>("tr[data-fila]");
      if (!fila) return;
      gsap.to(fila, { y: -2, duration: 0.25, ease: "power2.out", overwrite: "auto" });
    };

    const alSalir = (evento: Event) => {
      const raton = evento as MouseEvent;
      const fila = (raton.target as HTMLElement | null)?.closest<HTMLTableRowElement>(
        "tr[data-fila]",
      );
      if (!fila) return;
      // Ignora los micro movimientos dentro de la misma fila.
      if (raton.relatedTarget instanceof Node && fila.contains(raton.relatedTarget)) return;
      gsap.to(fila, { y: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
    };

    cuerpo.addEventListener("mouseover", alEntrar);
    cuerpo.addEventListener("mouseout", alSalir);
    return () => {
      cuerpo.removeEventListener("mouseover", alEntrar);
      cuerpo.removeEventListener("mouseout", alSalir);
    };
  }, { scope: seccionRef });

  /* Microinteracción de pulsación: rebote físico delegado en toda la tarjeta. */
  useGSAP(() => {
    const seccion = seccionRef.current;
    if (!seccion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alPresionar = (evento: Event) => {
      const boton = (evento.target as HTMLElement | null)?.closest<HTMLButtonElement>(
        "[data-accion]",
      );
      if (!boton || boton.disabled) return;
      gsap.fromTo(
        boton,
        { scale: 0.95 },
        {
          scale: 1,
          duration: 0.36,
          ease: "back.out(3)",
          overwrite: "auto",
          clearProps: "transform",
        },
      );
    };

    seccion.addEventListener("pointerdown", alPresionar);
    return () => seccion.removeEventListener("pointerdown", alPresionar);
  }, { scope: seccionRef });

  function alternarTodos() {
    setSeleccionados((previos) => {
      const siguientes = new Set(previos);
      if (todosSeleccionados) {
        for (const id of idsVisibles) siguientes.delete(id);
      } else {
        for (const id of idsVisibles) siguientes.add(id);
      }
      return siguientes;
    });
  }

  function alternarUno(id: string) {
    setSeleccionados((previos) => {
      const siguientes = new Set(previos);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  }

  function avisarSinSeleccion(accion: string) {
    onNotificar({
      titulo: "No hay comprobantes seleccionados",
      detalle: `Marca al menos un registro para ${accion}.`,
      tono: "aviso",
    });
  }

  function emitirComprobante() {
    onNotificar({
      titulo: "Nuevo comprobante en preparación",
      detalle: "Se abriría el formulario de emisión (simulación del prototipo).",
      tono: "info",
    });
  }

  /**
   * Reporte Excel real: genera el `.xlsx` y dispara la descarga.
   * Si no hay comprobantes seleccionados se exportan todos los visibles.
   */
  function exportarExcel() {
    const conjunto = documentosAExportar(seleccionadosVisibles, comprobantes);
    const total = conjunto.length;
    if (total === 0) return avisarSinSeleccion("exportar a Excel");

    const nombreArchivo = descargarExcel(conjunto, empresa);

    onNotificar({
      titulo: "Reporte Excel descargado exitosamente",
      detalle: `${nombreArchivo} · ${total} comprobante${total === 1 ? "" : "s"}`,
      tono: "ok",
    });
  }

  /**
   * Lote ZIP real: empaqueta el XML de cada comprobante.
   * Si no hay comprobantes seleccionados se incluye todo lo visible.
   */
  function descargarZip() {
    const conjunto = documentosAExportar(seleccionadosVisibles, comprobantes);
    const total = conjunto.length;
    if (total === 0) return avisarSinSeleccion("descargar el lote ZIP");

    const nombreArchivo = descargarLoteZip(conjunto, empresa);

    onNotificar({
      titulo: "Lote ZIP generado exitosamente",
      detalle: `${nombreArchivo} · XML + manifiesto`,
      tono: "ok",
    });
  }

  /** Envío real por correo: el navegador llama a `/api/enviar-comprobantes`. */
  async function enviarCorreo(seleccion: Comprobante[]) {
    if (seleccion.length === 0) return avisarSinSeleccion("enviar por correo");
    if (enviandoCorreo) return;

    setEnviandoCorreo(true);
    onNotificar({
      titulo: `Enviando ${seleccion.length} comprobante${seleccion.length === 1 ? "" : "s"} por correo…`,
      detalle: "Adjuntando el XML de cada comprobante",
      tono: "info",
    });

    const resultado = await enviarComprobantesPorCorreo(empresa, seleccion);
    setEnviandoCorreo(false);

    const destinatarios = resultado.destinatarios;
    const resumen = destinatarios.length
      ? `${destinatarios.slice(0, 2).join(", ")}${
          destinatarios.length > 2 ? ` y ${destinatarios.length - 2} más` : ""
        }`
      : "Revisa la configuración del servidor de correo.";

    onNotificar({
      titulo: resultado.mensaje,
      detalle: resultado.ok ? resumen : "No se envió ningún correo.",
      tono: resultado.ok ? "ok" : "aviso",
    });
  }

  function enviarCorreoMasivo() {
    void enviarCorreo(seleccionadosVisibles);
  }

  function enviarCorreoIndividual(comprobante: Comprobante) {
    void enviarCorreo([comprobante]);
  }

  return (
    <section ref={seccionRef} className="vidrio overflow-hidden rounded-3xl">
      {/* Encabezado de la sección */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-4 sm:px-5 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-inset ring-white/20">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Comprobantes electrónicos
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-400">
              Toca{" "}
              <span className="font-medium text-slate-500 dark:text-slate-300">Ver detalle</span> para
              abrir la representación impresa
            </p>
          </div>
        </div>
        <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          {cargando
            ? "Cargando…"
            : `${comprobantes.length} registro${comprobantes.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Barra de acciones rápidas y exportación masiva */}
      <QuickActionsBar
        seleccionados={seleccionadosVisibles.length}
        totalVisibles={comprobantes.length}
        todosSeleccionados={todosSeleccionados}
        cargando={cargando}
        enviandoCorreo={enviandoCorreo}
        importando={importando}
        sincronizando={sincronizando}
        puedeOperar={puedeOperar}
        onAlternarTodos={alternarTodos}
        onEmitir={emitirComprobante}
        onExportarExcel={exportarExcel}
        onDescargarZip={descargarZip}
        onEnviarCorreo={enviarCorreoMasivo}
        onImportarExcel={onImportarExcel}
        onImportarXml={onImportarXml}
        onSincronizar={onSincronizar}
      />

      {/* Vista de tabla (escritorio) */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1720px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200/70 bg-white/40 dark:border-white/10 dark:bg-white/[0.02]">
              <th className={cn(CLASES_TH, "w-12 pr-0")}>
                <span className="sr-only">Selección</span>
              </th>
              <th className={CLASES_TH}>N° comprobante</th>
              <th className={CLASES_TH}>Tipo de documento</th>
              <th className={CLASES_TH}>RUC / Razón social cliente</th>
              <th className={CLASES_TH}>F. emisión</th>
              <th className={CLASES_TH}>F. vencimiento</th>
              <th className={CLASES_TH}>Descripción general</th>
              <th className={cn(CLASES_TH, "text-right")}>P. unitario / base</th>
              <th className={cn(CLASES_TH, "text-right")}>IGV (18%)</th>
              <th className={cn(CLASES_TH, "text-right")}>Precio total</th>
              <th className={CLASES_TH}>Estado SUNAT</th>
            <th className={CLASES_TH}>N° SAP</th>
            <th className={CLASES_TH}>Orden de compra</th>
            <th className={cn(CLASES_TH, "text-center")}>Check SAP</th>
            <th className={cn(CLASES_TH, "text-center")}>Acciones</th>
            </tr>
          </thead>

          <tbody
            ref={cuerpoRef}
            className="divide-y divide-slate-100/80 dark:divide-white/5"
          >
            {cargando && <SkeletonFilasTabla filas={6} />}

            {!cargando &&
              comprobantes.map((comprobante) => {
                const sinImporte = esSinImporte(comprobante.tipo);
                const primerItem = comprobante.items[0];
                const marcado = seleccionados.has(comprobante.id);
                const clavePdf = claveDescarga(comprobante.id, "PDF");
                const claveXml = claveDescarga(comprobante.id, "XML");

                return (
                  <tr
                    key={comprobante.id}
                    data-fila="true"
                    className={cn(
                      "transition-colors duration-200 hover:bg-indigo-50/50 dark:hover:bg-white/[0.045]",
                      marcado && "bg-indigo-50/60 dark:bg-indigo-500/[0.07]",
                    )}
                  >
                    <td className="w-12 px-4 py-3.5 pr-0">
                      <CasillaSeleccion
                        checked={marcado}
                        onChange={() => alternarUno(comprobante.id)}
                        etiqueta={`Seleccionar ${comprobante.numero}`}
                      />
                    </td>

                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => onVerDetalle(comprobante)}
                        className="font-mono text-[13px] font-bold tracking-tight text-indigo-600 underline-offset-2 transition hover:text-indigo-500 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200"
                      >
                        {comprobante.numero}
                      </button>
                      <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-400">
                        {comprobante.formaPago}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/10",
                            ICONOS_TIPO[comprobante.tipo] ?? "bg-slate-100 text-slate-500",
                          )}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[13px] font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200">
                          {comprobante.tipo}
                        </span>
                      </span>
                    </td>

                    <td className="max-w-[240px] px-4 py-3.5">
                      <span
                        className="block truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100"
                        title={comprobante.cliente.razonSocial}
                      >
                        {comprobante.cliente.razonSocial}
                      </span>
                      <span className="block font-mono text-[11px] text-slate-400 dark:text-slate-400">
                        {comprobante.cliente.ruc}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {formatearFecha(comprobante.fechaEmision)}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {formatearFecha(comprobante.fechaVencimiento)}
                    </td>

                    <td className="max-w-[300px] px-4 py-3.5">
                      <span
                        className="block truncate text-[13px] text-slate-600 dark:text-slate-300"
                        title={comprobante.descripcion}
                      >
                        {comprobante.descripcion}
                      </span>
                      {primerItem && (
                        <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-400">
                          {primerItem.cantidad} {primerItem.unidad}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {sinImporte ? (
                        <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        <>
                          <span className="block text-[13px] font-medium tabular-nums text-slate-700 dark:text-slate-200">
                            {formatearMoneda(primerItem?.precioUnitario ?? 0)}
                          </span>
                          <span className="block text-[11px] tabular-nums text-slate-400 dark:text-slate-400">
                            Base: {formatearMoneda(comprobante.baseImponible)}
                          </span>
                        </>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right text-[13px] tabular-nums whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {sinImporte ? (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        formatearMoneda(comprobante.igv)
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {sinImporte ? (
                        <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        <span
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            comprobante.total < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-900 dark:text-white",
                          )}
                        >
                          {formatearMoneda(comprobante.total)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <SunatBadge estado={comprobante.estadoSunat} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-[13px] font-semibold tracking-tight text-slate-600 dark:text-slate-300">
                        {comprobante.numeroSap}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {comprobante.ordenCompra ? (
                        <span
                          className="font-mono text-[12px] font-semibold tracking-tight text-slate-600 dark:text-slate-300"
                          title={comprobante.ordenCompra}
                        >
                          {comprobante.ordenCompra}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <CasillaSeleccion
                        tono="esmeralda"
                        checked={comprobante.checkSap}
                        onChange={() => onAlternarCheckSap(comprobante.id)}
                        etiqueta={`Marcar Check SAP de ${comprobante.numero}`}
                      />
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <AccionBoton
                          etiqueta="Ver detalle"
                          onClick={() => onVerDetalle(comprobante)}
                          className="text-slate-500 hover:bg-slate-900 hover:text-white dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </AccionBoton>
                        <BotonDescarga
                          variante="icono"
                          icono={<Printer className="h-4 w-4" />}
                          etiqueta="Descargar PDF"
                          textoProgreso="Descargando PDF…"
                          cargando={descargaEnCurso === clavePdf}
                          completado={descargaCompletada === clavePdf}
                          onClick={() => onDescargar(comprobante, "PDF")}
                          className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/15 dark:hover:text-rose-200"
                        />
                        <BotonDescarga
                          variante="icono"
                          icono={<FileCode2 className="h-4 w-4" />}
                          etiqueta="Descargar XML"
                          textoProgreso="Descargando XML…"
                          cargando={descargaEnCurso === claveXml}
                          completado={descargaCompletada === claveXml}
                          onClick={() => onDescargar(comprobante, "XML")}
                          className="text-indigo-500 hover:bg-indigo-500/10 hover:text-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-200"
                        />
                        <AccionBoton
                          etiqueta={`Enviar por correo a ${correoCliente(comprobante.cliente)}`}
                          deshabilitado={enviandoCorreo}
                          onClick={() => enviarCorreoIndividual(comprobante)}
                          className="text-blue-500 hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-500/15 dark:hover:text-blue-200"
                        >
                          <Send className="h-4 w-4" />
                        </AccionBoton>
                      </div>
                    </td>
                  </tr>
                );
              })}

            {!cargando && comprobantes.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-20">
                  <EstadoVacio />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Vista de tarjetas (móvil y tablet) */}
      <div ref={listaMovilRef} className="space-y-3 p-4 lg:hidden">
        {cargando && <SkeletonTarjetas cantidad={4} />}

        {!cargando &&
          comprobantes.map((comprobante) => (
            <TarjetaComprobante
              key={comprobante.id}
              comprobante={comprobante}
              marcado={seleccionados.has(comprobante.id)}
              descargaEnCurso={descargaEnCurso}
              descargaCompletada={descargaCompletada}
              enviandoCorreo={enviandoCorreo}
              onAlternar={() => alternarUno(comprobante.id)}
              onAlternarCheckSap={onAlternarCheckSap}
              onVerDetalle={onVerDetalle}
              onDescargar={onDescargar}
              onEnviarCorreo={enviarCorreoIndividual}
            />
          ))}

        {!cargando && comprobantes.length === 0 && <EstadoVacio />}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-slate-200/70 bg-white/40 px-4 py-3 text-xs text-slate-400 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
        <span>
          Mostrando{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-200">
            {cargando ? "…" : comprobantes.length}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-200">{totalEmpresa}</span>{" "}
          comprobantes de la empresa
        </span>
        <span>Comprobantes reales validados ante SUNAT · Descargas firmadas</span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Tarjeta de comprobante (móvil)
 * ------------------------------------------------------------------ */

function TarjetaComprobante({
  comprobante,
  marcado,
  descargaEnCurso,
  descargaCompletada,
  enviandoCorreo,
  onAlternar,
  onAlternarCheckSap,
  onVerDetalle,
  onDescargar,
  onEnviarCorreo,
}: {
  comprobante: Comprobante;
  marcado: boolean;
  descargaEnCurso: string | null;
  descargaCompletada: string | null;
  enviandoCorreo: boolean;
  onAlternar: () => void;
  onAlternarCheckSap: (id: string) => void;
  onVerDetalle: (comprobante: Comprobante) => void;
  onDescargar: (comprobante: Comprobante, formato: FormatoDescarga) => void;
  onEnviarCorreo: (comprobante: Comprobante) => void;
}) {
  const sinImporte = esSinImporte(comprobante.tipo);

  return (
    <article
      data-tarjeta="true"
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 backdrop-blur-md transition duration-300",
        marcado
          ? "border-indigo-300/80 bg-indigo-50/50 dark:border-indigo-400/40 dark:bg-indigo-500/[0.08]"
          : "border-slate-200/80 bg-white/80 hover:border-indigo-200 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20",
      )}
    >
      <div className="flex items-start gap-3">
        <CasillaSeleccion
          checked={marcado}
          onChange={onAlternar}
          etiqueta={`Seleccionar ${comprobante.numero}`}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onVerDetalle(comprobante)}
            className="font-mono text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-300"
          >
            {comprobante.numero}
          </button>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-400">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded ring-1 ring-inset ring-black/5 dark:ring-white/10",
                ICONOS_TIPO[comprobante.tipo] ?? "bg-slate-100 text-slate-500",
              )}
            >
              <FileText className="h-3 w-3" />
            </span>
            <span className="truncate">{comprobante.tipo}</span>
          </p>
        </div>
        <SunatBadge estado={comprobante.estadoSunat} size="sm" />
      </div>

      <dl className="mt-3 space-y-2.5 text-xs">
        <div>
          <dt className="font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-400">
            Cliente
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">
            {comprobante.cliente.razonSocial}
          </dd>
          <dd className="font-mono text-[11px] text-slate-400 dark:text-slate-400">
            {comprobante.cliente.ruc}
          </dd>
        </div>

        <div>
          <dt className="font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-400">
            Concepto
          </dt>
          <dd className="mt-0.5 line-clamp-2 text-slate-600 dark:text-slate-300">
            {comprobante.descripcion}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-400">
              Emisión
            </dt>
            <dd className="mt-0.5 text-slate-600 dark:text-slate-300">
              {formatearFecha(comprobante.fechaEmision)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-400">
              Vencimiento
            </dt>
            <dd className="mt-0.5 text-slate-600 dark:text-slate-300">
              {formatearFecha(comprobante.fechaVencimiento)}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
        <span className="font-mono text-[11px] font-semibold tracking-tight text-slate-400 dark:text-slate-400">
          SAP {comprobante.numeroSap}
        </span>
        <div className="text-right">
          {sinImporte ? (
            <p className="text-sm text-slate-300 dark:text-slate-600">Sin importe</p>
          ) : (
            <>
              <p
                className={cn(
                  "text-base font-bold tabular-nums",
                  comprobante.total < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-900 dark:text-white",
                )}
              >
                {formatearMoneda(comprobante.total)}
              </p>
              <p className="text-[11px] tabular-nums text-slate-400 dark:text-slate-400">
                Base {formatearMoneda(comprobante.baseImponible)} · IGV{" "}
                {formatearMoneda(comprobante.igv)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
        <span className="font-mono text-[11px] font-semibold tracking-tight text-slate-500 dark:text-slate-300">
          OC {comprobante.ordenCompra || "—"}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-600 select-none dark:text-slate-200">
          <CasillaSeleccion
            tono="esmeralda"
            checked={comprobante.checkSap}
            onChange={() => onAlternarCheckSap(comprobante.id)}
            etiqueta={`Marcar Check SAP de ${comprobante.numero}`}
          />
          Check SAP
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <BotonTarjeta onClick={() => onVerDetalle(comprobante)}>
          <Eye className="h-4 w-4" />
          Detalle
        </BotonTarjeta>
        <BotonDescarga
          variante="tarjeta"
          icono={<Printer className="h-4 w-4" />}
          etiqueta="PDF"
          textoProgreso="Generando…"
          cargando={descargaEnCurso === claveDescarga(comprobante.id, "PDF")}
          completado={descargaCompletada === claveDescarga(comprobante.id, "PDF")}
          onClick={() => onDescargar(comprobante, "PDF")}
        />
        <BotonDescarga
          variante="tarjeta"
          icono={<FileCode2 className="h-4 w-4" />}
          etiqueta="XML"
          textoProgreso="Generando…"
          cargando={descargaEnCurso === claveDescarga(comprobante.id, "XML")}
          completado={descargaCompletada === claveDescarga(comprobante.id, "XML")}
          onClick={() => onDescargar(comprobante, "XML")}
        />
        <BotonTarjeta deshabilitado={enviandoCorreo} onClick={() => onEnviarCorreo(comprobante)}>
          <Send className="h-4 w-4" />
          Correo
        </BotonTarjeta>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * Piezas compartidas
 * ------------------------------------------------------------------ */

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-white/25 dark:border-t-white"
    />
  );
}

function AccionBoton({
  etiqueta,
  onClick,
  children,
  className,
  cargando = false,
  deshabilitado = false,
}: {
  etiqueta: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  cargando?: boolean;
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      data-accion="true"
      onClick={onClick}
      disabled={cargando || deshabilitado}
      title={etiqueta}
      aria-label={etiqueta}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-transparent backdrop-blur-md transition duration-150 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/5 dark:bg-white/[0.03]",
        className,
      )}
    >
      {cargando ? <Spinner /> : children}
    </button>
  );
}

function BotonTarjeta({
  onClick,
  children,
  cargando = false,
  deshabilitado = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  cargando?: boolean;
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      data-accion="true"
      onClick={onClick}
      disabled={cargando || deshabilitado}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/70 px-2 py-2 text-xs font-semibold text-slate-600 backdrop-blur-md transition hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
    >
      {cargando ? <Spinner /> : children}
    </button>
  );
}

function EstadoVacio() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200/70 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10">
        <Inbox className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          No se encontraron comprobantes
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
          Ajusta los filtros o la búsqueda para ver resultados de esta empresa.
        </p>
      </div>
    </div>
  );
}

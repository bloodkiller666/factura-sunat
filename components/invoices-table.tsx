"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Inbox,
  Printer,
  Send,
} from "lucide-react";
import { CasillaSeleccion, QuickActionsBar } from "@/components/quick-actions-bar";
import { SkeletonFilasTabla, SkeletonTarjetas } from "@/components/skeletons";
import { ComercialBadge, SunatBadge } from "@/components/status-badge";
import type { NuevoToast } from "@/components/toast";
import { type Emisor, descargarExcel, descargarLoteZip } from "@/lib/comprobante-descargas";
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
  onVerDetalle: (comprobante: Comprobante) => void;
  onDescargar: (comprobante: Comprobante, formato: FormatoDescarga) => void;
  onNotificar: (toast: NuevoToast) => void;
}

const CLASES_TH =
  "whitespace-nowrap bg-slate-50 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400";

const ICONOS_TIPO: Record<string, string> = {
  Factura: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  "Boleta de Venta": "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  "Guía de Remisión": "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  "Nota de Crédito": "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  "Nota de Débito": "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  "Comprobante de Retención": "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
};

export function InvoicesTable({
  comprobantes,
  empresa,
  totalEmpresa,
  cargando,
  descargaEnCurso,
  onVerDetalle,
  onDescargar,
  onNotificar,
}: Props) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(() => new Set());
  const [idsPrevios, setIdsPrevios] = useState<string[]>([]);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

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

  /** Reporte Excel real: genera el `.xlsx` y dispara la descarga. */
  function exportarExcel() {
    const total = seleccionadosVisibles.length;
    if (total === 0) return avisarSinSeleccion("exportar a Excel");

    const nombreArchivo = descargarExcel(seleccionadosVisibles, empresa);

    onNotificar({
      titulo: "Reporte Excel descargado exitosamente",
      detalle: `${nombreArchivo} · ${total} comprobante${total === 1 ? "" : "s"}`,
      tono: "ok",
    });
  }

  /** Lote ZIP real: empaqueta el XML de cada comprobante seleccionado. */
  function descargarZip() {
    const total = seleccionadosVisibles.length;
    if (total === 0) return avisarSinSeleccion("descargar el lote ZIP");

    const nombreArchivo = descargarLoteZip(seleccionadosVisibles, empresa);

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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Encabezado de la sección */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-blue-600">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Comprobantes electrónicos
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Toca <span className="font-medium text-slate-500 dark:text-slate-400">Ver detalle</span> para
              abrir la representación impresa
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
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
        onAlternarTodos={alternarTodos}
        onEmitir={emitirComprobante}
        onExportarExcel={exportarExcel}
        onDescargarZip={descargarZip}
        onEnviarCorreo={enviarCorreoMasivo}
      />

      {/* Vista de tabla (escritorio) */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1530px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
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
              <th className={CLASES_TH}>Estado comercial</th>
              <th className={cn(CLASES_TH, "text-center")}>Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                    className={cn(
                      "transition-colors hover:bg-blue-50/50 dark:hover:bg-slate-800/60",
                      marcado && "bg-blue-50/60 dark:bg-blue-500/5",
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
                        className="font-mono text-[13px] font-bold tracking-tight text-blue-700 underline-offset-2 transition hover:underline dark:text-blue-400"
                      >
                        {comprobante.numero}
                      </button>
                      <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
                        {comprobante.formaPago}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            ICONOS_TIPO[comprobante.tipo] ?? "bg-slate-100 text-slate-500",
                          )}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        <span className="whitespace-nowrap text-[13px] font-semibold text-slate-700 dark:text-slate-200">
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
                      <span className="block font-mono text-[11px] text-slate-400 dark:text-slate-500">
                        {comprobante.cliente.ruc}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-slate-600 dark:text-slate-300">
                      {formatearFecha(comprobante.fechaEmision)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-slate-600 dark:text-slate-300">
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
                        <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
                          {primerItem.cantidad} {primerItem.unidad}
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      {sinImporte ? (
                        <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        <>
                          <span className="block text-[13px] font-medium tabular-nums text-slate-700 dark:text-slate-200">
                            {formatearMoneda(primerItem?.precioUnitario ?? 0)}
                          </span>
                          <span className="block text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                            Base: {formatearMoneda(comprobante.baseImponible)}
                          </span>
                        </>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-right text-[13px] tabular-nums text-slate-500 dark:text-slate-400">
                      {sinImporte ? (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        formatearMoneda(comprobante.igv)
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
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

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <SunatBadge estado={comprobante.estadoSunat} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <ComercialBadge estado={comprobante.estadoComercial} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <AccionBoton
                          etiqueta="Ver detalle"
                          onClick={() => onVerDetalle(comprobante)}
                          className="text-slate-500 hover:bg-slate-900 hover:text-white dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </AccionBoton>
                        <AccionBoton
                          etiqueta="Imprimir / Descargar PDF"
                          cargando={descargaEnCurso === clavePdf}
                          onClick={() => onDescargar(comprobante, "PDF")}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        >
                          <Printer className="h-4 w-4" />
                        </AccionBoton>
                        <AccionBoton
                          etiqueta="Descargar XML"
                          cargando={descargaEnCurso === claveXml}
                          onClick={() => onDescargar(comprobante, "XML")}
                          className="text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                        >
                          <FileCode2 className="h-4 w-4" />
                        </AccionBoton>
                        <AccionBoton
                          etiqueta={`Enviar por correo a ${correoCliente(comprobante.cliente)}`}
                          deshabilitado={enviandoCorreo}
                          onClick={() => enviarCorreoIndividual(comprobante)}
                          className="text-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
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
                <td colSpan={13} className="px-4 py-20">
                  <EstadoVacio />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Vista de tarjetas (móvil y tablet) */}
      <div className="space-y-3 p-4 lg:hidden">
        {cargando && <SkeletonTarjetas cantidad={4} />}

        {!cargando &&
          comprobantes.map((comprobante) => (
            <TarjetaComprobante
              key={comprobante.id}
              comprobante={comprobante}
              marcado={seleccionados.has(comprobante.id)}
              descargaEnCurso={descargaEnCurso}
              enviandoCorreo={enviandoCorreo}
              onAlternar={() => alternarUno(comprobante.id)}
              onVerDetalle={onVerDetalle}
              onDescargar={onDescargar}
              onEnviarCorreo={enviarCorreoIndividual}
            />
          ))}

        {!cargando && comprobantes.length === 0 && <EstadoVacio />}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span>
          Mostrando{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {cargando ? "…" : comprobantes.length}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-300">{totalEmpresa}</span>{" "}
          comprobantes
        </span>
        <span>Datos simulados con fines de demostración · Prototipo no conectado a SUNAT</span>
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
  enviandoCorreo,
  onAlternar,
  onVerDetalle,
  onDescargar,
  onEnviarCorreo,
}: {
  comprobante: Comprobante;
  marcado: boolean;
  descargaEnCurso: string | null;
  enviandoCorreo: boolean;
  onAlternar: () => void;
  onVerDetalle: (comprobante: Comprobante) => void;
  onDescargar: (comprobante: Comprobante, formato: FormatoDescarga) => void;
  onEnviarCorreo: (comprobante: Comprobante) => void;
}) {
  const sinImporte = esSinImporte(comprobante.tipo);

  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-4 transition hover:shadow-sm dark:bg-slate-900",
        marcado
          ? "border-blue-300 bg-blue-50/40 dark:border-blue-500/50 dark:bg-blue-500/5"
          : "border-slate-200 hover:border-blue-200 dark:border-slate-800 dark:hover:border-slate-700",
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
            className="font-mono text-sm font-bold tracking-tight text-blue-700 dark:text-blue-400"
          >
            {comprobante.numero}
          </button>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded",
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
          <dt className="font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Cliente
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">
            {comprobante.cliente.razonSocial}
          </dd>
          <dd className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
            {comprobante.cliente.ruc}
          </dd>
        </div>

        <div>
          <dt className="font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Concepto
          </dt>
          <dd className="mt-0.5 line-clamp-2 text-slate-600 dark:text-slate-300">
            {comprobante.descripcion}
          </dd>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Emisión
            </dt>
            <dd className="mt-0.5 text-slate-600 dark:text-slate-300">
              {formatearFecha(comprobante.fechaEmision)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Vencimiento
            </dt>
            <dd className="mt-0.5 text-slate-600 dark:text-slate-300">
              {formatearFecha(comprobante.fechaVencimiento)}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <ComercialBadge estado={comprobante.estadoComercial} size="sm" />
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
              <p className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                Base {formatearMoneda(comprobante.baseImponible)} · IGV{" "}
                {formatearMoneda(comprobante.igv)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <BotonTarjeta onClick={() => onVerDetalle(comprobante)}>
          <Eye className="h-4 w-4" />
          Detalle
        </BotonTarjeta>
        <BotonTarjeta
          cargando={descargaEnCurso === claveDescarga(comprobante.id, "PDF")}
          onClick={() => onDescargar(comprobante, "PDF")}
        >
          <Printer className="h-4 w-4" />
          PDF
        </BotonTarjeta>
        <BotonTarjeta
          cargando={descargaEnCurso === claveDescarga(comprobante.id, "XML")}
          onClick={() => onDescargar(comprobante, "XML")}
        >
          <FileCode2 className="h-4 w-4" />
          XML
        </BotonTarjeta>
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
      className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-200"
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
      onClick={onClick}
      disabled={cargando || deshabilitado}
      title={etiqueta}
      aria-label={etiqueta}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40",
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
      onClick={onClick}
      disabled={cargando || deshabilitado}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
    >
      {cargando ? <Spinner /> : children}
    </button>
  );
}

function EstadoVacio() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Inbox className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          No se encontraron comprobantes
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Ajusta los filtros o la búsqueda para ver resultados de esta empresa.
        </p>
      </div>
    </div>
  );
}

import { SunatBadge } from "@/components/status-badge";
import { esSinImporte, formatearFecha, formatearFechaLarga, formatearMoneda } from "@/lib/format";
import type { Comprobante, Empresa } from "@/lib/types";

/** Etiqueta del documento tal como aparece en la representación impresa. */
export const TITULOS: Record<string, string> = {
  Factura: "FACTURA ELECTRÓNICA",
  "Boleta de Venta": "BOLETA DE VENTA ELECTRÓNICA",
  "Guía de Remisión": "GUÍA DE REMISIÓN ELECTRÓNICA",
  "Nota de Crédito": "NOTA DE CRÉDITO ELECTRÓNICA",
  "Nota de Débito": "NOTA DE DÉBITO ELECTRÓNICA",
  "Comprobante de Retención": "COMPROBANTE DE RETENCIÓN ELECTRÓNICO",
};

/**
 * Representación impresa del comprobante. Se reutiliza en dos lugares:
 * la vista previa del modal y la hoja exclusiva de impresión (`PrintSheet`),
 * de modo que lo que se ve en pantalla es lo que se exporta a PDF.
 */
export function InvoicePaper({ comprobante, empresa }: { comprobante: Comprobante; empresa: Empresa }) {
  const sinImporte = esSinImporte(comprobante.tipo);

  return (
    <div className="px-4 py-5 sm:px-8 sm:py-6">
      {/* Emisor + número de comprobante */}
      <div className="flex flex-col gap-5 border-b-2 border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
              TDM
            </span>
            <p className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
              {empresa.razonSocial}
            </p>
          </div>
          <dl className="mt-3 space-y-0.5 text-[12px] text-slate-600">
            <p>
              <span className="font-semibold text-slate-700">RUC:</span> {empresa.ruc}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Domicilio fiscal:</span>{" "}
              {empresa.domicilioFiscal}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Actividad:</span>{" "}
              {empresa.actividadPrincipal}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Sistema de emisión:</span> Facturación
              electrónica desde los sistemas del contribuyente
            </p>
          </dl>
        </div>

        <div className="shrink-0 self-start rounded-xl border-2 border-slate-800 px-4 py-3 text-center sm:px-5 sm:py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {TITULOS[comprobante.tipo] ?? comprobante.tipo}
          </p>
          <p className="mt-1 font-mono text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            {comprobante.numero}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <SunatBadge estado={comprobante.estadoSunat} size="sm" tono="claro" />
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-slate-600 ring-1 ring-inset ring-slate-300/70">
              SAP {comprobante.numeroSap}
            </span>
          </div>
        </div>
      </div>

      {/* Datos del adquirente */}
      <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Adquirente / Cliente
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {comprobante.cliente.razonSocial}
          </p>
          <p className="font-mono text-[12px] text-slate-500">RUC {comprobante.cliente.ruc}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <DatoEtiqueta etiqueta="F. emisión" valor={formatearFecha(comprobante.fechaEmision)} />
          <DatoEtiqueta
            etiqueta="F. vencimiento"
            valor={formatearFecha(comprobante.fechaVencimiento)}
          />
          <DatoEtiqueta etiqueta="Forma de pago" valor={comprobante.formaPago} />
          <DatoEtiqueta etiqueta="Moneda" valor="Soles (PEN)" />
        </div>
      </div>

      {/* Detalle de ítems */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-slate-900 text-left text-white">
              <th className="w-14 px-3 py-2.5 text-center font-bold uppercase tracking-wider">
                Cant.
              </th>
              <th className="w-20 px-3 py-2.5 font-bold uppercase tracking-wider">Unidad</th>
              <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Descripción</th>
              <th className="w-24 px-3 py-2.5 text-right font-bold uppercase tracking-wider">
                P. unit.
              </th>
              <th className="w-28 px-3 py-2.5 text-right font-bold uppercase tracking-wider">
                Importe
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {comprobante.items.length > 0 ? (
              comprobante.items.map((linea, indice) => (
                <tr key={`${linea.descripcion}-${indice}`} className="align-top">
                  <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                    {linea.cantidad}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{linea.unidad}</td>
                  <td className="px-3 py-3 text-slate-700">{linea.descripcion}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                    {formatearMoneda(linea.precioUnitario)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-800">
                    {formatearMoneda(linea.baseImponible)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  Documento de traslado de bienes: no se detallan importes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totales + código de barras */}
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-[2px]" aria-hidden="true">
            {[
              3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 2, 4, 1, 3, 1, 2, 3, 1, 1, 4, 2, 1, 3, 1, 2, 2, 1, 4, 1,
              3,
            ].map((ancho, indice) => (
              <span
                key={indice}
                className="block h-10 bg-slate-800"
                style={{ width: `${ancho}px` }}
              />
            ))}
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-slate-400">
            Resumen: {generarHash(comprobante.numero)}
            <br />
            Hash: {generarHash(`${comprobante.numero}-cdr`)}
          </p>
        </div>

        <div className="w-full space-y-1.5 text-[13px] sm:max-w-xs">
          {sinImporte ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-xs text-slate-500">
              Documento sin importe de venta.
            </div>
          ) : (
            <>
              <FilaTotal
                etiqueta="Base imponible"
                valor={formatearMoneda(comprobante.baseImponible)}
              />
              <FilaTotal
                etiqueta={comprobante.tipo === "Comprobante de Retención" ? "IGV" : "IGV (18%)"}
                valor={formatearMoneda(comprobante.igv)}
              />
              <div className="flex items-center justify-between border-t-2 border-slate-800 pt-2">
                <span className="text-sm font-bold text-slate-900">Importe total</span>
                <span className="text-base font-bold tabular-nums text-slate-900">
                  {formatearMoneda(comprobante.total, comprobante.moneda)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Observaciones */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Observaciones
        </p>
        <p className="mt-1 text-[12px] text-slate-600">
          {comprobante.observacion ?? "Sin observaciones registradas."}
        </p>
        {(comprobante.tipo === "Nota de Crédito" || comprobante.tipo === "Nota de Débito") && (
          <p className="mt-2 text-[12px] text-slate-500">
            Documento que modifica el comprobante de referencia emitido por {empresa.razonSocial}.
          </p>
        )}
        <p className="mt-2 text-[11px] text-slate-400">
          Emitido el {formatearFechaLarga(comprobante.fechaEmision)} · Vence el{" "}
          {formatearFechaLarga(comprobante.fechaVencimiento)}
        </p>
      </div>
    </div>
  );
}

function DatoEtiqueta({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{etiqueta}</p>
      <p className="truncate font-medium text-slate-700" title={valor}>
        {valor}
      </p>
    </div>
  );
}

function FilaTotal({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between text-slate-500">
      <span>{etiqueta}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

/** Genera una cadena pseudo-hash determinista para la vista previa (solo demo). */
function generarHash(semilla: string): string {
  let hash = 0;
  for (let i = 0; i < semilla.length; i += 1) {
    hash = (hash * 31 + semilla.charCodeAt(i)) % 0xffffffff;
  }
  const base = Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
  const sufijo = semilla
    .replace(/\W/g, "")
    .toUpperCase()
    .slice(-6)
    .padStart(6, "0");
  return `${base}-${sufijo}`;
}

import { InvoicePaper } from "@/components/invoice-paper";
import type { Comprobante, Empresa } from "@/lib/types";

/**
 * Hoja exclusiva para exportar a PDF. En pantalla permanece oculta; las reglas
 * `@media print` de `globals.css` hacen visible únicamente `.area-impresion`,
 * de modo que `window.print()` exporta solo el comprobante seleccionado.
 */
export function PrintSheet({
  comprobante,
  empresa,
}: {
  comprobante: Comprobante | null;
  empresa: Empresa;
}) {
  if (!comprobante) return null;

  return (
    <div id="area-impresion" className="area-impresion">
      <div className="bg-white text-slate-900">
        <InvoicePaper comprobante={comprobante} empresa={empresa} />
      </div>
    </div>
  );
}

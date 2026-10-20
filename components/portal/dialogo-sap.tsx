"use client";

import { useRef, useState, type DragEvent } from "react";
import { CheckCircle2, FileSpreadsheet, FileUp, Info, MinusCircle } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { Progreso } from "@/components/ui/varios";
import { ApiError, apiImportarSap } from "@/lib/api";
import { TIPO_XLSX, descargarBlob } from "@/lib/exportar";
import { formatearEntero } from "@/lib/format";
import { esExcelModerno, EXTENSIONES_EXCEL } from "@/lib/importar-excel";
import {
  CABECERAS_PLANTILLA_SAP,
  FILAS_POR_ENVIO,
  analizarHojaSap,
  enLotes,
  type AnalisisSap,
} from "@/lib/sap-excel";
import { generarXlsx } from "@/lib/xlsx";
import { leerHojaXlsx } from "@/lib/xlsx-lectura";
import { cn } from "@/lib/utils";

interface Props {
  abierto: boolean;
  token: string | null;
  ruc: string | null;
  onCerrar: () => void;
  /** Se llama al terminar si se actualizó al menos un comprobante (refresca la tabla). */
  onImportado: () => void;
}

interface Totales {
  recibidas: number;
  actualizadas: number;
  noEncontradas: number;
  invalidas: number;
}

function descargarPlantilla() {
  const xlsx = generarXlsx({
    nombre: "N° SAP",
    cabeceras: CABECERAS_PLANTILLA_SAP,
    filas: [
      ["F001-123", "20100000001", "4500000001"],
      ["B001-45", "", "4500000002"],
    ],
  });
  descargarBlob(new Blob([xlsx], { type: TIPO_XLSX }), "plantilla-numeros-sap.xlsx");
}

export function DialogoSap({ abierto, token, ruc, onCerrar, onImportado }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [analisis, setAnalisis] = useState<(AnalisisSap & { archivo: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [avance, setAvance] = useState(0);
  const [totales, setTotales] = useState<Totales | null>(null);

  const ocupado = leyendo || enviando;

  function reiniciar() {
    setAnalisis(null);
    setError(null);
    setTotales(null);
    setAvance(0);
  }

  function cerrar() {
    if (ocupado) return;
    reiniciar();
    onCerrar();
  }

  async function leer([archivo]: File[]) {
    if (!archivo || ocupado) return;
    reiniciar();
    if (!esExcelModerno(archivo.name)) {
      setError("El archivo no es un libro de Excel moderno (.xlsx o .xlsm).");
      return;
    }
    setLeyendo(true);
    try {
      const hoja = await leerHojaXlsx(new Uint8Array(await archivo.arrayBuffer()));
      const resultado = analizarHojaSap(hoja);
      if (resultado.filas.length === 0) {
        setError("El archivo tiene el encabezado pero ninguna fila con datos.");
      } else {
        setAnalisis({ ...resultado, archivo: archivo.name });
      }
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo leer el archivo.");
    } finally {
      setLeyendo(false);
    }
  }

  async function importar() {
    if (!token || !ruc || !analisis || enviando) return;
    setEnviando(true);
    setError(null);
    setAvance(0);
    const acumulado: Totales = { recibidas: 0, actualizadas: 0, noEncontradas: 0, invalidas: 0 };
    try {
      const lotes = enLotes(analisis.filas, FILAS_POR_ENVIO);
      for (const [indice, lote] of lotes.entries()) {
        const r = await apiImportarSap(token, ruc, lote);
        acumulado.recibidas += r.recibidas;
        acumulado.actualizadas += r.actualizadas;
        acumulado.noEncontradas += r.no_encontradas;
        acumulado.invalidas += r.invalidas;
        setAvance((indice + 1) / lotes.length);
      }
      setTotales(acumulado);
      setAnalisis(null);
      if (acumulado.actualizadas > 0) onImportado();
    } catch (fallo) {
      // Lo ya enviado quedó guardado: se informa cuánto antes de que fallara.
      if (acumulado.actualizadas > 0) onImportado();
      setError(
        (fallo instanceof ApiError || fallo instanceof Error
          ? fallo.message
          : "No se pudo importar.") +
          (acumulado.actualizadas > 0
            ? ` Antes del error se actualizaron ${formatearEntero(acumulado.actualizadas)} comprobantes.`
            : ""),
      );
    } finally {
      setEnviando(false);
    }
  }

  const soltar = (evento: DragEvent) => {
    evento.preventDefault();
    setEncima(false);
    void leer(Array.from(evento.dataTransfer.files));
  };

  return (
    <Dialogo
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Importar N° SAP"
      descripcion="Asigna el número de SAP a los comprobantes desde un Excel."
      ancho="lg"
      pie={
        <>
          {analisis && !enviando && (
            <Boton variante="primario" onClick={() => void importar()}>
              Importar {formatearEntero(analisis.filas.length)} filas
            </Boton>
          )}
          <Boton onClick={cerrar} disabled={ocupado}>
            Cerrar
          </Boton>
        </>
      }
    >
      <div className="space-y-5 p-5">
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-3.5 text-[12.5px] text-fg-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p>
              El Excel necesita una columna con el <strong className="text-fg-2">documento</strong>{" "}
              (serie-número, p. ej. <span className="font-mono">F001-123</span>) y otra con el{" "}
              <strong className="text-fg-2">N° SAP</strong>. El RUC es opcional y afina la
              búsqueda.
            </p>
            <p>
              Los documentos que no estén en el portal se omiten sin error y la importación sigue
              con la siguiente fila.
            </p>
            <button
              type="button"
              onClick={descargarPlantilla}
              className="font-medium text-accent hover:underline"
            >
              Descargar plantilla
            </button>
          </div>
        </div>

        {!totales && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setEncima(true);
            }}
            onDragLeave={() => setEncima(false)}
            onDrop={soltar}
            className={cn(
              "flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
              encima ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2",
              ocupado && "pointer-events-none opacity-60",
            )}
          >
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-fg-3">
              <FileUp className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-[14px] font-semibold text-fg">Arrastra aquí tu Excel de N° SAP</p>
            <p className="mt-1 text-[12.5px] text-fg-3">Formato .xlsx. Se lee en tu navegador.</p>
            <Boton
              className="mt-4"
              variante="primario"
              cargando={leyendo}
              disabled={enviando}
              onClick={() => entrada.current?.click()}
            >
              {leyendo ? "Leyendo…" : "Elegir Excel"}
            </Boton>
            <input
              ref={entrada}
              type="file"
              accept={EXTENSIONES_EXCEL.join(",")}
              hidden
              onChange={(e) => {
                const archivos = Array.from(e.target.files ?? []);
                e.target.value = "";
                void leer(archivos);
              }}
            />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-bad-line bg-bad-bg p-3.5 text-[13px] text-bad"
          >
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {analisis && (
          <div className="rounded-xl border border-ok-line bg-ok-bg p-3.5 text-[13px]">
            <p className="flex items-center gap-2 font-medium text-fg">
              <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />
              {analisis.archivo} · {formatearEntero(analisis.filas.length)} filas
            </p>
            <p className="mt-1 text-fg-3">
              Documento: «{analisis.columnas.documento}» · N° SAP: «{analisis.columnas.sap}»
              {analisis.columnas.ruc ? ` · RUC: «${analisis.columnas.ruc}»` : ""} · encabezado en
              la fila {analisis.filaCabecera}
            </p>
          </div>
        )}

        {enviando && (
          <div className="space-y-2" role="status" aria-live="polite">
            <Progreso valor={avance} tono="acento" />
            <p className="text-[12.5px] text-fg-3">Registrando N° SAP…</p>
          </div>
        )}

        {totales && (
          <div className="space-y-3" role="status" aria-live="polite">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-fg">
              <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />
              {formatearEntero(totales.actualizadas)} {totales.actualizadas === 1 ? "comprobante actualizado" : "comprobantes actualizados"}
            </p>
            <ul className="divide-y divide-line rounded-xl border border-line text-[13px]">
              <li className="flex items-center justify-between px-3.5 py-2">
                <span className="text-fg-3">Filas leídas</span>
                <span className="tnum text-fg">{formatearEntero(totales.recibidas)}</span>
              </li>
              <li className="flex items-center justify-between px-3.5 py-2">
                <span className="flex items-center gap-2 text-fg-3">
                  <MinusCircle className="h-4 w-4 text-warn" aria-hidden />
                  No están en el portal (omitidas)
                </span>
                <span className="tnum text-fg">{formatearEntero(totales.noEncontradas)}</span>
              </li>
              <li className="flex items-center justify-between px-3.5 py-2">
                <span className="flex items-center gap-2 text-fg-3">
                  <MinusCircle className="h-4 w-4 text-warn" aria-hidden />
                  Sin documento o N° SAP legible (omitidas)
                </span>
                <span className="tnum text-fg">{formatearEntero(totales.invalidas)}</span>
              </li>
            </ul>
            <Boton onClick={reiniciar}>Importar otro Excel</Boton>
          </div>
        )}
      </div>
    </Dialogo>
  );
}

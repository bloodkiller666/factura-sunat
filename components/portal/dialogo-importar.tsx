"use client";

import { useRef, useState, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, Info, MinusCircle } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { Etiqueta } from "@/components/ui/etiqueta";
import { ImportarProveedores } from "@/components/portal/importar-proveedores";
import {
  ApiError,
  apiImportarCdr,
  apiImportarPaquete,
  apiImportarXml,
} from "@/lib/api";
import {
  analizarHoja,
  esExcelModerno,
  EXTENSIONES_EXCEL,
  type ReporteImportacion,
} from "@/lib/importar-excel";
import { leerHojaXlsx } from "@/lib/xlsx-lectura";
import { formatearEntero } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PestanaImportar = "comprobantes" | "cdr" | "excel";

interface Props {
  abierto: boolean;
  pestana: PestanaImportar;
  onPestana: (pestana: PestanaImportar) => void;
  token: string | null;
  ruc: string | null;
  /** Sección activa: en compras se importa lo de los proveedores (XML + PDF + CDR por carpeta). */
  origen: "emitido" | "recibido";
  puedeOperar: boolean;
  onCerrar: () => void;
  /** Cantidad de elementos que cambiaron en el servidor (para refrescar la lista). */
  onImportado: (cambios: number) => void;
}

type Tono = "ok" | "aviso" | "error";
interface Fila {
  archivo: string;
  tono: Tono;
  texto: string;
}

interface Resultado {
  resumen: string;
  filas: Fila[];
}

const MOTIVOS_CDR: Record<string, string> = {
  nombre_invalido: "Nombre no reconocido (debe ser R-RUC-tipo-serie-número)",
  sin_comprobante: "No hay un comprobante emitido con esa numeración",
  ya_tiene_cdr: "Ya tenía su CDR; no se modificó",
  ruc_distinto: "Pertenece a otro RUC",
  no_archivado: "No se pudo guardar en el almacenamiento",
  cdr_parse_error: "El CDR está dañado o no se pudo leer",
};

// Archivos que el importador de proveedores deja de lado a propósito: se avisa, no es un error.
const MOTIVOS_INFORMATIVOS = new Set([
  "sin_xml",
  "guia",
  "cdr_sin_comprobante",
  "cdr_repetido",
  "xml_no_reconocido",
  "tipo_no_soportado",
]);

const MOTIVOS_XML: Record<string, string> = {
  conflict: "Ya estaba registrado",
  invalid_document: "No es un comprobante UBL válido",
  sin_xml: "PDF sin XML en su carpeta (o que no se puede unir a un comprobante)",
  guia: "Guía de remisión: no se registra como compra",
  cdr_sin_comprobante: "CDR sin comprobante en su carpeta",
  cdr_repetido: "Ya había otro CDR en la carpeta",
  xml_no_reconocido: "XML que no es un comprobante ni un CDR",
  tipo_no_soportado: "Solo se importan XML y PDF",
};

function ZonaArchivos({
  accept,
  multiple,
  titulo,
  ayuda,
  ocupado,
  onArchivos,
}: {
  accept: string;
  multiple?: boolean;
  titulo: string;
  ayuda: string;
  ocupado: boolean;
  onArchivos: (archivos: File[]) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);

  const soltar = (evento: DragEvent) => {
    evento.preventDefault();
    setEncima(false);
    if (ocupado) return;
    const archivos = Array.from(evento.dataTransfer.files);
    if (archivos.length > 0) onArchivos(multiple ? archivos : archivos.slice(0, 1));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={soltar}
      className={cn(
        "flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors",
        encima ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2",
        ocupado && "pointer-events-none opacity-60",
      )}
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-fg-3">
        <FileUp className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="text-[14px] font-semibold text-fg">{titulo}</p>
      <p className="mt-1 max-w-md text-[12.5px] text-fg-3">{ayuda}</p>
      <Boton
        className="mt-4"
        variante="primario"
        cargando={ocupado}
        onClick={() => entrada.current?.click()}
      >
        {ocupado ? "Procesando…" : "Elegir archivos"}
      </Boton>
      <input
        ref={entrada}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const archivos = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (archivos.length > 0) onArchivos(archivos);
        }}
      />
    </div>
  );
}

const ICONO_TONO = {
  ok: { icono: CheckCircle2, clase: "text-ok" },
  aviso: { icono: MinusCircle, clase: "text-warn" },
  error: { icono: AlertCircle, clase: "text-bad" },
} as const;

function ListaResultado({ resultado }: { resultado: Resultado }) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] font-medium text-fg">{resultado.resumen}</p>
      {resultado.filas.length > 0 && (
        <ul className="max-h-[260px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {resultado.filas.map((fila, i) => {
            const { icono: Icono, clase } = ICONO_TONO[fila.tono];
            return (
              <li key={`${fila.archivo}${i}`} className="flex items-start gap-2.5 px-3.5 py-2 text-[12.5px]">
                <Icono className={cn("mt-0.5 h-4 w-4 shrink-0", clase)} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-fg" title={fila.archivo}>
                    {fila.archivo}
                  </span>
                  <span className="text-fg-3">{fila.texto}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReporteExcel({ reporte }: { reporte: ReporteImportacion }) {
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-3.5",
          reporte.compatible ? "border-ok-line bg-ok-bg" : "border-warn-line bg-warn-bg",
        )}
      >
        {reporte.compatible ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
        ) : (
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
        )}
        <div className="text-[13px]">
          <p className="font-medium text-fg">
            {reporte.compatible
              ? "El archivo tiene todas las columnas del portal"
              : `Coincide con el ${reporte.porcentaje}% de las columnas`}
          </p>
          <p className="mt-0.5 text-fg-3">
            {reporte.archivo} · {formatearEntero(reporte.filasDatos)} filas de datos · cabecera en
            la fila {reporte.filaCabecera}
          </p>
        </div>
      </div>
      {reporte.faltantes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-fg-3">Columnas que faltan</p>
          <div className="flex flex-wrap gap-1.5">
            {reporte.faltantes.map((c) => (
              <Etiqueta key={c} tono="aviso">
                {c}
              </Etiqueta>
            ))}
          </div>
        </div>
      )}
      {reporte.extra.length > 0 && (
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-fg-3">Columnas adicionales</p>
          <div className="flex flex-wrap gap-1.5">
            {reporte.extra.map((c) => (
              <Etiqueta key={c}>{c}</Etiqueta>
            ))}
          </div>
        </div>
      )}
      <p className="text-[12px] text-fg-4">
        El archivo se analiza en tu navegador; no se sube a ningún servidor.
      </p>
    </div>
  );
}

const PESTANAS: Array<{ id: PestanaImportar; etiqueta: string }> = [
  { id: "comprobantes", etiqueta: "XML / ZIP" },
  { id: "cdr", etiqueta: "CDR (ZIP)" },
  { id: "excel", etiqueta: "Excel (análisis)" },
];

// En compras el CDR viaja dentro de la carpeta de cada proveedor, no en un ZIP aparte.
const PESTANAS_COMPRAS = PESTANAS.filter((p) => p.id !== "cdr");

export function DialogoImportar({
  abierto,
  pestana,
  onPestana,
  token,
  ruc,
  origen,
  puedeOperar,
  onCerrar,
  onImportado,
}: Props) {
  const compras = origen === "recibido";
  const pestanas = compras ? PESTANAS_COMPRAS : PESTANAS;
  const [ocupado, setOcupado] = useState(false);
  // En compras la importación en vivo lleva su propio estado: solo se avisa si está en curso.
  const [ocupadoCompras, setOcupadoCompras] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [excel, setExcel] = useState<ReporteImportacion | null>(null);
  const [errorExcel, setErrorExcel] = useState<string | null>(null);

  const cambiarPestana = (siguiente: PestanaImportar) => {
    setResultado(null);
    setExcel(null);
    setErrorExcel(null);
    onPestana(siguiente);
  };

  async function importarComprobantes(archivos: File[]) {
    if (!token || !ruc) return;
    setOcupado(true);
    setResultado(null);
    const filas: Fila[] = [];
    let nuevos = 0;
    for (const archivo of archivos) {
      try {
        if (archivo.name.toLowerCase().endsWith(".zip")) {
          const reporte = await apiImportarPaquete(token, ruc, archivo);
          nuevos += reporte.importados;
          for (const item of reporte.items) {
            filas.push({
              archivo: item.archivo,
              tono: item.ok
                ? item.code === "conflict"
                  ? "aviso"
                  : "ok"
                : item.code && MOTIVOS_INFORMATIVOS.has(item.code)
                  ? "aviso"
                  : item.code === "conflict"
                    ? "aviso"
                    : "error",
              texto: item.ok
                ? `Importado${item.pdf ? " con PDF" : ""}${item.cdr ? " y CDR" : ""}`
                : (item.code && MOTIVOS_XML[item.code]) || item.mensaje || "Con error",
            });
          }
        } else {
          await apiImportarXml(token, ruc, archivo, origen);
          nuevos += 1;
          filas.push({ archivo: archivo.name, tono: "ok", texto: "Importado" });
        }
      } catch (error) {
        const codigo = error instanceof ApiError ? error.code : "";
        filas.push({
          archivo: archivo.name,
          tono: codigo === "conflict" ? "aviso" : "error",
          texto:
            (codigo && MOTIVOS_XML[codigo]) ||
            (error instanceof Error ? error.message : "No se pudo importar"),
        });
      }
    }
    const errores = filas.filter((f) => f.tono === "error").length;
    const repetidos = filas.filter((f) => f.tono === "aviso").length;
    setResultado({
      resumen: `${formatearEntero(nuevos)} importado(s)${repetidos ? ` · ${repetidos} ya estaban` : ""}${errores ? ` · ${errores} con error` : ""}`,
      filas: filas.filter((f) => f.tono !== "ok" || filas.length <= 12),
    });
    setOcupado(false);
    if (nuevos > 0) onImportado(nuevos);
  }

  async function importarCdr(archivos: File[]) {
    if (!token || !ruc) return;
    setOcupado(true);
    setResultado(null);
    const filas: Fila[] = [];
    let asociados = 0;
    let yaTenian = 0;
    let sinComprobante = 0;
    for (const archivo of archivos) {
      try {
        const reporte = await apiImportarCdr(token, ruc, archivo);
        asociados += reporte.asociados;
        yaTenian += reporte.ya_tenian;
        sinComprobante += reporte.sin_comprobante;
        for (const item of reporte.items) {
          filas.push({
            archivo: item.archivo,
            tono: item.ok ? "ok" : item.code === "ya_tiene_cdr" ? "aviso" : "error",
            texto: item.ok
              ? `Asociado a ${item.numero ?? "el comprobante"}${item.estado ? ` · ${item.estado}` : ""}`
              : (item.code && MOTIVOS_CDR[item.code]) || item.mensaje || "Con error",
          });
        }
      } catch (error) {
        filas.push({
          archivo: archivo.name,
          tono: "error",
          texto: error instanceof Error ? error.message : "No se pudo importar",
        });
      }
    }
    setResultado({
      resumen: `${formatearEntero(asociados)} CDR asociado(s)${yaTenian ? ` · ${yaTenian} ya tenían` : ""}${sinComprobante ? ` · ${sinComprobante} sin comprobante` : ""}`,
      filas: filas.filter((f) => f.tono !== "ok" || filas.length <= 12),
    });
    setOcupado(false);
    if (asociados > 0) onImportado(asociados);
  }

  async function analizarExcel([archivo]: File[]) {
    setOcupado(true);
    setExcel(null);
    setErrorExcel(null);
    if (!esExcelModerno(archivo.name)) {
      setErrorExcel("El archivo no es un libro de Excel moderno (.xlsx o .xlsm).");
      setOcupado(false);
      return;
    }
    try {
      const hoja = await leerHojaXlsx(new Uint8Array(await archivo.arrayBuffer()));
      setExcel(analizarHoja(hoja, archivo.name));
    } catch (error) {
      setErrorExcel(error instanceof Error ? error.message : "No se pudo leer el archivo.");
    }
    setOcupado(false);
  }

  const cerrar = () => {
    if (ocupado || ocupadoCompras) return;
    setResultado(null);
    setExcel(null);
    setErrorExcel(null);
    onCerrar();
  };

  return (
    <Dialogo
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Importar archivos"
      descripcion={
        compras
          ? "Trae al portal los XML, PDF y CDR que te enviaron tus proveedores."
          : "Trae al portal los XML y CDR que emite tu sistema de facturación."
      }
      ancho="lg"
      pie={<Boton onClick={cerrar}>Cerrar</Boton>}
    >
      <div role="tablist" className="flex gap-1 border-b border-line px-4">
        {pestanas.map((p) => (
          <button
            key={p.id}
            role="tab"
            type="button"
            aria-selected={pestana === p.id}
            onClick={() => cambiarPestana(p.id)}
            disabled={ocupado || ocupadoCompras}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
              pestana === p.id ? "border-accent text-fg" : "border-transparent text-fg-3 hover:text-fg",
            )}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <div className="space-y-5 p-5">
        {!puedeOperar && pestana !== "excel" && (
          <p className="rounded-xl border border-warn-line bg-warn-bg p-3.5 text-[13px] text-warn">
            Tu rol es de solo lectura: no puedes importar archivos en esta empresa.
          </p>
        )}

        {pestana === "comprobantes" && compras && (
          <ImportarProveedores
            token={token}
            ruc={ruc}
            puedeOperar={puedeOperar}
            onImportado={onImportado}
            onOcupado={setOcupadoCompras}
          />
        )}

        {pestana === "comprobantes" && !compras && (
          <>
            <ZonaArchivos
              accept=".xml,.zip"
              multiple
              titulo="Arrastra aquí tus XML o un ZIP"
              ayuda="Hasta 200 archivos por ZIP; si traen el PDF con el mismo nombre, también se guarda. Un comprobante que ya está por SIRE se completa con su XML e ítems."
              ocupado={ocupado || !puedeOperar}
              onArchivos={(a) => void importarComprobantes(a)}
            />
            {resultado && <ListaResultado resultado={resultado} />}
          </>
        )}

        {pestana === "cdr" && (
          <>
            <ZonaArchivos
              accept=".zip"
              multiple
              titulo="Arrastra aquí el ZIP de CDR"
              ayuda="Cada archivo debe llamarse como lo entrega SUNAT: R-RUC-tipo-serie-número (.zip o .xml). Se asocia al comprobante, se guarda con su hash y actualiza el estado."
              ocupado={ocupado || !puedeOperar}
              onArchivos={(a) => void importarCdr(a)}
            />
            {resultado && <ListaResultado resultado={resultado} />}
          </>
        )}

        {pestana === "excel" && (
          <>
            <ZonaArchivos
              accept={EXTENSIONES_EXCEL.join(",")}
              titulo="Elige un Excel para verificarlo"
              ayuda="Comprueba que tenga las columnas del reporte del portal. Se analiza en tu navegador y no se sube a ningún servidor."
              ocupado={ocupado}
              onArchivos={(a) => void analizarExcel(a)}
            />
            {errorExcel && (
              <p className="flex items-start gap-2 rounded-xl border border-bad-line bg-bad-bg p-3.5 text-[13px] text-bad">
                <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {errorExcel}
              </p>
            )}
            {excel && <ReporteExcel reporte={excel} />}
          </>
        )}
      </div>
    </Dialogo>
  );
}

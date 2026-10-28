"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CirclePlus,
  CircleDashed,
  FileCode2,
  FileText,
  FolderOpen,
  Loader2,
  MinusCircle,
  Repeat2,
  Upload,
} from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Progreso } from "@/components/ui/varios";
import { ApiError, apiImportarGrupoProveedores } from "@/lib/api";
import { formatearEntero } from "@/lib/format";
import {
  aplicarRespuesta,
  detieneLaImportacion,
  filasIniciales,
  marcarGrupo,
  prepararSeleccion,
  resumirFilas,
  type EstadoArchivo,
  type FilaImportacion,
  type PreparadoImportacion,
  type TipoArchivo,
} from "@/lib/importar-proveedores";
import { cn } from "@/lib/utils";

interface Props {
  token: string | null;
  ruc: string | null;
  puedeOperar: boolean;
  /** Se llama al terminar (o detener) con la cantidad de compras que cambiaron. */
  onImportado: (cambios: number) => void;
  /** Avisa si hay una importación en curso (el diálogo no debe cerrarse a mitad). */
  onOcupado?: (ocupado: boolean) => void;
}

type Filtro = "todos" | "completada" | "nueva" | "ya_estaba" | "omitido" | "error";

const ESTADOS: Record<
  EstadoArchivo,
  { icono: typeof CheckCircle2; clase: string; etiqueta: string }
> = {
  espera: { icono: CircleDashed, clase: "text-fg-4", etiqueta: "En espera" },
  importando: {
    icono: Loader2,
    clase: "animate-[giro_0.8s_linear_infinite] text-accent",
    etiqueta: "Importando…",
  },
  completada: { icono: CheckCircle2, clase: "text-ok", etiqueta: "Importada · estaba en SIRE" },
  nueva: { icono: CirclePlus, clase: "text-accent", etiqueta: "Importada · no estaba en SIRE" },
  ya_estaba: { icono: Repeat2, clase: "text-fg-3", etiqueta: "Ya estaba" },
  guardado: { icono: CheckCircle2, clase: "text-ok", etiqueta: "Guardado" },
  omitido: { icono: MinusCircle, clase: "text-warn", etiqueta: "No se importó" },
  error: { icono: AlertCircle, clase: "text-bad", etiqueta: "Error" },
};

const ICONO_TIPO: Record<TipoArchivo, typeof FileText> = {
  xml: FileCode2,
  pdf: FileText,
  otro: FileText,
};

const FILTROS: Array<{ id: Filtro; etiqueta: string }> = [
  { id: "todos", etiqueta: "Todos" },
  { id: "completada", etiqueta: "Importadas" },
  { id: "nueva", etiqueta: "Nuevas (no estaban en SIRE)" },
  { id: "ya_estaba", etiqueta: "Ya estaban" },
  { id: "omitido", etiqueta: "No se importaron" },
  { id: "error", etiqueta: "Con error" },
];

/** Qué filas muestra cada filtro (los PDF guardados cuentan como «importadas»). */
function coincide(fila: FilaImportacion, filtro: Filtro): boolean {
  if (filtro === "todos") return true;
  if (filtro === "completada") return fila.estado === "completada" || fila.estado === "guardado";
  return fila.estado === filtro;
}

function Contador({
  valor,
  etiqueta,
  clase,
}: {
  valor: number;
  etiqueta: string;
  clase?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <p className={cn("tnum text-[18px] leading-6 font-semibold", clase ?? "text-fg")}>
        {formatearEntero(valor)}
      </p>
      <p className="text-[11.5px] leading-4 text-fg-3">{etiqueta}</p>
    </div>
  );
}

export function ImportarProveedores({ token, ruc, puedeOperar, onImportado, onOcupado }: Props) {
  const [preparado, setPreparado] = useState<PreparadoImportacion | null>(null);
  const [filas, setFilas] = useState<FilaImportacion[]>([]);
  const [leyendo, setLeyendo] = useState(false);
  const [corriendo, setCorriendo] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [encima, setEncima] = useState(false);
  const cancelado = useRef(false);
  const entradaCarpeta = useRef<HTMLInputElement>(null);
  const entradaArchivos = useRef<HTMLInputElement>(null);
  const filaActiva = useRef<HTMLLIElement>(null);

  const resumen = useMemo(() => resumirFilas(filas), [filas]);
  const visibles = useMemo(() => filas.filter((f) => coincide(f, filtro)), [filas, filtro]);
  const gruposTotal = preparado?.grupos.length ?? 0;
  const indiceActivo = visibles.findIndex((f) => f.estado === "importando");

  useEffect(() => onOcupado?.(corriendo || leyendo), [corriendo, leyendo, onOcupado]);
  // La lista sigue a la compra que se está importando.
  useEffect(() => {
    filaActiva.current?.scrollIntoView({ block: "nearest" });
  }, [filas]);

  async function elegir(seleccion: File[]) {
    if (seleccion.length === 0 || corriendo) return;
    setLeyendo(true);
    setErrorLectura(null);
    setTerminado(false);
    setFiltro("todos");
    try {
      const listo = await prepararSeleccion(seleccion);
      setPreparado(listo);
      setFilas(filasIniciales(listo.grupos));
      if (listo.grupos.length === 0) {
        setErrorLectura("No hay ningún XML ni PDF en lo que elegiste.");
      }
    } catch (error) {
      setPreparado(null);
      setFilas([]);
      setErrorLectura(error instanceof Error ? error.message : "No se pudo leer la selección.");
    }
    setLeyendo(false);
  }

  async function importar() {
    if (!token || !ruc || !preparado || corriendo) return;
    cancelado.current = false;
    setCorriendo(true);
    setTerminado(false);
    // Al reintentar, lo que falló vuelve a «en espera»; lo ya importado no se vuelve a enviar.
    let acumulado = filas.map((f) =>
      f.estado === "error" ? { ...f, estado: "espera" as const, mensaje: undefined } : f,
    );
    setFilas(acumulado);
    const cambiar = (siguiente: FilaImportacion[]) => {
      acumulado = siguiente;
      setFilas(siguiente);
    };
    const porHacer = preparado.grupos.filter((g) =>
      acumulado.some((f) => f.grupo === g.id && f.estado === "espera"),
    );
    let compras = 0;
    for (const grupo of porHacer) {
      if (cancelado.current) break;
      cambiar(marcarGrupo(acumulado, grupo.id, "importando"));
      try {
        const respuesta = await apiImportarGrupoProveedores(token, ruc, grupo.archivos);
        cambiar(aplicarRespuesta(acumulado, grupo.id, respuesta.items));
        compras += (respuesta.nuevas ?? 0) + (respuesta.completadas ?? 0);
        // Una compra o un PDF unido también cambia lo que ve el usuario en la lista.
        compras += respuesta.items.filter((i) => i.tipo === "pdf" && i.ok && i.situacion === "unido").length;
      } catch (error) {
        const estado = error instanceof ApiError ? error.status : 0;
        const codigo = error instanceof ApiError ? error.code : "";
        const mensaje = error instanceof Error ? error.message : "No se pudo importar este grupo";
        cambiar(marcarGrupo(acumulado, grupo.id, "error", mensaje));
        if (detieneLaImportacion(estado, codigo)) break;
      }
    }
    // Lo que no llegó a procesarse (detenido) vuelve a «en espera», no queda importando.
    cambiar(acumulado.map((f) => (f.estado === "importando" ? { ...f, estado: "espera" } : f)));
    setCorriendo(false);
    setTerminado(true);
    if (compras > 0) onImportado(compras);
  }

  function reiniciar() {
    if (corriendo) return;
    setPreparado(null);
    setFilas([]);
    setTerminado(false);
    setErrorLectura(null);
    setFiltro("todos");
  }

  const soltar = (evento: DragEvent) => {
    evento.preventDefault();
    setEncima(false);
    if (!puedeOperar || corriendo || leyendo) return;
    void elegir(Array.from(evento.dataTransfer.files));
  };

  const hayPendientes = filas.some((f) => f.estado === "espera");

  /* ------------------------------ 1. Elegir ------------------------------ */
  if (!preparado) {
    return (
      <div className="space-y-4">
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
            (!puedeOperar || leyendo) && "pointer-events-none opacity-60",
          )}
        >
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-fg-3">
            <Upload className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </span>
          <p className="text-[14px] font-semibold text-fg">
            Elige la carpeta, los ZIP o los archivos de tus proveedores
          </p>
          <p className="mt-1 max-w-lg text-[12.5px] text-fg-3">
            Cada carpeta es una compra con su XML y su PDF. También sirven ZIP (como los lotes del
            extractor) o XML y PDF sueltos: un PDF sin XML se une a una compra ya registrada si su
            texto trae el RUC y la serie-número. Verás cada archivo importarse en vivo.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Boton
              variante="primario"
              icono={FolderOpen}
              cargando={leyendo}
              onClick={() => entradaCarpeta.current?.click()}
            >
              {leyendo ? "Leyendo…" : "Elegir carpeta"}
            </Boton>
            <Boton icono={Upload} onClick={() => entradaArchivos.current?.click()}>
              Elegir ZIP o archivos
            </Boton>
          </div>
          <input
            ref={entradaCarpeta}
            type="file"
            multiple
            hidden
            {...({ webkitdirectory: "" } as object)}
            onChange={(e) => {
              const archivos = Array.from(e.target.files ?? []);
              e.target.value = "";
              void elegir(archivos);
            }}
          />
          <input
            ref={entradaArchivos}
            type="file"
            accept=".zip,.xml,.pdf"
            multiple
            hidden
            onChange={(e) => {
              const archivos = Array.from(e.target.files ?? []);
              e.target.value = "";
              void elegir(archivos);
            }}
          />
        </div>
        {errorLectura && (
          <p className="flex items-start gap-2 rounded-xl border border-bad-line bg-bad-bg p-3.5 text-[13px] text-bad">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {errorLectura}
          </p>
        )}
      </div>
    );
  }

  /* --------------------- 2. Revisar, importar y seguir --------------------- */
  const avance = resumen.total ? resumen.procesados / resumen.total : 0;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-fg-3">
          <span aria-live="polite">
            {corriendo
              ? "Importando…"
              : terminado
                ? hayPendientes
                  ? "Detenido"
                  : "Terminado"
                : "Listo para importar"}{" "}
            · {formatearEntero(resumen.procesados)} de {formatearEntero(resumen.total)} archivos ·{" "}
            {formatearEntero(gruposTotal)} compra{gruposTotal === 1 ? "" : "s"}
            {preparado.ignorados > 0 &&
              ` · ${formatearEntero(preparado.ignorados)} ignorado${preparado.ignorados === 1 ? "" : "s"} (no son XML ni PDF)`}
          </span>
        </div>
        <Progreso valor={avance} tono={resumen.errores > 0 ? "aviso" : "ok"} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Contador valor={resumen.completadas} etiqueta="Importadas (estaban en SIRE)" clase="text-ok" />
        <Contador valor={resumen.nuevas} etiqueta="Nuevas (no estaban en SIRE)" clase="text-accent" />
        <Contador valor={resumen.yaEstaban} etiqueta="Ya estaban" />
        <Contador valor={resumen.pdfGuardados} etiqueta="PDF guardados" clase="text-ok" />
        <Contador valor={resumen.omitidos} etiqueta="No se importaron" clase="text-warn" />
        <Contador valor={resumen.errores} etiqueta="Con error" clase={resumen.errores ? "text-bad" : undefined} />
      </div>

      <div role="group" aria-label="Filtrar archivos" className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
              filtro === f.id
                ? "border-accent-line bg-accent-soft text-accent"
                : "border-line text-fg-3 hover:text-fg",
            )}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      <ul className="max-h-[320px] divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {visibles.length === 0 && (
          <li className="px-3.5 py-6 text-center text-[12.5px] text-fg-3">
            No hay archivos en esta categoría todavía.
          </li>
        )}
        {visibles.map((fila, indice) => {
          const { icono: Icono, clase, etiqueta } = ESTADOS[fila.estado];
          const IconoTipo = ICONO_TIPO[fila.tipo];
          const activa = fila.estado === "importando";
          return (
            <li
              key={fila.id}
              ref={indice === indiceActivo ? filaActiva : undefined}
              className={cn("flex items-start gap-2.5 px-3.5 py-2 text-[12.5px]", activa && "bg-accent-soft")}
            >
              <Icono className={cn("mt-0.5 h-4 w-4 shrink-0", clase)} aria-hidden />
              <IconoTipo className="mt-0.5 h-4 w-4 shrink-0 text-fg-4" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-fg" title={fila.archivo}>
                  {fila.archivo}
                </span>
                <span className={cn("block", fila.estado === "error" ? "text-bad" : "text-fg-3")}>
                  {fila.estado === "importando" || fila.estado === "espera"
                    ? etiqueta
                    : (fila.mensaje ?? etiqueta)}
                  {fila.numero && fila.estado !== "error" ? ` · ${fila.numero}` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-fg-3">
          {resumen.errores > 0 && !corriendo
            ? "Los archivos con error se pueden reintentar: lo ya importado no se duplica."
            : "Lo ya importado no se duplica si repites el proceso."}
        </p>
        <div className="flex gap-2">
          {corriendo ? (
            <Boton
              onClick={() => {
                cancelado.current = true;
              }}
            >
              Detener tras esta compra
            </Boton>
          ) : (
            <>
              <Boton onClick={reiniciar}>Elegir otros archivos</Boton>
              <Boton
                variante="primario"
                icono={Upload}
                disabled={!puedeOperar || !token || (terminado && !hayPendientes && resumen.errores === 0)}
                onClick={() => void importar()}
              >
                {terminado ? "Reintentar lo pendiente" : `Importar ${formatearEntero(gruposTotal)} compra${gruposTotal === 1 ? "" : "s"}`}
              </Boton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

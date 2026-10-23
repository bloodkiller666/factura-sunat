"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Download,
  FileCode2,
  FileSearch,
  FileText,
  FolderOpen,
  HardDriveDownload,
  Info,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Boton, type IconoLucide } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { EstadoPill, Etiqueta } from "@/components/ui/etiqueta";
import { BotonCopiar, Esqueleto } from "@/components/ui/varios";
import {
  formatearFecha,
  formatearFechaHora,
  formatearMoneda,
  formatearTamano,
} from "@/lib/format";
import type { ArchivoGuardado, Comprobante, Empresa } from "@/lib/types";
import { cn } from "@/lib/utils";

type Pestana = "resumen" | "items" | "archivos";

interface Props {
  comprobante: Comprobante | null;
  empresa: Empresa | null;
  cargandoDetalle: boolean;
  puedeOperar: boolean;
  descargando: Set<string>;
  consultando: boolean;
  onCerrar: () => void;
  onDescargar: (c: Comprobante, tipo: "xml" | "cdr" | "pdf") => void;
  onConsultarCdr: (c: Comprobante) => void;
  onImportarXml: (archivo: File) => void;
  onAbrirImportarCdr: () => void;
  guardandoPc: boolean;
  onGuardarEnPc: (c: Comprobante) => void;
  onAbrirCarpeta: (c: Comprobante) => void;
  cargarArchivos: (c: Comprobante) => Promise<ArchivoGuardado[]>;
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-fg-3">{etiqueta}</dt>
      <dd className="mt-0.5 text-[13px] text-fg">{children}</dd>
    </div>
  );
}

function Resumen({ c, empresa }: { c: Comprobante; empresa: Empresa | null }) {
  return (
    <div className="space-y-6 p-5">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Dato etiqueta={c.origen === "recibido" ? "Proveedor" : "Cliente"}>
          <span className="block truncate font-medium" title={c.cliente.razonSocial}>
            {c.cliente.razonSocial}
          </span>
          <span className="font-mono text-[12px] text-fg-3">
            {c.cliente.ruc || "Sin documento"}
            {c.cliente.docEtiqueta && (
              <span className="ml-1.5 font-sans text-fg-4">· {c.cliente.docEtiqueta}</span>
            )}
          </span>
        </Dato>
        <Dato etiqueta="Fecha de emisión">
          <span className="tnum">{formatearFecha(c.fechaEmision)}</span>
        </Dato>
        <Dato etiqueta="Vencimiento">
          <span className="tnum">{formatearFecha(c.fechaVencimiento)}</span>
        </Dato>
        <Dato etiqueta="Forma de pago">{c.formaPago ?? "—"}</Dato>
        <Dato etiqueta="Moneda">{c.moneda === "USD" ? "Dólares (USD)" : "Soles (PEN)"}</Dato>
      </dl>

      <div className="rounded-xl border border-line">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[13px]">
          <span className="text-fg-3">Base imponible</span>
          <span className="tnum text-fg">{formatearMoneda(c.baseImponible, c.moneda)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[13px]">
          <span className="text-fg-3">IGV (18 %)</span>
          <span className="tnum text-fg">{formatearMoneda(c.igv, c.moneda)}</span>
        </div>
        <div className="flex items-center justify-between bg-surface-2 px-4 py-3 text-[14px] font-semibold">
          <span>Total (con IGV)</span>
          <span className="tnum">{formatearMoneda(c.total, c.moneda)}</span>
        </div>
      </div>
      {c.fuente === "sire" && (
        <p className="-mt-3 text-[12px] text-fg-3">
          Base e IGV son referenciales (SIRE no entrega el desglose). Se completan al importar el
          XML.
        </p>
      )}

      <div className="rounded-xl border border-line p-4">
        <p className="text-[12px] font-medium text-fg-3">N° de SAP</p>
        <p className="mt-1.5 font-mono text-[13px] text-fg">
          {c.numeroSap || <span className="font-sans text-fg-3">Sin N° de SAP</span>}
        </p>
        {!c.numeroSap && (
          <p className="mt-1.5 text-[12px] text-fg-4">
            Se registra con «Importar N° SAP» desde un Excel de Contabilidad.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-line p-4">
        <p className="text-[12px] font-medium text-fg-3">Respuesta de SUNAT</p>
        <p className="mt-1.5 text-[13px] text-fg">
          {c.cdrCodigo !== null ? (
            <>
              <span className="font-mono">Código {c.cdrCodigo}</span>
              {c.cdrDescripcion ? ` · ${c.cdrDescripcion}` : ""}
            </>
          ) : c.fuente === "sire" ? (
            "Listado por SUNAT en el registro de ventas (SIRE). Aún no hay un CDR archivado."
          ) : (
            "Sin respuesta registrada todavía."
          )}
        </p>
        <p className="mt-2 text-[12px] text-fg-4">
          Origen: {c.fuente === "sire" ? "Registro de ventas (SIRE)" : "XML importado"} ·{" "}
          {c.origen === "emitido" ? "Emitido" : "Recibido"}
          {empresa?.ambiente ? ` · ${empresa.ambiente}` : ""}
        </p>
      </div>
    </div>
  );
}

function Items({
  c,
  cargando,
  onImportarXml,
  puedeOperar,
}: {
  c: Comprobante;
  cargando: boolean;
  onImportarXml: (archivo: File) => void;
  puedeOperar: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  if (cargando) {
    return (
      <div className="space-y-2 p-5">
        <Esqueleto className="h-9 w-full" />
        <Esqueleto className="h-9 w-full" />
      </div>
    );
  }
  if (c.items.length === 0) {
    return (
      <div className="p-5">
        <div className="flex gap-3 rounded-xl border border-dashed border-line-strong bg-surface-2 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-3" aria-hidden />
          <div className="text-[13px] text-fg-2">
            <p className="font-medium text-fg">Este comprobante no tiene líneas de detalle</p>
            <p className="mt-1 text-fg-3">
              {c.fuente === "sire"
                ? "SUNAT solo entrega la cabecera por SIRE. Importa el XML desde el sistema que lo emite para ver los ítems."
                : "El XML importado no trae líneas de detalle."}
            </p>
            {puedeOperar && c.fuente === "sire" && (
              <>
                <Boton
                  tamano="sm"
                  icono={Upload}
                  className="mt-3"
                  onClick={() => entrada.current?.click()}
                >
                  Importar XML
                </Boton>
                <input
                  ref={entrada}
                  type="file"
                  accept=".xml"
                  hidden
                  onChange={(e) => {
                    const archivo = e.target.files?.[0];
                    e.target.value = "";
                    if (archivo) onImportarXml(archivo);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-5">
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2 text-[11.5px] tracking-wide text-fg-3 uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Descripción</th>
              <th className="px-3 py-2 text-right font-medium">Cant.</th>
              <th className="px-3 py-2 text-right font-medium">P. unit.</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {c.items.map((item, indice) => (
              <tr key={indice}>
                <td className="px-3 py-2.5">
                  <p className="text-fg">{item.descripcion}</p>
                  <p className="text-[12px] text-fg-4">{item.unidad}</p>
                </td>
                <td className="tnum px-3 py-2.5 text-right text-fg-2">{item.cantidad}</td>
                <td className="tnum px-3 py-2.5 text-right text-fg-2">
                  {formatearMoneda(item.precioUnitario, c.moneda)}
                </td>
                <td className="tnum px-3 py-2.5 text-right font-medium text-fg">
                  {formatearMoneda(item.baseImponible, c.moneda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilaArchivo({
  icono: Icono,
  titulo,
  archivo,
  vacio,
  acciones,
}: {
  icono: IconoLucide;
  titulo: string;
  archivo?: ArchivoGuardado;
  vacio: ReactNode;
  acciones: ReactNode;
}) {
  return (
    <li className="flex gap-3.5 rounded-xl border border-line p-3.5">
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
          archivo ? "border-ok-line bg-ok-bg text-ok" : "border-line bg-surface-2 text-fg-4",
        )}
      >
        <Icono className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-fg">{titulo}</p>
          {archivo ? (
            <Etiqueta tono="ok">
              <CheckCircle2 className="h-3 w-3" aria-hidden /> Archivado
            </Etiqueta>
          ) : (
            <Etiqueta>
              <CircleDashed className="h-3 w-3" aria-hidden /> Falta
            </Etiqueta>
          )}
        </div>
        {archivo ? (
          <div className="mt-1 space-y-0.5 text-[12px] text-fg-3">
            <p className="truncate font-mono" title={archivo.nombre}>
              {archivo.nombre}
            </p>
            <p className="tnum">
              {formatearTamano(archivo.tamano)} · {formatearFechaHora(archivo.creado)}
            </p>
            {archivo.hashSha256 && (
              <p className="flex items-center gap-1 font-mono text-[11px] text-fg-4">
                SHA-256 {archivo.hashSha256.slice(0, 16)}…
                <BotonCopiar texto={archivo.hashSha256} etiqueta="Copiar hash SHA-256" />
              </p>
            )}
          </div>
        ) : (
          <div className="mt-1 text-[12.5px] text-fg-3">{vacio}</div>
        )}
        <div className="mt-2.5 flex flex-wrap gap-2">{acciones}</div>
      </div>
    </li>
  );
}

function Archivos({
  c,
  puedeOperar,
  descargando,
  consultando,
  cargarArchivos,
  onDescargar,
  onConsultarCdr,
  onImportarXml,
  onAbrirImportarCdr,
}: Pick<
  Props,
  | "puedeOperar"
  | "descargando"
  | "consultando"
  | "cargarArchivos"
  | "onDescargar"
  | "onConsultarCdr"
  | "onImportarXml"
  | "onAbrirImportarCdr"
> & { c: Comprobante }) {
  const [archivos, setArchivos] = useState<ArchivoGuardado[] | null>(null);
  const [error, setError] = useState(false);
  const entradaXml = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vigente = true;
    cargarArchivos(c)
      .then((lista) => {
        if (vigente) setArchivos(lista);
      })
      .catch(() => {
        if (vigente) setError(true);
      });
    return () => {
      vigente = false;
    };
    // Se recarga cuando cambian los respaldos del comprobante (tras una importación).
  }, [c, cargarArchivos]);

  if (error) {
    return (
      <p className="p-5 text-[13px] text-bad">No se pudo leer la lista de archivos. Reintenta.</p>
    );
  }
  if (!archivos) {
    return (
      <div className="space-y-3 p-5">
        <Esqueleto className="h-24 w-full" />
        <Esqueleto className="h-24 w-full" />
        <Esqueleto className="h-24 w-full" />
      </div>
    );
  }

  const de = (tipo: ArchivoGuardado["tipo"]) => archivos.find((a) => a.tipo === tipo);
  const esBoleta = c.codigoTipo === "03";

  return (
    <div className="space-y-3 p-5">
      <p className="text-[12.5px] text-fg-3">
        Lo que el portal tiene guardado de este comprobante. Ante una auditoría, la evidencia es
        el <strong className="font-medium text-fg-2">XML firmado</strong> junto con su{" "}
        <strong className="font-medium text-fg-2">CDR</strong>.
      </p>
      <ul className="space-y-3">
        <FilaArchivo
          icono={FileCode2}
          titulo="XML firmado"
          archivo={de("xml")}
          vacio={
            <>
              SUNAT no entrega el XML por SIRE. Importa el XML desde el sistema que emite el
              comprobante.
            </>
          }
          acciones={
            de("xml") ? (
              <Boton
                tamano="sm"
                icono={Download}
                cargando={descargando.has(`${c.id}:xml`)}
                onClick={() => onDescargar(c, "xml")}
              >
                Descargar XML
              </Boton>
            ) : (
              puedeOperar && (
                <>
                  <Boton tamano="sm" icono={Upload} onClick={() => entradaXml.current?.click()}>
                    Importar XML
                  </Boton>
                  <input
                    ref={entradaXml}
                    type="file"
                    accept=".xml"
                    hidden
                    onChange={(e) => {
                      const archivo = e.target.files?.[0];
                      e.target.value = "";
                      if (archivo) onImportarXml(archivo);
                    }}
                  />
                </>
              )
            )
          }
        />
        {c.origen === "recibido" && (
          <FilaArchivo
            icono={FileText}
            titulo="PDF del proveedor"
            archivo={de("pdf")}
            vacio={
              <>
                El proveedor lo envía por correo junto con el XML. Se trae con Importar → ZIP de
                proveedores.
              </>
            }
            acciones={
              de("pdf") && (
                <Boton
                  tamano="sm"
                  icono={Download}
                  cargando={descargando.has(`${c.id}:pdf`)}
                  onClick={() => onDescargar(c, "pdf")}
                >
                  Descargar PDF
                </Boton>
              )
            }
          />
        )}
        <FilaArchivo
          icono={ShieldCheck}
          titulo="CDR (constancia de recepción)"
          archivo={de("cdr")}
          vacio={
            esBoleta ? (
              <>Las boletas no tienen consulta de CDR en SUNAT; pide el CDR al emisor.</>
            ) : (
              <>
                Consulta a SUNAT. Si el comprobante lo emite otro sistema (OSE, PSE, SAP), SUNAT
                responde que no lo reconoce y el CDR hay que importarlo desde ese sistema.
              </>
            )
          }
          acciones={
            de("cdr") ? (
              <Boton
                tamano="sm"
                icono={Download}
                cargando={descargando.has(`${c.id}:cdr`)}
                onClick={() => onDescargar(c, "cdr")}
              >
                Descargar CDR
              </Boton>
            ) : (
              puedeOperar && (
                <>
                  {!esBoleta && c.origen === "emitido" && (
                    <Boton
                      tamano="sm"
                      icono={FileSearch}
                      cargando={consultando}
                      onClick={() => onConsultarCdr(c)}
                    >
                      Consultar en SUNAT
                    </Boton>
                  )}
                  <Boton tamano="sm" icono={Upload} onClick={onAbrirImportarCdr}>
                    Importar CDR (ZIP)
                  </Boton>
                </>
              )
            )
          }
        />
      </ul>
    </div>
  );
}

export function DetalleComprobante(props: Props) {
  const { comprobante: c, empresa, cargandoDetalle, puedeOperar, onCerrar } = props;
  const [pestana, setPestana] = useState<Pestana>("resumen");

  // Cada comprobante empieza en «Resumen».
  const [idPrevio, setIdPrevio] = useState<string | null>(null);
  if ((c?.id ?? null) !== idPrevio) {
    setIdPrevio(c?.id ?? null);
    setPestana("resumen");
  }

  const pestanas: Array<{ id: Pestana; etiqueta: string }> = [
    { id: "resumen", etiqueta: "Resumen" },
    { id: "items", etiqueta: c && c.items.length > 0 ? `Ítems (${c.items.length})` : "Ítems" },
    { id: "archivos", etiqueta: "Archivos" },
  ];

  return (
    <Dialogo
      abierto={c !== null}
      onCerrar={onCerrar}
      titulo={c ? `Comprobante ${c.numero}` : "Comprobante"}
      modo="lateral"
      cabecera={
        c && (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-[16px] leading-6 font-semibold tracking-tight text-fg">
                {c.numero}
              </h2>
              <EstadoPill estado={c.estadoSunat} />
            </div>
            <p className="mt-1 truncate text-[13px] text-fg-3">
              {c.tipo} · {c.cliente.razonSocial}
            </p>
            <p className="tnum mt-2 text-[22px] leading-7 font-semibold tracking-tight text-fg">
              {formatearMoneda(c.tipo === "Nota de Crédito" ? -c.total : c.total, c.moneda)}
            </p>
          </div>
        )
      }
      pie={
        c && (
          <>
            {puedeOperar && c.origen === "emitido" && c.codigoTipo !== "03" && !c.tieneCdr && (
              <Boton
                icono={FileSearch}
                cargando={props.consultando}
                onClick={() => props.onConsultarCdr(c)}
              >
                Consultar CDR
              </Boton>
            )}
            {(c.tieneXml || c.tieneCdr || c.tienePdf) && (
              <>
                <Boton
                  icono={FolderOpen}
                  onClick={() => props.onAbrirCarpeta(c)}
                  title="Abre Descargas/AAAA/MM/RUC/SERIE-NÚMERO (requiere el backend en tu PC)"
                >
                  Abrir carpeta
                </Boton>
                <Boton
                  icono={HardDriveDownload}
                  cargando={props.guardandoPc}
                  onClick={() => props.onGuardarEnPc(c)}
                  title={
                    c.origen === "recibido"
                      ? "Guarda el XML, el CDR y el PDF en Descargas/AAAA/MM/RUC/SERIE-NÚMERO"
                      : "Guarda el XML y el CDR en Descargas/AAAA/MM/RUC/SERIE-NÚMERO"
                  }
                >
                  Guardar en mi PC
                </Boton>
              </>
            )}
          </>
        )
      }
    >
      {c && (
        <div className="flex h-full flex-col">
          <div role="tablist" aria-label="Secciones" className="flex gap-1 border-b border-line px-4">
            {pestanas.map((p) => (
              <button
                key={p.id}
                role="tab"
                type="button"
                aria-selected={pestana === p.id}
                onClick={() => setPestana(p.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
                  pestana === p.id
                    ? "border-accent text-fg"
                    : "border-transparent text-fg-3 hover:text-fg",
                )}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto" role="tabpanel">
            {pestana === "resumen" && (
              <Resumen c={c} empresa={empresa} />
            )}
            {pestana === "items" && (
              <Items
                c={c}
                cargando={cargandoDetalle}
                puedeOperar={puedeOperar}
                onImportarXml={props.onImportarXml}
              />
            )}
            {pestana === "archivos" && (
              <Archivos
                key={`${c.id}:${c.tieneXml}:${c.tieneCdr}`}
                c={c}
                puedeOperar={puedeOperar}
                descargando={props.descargando}
                consultando={props.consultando}
                cargarArchivos={props.cargarArchivos}
                onDescargar={props.onDescargar}
                onConsultarCdr={props.onConsultarCdr}
                onImportarXml={props.onImportarXml}
                onAbrirImportarCdr={props.onAbrirImportarCdr}
              />
            )}
          </div>
        </div>
      )}
    </Dialogo>
  );
}

"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  FileArchive,
  FileCode2,
  FileSearch,
  FileText,
  MoreHorizontal,
  SearchX,
  ShieldCheck,
  X,
} from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Casilla, Seleccion } from "@/components/ui/campos";
import { EncabezadoOrden } from "@/components/ui/encabezado-orden";
import { ChipRespaldo, EstadoPill } from "@/components/ui/etiqueta";
import { ItemMenu, Menu, SeparadorMenu } from "@/components/ui/menu";
import { Esqueleto, EstadoVacio } from "@/components/ui/varios";
import type { CampoOrden, Orden } from "@/lib/filtros";
import { formatearEntero, formatearFecha, formatearMoneda } from "@/lib/format";
import type { Comprobante } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TipoDescarga = "xml" | "cdr" | "pdf";

interface Props {
  /** Solo la página actual: el servidor ya filtró, ordenó y paginó. */
  comprobantes: Comprobante[];
  /** Total del conjunto filtrado (todas las páginas); `null` mientras se cuenta. */
  total: number | null;
  pagina: number;
  tamano: number;
  hayMas: boolean;
  orden: Orden;
  cargando: boolean;
  /** Hay datos en pantalla y se está pidiendo otra página, orden o filtro. */
  actualizando: boolean;
  hayFiltros: boolean;
  /** Quién es la contraparte: el cliente en ventas, el proveedor en compras. */
  contraparte: "Cliente" | "Proveedor";
  seleccionados: Set<string>;
  consultando: Set<string>;
  puedeOperar: boolean;
  onOrden: (campo: CampoOrden) => void;
  onPagina: (pagina: number) => void;
  onTamano: (tamano: number) => void;
  onAlternar: (comprobante: Comprobante) => void;
  onAlternarVisibles: (comprobantes: Comprobante[], marcar: boolean) => void;
  onLimpiarSeleccion: () => void;
  onAbrir: (comprobante: Comprobante) => void;
  onDescargar: (comprobante: Comprobante, tipo: TipoDescarga) => void;
  onConsultarCdr: (comprobante: Comprobante) => void;
  onExportarExcel: () => void;
  onLote: () => void;
  onLimpiarFiltros: () => void;
  generandoLote: boolean;
}

const TAMANOS_PAGINA = [25, 50, 100] as const;

function importeFirmado(c: Comprobante): number {
  return c.tipo === "Nota de Crédito" ? -c.total : c.total;
}

const TH = "px-3 py-2.5 text-left text-[11.5px] font-medium tracking-wide text-fg-3 uppercase";

function MenuFila({
  comprobante,
  puedeOperar,
  consultando,
  onAbrir,
  onDescargar,
  onConsultarCdr,
}: {
  comprobante: Comprobante;
  puedeOperar: boolean;
  consultando: boolean;
  onAbrir: Props["onAbrir"];
  onDescargar: Props["onDescargar"];
  onConsultarCdr: Props["onConsultarCdr"];
}) {
  const esBoleta = comprobante.codigoTipo === "03";
  return (
    <Menu
      disparador={(props) => (
        <Boton
          variante="fantasma"
          tamano="sm"
          icono={MoreHorizontal}
          etiqueta={`Más acciones de ${comprobante.numero}`}
          {...props}
        />
      )}
    >
      <ItemMenu icono={Eye} onClick={() => onAbrir(comprobante)}>
        Ver detalle
      </ItemMenu>
      <SeparadorMenu />
      <ItemMenu
        icono={FileCode2}
        deshabilitado={!comprobante.tieneXml}
        ayuda={comprobante.tieneXml ? undefined : "No archivado"}
        onClick={() => onDescargar(comprobante, "xml")}
      >
        Descargar XML
      </ItemMenu>
      <ItemMenu
        icono={ShieldCheck}
        deshabilitado={!comprobante.tieneCdr}
        ayuda={comprobante.tieneCdr ? undefined : "No archivado"}
        onClick={() => onDescargar(comprobante, "cdr")}
      >
        Descargar CDR
      </ItemMenu>
      {comprobante.origen === "recibido" && (
        <ItemMenu
          icono={FileText}
          deshabilitado={!comprobante.tienePdf}
          ayuda={comprobante.tienePdf ? undefined : "No archivado"}
          onClick={() => onDescargar(comprobante, "pdf")}
        >
          Descargar PDF
        </ItemMenu>
      )}
      {puedeOperar && comprobante.origen === "emitido" && (
        <>
          <SeparadorMenu />
          <ItemMenu
            icono={FileSearch}
            deshabilitado={consultando || esBoleta}
            ayuda={esBoleta ? "No aplica a boletas" : undefined}
            onClick={() => onConsultarCdr(comprobante)}
          >
            Consultar CDR en SUNAT
          </ItemMenu>
        </>
      )}
    </Menu>
  );
}

function Respaldos({ c }: { c: Comprobante }) {
  return (
    <span className="inline-flex items-center gap-1">
      <ChipRespaldo nombre="XML" presente={c.tieneXml} />
      <ChipRespaldo nombre="CDR" presente={c.tieneCdr} />
      {c.origen === "recibido" && <ChipRespaldo nombre="PDF" presente={c.tienePdf} />}
    </span>
  );
}

export function TablaComprobantes({
  comprobantes,
  contraparte,
  total,
  pagina,
  tamano,
  hayMas,
  orden,
  cargando,
  actualizando,
  hayFiltros,
  seleccionados,
  consultando,
  puedeOperar,
  onOrden,
  onPagina,
  onTamano,
  onAlternar,
  onAlternarVisibles,
  onLimpiarSeleccion,
  onAbrir,
  onDescargar,
  onConsultarCdr,
  onExportarExcel,
  onLote,
  onLimpiarFiltros,
  generandoLote,
}: Props) {
  // El servidor ya filtró, ordenó y paginó: aquí solo se pinta la página recibida.
  const visibles = comprobantes;
  const marcadosEnPagina = visibles.filter((c) => seleccionados.has(c.id)).length;
  const todosMarcados = visibles.length > 0 && marcadosEnPagina === visibles.length;

  const paginas = total === null ? null : Math.max(1, Math.ceil(total / tamano));
  const ultima = paginas === null ? pagina : paginas - 1;
  const hayAnterior = pagina > 0;
  const haySiguiente = paginas === null ? hayMas : pagina < paginas - 1;
  const desde = visibles.length === 0 ? 0 : pagina * tamano + 1;
  const hasta = pagina * tamano + visibles.length;

  return (
    <section
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
      aria-busy={actualizando || undefined}
    >
      {/* Barra de selección */}
      {seleccionados.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-accent-line bg-accent-soft px-4 py-2.5">
          <p className="text-[13px] font-medium text-accent" aria-live="polite">
            {formatearEntero(seleccionados.size)} seleccionado{seleccionados.size === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Boton tamano="sm" icono={Download} onClick={onExportarExcel}>
              Exportar Excel
            </Boton>
            <Boton tamano="sm" icono={FileArchive} onClick={onLote} cargando={generandoLote}>
              Lote de respaldo (ZIP)
            </Boton>
          </div>
          <Boton
            variante="fantasma"
            tamano="sm"
            icono={X}
            onClick={onLimpiarSeleccion}
            className="ml-auto"
          >
            Quitar selección
          </Boton>
        </div>
      )}

      {/* Tabla (≥ md) */}
      <div className="hidden max-h-[calc(100dvh-300px)] min-h-[320px] overflow-auto md:block">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-surface-2 shadow-[0_1px_0_var(--line)]">
            <tr>
              <th scope="col" className="w-10 py-2.5 pr-0 pl-4">
                <Casilla
                  checked={todosMarcados}
                  indeterminada={marcadosEnPagina > 0 && !todosMarcados}
                  disabled={cargando || visibles.length === 0}
                  onChange={() => onAlternarVisibles(visibles, !todosMarcados)}
                  etiqueta="Seleccionar los comprobantes de esta página"
                />
              </th>
              <EncabezadoOrden etiqueta="Documento" campo="numero" orden={orden} onOrden={onOrden} />
              <EncabezadoOrden etiqueta={contraparte} campo="cliente" orden={orden} onOrden={onOrden} />
              <EncabezadoOrden etiqueta="Emisión" campo="fecha" orden={orden} onOrden={onOrden} />
              <th scope="col" className={TH}>
                Vencimiento
              </th>
              <EncabezadoOrden
                etiqueta="Importe total"
                nota="con IGV"
                campo="importe"
                orden={orden}
                onOrden={onOrden}
                alinear="derecha"
              />
              <th scope="col" className={TH}>
                Estado SUNAT
              </th>
              <th scope="col" className={TH}>
                Respaldo
              </th>
              <th scope="col" className={cn(TH, "hidden lg:table-cell")}>
                N° de SAP
              </th>
              <th scope="col" className="w-[84px] px-3 py-2.5">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody
            className={cn("divide-y divide-line transition-opacity", actualizando && "opacity-55")}
          >
            {cargando &&
              Array.from({ length: 8 }, (_, i) => (
                <tr key={`e${i}`}>
                  <td colSpan={10} className="px-4 py-3.5">
                    <Esqueleto className="h-5 w-full" />
                  </td>
                </tr>
              ))}
            {!cargando &&
              visibles.map((c) => {
                const marcado = seleccionados.has(c.id);
                const negativo = c.tipo === "Nota de Crédito";
                return (
                  <tr
                    key={c.id}
                    onClick={(evento) => {
                      if ((evento.target as HTMLElement).closest("button, input, a, label")) return;
                      onAbrir(c);
                    }}
                    className={cn(
                      "group cursor-pointer transition-colors hover:bg-surface-2",
                      marcado && "bg-accent-soft/60 hover:bg-accent-soft",
                    )}
                  >
                    <td className="py-2.5 pr-0 pl-4">
                      <Casilla
                        checked={marcado}
                        onChange={() => onAlternar(c)}
                        etiqueta={`Seleccionar ${c.numero}`}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-[12.5px] font-medium tracking-tight text-fg">
                        {c.numero}
                      </p>
                      <p className="text-[12px] text-fg-3">{c.tipo}</p>
                    </td>
                    <td className="max-w-[300px] px-3 py-2.5">
                      <p className="truncate text-[13px] text-fg" title={c.cliente.razonSocial}>
                        {c.cliente.razonSocial}
                      </p>
                      <p className="font-mono text-[11.5px] text-fg-3">
                        {c.cliente.ruc || "Sin documento"}
                        {c.cliente.docEtiqueta && (
                          <span className="ml-1.5 font-sans text-fg-4">· {c.cliente.docEtiqueta}</span>
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <p className="tnum text-[13px] text-fg">{formatearFecha(c.fechaEmision)}</p>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {c.fechaVencimiento ? (
                        <p className="tnum text-[13px] text-fg">{formatearFecha(c.fechaVencimiento)}</p>
                      ) : (
                        <p className="text-[13px] text-fg-4">—</p>
                      )}
                      {c.formaPago && <p className="text-[12px] text-fg-3">{c.formaPago}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <p
                        className={cn(
                          "tnum text-[13px] font-medium",
                          negativo ? "text-bad" : "text-fg",
                          c.estadoSunat === "Anulado" && "text-fg-4 line-through",
                        )}
                      >
                        {formatearMoneda(importeFirmado(c), c.moneda)}
                      </p>
                      {c.moneda === "USD" && <p className="text-[11px] text-fg-4">Dólares</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <EstadoPill estado={c.estadoSunat} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Respaldos c={c} />
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      <span className="font-mono text-[12px] text-fg-3">{c.numeroSap || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <MenuFila
                          comprobante={c}
                          puedeOperar={puedeOperar}
                          consultando={consultando.has(c.id)}
                          onAbrir={onAbrir}
                          onDescargar={onDescargar}
                          onConsultarCdr={onConsultarCdr}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {!cargando && comprobantes.length === 0 && (
          <EstadoVacio
            icono={hayFiltros ? SearchX : FileText}
            titulo={hayFiltros ? "Ningún comprobante coincide" : "Aún no hay comprobantes"}
            descripcion={
              hayFiltros
                ? "Prueba con otros criterios o quita algunos filtros."
                : "Sincroniza un periodo desde SIRE o importa los XML de tus comprobantes."
            }
            accion={
              hayFiltros ? (
                <Boton onClick={onLimpiarFiltros}>Limpiar filtros</Boton>
              ) : undefined
            }
          />
        )}
      </div>

      {/* Tarjetas (< md) */}
      <ul className="divide-y divide-line md:hidden">
        {cargando &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="p-4">
              <Esqueleto className="h-14 w-full" />
            </li>
          ))}
        {!cargando &&
          visibles.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onAbrir(c)}
                className="flex w-full flex-col gap-2 p-4 text-left active:bg-surface-2"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-mono text-[13px] font-medium text-fg">{c.numero}</span>
                    <span className="block truncate text-[12.5px] text-fg-3">
                      {c.cliente.razonSocial}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-[13px] font-medium text-fg">
                    {formatearMoneda(importeFirmado(c), c.moneda)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <EstadoPill estado={c.estadoSunat} />
                  <Respaldos c={c} />
                  <span className="tnum ml-auto text-right text-[12px] text-fg-3">
                    Emisión {formatearFecha(c.fechaEmision)}
                    {c.fechaVencimiento && <> · Vence {formatearFecha(c.fechaVencimiento)}</>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        {!cargando && comprobantes.length === 0 && (
          <li>
            <EstadoVacio
              icono={SearchX}
              titulo={hayFiltros ? "Ningún comprobante coincide" : "Aún no hay comprobantes"}
            />
          </li>
        )}
      </ul>

      {/* Paginación */}
      {(comprobantes.length > 0 || pagina > 0) && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-4 py-2.5">
          <p className="tnum text-[12.5px] text-fg-3" aria-live="polite">
            {formatearEntero(desde)}–{formatearEntero(hasta)}
            {total !== null && <> de {formatearEntero(total)}</>}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[12.5px] text-fg-3">
              Filas
              <div className="w-[76px]">
                <Seleccion
                  aria-label="Filas por página"
                  value={tamano}
                  onChange={(e) => onTamano(Number(e.target.value))}
                  className="h-8 text-[12.5px]"
                >
                  {TAMANOS_PAGINA.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Seleccion>
              </div>
            </label>
            <nav className="flex items-center gap-1" aria-label="Paginación">
              <Boton
                variante="secundario"
                tamano="sm"
                icono={ChevronsLeft}
                etiqueta="Primera página"
                disabled={!hayAnterior}
                onClick={() => onPagina(0)}
              />
              <Boton
                variante="secundario"
                tamano="sm"
                icono={ChevronLeft}
                etiqueta="Página anterior"
                disabled={!hayAnterior}
                onClick={() => onPagina(pagina - 1)}
              />
              <span className="tnum min-w-[72px] text-center text-[12.5px] text-fg-2">
                {formatearEntero(pagina + 1)}
                {paginas !== null && <> / {formatearEntero(paginas)}</>}
              </span>
              <Boton
                variante="secundario"
                tamano="sm"
                icono={ChevronRight}
                etiqueta="Página siguiente"
                disabled={!haySiguiente}
                onClick={() => onPagina(pagina + 1)}
              />
              <Boton
                variante="secundario"
                tamano="sm"
                icono={ChevronsRight}
                etiqueta="Última página"
                disabled={paginas === null || pagina >= ultima}
                onClick={() => onPagina(ultima)}
              />
            </nav>
          </div>
        </footer>
      )}
    </section>
  );
}


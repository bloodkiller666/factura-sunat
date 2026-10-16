"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
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
import { ChipRespaldo, EstadoPill } from "@/components/ui/etiqueta";
import { ItemMenu, Menu, SeparadorMenu } from "@/components/ui/menu";
import { Esqueleto, EstadoVacio } from "@/components/ui/varios";
import {
  ORDEN_INICIAL,
  checkVigente,
  ordenar,
  type CampoOrden,
  type Orden,
} from "@/lib/filtros";
import { formatearEntero, formatearFecha, formatearMoneda } from "@/lib/format";
import type { Comprobante } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TipoDescarga = "pdf" | "xml" | "cdr";

interface Props {
  comprobantes: Comprobante[];
  cargando: boolean;
  hayFiltros: boolean;
  seleccionados: Set<string>;
  checksPendientes: Record<string, boolean>;
  descargando: Set<string>;
  consultando: Set<string>;
  puedeOperar: boolean;
  onAlternar: (id: string) => void;
  onAlternarVisibles: (ids: string[], marcar: boolean) => void;
  onLimpiarSeleccion: () => void;
  onAbrir: (comprobante: Comprobante) => void;
  onDescargar: (comprobante: Comprobante, tipo: TipoDescarga) => void;
  onConsultarCdr: (comprobante: Comprobante) => void;
  onCheckSap: (id: string) => void;
  onExportarExcel: () => void;
  onLote: () => void;
  onLimpiarFiltros: () => void;
  generandoLote: boolean;
}

const TAMANOS_PAGINA = [25, 50, 100] as const;

function importeFirmado(c: Comprobante): number {
  return c.tipo === "Nota de Crédito" ? -c.total : c.total;
}

function EncabezadoOrden({
  etiqueta,
  campo,
  orden,
  onOrden,
  alinear = "izquierda",
  className,
}: {
  etiqueta: string;
  campo: CampoOrden;
  orden: Orden;
  onOrden: (campo: CampoOrden) => void;
  alinear?: "izquierda" | "derecha";
  className?: string;
}) {
  const activo = orden.campo === campo;
  const Flecha = orden.direccion === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={activo ? (orden.direccion === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-2.5 font-medium", alinear === "derecha" && "text-right", className)}
    >
      <button
        type="button"
        onClick={() => onOrden(campo)}
        className={cn(
          "inline-flex items-center gap-1 rounded text-[11.5px] font-medium tracking-wide uppercase transition-colors hover:text-fg",
          activo ? "text-fg" : "text-fg-3",
          alinear === "derecha" && "flex-row-reverse",
        )}
      >
        {etiqueta}
        <Flecha
          className={cn("h-3 w-3 transition-opacity", activo ? "opacity-100" : "opacity-0")}
          aria-hidden
        />
      </button>
    </th>
  );
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
      <ItemMenu icono={FileText} onClick={() => onDescargar(comprobante, "pdf")}>
        Descargar PDF
      </ItemMenu>
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
      <ChipRespaldo nombre="PDF" presente={c.tienePdf} />
    </span>
  );
}

export function TablaComprobantes({
  comprobantes,
  cargando,
  hayFiltros,
  seleccionados,
  checksPendientes,
  descargando,
  consultando,
  puedeOperar,
  onAlternar,
  onAlternarVisibles,
  onLimpiarSeleccion,
  onAbrir,
  onDescargar,
  onConsultarCdr,
  onCheckSap,
  onExportarExcel,
  onLote,
  onLimpiarFiltros,
  generandoLote,
}: Props) {
  const [orden, setOrden] = useState<Orden>(ORDEN_INICIAL);
  const [tamano, setTamano] = useState<number>(50);
  const [pagina, setPagina] = useState(0);
  const [referencia, setReferencia] = useState(comprobantes);

  // Si cambia el conjunto (filtros, periodo, recarga) se vuelve a la primera página.
  if (referencia !== comprobantes) {
    setReferencia(comprobantes);
    setPagina(0);
  }

  const ordenados = useMemo(() => ordenar(comprobantes, orden), [comprobantes, orden]);
  const paginas = Math.max(1, Math.ceil(ordenados.length / tamano));
  const actual = Math.min(pagina, paginas - 1);
  const visibles = ordenados.slice(actual * tamano, (actual + 1) * tamano);
  const idsVisibles = visibles.map((c) => c.id);

  const marcadosEnPagina = idsVisibles.filter((id) => seleccionados.has(id)).length;
  const todosMarcados = idsVisibles.length > 0 && marcadosEnPagina === idsVisibles.length;

  const alOrdenar = (campo: CampoOrden) =>
    setOrden((previo) =>
      previo.campo === campo
        ? { campo, direccion: previo.direccion === "asc" ? "desc" : "asc" }
        : { campo, direccion: campo === "fecha" || campo === "importe" ? "desc" : "asc" },
    );

  const desde = ordenados.length === 0 ? 0 : actual * tamano + 1;
  const hasta = Math.min((actual + 1) * tamano, ordenados.length);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
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
                  disabled={cargando || idsVisibles.length === 0}
                  onChange={() => onAlternarVisibles(idsVisibles, !todosMarcados)}
                  etiqueta="Seleccionar los comprobantes de esta página"
                />
              </th>
              <EncabezadoOrden etiqueta="Documento" campo="numero" orden={orden} onOrden={alOrdenar} />
              <EncabezadoOrden etiqueta="Cliente" campo="cliente" orden={orden} onOrden={alOrdenar} />
              <EncabezadoOrden etiqueta="Emisión" campo="fecha" orden={orden} onOrden={alOrdenar} />
              <EncabezadoOrden
                etiqueta="Importe"
                campo="importe"
                orden={orden}
                onOrden={alOrdenar}
                alinear="derecha"
              />
              <th scope="col" className={TH}>
                Estado
              </th>
              <th scope="col" className={TH}>
                Respaldo
              </th>
              <th scope="col" className={cn(TH, "hidden xl:table-cell")}>
                SAP
              </th>
              <th scope="col" className="w-[84px] px-3 py-2.5">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cargando &&
              Array.from({ length: 8 }, (_, i) => (
                <tr key={`e${i}`}>
                  <td colSpan={9} className="px-4 py-3.5">
                    <Esqueleto className="h-5 w-full" />
                  </td>
                </tr>
              ))}
            {!cargando &&
              visibles.map((c) => {
                const marcado = seleccionados.has(c.id);
                const checkSap = checkVigente(c, checksPendientes);
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
                        onChange={() => onAlternar(c.id)}
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
                      </p>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <p className="tnum text-[13px] text-fg">{formatearFecha(c.fechaEmision)}</p>
                      <p className="tnum text-[12px] text-fg-3">
                        {c.fechaVencimiento ? `Vence ${formatearFecha(c.fechaVencimiento)}` : c.formaPago ?? ""}
                      </p>
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
                    <td className="hidden px-3 py-2.5 xl:table-cell">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <Casilla
                          checked={checkSap}
                          onChange={() => onCheckSap(c.id)}
                          etiqueta={`Marcar Check SAP de ${c.numero}`}
                          disabled={!puedeOperar}
                        />
                        <span className="font-mono text-[12px] text-fg-3">
                          {c.numeroSap || (checkSap ? "Verificado" : "—")}
                        </span>
                      </label>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <Boton
                          variante="fantasma"
                          tamano="sm"
                          icono={descargando.has(`${c.id}:pdf`) ? undefined : FileText}
                          cargando={descargando.has(`${c.id}:pdf`)}
                          etiqueta={`Descargar PDF de ${c.numero}`}
                          onClick={() => onDescargar(c, "pdf")}
                        />
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
                  <span className="tnum ml-auto text-[12px] text-fg-3">
                    {formatearFecha(c.fechaEmision)}
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
      {comprobantes.length > 0 && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-4 py-2.5">
          <p className="tnum text-[12.5px] text-fg-3">
            {formatearEntero(desde)}–{formatearEntero(hasta)} de {formatearEntero(ordenados.length)}
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12.5px] text-fg-3">
              Filas
              <div className="w-[76px]">
                <Seleccion
                  aria-label="Filas por página"
                  value={tamano}
                  onChange={(e) => {
                    setTamano(Number(e.target.value));
                    setPagina(0);
                  }}
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
            <div className="flex items-center gap-1">
              <Boton
                variante="secundario"
                tamano="sm"
                icono={ChevronLeft}
                etiqueta="Página anterior"
                disabled={actual === 0}
                onClick={() => setPagina(actual - 1)}
              />
              <span className="tnum min-w-[64px] text-center text-[12.5px] text-fg-2">
                {actual + 1} / {paginas}
              </span>
              <Boton
                variante="secundario"
                tamano="sm"
                icono={ChevronRight}
                etiqueta="Página siguiente"
                disabled={actual >= paginas - 1}
                onClick={() => setPagina(actual + 1)}
              />
            </div>
          </div>
        </footer>
      )}
    </section>
  );
}


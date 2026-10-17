"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  FileArchive,
  FileSearch,
  Loader2,
  Menu as IconoMenu,
  RefreshCw,
  Upload,
} from "lucide-react";
import { ContenidoLateral, PanelLateralMovil, type Vista } from "@/components/portal/barra-lateral";
import { BarraFiltros } from "@/components/portal/barra-filtros";
import { DetalleComprobante } from "@/components/portal/detalle-comprobante";
import { DialogoImportar, type PestanaImportar } from "@/components/portal/dialogo-importar";
import { DialogoSire } from "@/components/portal/dialogo-sire";
import { Indicadores } from "@/components/portal/indicadores";
import { Marca } from "@/components/portal/marca";
import { TablaComprobantes } from "@/components/portal/tabla-comprobantes";
import { usePortal } from "@/components/portal/use-portal";
import { VistaEvidencias } from "@/components/portal/vista-evidencias";
import { Boton } from "@/components/ui/boton";
import { Etiqueta } from "@/components/ui/etiqueta";
import { ItemMenu, Menu, SeparadorMenu } from "@/components/ui/menu";
import { formatearEntero } from "@/lib/format";
import { checkVigente } from "@/lib/filtros";

interface Props {
  token: string;
  email: string | null;
  onSalir: () => void;
}

export function Portal({ token, email, onSalir }: Props) {
  const p = usePortal(token);
  const [vista, setVista] = useState<Vista>("comprobantes");
  const [menuMovil, setMenuMovil] = useState(false);
  const [sireAbierto, setSireAbierto] = useState(false);
  const [importar, setImportar] = useState<{ abierto: boolean; pestana: PestanaImportar }>({
    abierto: false,
    pestana: "comprobantes",
  });

  const abrirImportar = (pestana: PestanaImportar = "comprobantes") =>
    setImportar({ abierto: true, pestana });

  // Las evidencias se cargan al entrar a su vista (y al cambiar de empresa).
  const rucActivo = p.empresa?.ruc ?? null;
  useEffect(() => {
    if (vista === "evidencias" && rucActivo) void p.cargarEvidencias();
    // `cargarEvidencias` cambia con el token; basta con vista y empresa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, rucActivo]);

  const detalleCheck = p.detalle ? checkVigente(p.detalle, p.checksPendientes) : false;
  // Lo que exportan «Reporte Excel» y «Lote»: la selección o, sin ella, todo lo filtrado.
  const cuentaExportable =
    p.seleccion.length > 0
      ? formatearEntero(p.seleccion.length)
      : p.total === null
        ? undefined
        : formatearEntero(p.total);

  const lateral = (alElegir?: () => void) => (
    <ContenidoLateral
      empresas={p.empresas}
      empresaActiva={p.empresa}
      cargandoEmpresas={p.cargandoEmpresas}
      onCambiarEmpresa={p.cambiarEmpresa}
      vista={vista}
      onVista={setVista}
      puedeOperar={p.puedeOperar}
      onSire={() => setSireAbierto(true)}
      onImportar={() => abrirImportar()}
      email={email}
      onSalir={onSalir}
      alElegir={alElegir}
    />
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh lg:block">{lateral()}</aside>
      <PanelLateralMovil abierto={menuMovil} onCerrar={() => setMenuMovil(false)}>
        {lateral(() => setMenuMovil(false))}
      </PanelLateralMovil>

      <div className="min-w-0">
        {/* Barra superior en móvil */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-side-line bg-side px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuMovil(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-side-fg hover:bg-side-2"
          >
            <IconoMenu className="h-5 w-5" aria-hidden />
          </button>
          <Marca />
        </header>

        <main className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {vista === "comprobantes" ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-fg">
                    Comprobantes
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-3">
                    <span className="truncate">{p.empresa?.razonSocial ?? "Cargando empresa…"}</span>
                    {p.empresa && !p.puedeOperar && <Etiqueta>Solo lectura</Etiqueta>}
                    {p.actualizando && (
                      <span
                        role="status"
                        className="inline-flex items-center gap-1.5 text-[12px] text-fg-4"
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-[giro_0.8s_linear_infinite]" aria-hidden />
                        Actualizando…
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {p.puedeOperar && (
                    <Boton
                      icono={FileSearch}
                      cargando={p.sincronizando}
                      onClick={() => void p.sincronizarPendientes()}
                    >
                      Consultar pendientes
                    </Boton>
                  )}
                  <Menu
                    ancho={252}
                    disparador={(props) => (
                      <Boton icono={Download} {...props}>
                        Exportar
                        <ChevronDown className="h-3.5 w-3.5 text-fg-4" aria-hidden />
                      </Boton>
                    )}
                  >
                    <ItemMenu
                      icono={Download}
                      deshabilitado={p.exportando}
                      onClick={() => void p.exportarExcel()}
                      ayuda={cuentaExportable}
                    >
                      Reporte Excel
                    </ItemMenu>
                    <ItemMenu
                      icono={FileArchive}
                      onClick={() => void p.generarLote()}
                      ayuda={cuentaExportable}
                    >
                      Lote de respaldo (ZIP)
                    </ItemMenu>
                    <SeparadorMenu />
                    <p className="px-2.5 py-1.5 text-[11.5px] leading-4 text-fg-4">
                      Exporta la selección o, si no hay, todo lo filtrado. El lote incluye los XML,
                      CDR y PDF reales con su huella SHA-256.
                    </p>
                  </Menu>
                  {p.puedeOperar && (
                    <Boton icono={Upload} onClick={() => abrirImportar()}>
                      Importar
                    </Boton>
                  )}
                  {p.puedeOperar && (
                    <Boton variante="primario" icono={RefreshCw} onClick={() => setSireAbierto(true)}>
                      Sincronizar SIRE
                    </Boton>
                  )}
                </div>
              </div>

              {(p.errorEmpresas || p.errorCarga || p.errorResumen) && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-[13px] text-warn"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{p.errorEmpresas ?? p.errorCarga ?? p.errorResumen}</span>
                  {(p.errorCarga || p.errorResumen) && (
                    <Boton tamano="sm" onClick={p.recargar}>
                      Reintentar
                    </Boton>
                  )}
                </div>
              )}

              <Indicadores
                metricas={p.metricas}
                actualizando={p.actualizandoResumen}
                cargando={false}
                onFiltrarEstado={p.filtrarPorEstado}
                onFiltrarRespaldo={p.filtrarPorRespaldo}
              />

              <BarraFiltros
                filtros={p.filtros}
                onCambiar={p.cambiarFiltros}
                onLimpiar={p.limpiarFiltros}
              />

              <TablaComprobantes
                comprobantes={p.comprobantes}
                total={p.total}
                pagina={p.pagina}
                tamano={p.tamano}
                hayMas={p.hayMas}
                orden={p.orden}
                cargando={p.cargando}
                actualizando={p.actualizando}
                hayFiltros={p.hayFiltros}
                seleccionados={p.seleccionados}
                checksPendientes={p.checksPendientes}
                descargando={p.descargando}
                consultando={p.consultando}
                puedeOperar={p.puedeOperar}
                onOrden={p.ordenarPor}
                onPagina={p.irAPagina}
                onTamano={p.cambiarTamano}
                onAlternar={p.alternarSeleccion}
                onAlternarVisibles={p.seleccionarVisibles}
                onLimpiarSeleccion={p.limpiarSeleccion}
                onAbrir={(c) => void p.abrirDetalle(c)}
                onDescargar={(c, tipo) => void p.descargar(c, tipo)}
                onConsultarCdr={(c) => void p.consultarCdr(c)}
                onCheckSap={(id) => void p.alternarCheckSap(id)}
                onExportarExcel={() => void p.exportarExcel()}
                onLote={() => void p.generarLote()}
                onLimpiarFiltros={p.limpiarFiltros}
                generandoLote={p.generandoLote}
              />

            </>
          ) : (
            <>
              <div>
                <h1 className="text-[22px] leading-7 font-semibold tracking-tight text-fg">
                  Evidencias SIRE
                </h1>
                <p className="mt-1 text-[13px] text-fg-3">
                  Archivos originales de SUNAT guardados en cada sincronización.
                </p>
              </div>
              <VistaEvidencias
                evidencias={p.evidencias}
                error={p.errorEvidencias}
                descargando={p.descargando}
                puedeOperar={p.puedeOperar}
                onDescargar={(a) => void p.descargarEvidencia(a)}
                onSire={() => setSireAbierto(true)}
                onReintentar={() => void p.cargarEvidencias()}
              />
            </>
          )}
        </main>
      </div>

      <DetalleComprobante
        comprobante={p.detalle}
        empresa={p.empresa}
        cargandoDetalle={p.cargandoDetalle}
        puedeOperar={p.puedeOperar}
        checkSap={detalleCheck}
        descargando={p.descargando}
        consultando={p.detalle ? p.consultando.has(p.detalle.id) : false}
        onCerrar={p.cerrarDetalle}
        onDescargar={(c, tipo) => void p.descargar(c, tipo)}
        onConsultarCdr={(c) => void p.consultarCdr(c)}
        onCheckSap={(id) => void p.alternarCheckSap(id)}
        onImportarXml={(archivo) => void p.importarXmlDeComprobante(archivo)}
        onAbrirImportarCdr={() => {
          p.cerrarDetalle();
          abrirImportar("cdr");
        }}
        cargarArchivos={p.cargarArchivos}
        cargarPdf={p.cargarPdf}
      />

      <DialogoSire
        abierto={sireAbierto}
        token={token}
        ruc={rucActivo}
        onCerrar={() => setSireAbierto(false)}
        onTerminado={(nuevos) => {
          if (nuevos > 0) p.recargar();
          if (vista === "evidencias") void p.cargarEvidencias();
        }}
      />

      <DialogoImportar
        abierto={importar.abierto}
        pestana={importar.pestana}
        onPestana={(pestana) => setImportar((previo) => ({ ...previo, pestana }))}
        token={token}
        ruc={rucActivo}
        puedeOperar={p.puedeOperar}
        onCerrar={() => setImportar((previo) => ({ ...previo, abierto: false }))}
        onImportado={() => p.recargar()}
      />
    </div>
  );
}

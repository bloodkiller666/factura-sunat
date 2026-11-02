"use client";

import { useEffect, useState } from "react";
import { Menu as IconoMenu } from "lucide-react";
import { ContenidoLateral, PanelLateralMovil, type Seccion } from "@/components/portal/barra-lateral";
import { DialogosPortal, type EstadoImportar } from "@/components/portal/dialogos-portal";
import type { PestanaImportar } from "@/components/portal/dialogo-importar";
import { EncabezadoVista } from "@/components/portal/encabezado-vista";
import { Marca } from "@/components/portal/marca";
import { usePortal } from "@/components/portal/use-portal";
import { VistaComprobantes } from "@/components/portal/vista-comprobantes";
import { VistaEvidencias } from "@/components/portal/vista-evidencias";
import { VistaLogs } from "@/components/portal/vista-logs";
import { cn } from "@/lib/utils";

interface Props {
  token: string;
  email: string | null;
  onSalir: () => void;
}

type VistaActiva = "comprobantes" | "evidencias" | "logs";

export function Portal({ token, email, onSalir }: Props) {
  const p = usePortal(token);
  const [vista, setVista] = useState<VistaActiva>("comprobantes");
  const [menuMovil, setMenuMovil] = useState(false);
  // Menú lateral contraído (solo iconos). Se recuerda entre visitas.
  const [colapsado, setColapsado] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- se lee del navegador tras montar (evita desajuste de hidratación)
      if (window.localStorage.getItem("tdm-menu") === "contraido") setColapsado(true);
    } catch {}
  }, []);
  const alternarMenu = () =>
    setColapsado((actual) => {
      try {
        window.localStorage.setItem("tdm-menu", actual ? "abierto" : "contraido");
      } catch {}
      return !actual;
    });
  const [sireAbierto, setSireAbierto] = useState(false);
  const [respaldosAbierto, setRespaldosAbierto] = useState(false);
  const [sapAbierto, setSapAbierto] = useState(false);
  const [importar, setImportar] = useState<EstadoImportar>({
    abierto: false,
    pestana: "comprobantes",
  });

  const abrirImportar = (pestana: PestanaImportar = "comprobantes") =>
    setImportar({ abierto: true, pestana });

  // Las evidencias se cargan al entrar a su vista (y al cambiar de empresa).
  const rucActivo = p.empresa?.ruc ?? null;
  const compras = p.filtros.origen === "recibido";
  useEffect(() => {
    if (vista === "evidencias" && rucActivo) void p.cargarEvidencias();
    // `cargarEvidencias` cambia con el token; basta con vista y empresa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, rucActivo]);

  const seccion: Seccion =
    vista === "evidencias" ? "evidencias" : vista === "logs" ? "logs" : compras ? "compras" : "ventas";
  const irASeccion = (destino: Seccion) => {
    if (destino === "evidencias") return setVista("evidencias");
    if (destino === "logs") return setVista("logs");
    setVista("comprobantes");
    p.cambiarOrigen(destino === "compras" ? "recibido" : "emitido");
  };

  const lateral = (alElegir?: () => void, escritorio = false) => (
    <ContenidoLateral
      empresas={p.empresas}
      empresaActiva={p.empresa}
      cargandoEmpresas={p.cargandoEmpresas}
      onCambiarEmpresa={p.cambiarEmpresa}
      seccion={seccion}
      onSeccion={irASeccion}
      email={email}
      onSalir={onSalir}
      alElegir={alElegir}
      colapsado={escritorio && colapsado}
      onColapsar={escritorio ? alternarMenu : undefined}
    />
  );

  return (
    <div
      className={cn(
        "min-h-dvh transition-[grid-template-columns] duration-200 lg:grid",
        colapsado ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]",
      )}
    >
      <aside className="sticky top-0 hidden h-dvh lg:block">{lateral(undefined, true)}</aside>
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

        <main className="mx-auto w-full max-w-[1480px] space-y-6 px-4 py-6 sm:px-6 lg:px-6 lg:py-9 2xl:px-10">
          {vista === "comprobantes" && (
            <VistaComprobantes
              p={p}
              compras={compras}
              onRespaldos={() => setRespaldosAbierto(true)}
              onImportar={() => abrirImportar()}
              onSap={() => setSapAbierto(true)}
              onSire={() => setSireAbierto(true)}
            />
          )}
          {vista === "logs" && (
            <>
              <EncabezadoVista titulo="Logs">
                Corridas de la automatización: SIRE, correo de proveedores e importación.
              </EncabezadoVista>
              <VistaLogs key={rucActivo} token={token} ruc={rucActivo} />
            </>
          )}
          {vista === "evidencias" && (
            <>
              <EncabezadoVista titulo="Evidencias SIRE">
                Archivos originales de SUNAT guardados en cada sincronización.
              </EncabezadoVista>
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

      <DialogosPortal
        p={p}
        token={token}
        ruc={rucActivo}
        compras={compras}
        enEvidencias={vista === "evidencias"}
        sireAbierto={sireAbierto}
        onSire={setSireAbierto}
        respaldosAbierto={respaldosAbierto}
        onRespaldos={setRespaldosAbierto}
        sapAbierto={sapAbierto}
        onSap={setSapAbierto}
        importar={importar}
        onImportar={setImportar}
        onAbrirImportar={abrirImportar}
      />
    </div>
  );
}

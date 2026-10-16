"use client";

import { useEffect, useRef } from "react";

import { Check, ChevronsUpDown, FileText, LogOut, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { Marca } from "@/components/portal/marca";
import { Menu, ItemMenu, TituloMenu } from "@/components/ui/menu";
import { BotonTema } from "@/components/ui/tema";
import { iniciales } from "@/lib/format";
import type { Empresa } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { IconoLucide } from "@/components/ui/boton";

export type Vista = "comprobantes" | "evidencias";

const ROLES: Record<Empresa["rol"], string> = {
  admin: "Administrador",
  emisor: "Emisor",
  lector: "Solo lectura",
};

interface Props {
  empresas: Empresa[];
  empresaActiva: Empresa | null;
  cargandoEmpresas: boolean;
  onCambiarEmpresa: (ruc: string) => void;
  vista: Vista;
  onVista: (vista: Vista) => void;
  puedeOperar: boolean;
  onSire: () => void;
  onImportar: () => void;
  email: string | null;
  onSalir: () => void;
  /** Se ejecuta tras elegir algo (cierra el panel en móvil). */
  alElegir?: () => void;
}

function Item({
  icono: Icono,
  etiqueta,
  activo,
  onClick,
  deshabilitado,
  nota,
}: {
  icono: IconoLucide;
  etiqueta: string;
  activo?: boolean;
  onClick: () => void;
  deshabilitado?: boolean;
  nota?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-current={activo ? "page" : undefined}
      title={nota}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors",
        activo
          ? "bg-side-2 text-side-fg shadow-[inset_2px_0_0_#F5B301]"
          : "text-side-fg-2 hover:bg-side-2/70 hover:text-side-fg",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      <Icono className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} aria-hidden />
      {etiqueta}
    </button>
  );
}

/** Contenido del panel lateral: se reutiliza en escritorio y en el menú móvil. */
export function ContenidoLateral({
  empresas,
  empresaActiva,
  cargandoEmpresas,
  onCambiarEmpresa,
  vista,
  onVista,
  puedeOperar,
  onSire,
  onImportar,
  email,
  onSalir,
  alElegir,
}: Props) {
  const elegir = (accion: () => void) => () => {
    accion();
    alElegir?.();
  };

  return (
    <div className="flex h-full flex-col bg-side text-side-fg">
      <div className="px-4 pt-5 pb-4">
        <Marca />
      </div>

      {/* Empresa activa */}
      <div className="px-3">
        {cargandoEmpresas || !empresaActiva ? (
          <div className="h-[58px] animate-pulse rounded-xl bg-side-2" />
        ) : (
          <Menu
            ancho={256}
            alinear="inicio"
            disparador={(props) => (
              <button
                type="button"
                {...props}
                disabled={empresas.length < 2}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-side-line bg-side-2 p-2.5 text-left transition-colors",
                  empresas.length > 1 && "hover:border-[#323a49]",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#232a36] text-[12px] font-semibold text-side-fg">
                  {iniciales(empresaActiva.nombreCorto)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-side-fg">
                    {empresaActiva.nombreCorto}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-side-fg-2">
                    RUC {empresaActiva.ruc}
                  </span>
                </span>
                {empresas.length > 1 && (
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-side-fg-2" aria-hidden />
                )}
              </button>
            )}
          >
            <TituloMenu>Cambiar de empresa</TituloMenu>
            {empresas.map((empresa) => (
              <ItemMenu
                key={empresa.ruc}
                onClick={() => {
                  onCambiarEmpresa(empresa.ruc);
                  alElegir?.();
                }}
                ayuda={empresa.ruc === empresaActiva.ruc ? undefined : ROLES[empresa.rol]}
                icono={empresa.ruc === empresaActiva.ruc ? Check : undefined}
              >
                {empresa.nombreCorto}
              </ItemMenu>
            ))}
          </Menu>
        )}
        {empresaActiva && (
          <p className="mt-2 px-1 text-[11px] text-side-fg-2">
            Tu rol: <span className="text-side-fg">{ROLES[empresaActiva.rol]}</span>
          </p>
        )}
      </div>

      <nav aria-label="Principal" className="mt-5 flex-1 space-y-0.5 overflow-y-auto px-3">
        <p className="px-3 pb-1.5 text-[11px] font-medium tracking-wider text-side-fg-2 uppercase">
          Gestión
        </p>
        <Item
          icono={FileText}
          etiqueta="Comprobantes"
          activo={vista === "comprobantes"}
          onClick={elegir(() => onVista("comprobantes"))}
        />
        <Item
          icono={ShieldCheck}
          etiqueta="Evidencias SIRE"
          activo={vista === "evidencias"}
          onClick={elegir(() => onVista("evidencias"))}
        />

        <p className="px-3 pt-5 pb-1.5 text-[11px] font-medium tracking-wider text-side-fg-2 uppercase">
          Acciones
        </p>
        <Item
          icono={RefreshCw}
          etiqueta="Sincronizar SIRE"
          onClick={elegir(onSire)}
          deshabilitado={!puedeOperar}
          nota={puedeOperar ? undefined : "Requiere rol de administrador o emisor"}
        />
        <Item
          icono={Upload}
          etiqueta="Importar archivos"
          onClick={elegir(onImportar)}
          deshabilitado={!puedeOperar}
          nota={puedeOperar ? undefined : "Requiere rol de administrador o emisor"}
        />
      </nav>

      <div className="border-t border-side-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg p-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#232a36] text-[12px] font-semibold uppercase">
            {(email ?? "?").charAt(0)}
          </span>
          <p className="min-w-0 flex-1 truncate text-[12px] text-side-fg-2" title={email ?? undefined}>
            {email ?? "—"}
          </p>
          <BotonTema sobreOscuro />
          <button
            type="button"
            onClick={onSalir}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-side-fg-2 transition-colors hover:bg-side-2 hover:text-side-fg"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Panel lateral deslizante para pantallas pequeñas (basado en <dialog> nativo). */
export function PanelLateralMovil({
  abierto,
  onCerrar,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-label="Menú principal"
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCerrar();
      }}
      className="panel-lateral m-0 h-dvh max-h-dvh w-[280px] max-w-[85vw] border-0 bg-transparent p-0 lg:hidden"
    >
      {abierto && children}
    </dialog>
  );
}

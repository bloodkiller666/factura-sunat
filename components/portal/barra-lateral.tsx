"use client";

import { useEffect, useRef } from "react";

import {
  Check,
  ChevronsUpDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  UserCog,
} from "lucide-react";
import { Marca } from "@/components/portal/marca";
import { Menu, ItemMenu, TituloMenu } from "@/components/ui/menu";
import { BotonTema } from "@/components/ui/tema";
import { iniciales } from "@/lib/format";
import { VENTAS_VISIBLES } from "@/lib/secciones";
import type { Empresa } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { IconoLucide } from "@/components/ui/boton";

/** Cada sección de la barra lateral es un destino propio: ventas, compras, evidencias o logs. */
export type Seccion = "ventas" | "compras" | "evidencias" | "logs";

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
  seccion: Seccion;
  onSeccion: (seccion: Seccion) => void;
  email: string | null;
  onSalir: () => void;
  /** Abre «Mi cuenta» (cambiar correo y/o contraseña). */
  onCuenta: () => void;
  /** Se ejecuta tras elegir algo (cierra el panel en móvil). */
  alElegir?: () => void;
  /** Solo escritorio: el menú se contrae a una columna de iconos. */
  colapsado?: boolean;
  onColapsar?: () => void;
}

/** Color de la pestaña de índice de cada sección, como las divisiones de un fichero. */
const COLOR_TAB: Record<Seccion, string> = {
  ventas: "text-tab-ventas",
  compras: "text-tab-compras",
  evidencias: "text-tab-evidencias",
  logs: "text-tab-logs",
};

function Item({
  icono: Icono,
  etiqueta,
  activo,
  onClick,
  deshabilitado,
  nota,
  tab,
  colapsado,
}: {
  icono: IconoLucide;
  etiqueta: string;
  activo?: boolean;
  onClick: () => void;
  deshabilitado?: boolean;
  nota?: string;
  tab: Seccion;
  colapsado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-current={activo ? "page" : undefined}
      title={colapsado ? etiqueta : nota}
      aria-label={colapsado ? etiqueta : undefined}
      // La pestaña activa se funde con el escritorio (mismo color y sin borde a la derecha):
      // así se ve como la división de un fichero que sale por encima del resto.
      className={cn(
        "group relative flex w-full items-center gap-3 py-2.5 pl-3 text-left text-[14px] font-medium transition-colors",
        colapsado && "justify-center pr-0 pl-0",
        activo
          ? cn("rounded-l-xl bg-bg font-semibold text-fg", !colapsado && "pr-6")
          : cn("rounded-lg text-side-fg-2 hover:bg-side-2 hover:text-side-fg", !colapsado && "pr-3"),
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      <Icono
        className={cn("h-[18px] w-[18px] shrink-0", COLOR_TAB[tab], !activo && "opacity-90")}
        strokeWidth={activo ? 2.1 : 1.75}
        aria-hidden
      />
      {!colapsado && etiqueta}
    </button>
  );
}

/** Contenido del panel lateral: se reutiliza en escritorio y en el menú móvil. */
export function ContenidoLateral({
  empresas,
  empresaActiva,
  cargandoEmpresas,
  onCambiarEmpresa,
  seccion,
  onSeccion,
  email,
  onSalir,
  onCuenta,
  alElegir,
  colapsado = false,
  onColapsar,
}: Props) {
  const elegir = (accion: () => void) => () => {
    accion();
    alElegir?.();
  };

  return (
    <div className="flex h-full flex-col bg-side text-side-fg">
      <div
        className={cn(
          "flex pt-5 pb-4",
          colapsado ? "flex-col items-center gap-3 px-2" : "items-center justify-between gap-2 px-4",
        )}
      >
        <Marca compacta={colapsado} />
        {onColapsar && (
          <button
            type="button"
            onClick={onColapsar}
            aria-label={colapsado ? "Traer el menú" : "Contraer el menú"}
            aria-expanded={!colapsado}
            title={colapsado ? "Traer el menú" : "Contraer el menú"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-side-fg-2 transition-colors hover:bg-side-2 hover:text-side-fg"
          >
            {colapsado ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            )}
          </button>
        )}
      </div>

      {/* Empresa activa */}
      <div className={colapsado ? "px-2" : "px-3"}>
        {cargandoEmpresas || !empresaActiva ? (
          <div className="h-[58px] animate-pulse rounded-xl bg-side-2" />
        ) : (
          <Menu
            ancho={240}
            alinear="inicio"
            disparador={(props) => (
              <button
                type="button"
                {...props}
                disabled={empresas.length < 2}
                className={cn(
                  cn(
                  "flex w-full items-center gap-3 rounded-lg border border-side-line bg-side-2 p-2.5 text-left transition-colors",
                  colapsado && "justify-center p-1.5",
                ),
                  empresas.length > 1 && "hover:border-side-fg-2/50",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-tab-compras text-[12px] font-bold text-[#0a1530]">
                  {iniciales(empresaActiva.nombreCorto)}
                </span>
                <span className={cn("min-w-0 flex-1", colapsado && "sr-only")}>
                  <span className="block truncate text-[13px] font-medium text-side-fg">
                    {empresaActiva.nombreCorto}
                  </span>
                  <span className="block truncate font-mono text-[12px] text-side-fg-2">
                    RUC {empresaActiva.ruc}
                  </span>
                </span>
                {empresas.length > 1 && !colapsado && (
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
        {empresaActiva && !colapsado && (
          <p className="mt-2 px-1 text-[12px] text-side-fg-2">
            Tu rol: <span className="text-side-fg">{ROLES[empresaActiva.rol]}</span>
          </p>
        )}
      </div>

      <nav aria-label="Principal" className={cn("mt-6 flex-1 space-y-1 overflow-y-auto", colapsado ? "pl-2" : "pl-3")}>
        {!colapsado && (
          <p className="rotulo px-3 pb-2 text-[12px] font-semibold text-side-fg-2">Comprobantes</p>
        )}
        {/* Ventas está oculta por ahora (lib/secciones.ts): su código sigue completo. */}
        {VENTAS_VISIBLES && (
          <Item
            icono={Receipt}
            etiqueta="Ventas"
            activo={seccion === "ventas"}
            tab="ventas"
            colapsado={colapsado}
            onClick={elegir(() => onSeccion("ventas"))}
          />
        )}
        <Item
          icono={ShoppingCart}
          etiqueta="Compras"
          activo={seccion === "compras"}
          tab="compras"
          colapsado={colapsado}
          onClick={elegir(() => onSeccion("compras"))}
        />

        {colapsado ? (
          <hr className="mx-3 my-3 border-side-line" />
        ) : (
          <p className="rotulo px-3 pt-6 pb-2 text-[12px] font-semibold text-side-fg-2">Auditoría</p>
        )}
        <Item
          icono={ShieldCheck}
          etiqueta="Evidencias SIRE"
          activo={seccion === "evidencias"}
          tab="evidencias"
          colapsado={colapsado}
          onClick={elegir(() => onSeccion("evidencias"))}
        />
        <Item
          icono={ScrollText}
          etiqueta="Logs"
          activo={seccion === "logs"}
          tab="logs"
          colapsado={colapsado}
          onClick={elegir(() => onSeccion("logs"))}
        />
      </nav>

      <div className="border-t border-side-line p-3">
        <div className={cn("flex items-center gap-2.5 rounded-lg p-1.5", colapsado && "flex-col")}>
          <span
            title={email ?? undefined}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-side-line text-[12px] font-semibold uppercase"
          >
            {(email ?? "?").charAt(0)}
          </span>
          {!colapsado && (
            <p className="min-w-0 flex-1 truncate text-[12px] text-side-fg-2" title={email ?? undefined}>
              {email ?? "—"}
            </p>
          )}
          <BotonTema sobreOscuro />
          <button
            type="button"
            onClick={elegir(onCuenta)}
            aria-label="Mi cuenta"
            title="Mi cuenta: cambiar correo o contraseña"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-side-fg-2 transition-colors hover:bg-side-2 hover:text-side-fg"
          >
            <UserCog className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
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

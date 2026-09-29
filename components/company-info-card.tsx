import { Activity, BadgeCheck, Building2, CalendarClock, FileStack, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Pulso } from "@/components/skeletons";
import type { Empresa } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  empresa: Empresa;
  cargando?: boolean;
}

function Dato({
  icono: Icono,
  etiqueta,
  children,
  className,
}: {
  icono: typeof MapPin;
  etiqueta: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100/90 text-slate-500 ring-1 ring-inset ring-slate-200/70 dark:bg-white/5 dark:text-indigo-300 dark:ring-white/10">
        <Icono className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-400">
          {etiqueta}
        </dt>
        <dd className="mt-1.5 text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-200">
          {children}
        </dd>
      </div>
    </div>
  );
}

function SelloVerde({ texto }: { texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25 dark:shadow-[0_0_20px_-6px_rgba(16,185,129,0.9)]">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_1px_rgba(16,185,129,0.75)]" />
      {texto}
    </span>
  );
}

export function CompanyInfoCard({ empresa, cargando = false }: Props) {
  return (
    <section className="vidrio borde-brillo overflow-hidden rounded-3xl">
      {/* Encabezado corporativo */}
      <div className="relative flex flex-col gap-3 bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:from-[#0b0e1a] dark:via-indigo-950/90 dark:to-blue-950">
        <div aria-hidden="true" className="aura-corporativa pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-indigo-200/85 uppercase">
              Ficha informativa SUNAT
            </p>
            {cargando ? (
              <Pulso tono="claro" className="mt-1.5 h-5 w-44 rounded-md sm:w-64" />
            ) : (
              <h2 className="truncate text-base font-bold tracking-tight text-white sm:text-lg lg:text-xl">
                {empresa.razonSocial}
              </h2>
            )}
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-2">
          {cargando ? (
            <Pulso tono="claro" className="h-8 w-36 rounded-lg" />
          ) : (
            <span className="rounded-xl bg-white/10 px-3 py-1.5 font-mono text-sm font-semibold tracking-wide text-white ring-1 ring-inset ring-white/20 backdrop-blur-md">
              RUC {empresa.ruc}
            </span>
          )}
        </div>
      </div>

      {/* Cuerpo */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <Dato icono={BadgeCheck} etiqueta="Estado del contribuyente">
          {cargando ? <Pulso className="h-6 w-24 rounded-full" /> : <SelloVerde texto={empresa.estado} />}
        </Dato>

        <Dato icono={BadgeCheck} etiqueta="Condición del contribuyente">
          {cargando ? <Pulso className="h-6 w-24 rounded-full" /> : <SelloVerde texto={empresa.condicion} />}
        </Dato>

        <Dato icono={CalendarClock} etiqueta="Última consulta SUNAT">
          {cargando ? (
            <Pulso className="h-4 w-32" />
          ) : (
            <span className="text-slate-600 dark:text-slate-300">26/09/2026 · 09:14 a.m.</span>
          )}
        </Dato>

        <Dato icono={FileStack} etiqueta="Comprobantes electrónicos">
          {cargando ? (
            <span className="flex flex-wrap gap-1.5">
              <Pulso className="h-5 w-16" />
              <Pulso className="h-5 w-20" />
              <Pulso className="h-5 w-14" />
            </span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {empresa.comprobantesElectronicos.map((tipo) => (
                <span
                  key={tipo}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10"
                >
                  {tipo}
                </span>
              ))}
            </span>
          )}
        </Dato>

        <Dato icono={MapPin} etiqueta="Domicilio fiscal" className="sm:col-span-2">
          {cargando ? (
            <span className="block space-y-1.5">
              <Pulso className="h-4 w-full max-w-md" />
              <Pulso className="h-4 w-40" />
            </span>
          ) : (
            <span className="block">{empresa.domicilioFiscal}</span>
          )}
        </Dato>

        <Dato icono={Activity} etiqueta="Actividad principal" className="sm:col-span-2">
          {cargando ? (
            <span className="block space-y-1.5">
              <Pulso className="h-4 w-full max-w-sm" />
              <Pulso className="h-4 w-52" />
            </span>
          ) : (
            <span className="block">{empresa.actividadPrincipal}</span>
          )}
        </Dato>
      </div>
    </section>
  );
}

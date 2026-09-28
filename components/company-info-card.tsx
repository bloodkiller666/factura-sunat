import { Activity, BadgeCheck, Building2, CalendarClock, FileStack, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Pulso } from "@/components/skeletons";
import type { Empresa } from "@/lib/types";

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
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <Icono className="h-3.5 w-3.5" />
        {etiqueta}
      </dt>
      <dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
        {children}
      </dd>
    </div>
  );
}

function SelloVerde({ texto }: { texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {texto}
    </span>
  );
}

export function CompanyInfoCard({ empresa, cargando = false }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Encabezado corporativo */}
      <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/20">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-200/80">
              Ficha informativa SUNAT
            </p>
            {cargando ? (
              <Pulso className="mt-1 h-5 w-44 bg-white/25 sm:w-64 dark:bg-white/20" />
            ) : (
              <h2 className="truncate text-base font-bold tracking-tight text-white sm:text-lg lg:text-xl">
                {empresa.razonSocial}
              </h2>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {cargando ? (
            <Pulso className="h-8 w-36 bg-white/20 rounded-lg dark:bg-white/15" />
          ) : (
            <span className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-sm font-semibold tracking-wide text-white ring-1 ring-inset ring-white/20">
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
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
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

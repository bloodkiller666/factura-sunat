import { Ban, CheckCircle2, Clock, Wallet } from "lucide-react";
import { formatearMoneda } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface Metricas {
  totalFacturado: number;
  aprobados: number;
  pendientes: number;
  anulados: number;
  totalComprobantes: number;
  mesEtiqueta: string;
}

interface Props {
  metricas: Metricas;
}

const TONOS = {
  blue: {
    icono:
      "bg-blue-50 text-blue-600 ring-blue-600/10 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/25 dark:shadow-[0_0_26px_-8px_rgba(59,130,246,0.95)]",
    acento: "from-blue-500/0 via-blue-400/70 to-blue-500/0",
    aura: "aura-azul",
    valor: "text-slate-900 dark:text-white",
  },
  emerald: {
    icono:
      "bg-emerald-50 text-emerald-600 ring-emerald-600/10 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25 dark:shadow-[0_0_26px_-8px_rgba(16,185,129,0.95)]",
    acento: "from-emerald-500/0 via-emerald-400/70 to-emerald-500/0",
    aura: "aura-esmeralda",
    valor: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    icono:
      "bg-amber-50 text-amber-600 ring-amber-600/10 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25 dark:shadow-[0_0_26px_-8px_rgba(245,158,11,0.95)]",
    acento: "from-amber-400/0 via-amber-400/70 to-amber-500/0",
    aura: "aura-ambar",
    valor: "text-amber-700 dark:text-amber-300",
  },
  rose: {
    icono:
      "bg-rose-50 text-rose-600 ring-rose-600/10 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/25 dark:shadow-[0_0_26px_-8px_rgba(244,63,94,0.95)]",
    acento: "from-rose-500/0 via-rose-400/70 to-rose-500/0",
    aura: "aura-rosa",
    valor: "text-rose-700 dark:text-rose-300",
  },
} as const;

function Tarjeta({
  icono: Icono,
  etiqueta,
  valor,
  detalle,
  tono,
}: {
  icono: typeof Wallet;
  etiqueta: string;
  valor: string;
  detalle: string;
  tono: keyof typeof TONOS;
}) {
  const t = TONOS[tono];
  return (
    <div className="vidrio group relative overflow-hidden rounded-3xl p-4 transition duration-300 hover:-translate-y-0.5 hover:border-indigo-300/70 sm:p-5 dark:hover:border-white/20 dark:hover:shadow-[0_40px_80px_-48px_rgba(79,70,229,0.75)]">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          t.aura,
        )}
      />
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-0 h-px bg-gradient-to-r", t.acento)}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase dark:text-slate-400">
            {etiqueta}
          </p>
          <p
            className={cn(
              "mt-2 truncate text-xl font-bold tracking-tight tabular-nums sm:text-2xl",
              t.valor,
            )}
          >
            {valor}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-400">{detalle}</p>
        </div>
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset transition duration-300 group-hover:scale-105",
            t.icono,
          )}
        >
          <Icono className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function KpiCards({ metricas }: Props) {
  const { totalFacturado, aprobados, pendientes, anulados, totalComprobantes, mesEtiqueta } = metricas;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tarjeta
        icono={Wallet}
        etiqueta="Total facturado del mes"
        valor={formatearMoneda(totalFacturado)}
        detalle={`${mesEtiqueta} · ${totalComprobantes} comprobantes`}
        tono="blue"
      />
      <Tarjeta
        icono={CheckCircle2}
        etiqueta="Comprobantes aprobados"
        valor={String(aprobados)}
        detalle={`${porcentaje(aprobados, totalComprobantes)} del total emitido`}
        tono="emerald"
      />
      <Tarjeta
        icono={Clock}
        etiqueta="Comprobantes pendientes"
        valor={String(pendientes)}
        detalle="En espera de CDR o cobro"
        tono="amber"
      />
      <Tarjeta
        icono={Ban}
        etiqueta="Comprobantes anulados"
        valor={String(anulados)}
        detalle={`${porcentaje(anulados, totalComprobantes)} del total emitido`}
        tono="rose"
      />
    </section>
  );
}

function porcentaje(parte: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((parte / total) * 100)}%`;
}

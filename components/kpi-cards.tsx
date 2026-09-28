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
    icono: "bg-blue-50 text-blue-600 ring-blue-600/10 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20",
    acento: "from-blue-500 to-blue-700",
    valor: "text-slate-900 dark:text-white",
  },
  emerald: {
    icono:
      "bg-emerald-50 text-emerald-600 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    acento: "from-emerald-500 to-emerald-700",
    valor: "text-emerald-700 dark:text-emerald-400",
  },
  amber: {
    icono:
      "bg-amber-50 text-amber-600 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    acento: "from-amber-400 to-amber-600",
    valor: "text-amber-700 dark:text-amber-400",
  },
  rose: {
    icono: "bg-rose-50 text-rose-600 ring-rose-600/10 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    acento: "from-rose-500 to-rose-700",
    valor: "text-rose-700 dark:text-rose-400",
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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 sm:p-5">
      <span className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", t.acento)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
          <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{detalle}</p>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition group-hover:scale-105",
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

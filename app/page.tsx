"use client";

import { CloudOff, Loader2 } from "lucide-react";
import { Login } from "@/components/portal/login";
import { Portal } from "@/components/portal/portal";
import { Avisos } from "@/components/ui/avisos";
import { apiConfigurado } from "@/lib/api";
import { useSesion } from "@/lib/use-sesion";

/** Sin las variables de entorno no hay nada que conectar: se explica qué falta. */
function EntornoIncompleto({ faltan }: { faltan: string[] }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="max-w-md rounded-2xl border border-line bg-surface p-7 shadow-sm">
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-warn-line bg-warn-bg text-warn">
          <CloudOff className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="text-[16px] font-semibold text-fg">Falta configurar el entorno</h1>
        <p className="mt-1.5 text-[13px] text-fg-3">
          El portal se conecta al backend y a Supabase con las variables de entorno. Falta:
        </p>
        <ul className="mt-3 space-y-1.5 font-mono text-[12px] text-fg-2">
          {faltan.map((variable) => (
            <li key={variable}>• {variable}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default function Page() {
  const sesion = useSesion();

  if (!apiConfigurado || !sesion.configurado) {
    return (
      <EntornoIncompleto
        faltan={[
          ...(apiConfigurado ? [] : ["NEXT_PUBLIC_API_URL"]),
          ...(sesion.configurado
            ? []
            : ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
        ]}
      />
    );
  }

  if (sesion.cargando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg" role="status">
        <Loader2 className="h-6 w-6 animate-[giro_0.8s_linear_infinite] text-fg-4" aria-label="Cargando" />
      </div>
    );
  }

  if (!sesion.token) return <Login entrar={sesion.entrar} />;

  return (
    <>
      <Portal token={sesion.token} email={sesion.email} onSalir={() => void sesion.salir()} />
      <Avisos />
    </>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Isotipo } from "@/components/portal/marca";
import { Boton } from "@/components/ui/boton";
import { Campo, Grupo } from "@/components/ui/campos";

interface Props {
  entrar: (email: string, password: string) => Promise<{ ok: boolean; mensaje?: string }>;
}

const PUNTOS = [
  {
    tab: "bg-tab-ventas",
    titulo: "Conectado a SUNAT",
    texto: "Trae tus ventas reales desde el registro SIRE y consulta el estado de cada comprobante.",
  },
  {
    tab: "bg-tab-compras",
    titulo: "Respaldo ordenado",
    texto: "XML, CDR y evidencia de SUNAT guardados con su huella digital, listos para una auditoría.",
  },
  {
    tab: "bg-tab-evidencias",
    titulo: "Acceso por empresa",
    texto: "Cada usuario ve solo las empresas y operaciones que su rol permite.",
  },
];

export function Login({ entrar }: Props) {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const resultado = await entrar(email.trim(), clave);
    if (!resultado.ok) setError(resultado.mensaje ?? "No se pudo iniciar sesión.");
    setEnviando(false);
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden bg-side text-side-fg lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Regla de libro: líneas horizontales finas. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0, transparent 39px, color-mix(in srgb, var(--side-line) 45%, transparent) 39px, color-mix(in srgb, var(--side-line) 45%, transparent) 40px)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <Isotipo className="h-12 w-12" />
          <div className="leading-tight">
            <p className="text-[16px] font-bold tracking-tight">Portal Holding TDM</p>
            <p className="text-[13px] text-side-fg-2">Facturación electrónica</p>
          </div>
        </div>

        <div className="relative max-w-[520px]">
          <h1 className="text-[44px] leading-[1.05] font-bold tracking-tight text-balance">
            Tus comprobantes electrónicos, respaldados y a la mano.
          </h1>
          <ul className="mt-10 divide-y divide-side-line border-y border-side-line">
            {PUNTOS.map(({ tab, titulo, texto }) => (
              <li key={titulo} className="flex items-start gap-4 py-4">
                <span aria-hidden className={`mt-[7px] h-2.5 w-2.5 shrink-0 rounded-[2px] ${tab}`} />
                <div>
                  <p className="text-[15px] font-semibold">{titulo}</p>
                  <p className="mt-0.5 text-[14px] leading-5 text-side-fg-2">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[12px] text-side-fg-2">
          TDM ASFALTOS S.A.C. · Información tributaria confidencial
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center bg-bg px-5 py-10">
        <div className="w-full max-w-[400px] overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-sm)]">
          <div aria-hidden className="flex h-1.5">
            <span className="flex-1 bg-tab-ventas" />
            <span className="flex-1 bg-tab-compras" />
            <span className="flex-1 bg-tab-evidencias" />
            <span className="flex-1 bg-tab-logs" />
          </div>
          <div className="p-8">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Isotipo className="h-12 w-12" />
            <p className="text-[15px] font-semibold tracking-tight">Portal Holding TDM</p>
          </div>

          <h2 className="text-[26px] leading-8 font-bold tracking-tight text-fg">
            Inicia sesión
          </h2>
          <p className="mt-1.5 text-[13.5px] text-fg-3">
            Ingresa con tu cuenta del portal para ver tus empresas.
          </p>

          <form onSubmit={enviar} className="mt-7 space-y-4" noValidate>
            <Grupo etiqueta="Correo electrónico">
              <Campo
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="nombre@empresa.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Grupo>
            <Grupo etiqueta="Contraseña">
              <div className="relative">
                <Campo
                  type={verClave ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-fg-4 hover:bg-surface-3 hover:text-fg"
                >
                  {verClave ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </Grupo>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-bad-line bg-bad-bg px-3 py-2.5 text-[13px] text-bad"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <Boton
              type="submit"
              variante="primario"
              cargando={enviando}
              disabled={!email || !clave}
              className="h-10 w-full"
            >
              Entrar
            </Boton>
          </form>

          <p className="mt-6 text-[12.5px] text-fg-4">
            ¿No puedes ingresar? Pide acceso al administrador de tu empresa.
          </p>
          </div>
        </div>
      </main>
    </div>
  );
}

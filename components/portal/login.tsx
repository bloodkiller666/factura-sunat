"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Building2, Eye, EyeOff, FileArchive, Lock, ShieldCheck } from "lucide-react";
import { Isotipo } from "@/components/portal/marca";
import { Boton } from "@/components/ui/boton";
import { Campo, Grupo } from "@/components/ui/campos";

interface Props {
  entrar: (email: string, password: string) => Promise<{ ok: boolean; mensaje?: string }>;
}

const PUNTOS = [
  {
    icono: ShieldCheck,
    titulo: "Conectado a SUNAT",
    texto: "Trae tus ventas reales desde el registro SIRE y consulta el estado de cada comprobante.",
  },
  {
    icono: FileArchive,
    titulo: "Respaldo ordenado",
    texto: "XML, CDR y evidencia de SUNAT guardados con su huella digital, listos para una auditoría.",
  },
  {
    icono: Building2,
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
      {/* Panel de marca: la hoja reglada. */}
      <aside className="relative hidden overflow-hidden bg-side text-side-fg lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0, transparent 39px, color-mix(in srgb, var(--side-line) 40%, transparent) 39px, color-mix(in srgb, var(--side-line) 40%, transparent) 40px)",
          }}
        />

        <div className="relative flex items-center gap-3">
          <Isotipo className="h-12 w-12 shadow-[0_6px_20px_-6px_rgb(0_0_0/0.6)]" />
          <div className="leading-tight">
            <p className="text-[16px] font-semibold tracking-tight">Portal Holding TDM</p>
            <p className="text-[13px] text-side-fg-2">Facturación electrónica</p>
          </div>
        </div>

        <div className="relative max-w-[540px]">
          <h1 className="text-[46px] leading-[1.06] font-semibold tracking-[-0.025em] text-balance">
            Tus comprobantes electrónicos, respaldados y a la mano.
          </h1>
          <ul className="mt-12 space-y-6">
            {PUNTOS.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-side-line bg-side-2 text-side-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                >
                  <Icono className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold">{titulo}</p>
                  <p className="mt-0.5 text-[14px] leading-[22px] text-side-fg-2">{texto}</p>
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
        <div className="entra-vista w-full max-w-[420px] rounded-2xl border border-line bg-surface p-9 shadow-pop">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Isotipo className="h-12 w-12" />
            <p className="text-[15px] font-semibold tracking-tight">Portal Holding TDM</p>
          </div>

          <h2 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] text-fg">
            Inicia sesión
          </h2>
          <p className="mt-2 text-[14px] leading-5 text-fg-3">
            Ingresa con tu cuenta del portal para ver tus empresas.
          </p>

          <form onSubmit={enviar} className="mt-8 space-y-5" noValidate>
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
                className="h-11 text-[14px]"
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
                  className="h-11 pr-11 text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-4 transition-colors hover:bg-surface-3 hover:text-fg"
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
              className="h-11 w-full text-[14px]"
            >
              Entrar
            </Boton>
          </form>

          <div className="mt-7 flex items-start gap-2 border-t border-line pt-5 text-[12.5px] leading-5 text-fg-4">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <p>¿No puedes ingresar? Pide acceso al administrador de tu empresa.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

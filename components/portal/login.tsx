"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Archive, Eye, EyeOff, ShieldCheck, Workflow } from "lucide-react";
import { Isotipo } from "@/components/portal/marca";
import { Boton } from "@/components/ui/boton";
import { Campo, Grupo } from "@/components/ui/campos";

interface Props {
  entrar: (email: string, password: string) => Promise<{ ok: boolean; mensaje?: string }>;
}

const PUNTOS = [
  {
    icono: Workflow,
    titulo: "Conectado a SUNAT",
    texto: "Trae tus ventas reales desde el registro SIRE y consulta el estado de cada comprobante.",
  },
  {
    icono: Archive,
    titulo: "Respaldo ordenado",
    texto: "XML, CDR y evidencia de SUNAT guardados con su huella digital, listos para una auditoría.",
  },
  {
    icono: ShieldCheck,
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
        {/* Retícula sutil: evoca un plano técnico sin recurrir a degradados */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(var(--side-line) 1px, transparent 1px), linear-gradient(90deg, var(--side-line) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 20% 30%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 20% 30%, black 0%, transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <Isotipo className="h-9 w-9" />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">Portal Holding TDM</p>
            <p className="text-[12px] text-side-fg-2">Facturación electrónica</p>
          </div>
        </div>

        <div className="relative max-w-[520px]">
          <h1 className="text-[34px] leading-[1.15] font-semibold tracking-tight text-balance">
            Tus comprobantes electrónicos, respaldados y a la mano.
          </h1>
          <ul className="mt-9 space-y-6">
            {PUNTOS.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-side-line bg-side-2 text-[#F5B301]">
                  <Icono className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <p className="text-[14px] font-medium">{titulo}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-side-fg-2">{texto}</p>
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
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Isotipo className="h-9 w-9" />
            <p className="text-[15px] font-semibold tracking-tight">Portal Holding TDM</p>
          </div>

          <h2 className="text-[22px] leading-7 font-semibold tracking-tight text-fg">
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
      </main>
    </div>
  );
}

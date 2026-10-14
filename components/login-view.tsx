"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { AlertCircle, Loader2, LogIn, Mail, Receipt } from "lucide-react";

interface Props {
  entrar: (email: string, password: string) => Promise<{ ok: boolean; mensaje?: string }>;
}

/**
 * Puerta del portal: login con Supabase Auth. Sin sesión no se muestra ningún
 * dato, y el JWT que aquí se obtiene viaja en cada llamada al backend.
 */
export function LoginView({ entrar }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ingresando, setIngresando] = useState(false);
  const tarjetaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(tarjetaRef.current, {
          y: 24,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          clearProps: "opacity,transform",
        });
      });
      return () => mm.revert();
    },
    { scope: tarjetaRef },
  );

  useEffect(() => {
    if (!mensaje) return;
    const temporizador = setTimeout(() => setMensaje(null), 5000);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  async function alEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (ingresando) return;

    setIngresando(true);
    setMensaje(null);
    const resultado = await entrar(email.trim(), password);
    if (!resultado.ok) setMensaje(resultado.mensaje ?? "No se pudo iniciar sesión.");
    setIngresando(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f7fc] via-[#fafbff] to-[#eef1f9] px-4 py-12 dark:from-[#05060c] dark:via-[#06070e] dark:to-[#04050a]">
      {/* Orbes de fondo, coherentes con el portal */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[380px] w-[380px] rounded-full bg-indigo-500/20 blur-[120px] dark:bg-indigo-500/25" />
        <div className="absolute right-[-6rem] bottom-[-4rem] h-[320px] w-[320px] rounded-full bg-emerald-400/15 blur-[120px] dark:bg-emerald-500/20" />
      </div>

      <div ref={tarjetaRef} className="relative w-full max-w-md">
        <div className="vidrio borde-brillo rounded-3xl p-7 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-slate-900 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-inset ring-white/25">
              <Receipt className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-base leading-tight font-bold tracking-tight text-slate-900 dark:text-white">
                Portal de Facturación Electrónica
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-400">Grupo TDM · Comprobantes SUNAT</p>
            </div>
          </div>

          <form onSubmit={alEnviar} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase dark:text-slate-400"
              >
                Correo
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  placeholder="usuario@empresa.pe"
                  className="w-full rounded-xl border border-slate-200 bg-white/90 py-2.5 pr-3 pl-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase dark:text-slate-400"
              >
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>

            {mensaje && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {mensaje}
              </p>
            )}

            <button
              type="submit"
              disabled={ingresando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ingresando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {ingresando ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
          El acceso lo valida Supabase Auth; tus credenciales no pasan por el backend.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Campo, Grupo } from "@/components/ui/campos";
import { Dialogo } from "@/components/ui/dialogo";
import { MINIMO_PASSWORD, validarCambioCuenta, type CambioCuenta } from "@/lib/cuenta";
import type { ResultadoActualizacion } from "@/lib/use-sesion";

interface Props {
  abierto: boolean;
  emailActual: string | null;
  onCerrar: () => void;
  onActualizar: (cambios: CambioCuenta) => Promise<ResultadoActualizacion>;
}

interface Errores {
  email?: string;
  password?: string;
  general?: string;
}

/**
 * «Mi cuenta»: cambiar el correo, la contraseña o las dos cosas.
 *
 * Cada campo es opcional: se manda a Supabase solo lo que el usuario escribió, así que no hace
 * falta tocar la contraseña para cambiar el correo (ni al revés).
 */
export function DialogoCuenta({ abierto, emailActual, onCerrar, onActualizar }: Props) {
  const [emailNuevo, setEmailNuevo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoActualizacion | null>(null);

  const cerrar = () => {
    setEmailNuevo("");
    setPassword("");
    setConfirmacion("");
    setErrores({});
    setResultado(null);
    onCerrar();
  };

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    setResultado(null);
    const validacion = validarCambioCuenta({ emailActual, emailNuevo, password, confirmacion });
    if (!validacion.ok) {
      setErrores(validacion.errores);
      return;
    }
    setErrores({});
    setEnviando(true);
    try {
      const respuesta = await onActualizar(validacion.cambios);
      setResultado(respuesta);
      if (respuesta.ok) {
        setEmailNuevo("");
        setPassword("");
        setConfirmacion("");
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Mi cuenta"
      descripcion="Cambia tu correo, tu contraseña o los dos. Lo que dejes vacío no se modifica."
      ancho="sm"
      pie={
        <>
          <Boton variante="fantasma" onClick={cerrar}>
            Cerrar
          </Boton>
          <Boton variante="acento" type="submit" form="form-cuenta" cargando={enviando}>
            Guardar cambios
          </Boton>
        </>
      }
    >
      <form id="form-cuenta" onSubmit={guardar} className="space-y-4 px-5 py-4" noValidate>
        <p className="text-[13px] text-fg-3">
          Sesión actual: <span className="font-medium text-fg">{emailActual ?? "—"}</span>
        </p>

        <Grupo etiqueta="Correo nuevo" ayuda="Te enviaremos un enlace para confirmarlo.">
          <Campo
            type="email"
            autoComplete="email"
            value={emailNuevo}
            onChange={(e) => setEmailNuevo(e.target.value)}
            placeholder="nuevo@correo.com"
            aria-invalid={Boolean(errores.email)}
          />
        </Grupo>
        {errores.email && <MensajeError>{errores.email}</MensajeError>}

        <Grupo etiqueta="Contraseña nueva" ayuda={`Mínimo ${MINIMO_PASSWORD} caracteres.`}>
          <Campo
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errores.password)}
          />
        </Grupo>
        <Grupo etiqueta="Repite la contraseña nueva">
          <Campo
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            aria-invalid={Boolean(errores.password)}
          />
        </Grupo>
        {errores.password && <MensajeError>{errores.password}</MensajeError>}
        {errores.general && <MensajeError>{errores.general}</MensajeError>}

        {resultado && (
          <p
            role="status"
            className={
              resultado.ok
                ? "flex items-start gap-2 rounded-md border border-ok-line bg-ok-bg px-3 py-2 text-[13px] text-ok"
                : "flex items-start gap-2 rounded-md border border-bad-line bg-bad-bg px-3 py-2 text-[13px] text-bad"
            }
          >
            {resultado.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            {resultado.mensaje}
          </p>
        )}
      </form>
    </Dialogo>
  );
}

function MensajeError({ children }: { children: string }) {
  return (
    <p role="alert" className="-mt-2 text-[12px] text-bad">
      {children}
    </p>
  );
}

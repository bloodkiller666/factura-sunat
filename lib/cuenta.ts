/**
 * Cambio de correo y/o contraseña de la cuenta del usuario (Supabase Auth).
 *
 * Los dos cambios son independientes: se puede cambiar solo el correo, solo la contraseña o los
 * dos a la vez. Un campo vacío significa «no lo cambio»; lo único que no se acepta es no pedir
 * ningún cambio.
 */

/** Mínimo de caracteres de la contraseña (el de Supabase por defecto). */
export const MINIMO_PASSWORD = 6;

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EntradaCuenta {
  emailActual: string | null;
  emailNuevo: string;
  password: string;
  confirmacion: string;
}

export interface CambioCuenta {
  /** Solo si el correo escrito es distinto del actual. */
  email?: string;
  /** Solo si se escribió una contraseña. */
  password?: string;
}

export type ResultadoCuenta =
  | { ok: true; cambios: CambioCuenta }
  | { ok: false; errores: { email?: string; password?: string; general?: string } };

/** Decide qué se cambia y qué campos están mal, sin tocar la red. */
export function validarCambioCuenta(entrada: EntradaCuenta): ResultadoCuenta {
  const correo = entrada.emailNuevo.trim().toLowerCase();
  const actual = (entrada.emailActual ?? "").trim().toLowerCase();
  const errores: { email?: string; password?: string; general?: string } = {};
  const cambios: CambioCuenta = {};

  if (correo !== "" && correo !== actual) {
    if (FORMATO_CORREO.test(correo)) cambios.email = correo;
    else errores.email = "Escribe un correo válido.";
  }

  if (entrada.password !== "" || entrada.confirmacion !== "") {
    if (entrada.password.length < MINIMO_PASSWORD) {
      errores.password = `La contraseña debe tener al menos ${MINIMO_PASSWORD} caracteres.`;
    } else if (entrada.password !== entrada.confirmacion) {
      errores.password = "Las contraseñas no coinciden.";
    } else {
      cambios.password = entrada.password;
    }
  }

  if (errores.email || errores.password) return { ok: false, errores };
  if (cambios.email === undefined && cambios.password === undefined) {
    return { ok: false, errores: { general: "Escribe un correo nuevo, una contraseña nueva o ambos." } };
  }
  return { ok: true, cambios };
}

/** Mensajes de Supabase al actualizar la cuenta → texto entendible. */
export function traducirErrorCuenta(mensaje: string): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes("same password") || texto.includes("different from the old")) {
    return "La contraseña nueva debe ser distinta de la actual.";
  }
  if (texto.includes("already been registered") || texto.includes("already registered")) {
    return "Ese correo ya está en uso por otra cuenta.";
  }
  if (texto.includes("reauthentication") || texto.includes("recently")) {
    return "Por seguridad, cierra sesión, vuelve a entrar y repite el cambio.";
  }
  if (texto.includes("rate limit") || texto.includes("security purposes")) {
    return "Demasiados intentos; espera un momento y vuelve a intentar.";
  }
  if (texto.includes("weak") || texto.includes("password should")) {
    return "La contraseña es demasiado débil; usa una más larga.";
  }
  return mensaje;
}

import { describe, expect, it } from "vitest";
import { traducirErrorCuenta, validarCambioCuenta } from "./cuenta";

const base = { emailActual: "ana@empresa.pe", emailNuevo: "", password: "", confirmacion: "" };

describe("validarCambioCuenta", () => {
  it("permite cambiar solo la contraseña", () => {
    expect(validarCambioCuenta({ ...base, password: "nueva123", confirmacion: "nueva123" })).toEqual({
      ok: true,
      cambios: { password: "nueva123" },
    });
  });

  it("permite cambiar solo el correo (en minúsculas y sin espacios)", () => {
    expect(validarCambioCuenta({ ...base, emailNuevo: "  Nuevo@Empresa.PE " })).toEqual({
      ok: true,
      cambios: { email: "nuevo@empresa.pe" },
    });
  });

  it("permite cambiar los dos a la vez", () => {
    expect(
      validarCambioCuenta({
        ...base,
        emailNuevo: "nuevo@empresa.pe",
        password: "nueva123",
        confirmacion: "nueva123",
      }),
    ).toEqual({ ok: true, cambios: { email: "nuevo@empresa.pe", password: "nueva123" } });
  });

  it("no exige cambiar la contraseña para cambiar el correo, ni al revés", () => {
    const soloCorreo = validarCambioCuenta({ ...base, emailNuevo: "otro@empresa.pe" });
    const soloClave = validarCambioCuenta({ ...base, password: "abcdef", confirmacion: "abcdef" });
    expect(soloCorreo.ok).toBe(true);
    expect(soloClave.ok).toBe(true);
  });

  it("sin ningún cambio pide escribir algo", () => {
    expect(validarCambioCuenta(base)).toEqual({
      ok: false,
      errores: { general: "Escribe un correo nuevo, una contraseña nueva o ambos." },
    });
  });

  it("el mismo correo que ya tiene no cuenta como cambio", () => {
    const r = validarCambioCuenta({ ...base, emailNuevo: "ANA@empresa.pe" });
    expect(r.ok).toBe(false);
  });

  it("rechaza un correo mal escrito", () => {
    expect(validarCambioCuenta({ ...base, emailNuevo: "ana@" })).toEqual({
      ok: false,
      errores: { email: "Escribe un correo válido." },
    });
  });

  it("rechaza una contraseña corta o que no coincide", () => {
    expect(validarCambioCuenta({ ...base, password: "123", confirmacion: "123" })).toEqual({
      ok: false,
      errores: { password: "La contraseña debe tener al menos 6 caracteres." },
    });
    expect(validarCambioCuenta({ ...base, password: "abcdef", confirmacion: "abcdeg" })).toEqual({
      ok: false,
      errores: { password: "Las contraseñas no coinciden." },
    });
  });

  it("un correo inválido no deja pasar el cambio de contraseña a medias", () => {
    const r = validarCambioCuenta({
      ...base,
      emailNuevo: "mal",
      password: "abcdef",
      confirmacion: "abcdef",
    });
    expect(r.ok).toBe(false);
  });
});

describe("traducirErrorCuenta", () => {
  it("traduce los errores conocidos y deja pasar el resto", () => {
    expect(traducirErrorCuenta("New password should be different from the old password.")).toMatch(
      /distinta de la actual/,
    );
    expect(traducirErrorCuenta("A user with this email address has already been registered")).toMatch(
      /ya está en uso/,
    );
    expect(traducirErrorCuenta("algo raro")).toBe("algo raro");
  });
});

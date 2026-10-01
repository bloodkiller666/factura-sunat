/** Escapa texto para que sea válido dentro de un nodo o atributo XML. */
export function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Elimina caracteres de control no válidos en XML 1.0. */
export function limpiarXml(valor: string): string {
  return valor.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Devuelve el texto legible de un nodo XML (incluye entidades numéricas). */
export function desescaparXml(valor: string): string {
  return valor.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (coincidencia, entidad: string) => {
    if (entidad.startsWith("#")) {
      const esHexadecimal = entidad[1] === "x" || entidad[1] === "X";
      const codigo = Number.parseInt(entidad.slice(esHexadecimal ? 2 : 1), esHexadecimal ? 16 : 10);
      return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : coincidencia;
    }

    return ENTIDADES[entidad] ?? coincidencia;
  });
}

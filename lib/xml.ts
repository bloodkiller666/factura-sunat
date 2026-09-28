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

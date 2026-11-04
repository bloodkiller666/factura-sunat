/**
 * Secciones de comprobantes que el portal muestra.
 *
 * Ventas está oculta por ahora (no se usa): su código, sus filtros y su API siguen intactos, así
 * que volver a mostrarla es cambiar esta constante a `true`. Solo afecta al menú lateral y a la
 * sección con la que arranca el portal.
 */
export const VENTAS_VISIBLES = false;

/** `origen` con el que se abre el portal: Ventas (`emitido`) si se ve; si no, Compras. */
export const ORIGEN_INICIAL: "emitido" | "recibido" = VENTAS_VISIBLES ? "emitido" : "recibido";

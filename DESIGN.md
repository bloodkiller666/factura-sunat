# Design — Portal Holding TDM (ficha kardex)

Superficie: Operate. Contabilidad y Tesorería, escritorio, uso diario. Producto en `PRODUCT.md`.

## Concepto

El portal es la ficha kardex digital de la empresa: una hoja reglada sobre un escritorio, donde cada comprobante es un asiento. El mundo aporta cuatro cosas y solo esas: tipografía, paleta, densidad y una jugada propia. La organización de la pantalla, la navegación y los controles son los estándar de una aplicación web.

Jugadas propias:
- **Pestañas de índice** en el menú lateral: cada sección tiene su color (Ventas azul, Compras amarillo TDM, Evidencias verde, Logs rojo) y la pestaña activa se funde con el escritorio.
- **Sellos de estado**: rectángulo de esquinas cortas, versalitas y borde de 1,5 px (nunca solo color: llevan icono y texto).

## Color (tokens en `app/globals.css`)

| Rol | Claro | Uso |
| --- | --- | --- |
| `--bg` | `#e8ecf2` | Escritorio (fondo de página) |
| `--surface` | `#ffffff` | Hoja: tarjetas, tabla, diálogos |
| `--surface-3` | `#ebeff6` | Encabezado de tabla, hover |
| `--line` / `--line-strong` | `#d3dae7` / `#b3c0d4` | Regla del libro |
| `--fg` … `--fg-4` | `#0e1b3d` → `#596884` | Tinta azul marino (todo ≥ 4,5:1) |
| `--accent` | `#1c3d9c` | Tinta de bolígrafo: lo interactivo |
| `--margen` | `#d2404c` | Rojo contable (negativos) |
| `--side` | `#0a1530` | Menú lateral |
| `--tab-*` | `#3b6df0` `#f5b301` `#1fa971` `#e0505a` | Pestañas de índice |

Estados de datos (`--ok`, `--warn`, `--bad`, `--mute`) se reservan para el estado real del dato. El modo oscuro tiene su propio conjunto, también azul tinta.

## Tipografía

- **Barlow** (400–700) para la interfaz; cuerpo 14 px. Rotulación de carretera y de libro.
- **Barlow Semi Condensed** (500–600) solo en versalitas (`.rotulo`, tracking 0,07 em): encabezados de columna, títulos de las fichas, grupos del menú.
- **Geist Mono** para cifras y números de documento (`tnum`).
- Título de sección 30 px bold; mínimo de texto 11,5 px (chips y notas), 12 px para texto.

## Componentes

- **Ficha de indicadores**: en escritorio, UNA hoja con tres columnas separadas por la regla (no tres tarjetas). En móvil, carrusel de tarjetas.
- **Filtros**: una hoja con dos filas alineadas; un filtro fuera de su valor por defecto se marca con borde y fondo de acento.
- **Tabla**: anchos fijos por columna (`colgroup`), sin scroll horizontal desde 1280 px; Proveedor y Correo se reparten el resto y cortan con «…».
- **Botones y campos**: esquina de 6 px (`rounded-md`), no de burbuja.
- **Zonas de clic**: mínimo 24 × 24 px (casillas con `label`).

## Hacer / No hacer

- Hacer: texto en tinta (`--fg*`), nunca negro puro ni gris neutro; color de pestaña solo para identificar la sección.
- No hacer: sobretítulo encima de un título; tarjetas dentro de tarjetas; rayas laterales de color en filas; degradados; sombras con halo de color.

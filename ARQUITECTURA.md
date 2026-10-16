# Portal de Facturación Electrónica — Grupo TDM

Documento técnico del frontend: **para qué sirve**, **qué es real** y **cómo está construido**.

## Para qué sirve

Dar a TDM un lugar único para **consultar, respaldar y auditar** sus comprobantes
electrónicos (facturas, boletas, notas de crédito y débito):

1. Traer de SUNAT, vía **SIRE**, lo que SUNAT tiene registrado de la empresa.
2. Completar cada comprobante con su **XML firmado** y su **CDR** (que emite otro sistema).
3. Saber de un vistazo **qué respaldo falta** y poder entregar un **lote de auditoría**.
4. Conciliar con SAP (Check SAP y N° SAP) y exportar a Excel.

## Qué es real

Todo lo que muestra el portal viene del backend (FastAPI) con el JWT de Supabase. No hay
datos de ejemplo ni XML fabricados en el navegador.

| Dato / acción | Origen |
| --- | --- |
| Empresas, roles, comprobantes, ítems | API (`/companies`, `/comprobantes`) sobre Supabase con RLS |
| Ventas por mes | SIRE de SUNAT, vía `POST /companies/{ruc}/sire/ventas/sync` |
| XML y CDR | Archivos reales en Cloudflare R2 (URL firmada temporal) |
| PDF | Generado por el backend con los datos registrados (**copia informativa**) |
| Estado SUNAT | Consulta real a SUNAT (`refresh-cdr`) o el CDR importado |
| Check SAP | Persistido (`PATCH /comprobantes/{id}`) |

Lo que **no** existe todavía: emisión de comprobantes y firma digital (se harán aparte).

## Cómo está construido

```
app/page.tsx ── sesión (Supabase) ── Login | Portal
components/portal/portal.tsx ── layout y diálogos
   └─ use-portal.ts ── estado y acciones (carga por empresa y periodo, selección, descargas)
lib/api.ts ── cliente HTTP + mapeo snake_case → modelo del portal
lib/filtros.ts · lote.ts · sire-lote.ts · exportar.ts ── lógica pura (con pruebas)
```

- **Carga de datos**: el periodo se pide al servidor (`fecha_desde/hasta`); los demás
  filtros se aplican en memoria. Al recargar la misma consulta se siguen mostrando los datos
  anteriores (con un indicador) para no vaciar la tabla.
- **Diálogos** con el elemento `<dialog>` nativo (foco, Escape y fondo inerte gratis).
- **Diseño**: tokens de color en `app/globals.css` (claro/oscuro), Tailwind v4, tipografía
  Geist, cifras tabulares. El color semántico se reserva para el estado de los datos.
- **Sin dependencias de terceros** para ZIP y XLSX (`lib/zip.ts`, `lib/xlsx.ts`).

## Pruebas

`pnpm test` ejecuta las pruebas de `lib/` (filtros, métricas, formato, mapeo y cliente de
la API, sincronización por meses, lote de respaldo y exportación). Verificación completa de
un cambio: `pnpm lint && pnpm test && pnpm build`.

## Evolución prevista

- Paginación y filtros en el servidor si una empresa supera los ~1500 comprobantes por periodo.
- Emisión y firma (requieren certificado y activar `CONFIRM_PROD_EMISSION` en el backend).
- Envío por correo desde el backend, autenticado y con direcciones reales de los clientes.

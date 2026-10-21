# Portal de Facturación Electrónica — Frontend

Portal Next.js para consultar, respaldar y auditar los comprobantes electrónicos de
TDM: datos reales del backend (FastAPI + Supabase + SUNAT), con indicadores de
cobertura de respaldo (XML / CDR), sincronización desde SIRE, carga masiva de
XML y CDR, y un lote ZIP de respaldo con huellas SHA-256.

## Puesta en marcha

```bash
pnpm install            # este proyecto usa pnpm (no npm)
cp .env.example .env.local   # completa las variables
pnpm dev
```

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo en `http://localhost:3000` |
| `pnpm build` | Compilación de producción y comprobación de tipos |
| `pnpm lint` | ESLint (debe terminar en 0 errores) |
| `pnpm test` | Pruebas unitarias de la lógica (vitest, sin red) |

### Variables de entorno (`.env.local`)

| Variable | Qué es |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL del backend FastAPI (local: `http://127.0.0.1:8000`; prod: tu dominio). **Se incrusta al compilar**: si cambia, hay que volver a desplegar. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Proyecto de Supabase (Dashboard → Project Settings → API). La clave anónima es pública. Pégala completa, sin comillas ni espacios. |

En Vercel se configuran las mismas variables en *Project Settings → Environment
Variables*. Además, el bucket de R2 necesita CORS para el dominio del frontend (GET),
o el navegador bloqueará la descarga de XML/CDR con URL firmada.

## Qué hace

- **Login** con Supabase Auth. El JWT viaja como `Bearer` al backend, que aplica RLS por
  empresa. Los roles `admin`/`emisor`/`lector` vienen del backend: con `lector` las
  acciones de escritura (importar, sincronizar, importar N° SAP) quedan deshabilitadas.
- **Comprobantes**: indicadores (facturado neto por moneda, Estado SUNAT, cobertura de
  respaldo), filtros (texto, **calendario de rango de fechas**, tipo, Estado SUNAT, respaldo,
  N° SAP, **fecha de vencimiento**), orden por columna, **paginación en el servidor**,
  selección múltiple (también entre páginas) y panel de detalle con pestañas Resumen / Ítems /
  Archivos. El importe de la tabla es el **total con IGV**.
- **Importar N° SAP**: un Excel con el documento (serie-número) y su N° SAP (RUC opcional)
  asigna el número a los comprobantes del portal; los que no están se omiten sin error.
- **Respaldo por comprobante**: cada fila indica si tiene XML y CDR archivados en R2.
  El filtro «Respaldo» y los atajos de la tarjeta de cobertura listan lo que falta.
- **Sincronizar SIRE**: trae las ventas de uno o varios meses (desde julio de 2023). Es de
  solo lectura, idempotente, y guarda además el archivo original de SUNAT como evidencia.
- **Importar**: XML/ZIP de comprobantes (completan los registros que vinieron de SIRE),
  ZIP de CDR (`R-RUC-tipo-serie-número`) y análisis de columnas de un Excel.
- **Traer XML y CDR** (Bizlinks): recupera del OSE los archivos firmados que falten de los
  comprobantes emitidos y los archiva con su hash. Respeta el rango de fechas del filtro, se
  puede repetir sin duplicar nada y muestra, comprobante por comprobante, qué se archivó y
  por qué se detuvo el lote (credenciales, bloqueo del portal o cuota diaria).
- **Consultar CDR** de un comprobante en SUNAT. Si SUNAT responde que no lo reconoce
  (emitido por otro sistema), el CDR hay que importarlo desde ese sistema o traerlo de
  Bizlinks.
- **Exportar**: reporte Excel y **lote de respaldo ZIP** con los XML y CDR reales de
  cada comprobante más `LEEME.txt` y `manifiesto.csv` (SHA-256).
- **Evidencias SIRE**: lista de los archivos originales de SUNAT guardados, con su hash;
  todas las columnas se ordenan de menor a mayor y al revés.

## Decisiones que conviene conocer

- **Nunca se fabrican XML.** El XML que se descarga o se incluye en un lote es siempre el
  archivado en el almacenamiento. Si falta, el portal lo dice y explica cómo obtenerlo.
- **El portal no genera PDF**: la evidencia ante SUNAT es el XML firmado con su CDR.
- No hay envío de comprobantes por correo: no existen direcciones reales de los clientes y
  la ruta anterior era pública. Si se necesita, debe hacerse en el backend, autenticado.
- **Nada se carga de golpe.** El servidor filtra, ordena, pagina y cuenta; el portal pide una
  página (50 filas) y los indicadores del rango de fechas, en paralelo. La página siguiente se
  precarga y las ya vistas se recuerdan, así que ir y volver es instantáneo. «Exportar» trae
  del servidor, página a página, todo lo filtrado (hasta 5 000 filas; con selección, solo lo
  marcado).

## Estructura

```
app/               página única y layout (tema sin parpadeo)
components/ui/     primitivas: botón, diálogo (<dialog> nativo), menú, campos, avisos…
components/portal/ pantallas: barra lateral, tabla, detalle, diálogos, evidencias, login
components/portal/use-portal.ts   estado y acciones del portal
lib/               API, mapeo, filtros/métricas, lote de respaldo, SIRE por meses, Bizlinks, exportación
```

La lógica de `lib/` es pura y está cubierta por pruebas (`lib/*.test.ts`).
`lib/zip.ts` y `lib/xlsx.ts` son escritores propios (sin dependencias) del ZIP y del
OOXML mínimo que Excel necesita.

## Despliegue

Vercel (el repo está conectado: cada push a `main` despliega). Ver el README del backend
para el despliegue de la API.

<!-- redeploy: 2026-10-21 -->

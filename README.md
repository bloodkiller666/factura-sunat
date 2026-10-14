# Portal de Facturación Electrónica — Frontend

Portal Next.js para gestionar los comprobantes electrónicos del grupo: datos
reales del backend (FastAPI + Supabase + SUNAT), filtros, KPIs, vista de
detalle, descargas firmadas (XML/CDR/PDF) y envío por correo.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # completa las variables
pnpm dev
```

### Variables de entorno (`.env.local`)

| Variable | Qué es |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL del backend FastAPI (local: `http://127.0.0.1:8000`; prod: tu dominio). Sin ella el portal muestra el aviso de configuración. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Proyecto de Supabase (Dashboard → Project Settings → API). La clave anónima es pública: va al navegador. |
| `RESEND_API_KEY` / `CORREO_EMISOR` / `CORREO_DESTINO_PRUEBA` | Envío de correos (ver sección abajo). |

Copia `.env.example` → `.env.local` y completa. En Vercel se configuran las
mismas variables en *Project Settings → Environment Variables*.

### Autenticación

El login lo maneja **Supabase Auth**: el JWT que emite viaja como `Bearer` en
cada llamada al backend, que lo verifica y aplica RLS por empresa. Sin sesión
no se muestra ningún dato. Los roles (`admin`/`emisor`/`lector`) vienen de la
tabla `user_companies` del backend: con rol `lector` los botones de importar y
sincronizar quedan ocultos.

## Datos reales

- El listado, los ítems del detalle, los KPIs y los periodos vienen de la API:
  `GET /companies`, `GET /companies/{ruc}/comprobantes`, `GET /comprobantes/{id}`.
- **Descargar PDF**: el backend genera la representación impresa
  (`GET /comprobantes/{id}/pdf`).
- **Descargar XML/CDR**: archivos archivados en el bucket privado, descargados
  con URL firmada temporal (`POST /archivos/{id}/download-url`).
- **Importar XML/ZIP** (admin/emisor): `POST /companies/{ruc}/comprobantes/import`
  e `import-paquete`; los XML repetidos se informan como duplicados.
- **Sincronizar SUNAT** (admin/emisor): consulta el estado de los pendientes
  (`POST /companies/{ruc}/comprobantes/refresh`) y recarga el listado.
- Los filtros y la búsqueda se aplican sobre los comprobantes cargados (hasta
  1000 por empresa); para volúmenes mayores el backend ya soporta filtros
  server-side.
- El **Check SAP** sigue siendo una marca manual de la sesión (persistirla
  requiere un endpoint `PATCH` pendiente).

## Envío de comprobantes por correo

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Este proyecto usa **pnpm** (fijado en `packageManager`). No uses `npm`: el lockfile es
`pnpm-lock.yaml`.

```bash
pnpm install
```


### Seguridad de la cadena de suministro

pnpm no ejecuta los scripts de instalación de las dependencias salvo que se autoricen
explícitamente. Las decisiones quedan registradas en `pnpm-workspace.yaml` (`allowBuilds`);
si necesitas revisar o cambiar alguna, usa `pnpm approve-builds`.

## Envío de comprobantes por correo

El botón **Enviar por Correo** hace un envío real a través de [Resend](https://resend.com).
El navegador llama a la ruta `POST /api/enviar-comprobantes`, y la clave del proveedor solo
existe en el servidor: nunca llega al cliente.

1. Crea un archivo `.env.local` en la raíz del proyecto.
2. Crea una API key en <https://resend.com/api-keys> y asígnala a `RESEND_API_KEY`.
3. Opcional: define `CORREO_DESTINO_PRUEBA` para redirigir todos los correos a tu propio
   buzón. Es lo recomendable en el prototipo, porque los RUC de los datos simulados no
   tienen buzones reales.

Si `RESEND_API_KEY` no está definida, la acción no falla en silencio: muestra un aviso
indicando que falta configurarla.

## Exportaciones

Todos los archivos se generan en el navegador, sin dependencias de terceros:

| Acción | Formato | Contenido |
| --- | --- | --- |
| `Imprimir / PDF` | PDF (impresión nativa) | Representación impresa del comprobante |
| `Descargar XML` | XML | UBL 2.1 simulado de SUNAT |
| `Exportar a Excel` | XLSX (OOXML) | Reporte con los comprobantes seleccionados o, si no hay ninguno, con todos los visibles |
| `Descargar Lote ZIP` | ZIP | Un XML por comprobante (seleccionados o todos los visibles) + `LEEME.txt` |

El ZIP y el contenedor XLSX se construyen con un escritor propio en `lib/zip.ts` (sin
compresión) para evitar añadir dependencias; `lib/xlsx.ts` genera las seis partes OOXML
mínimas que Excel necesita.

## Estado SUNAT, periodo y Check SAP

- Estados del comprobante: **Aprobado**, **Pendiente**, **Anulado** y **Rechazado** (SUNAT
  devolvió la CDR con observaciones). Cada uno tiene su insignia, su filtro y su tarjeta KPI.
- El selector **Periodo de emisión** (Setiembre 2026 / Octubre 2026 / Todos los periodos) mueve a
  la vez la tabla y los KPIs del mes.

## Check SAP, orden de compra e importación de Excel

- La tabla tiene dos columnas nuevas: **Orden de compra** (dato del comprobante) y
  **Check SAP**, una casilla **editable** que el usuario marca y desmarca; el filtro
  `Check SAP` permite ver solo los comprobantes marcados o solo los que no lo están.
  La marca vive en memoria (no se persiste al recargar) y viaja también al reporte Excel.
- El botón **Importar Excel** lee un `.xlsx` / `.xlsm` en el navegador (nada se sube al
  servidor) y **valida sus columnas** contra las columnas de datos de la tabla del portal:
  indica el porcentaje de coincidencia y lista las columnas coincidentes, faltantes y
  sobrantes. Es un análisis de estructura, no una carga de datos.

## Ver los PDF reales desde SharePoint

La vista previa muestra hoy la representación impresa que el portal arma en memoria. Para
mostrar los PDF que facturación archiva en SharePoint, el diseño está en
[INTEGRACION-SHAREPOINT.md](INTEGRACION-SHAREPOINT.md): las alternativas comparadas **con y sin
acceso a Entra ID** (enlace directo, flujo de Power Automate, carpeta sincronizada en el
servidor), el registro de la app en Azure, los permisos sobre el sitio, la ruta
`/api/comprobante-pdf`, la convención de nombres y las pruebas de aceptación.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

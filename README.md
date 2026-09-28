This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Este proyecto usa **pnpm** (fijado en `packageManager`). No uses `npm`: el lockfile es
`pnpm-lock.yaml`.

Instala las dependencias y arranca el servidor de desarrollo:

```bash
pnpm install
pnpm dev
```

### Seguridad de la cadena de suministro

pnpm no ejecuta los scripts de instalación de las dependencias salvo que se autoricen
explícitamente. Las decisiones quedan registradas en `pnpm-workspace.yaml` (`allowBuilds`);
si necesitas revisar o cambiar alguna, usa `pnpm approve-builds`.

## Envío de comprobantes por correo

El botón **Enviar por Correo** hace un envío real a través de [Resend](https://resend.com).
El navegador llama a la ruta `POST /api/enviar-comprobantes`, y la clave del proveedor solo
existe en el servidor: nunca llega al cliente.

1. Copia `.env.example` a `.env.local`.
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
| `Exportar a Excel` | XLSX (OOXML) | Reporte con los comprobantes seleccionados |
| `Descargar Lote ZIP` | ZIP | Un XML por comprobante + `LEEME.txt` |

El ZIP y el contenedor XLSX se construyen con un escritor propio en `lib/zip.ts` (sin
compresión) para evitar añadir dependencias; `lib/xlsx.ts` genera las seis partes OOXML
mínimas que Excel necesita.

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

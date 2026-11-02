# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal interno de Contabilidad y Tesorería de TDM Asfaltos S.A.C. (RUC 20514831620). Usan el portal todos los días, en escritorio, para revisar ventas emitidas y compras a proveedores, validar que cada comprobante tenga su XML, PDF y CDR, y registrar el N° SAP.

## Product Purpose

Portal multiempresa de comprobantes electrónicos peruanos (SUNAT). Sincroniza ventas y compras desde SIRE, importa facturas de proveedores recibidas por correo y archiva los respaldos (XML, PDF, CDR) en Cloudflare R2. Éxito: encontrar, verificar y descargar cualquier comprobante en pocos clics, sin tener que buscar en carpetas ni en el correo.

## Operating Context

Dos secciones: Ventas (emitidos) y Compras (recibidos). Tabla paginada con filtros por fecha, estado, respaldo y estado del correo; previsualización de archivos, descarga masiva en ZIP y apertura de la carpeta local. Un apartado «Logs» muestra la automatización y los fallos del portal. Los datos reales son densos: muchos comprobantes por día, razones sociales largas y montos en PEN y USD.

## Capabilities and Constraints

- Frontend Next.js 16 (App Router), React 19, Tailwind v4, gestor pnpm; desplegado en Vercel; login con Supabase.
- Texto de interfaz en español. Tokens de diseño en `app/globals.css`.
- Estructura de la tabla y de sus columnas: se conserva (decisión del usuario, 2026-11-02).

## Brand Commitments

Marca TDM Asfaltos. La identidad visual exacta (logo, paleta) aún no está documentada; se registra con `/impeccable document`, no se inventa aquí.

## Evidence on Hand

Datos reales de producción (no usar como fixtures públicos). No hay testimonios, métricas de uso ni investigación de usuarios.

## Product Principles

- Escaneabilidad antes que decoración: es una herramienta de trabajo diaria.
- Un dato dudoso se muestra como dudoso (pendiente, no enviado), nunca se oculta.
- Cada acción lleva a un archivo real; no se muestran datos fabricados.
- La densidad de información es un requisito, no un defecto.

import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed, Geist_Mono } from "next/font/google";
import "./globals.css";

// Rotulación de carretera y de libro: Barlow para la interfaz y su versión semicondensada
// para los encabezados de columna. Las cifras siguen en mono tabular.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensada = Barlow_Semi_Condensed({
  variable: "--font-barlow-sc",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal Holding TDM · Facturación",
  description:
    "Gestión de comprobantes electrónicos SUNAT de TDM ASFALTOS S.A.C.: consulta, respaldo y trazabilidad.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ecf2" },
    { media: "(prefers-color-scheme: dark)", color: "#070c1c" },
  ],
};

/**
 * Se ejecuta antes del primer pintado para evitar el parpadeo de tema.
 * Respeta la elección guardada y, si no hay ninguna, el tema del sistema.
 */
const scriptTema = `
(function () {
  try {
    var guardado = window.localStorage.getItem("tdm-tema");
    var oscuro = guardado
      ? guardado === "oscuro"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (oscuro) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensada.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-fg antialiased">{children}</body>
    </html>
  );
}

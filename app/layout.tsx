import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-fg antialiased">{children}</body>
    </html>
  );
}

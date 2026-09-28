import type { Metadata } from "next";
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
  title: "Portal de Facturación Electrónica - Grupo TDM",
  description:
    "Prototipo del portal de gestión de comprobantes electrónicos SUNAT para las empresas del Grupo TDM.",
};

/**
 * Se ejecuta antes del primer pintado para evitar el "flash" de tema:
 * respeta la preferencia guardada y, si no existe, la del sistema.
 */
const scriptTema = `
(function () {
  try {
    var guardado = window.localStorage.getItem("tdm-tema");
    var sistemaOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (guardado === "oscuro" || (!guardado && sistemaOscuro)) {
      document.documentElement.classList.add("dark");
    }
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
      <body className="min-h-full bg-slate-100 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}

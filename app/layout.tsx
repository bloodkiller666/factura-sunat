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
    "Portal de gestión de comprobantes electrónicos SUNAT de TDM ASFALTOS S.A.C. (RUC 20514831620).",
};

/**
 * Se ejecuta antes del primer pintado para evitar el "flash" de tema.
 * El portal es dark-first: si el usuario nunca eligió un tema se aplica el
 * modo oscuro premium; si eligió "claro" esa preferencia se respeta.
 */
const scriptTema = `
(function () {
  try {
    var guardado = window.localStorage.getItem("tdm-tema");
    if (guardado === "oscuro" || !guardado) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
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
      <body className="min-h-full font-sans text-slate-900 antialiased dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}

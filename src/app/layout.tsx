import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://r3zon.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "R3ZON Business OS",
    template: "%s · R3ZON",
  },
  description:
    "Sistema operativo de negocio para autónomos y pequeñas empresas: clientes, agenda, tareas, finanzas y OCR de tickets en un único panel.",
  applicationName: "R3ZON",
  keywords: [
    "CRM",
    "autónomos",
    "facturación",
    "agenda",
    "kanban",
    "OCR tickets",
    "gestión negocio",
    "pymes",
  ],
  authors: [{ name: "R3ZON" }],
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: "R3ZON Business OS",
    title: "R3ZON Business OS",
    description:
      "Clientes, agenda, tareas y finanzas en un único panel. Procesamiento local, sin coste de servidor.",
  },
  twitter: {
    card: "summary",
    title: "R3ZON Business OS",
    description:
      "Sistema integral de gestión para autónomos y pequeñas empresas.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#080714",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

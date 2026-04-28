import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "R3ZON Business OS",
  description: "Sistema de gestión integral para autónomos y pequeñas empresas",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#080714",
  width: "device-width",
  initialScale: 1,
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

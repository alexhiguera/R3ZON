import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Escanear ticket",
  description: "Captura tickets y facturas con la cámara. OCR 100% en tu dispositivo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ajustes",
  description: "Negocio, integraciones, equipo, suscripción y seguridad.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel principal",
  description: "Resumen de clientes, agenda, tareas y finanzas en un único vistazo.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

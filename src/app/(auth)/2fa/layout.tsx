import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificación en dos pasos",
  description: "Confirma tu identidad para acceder.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

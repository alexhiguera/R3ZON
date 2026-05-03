import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu panel de R3ZON Business OS.",
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clientes",
  description: "Empresas y contactos B2B con los que trabajas.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

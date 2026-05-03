import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finanzas",
  description: "Ingresos, gastos, beneficio y previsión de impuestos del año.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

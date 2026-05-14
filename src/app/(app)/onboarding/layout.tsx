import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurar tu cuenta",
  description: "Acepta los consentimientos legales para empezar a usar ANTARES.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurar tu cuenta",
  description: "Configura tu cuenta de R3ZON ANTARES en unos minutos.",
  robots: { index: false, follow: false },
};

// El wizard renderiza su propio chrome full-screen, así que dejamos pasar
// los hijos sin envolvelos. El AppShell se ha desactivado en (app)/layout.tsx
// para esta ruta.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

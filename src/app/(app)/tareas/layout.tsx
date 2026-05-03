import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tablero de tareas",
  description: "Tablero kanban con columnas reordenables y tarjetas arrastrables.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Calendario y citas sincronizadas con Google Calendar.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

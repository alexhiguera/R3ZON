import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consentimientos RGPD",
  description: "Tus consentimientos legales y registro de privacidad.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

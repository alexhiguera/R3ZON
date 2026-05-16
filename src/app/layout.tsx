import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { A11Y_BOOT_SCRIPT } from "@/lib/a11y-prefs";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://r3zon.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "R3ZON ANTARES",
    template: "%s · ANTARES",
  },
  description:
    "Sistema operativo de negocio para autónomos y pequeñas empresas: clientes, agenda, tareas, finanzas y OCR de tickets en un único panel.",
  applicationName: "ANTARES",
  keywords: [
    "CRM",
    "autónomos",
    "facturación",
    "agenda",
    "kanban",
    "OCR tickets",
    "gestión negocio",
    "pymes",
  ],
  authors: [{ name: "R3ZON ANTARES" }],
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: "R3ZON ANTARES",
    title: "R3ZON ANTARES",
    description:
      "Clientes, agenda, tareas y finanzas en un único panel. Procesamiento local, sin coste de servidor.",
  },
  twitter: {
    card: "summary",
    title: "R3ZON ANTARES",
    description: "Sistema integral de gestión para autónomos y pequeñas empresas.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#080714",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

// Inline-script que aplica el tema cacheado en localStorage antes del primer
// paint para evitar el flash entre el tema por defecto y el del usuario.
const themeBootScript = `(() => {
  try {
    var raw = localStorage.getItem('r3zon:theme:v1');
    if (!raw) return;
    var t = JSON.parse(raw);
    var r = document.documentElement;
    function hx(h){ if(!h) return null; var m=/^#?([0-9a-f]{6})$/i.exec(h); if(!m) return null; var n=parseInt(m[1],16); return ((n>>16)&255)+' '+((n>>8)&255)+' '+(n&255); }
    function setRgb(name, hex){ var v = hx(hex); if (v) r.style.setProperty(name, v); }
    var palettes = {
      r3zon:     { '--bg':'#080714','--indigo-900':'#1e1b4b','--indigo-800':'#312e81','--indigo-700':'#3730a3','--indigo-600':'#4f46e5','--indigo-400':'#818cf8','--indigo-300':'#a5b4fc','--cyan':'#22d3ee','--fuchsia':'#e879f9','--text-hi':'#f0f4ff','--text-mid':'#c7d2fe' },
      esmeralda: { '--bg':'#06120e','--indigo-900':'#064e3b','--indigo-800':'#065f46','--indigo-700':'#047857','--indigo-600':'#059669','--indigo-400':'#34d399','--indigo-300':'#6ee7b7','--cyan':'#14b8a6','--fuchsia':'#22d3ee','--text-hi':'#ecfdf5','--text-mid':'#a7f3d0' },
      magma:     { '--bg':'#140706','--indigo-900':'#7c2d12','--indigo-800':'#9a3412','--indigo-700':'#c2410c','--indigo-600':'#ea580c','--indigo-400':'#fb923c','--indigo-300':'#fdba74','--cyan':'#facc15','--fuchsia':'#f87171','--text-hi':'#fff7ed','--text-mid':'#fed7aa' },
      noir:      { '--bg':'#0a0a0a','--indigo-900':'#171717','--indigo-800':'#262626','--indigo-700':'#404040','--indigo-600':'#525252','--indigo-400':'#a3a3a3','--indigo-300':'#d4d4d4','--cyan':'#e5e5e5','--fuchsia':'#fafafa','--text-hi':'#fafafa','--text-mid':'#a3a3a3' }
    };
    var p = palettes[t.palette];
    if (p) for (var k in p) setRgb(k, p[k]);
    if (t.mode === 'light' && t.palette !== 'custom') {
      setRgb('--bg', '#f6f7fb');
      setRgb('--text-hi', '#0b0a1f');
      setRgb('--text-mid', '#3b3a55');
      setRgb('--indigo-900', '#e0e7ff');
      setRgb('--indigo-800', '#c7d2fe');
      setRgb('--indigo-700', '#a5b4fc');
      setRgb('--indigo-400', '#6366f1');
      setRgb('--indigo-300', '#4f46e5');
    }
    if (t['colors.bg'])      setRgb('--bg',         t['colors.bg']);
    if (t['colors.primary']) setRgb('--indigo-600', t['colors.primary']);
    if (t['colors.accent1']) setRgb('--cyan',       t['colors.accent1']);
    if (t['colors.accent2']) setRgb('--fuchsia',    t['colors.accent2']);
    if (t['colors.text'])    setRgb('--text-hi',    t['colors.text']);
    if (t['font.sans'])    r.style.setProperty('--font-sans', '"' + t['font.sans'] + '", system-ui, -apple-system, sans-serif');
    if (t['font.display']) r.style.setProperty('--font-display', '"' + t['font.display'] + '", system-ui, -apple-system, sans-serif');
    if (t.fontSize) r.style.setProperty('--font-scale', t.fontSize);
    if (t.radius)   r.style.setProperty('--radius-scale', t.radius);
    if (t.mode === 'light') { r.classList.remove('dark'); r.classList.add('light'); }
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

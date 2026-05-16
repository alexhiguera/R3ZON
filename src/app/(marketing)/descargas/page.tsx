import { Apple, Download, type LucideIcon, Monitor, Smartphone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Descargas",
  description: "Descarga ANTARES para Android, macOS y Windows. Versión web siempre disponible.",
};

type Build = {
  platform: string;
  desc: string;
  ext: string;
  url: string | null;
  Icon: LucideIcon;
};

// Cuando publiques las builds en GitHub Releases, sustituye estas URLs por
// los links directos (p. ej. https://github.com/<owner>/<repo>/releases/latest/download/antares.apk).
const DOWNLOADS: Build[] = [
  {
    platform: "Android",
    desc: "APK firmada para instalación directa.",
    ext: "APK",
    url: null,
    Icon: Smartphone,
  },
  {
    platform: "macOS",
    desc: "Universal (Apple Silicon e Intel).",
    ext: "DMG",
    url: null,
    Icon: Apple,
  },
  {
    platform: "Windows",
    desc: "Instalador para Windows 10/11.",
    ext: "EXE",
    url: null,
    Icon: Monitor,
  },
];

export default function DescargasPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <div className="accent-bar mx-auto mb-4" style={{ width: 64 }} />
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-text-hi sm:text-5xl">
          Descargas
        </h1>
        <p className="mt-4 text-base text-text-mid sm:text-lg">
          Lleva ANTARES contigo. Móvil y escritorio sincronizados con tu cuenta. La versión web
          sigue disponible siempre desde el navegador.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {DOWNLOADS.map(({ platform, desc, ext, url, Icon }) => {
          const available = !!url;
          return (
            <article key={platform} className="card-glass flex flex-col items-start p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/10 text-cyan">
                <Icon size={22} strokeWidth={2} />
              </div>
              <h2 className="font-display text-xl font-bold text-text-hi">{platform}</h2>
              <p className="mt-1 text-sm text-text-mid">{desc}</p>
              <div className="mt-4 text-xs uppercase tracking-wider text-text-lo">
                Formato {ext}
              </div>

              {available ? (
                <a
                  href={url!}
                  className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-cyan px-4 py-2.5 text-sm font-semibold text-bg shadow-[0_0_20px_rgba(34,211,238,0.35)] transition hover:brightness-110"
                >
                  <Download size={14} strokeWidth={2.5} />
                  Descargar
                </a>
              ) : (
                <div className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-900/30 px-4 py-2.5 text-sm font-semibold text-text-mid">
                  Próximamente
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-10 text-center text-xs text-text-lo">
        Las builds se publican en <span className="text-text-mid">GitHub Releases</span>. Si tienes
        dudas sobre la instalación, contáctanos desde tu panel.
      </div>
    </div>
  );
}

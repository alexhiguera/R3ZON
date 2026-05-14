import Link from "next/link";

const NAV = [
  { href: "/legal/aviso-legal", label: "Aviso legal" },
  { href: "/legal/privacidad",  label: "Privacidad" },
  { href: "/legal/cookies",     label: "Cookies" },
  { href: "/legal/terminos",    label: "Términos" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="mb-6 inline-flex items-center gap-2">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-glow">
          <span className="font-display text-sm font-extrabold text-white">R3</span>
        </div>
        <span className="font-display text-lg font-extrabold tracking-tight">R3ZON ANTARES</span>
      </Link>

      <nav className="mb-8 flex flex-wrap gap-2">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-full border border-indigo-400/20 bg-indigo-900/30 px-3 py-1.5 text-xs font-medium text-text-mid hover:border-cyan/40 hover:text-text-hi"
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <article className="card-glass overflow-hidden">
        <div className="rainbow-bar" />
        <div className="prose prose-invert max-w-none p-6 sm:p-10">{children}</div>
      </article>

      <p className="mt-6 text-center text-xs text-text-lo">
        © {new Date().getFullYear()} R3ZON · Versión vigente: 2026-04-28
      </p>
    </div>
  );
}

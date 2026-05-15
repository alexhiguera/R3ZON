"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/precios", label: "Precios" },
  { href: "/descargas", label: "Descargas" },
];

export function MarketingNavbar({ hasSession }: { hasSession: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const ctaHref = hasSession ? "/dashboard" : "/login";
  const ctaLabel = hasSession ? "Ir al panel" : "Acceso";

  return (
    <header className="sticky top-0 z-40 border-b border-indigo-400/15 bg-bg/70 backdrop-blur-glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/R3ZON-ANTARES-negativo.svg"
            alt="ANTARES"
            className="h-9 w-9 dark:block hidden"
          />
          <img
            src="/R3ZON-ANTARES.svg"
            alt="ANTARES"
            className="h-9 w-9 dark:hidden block"
          />
          <span className="font-display text-lg font-extrabold tracking-tight text-text-hi">
            ANTARES
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-900/50 text-text-hi"
                    : "text-text-mid hover:bg-indigo-900/30 hover:text-text-hi",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={ctaHref}
            className="hidden items-center gap-1.5 rounded-full bg-cyan px-4 py-2 text-sm font-semibold text-bg shadow-[0_0_20px_rgba(34,211,238,0.35)] transition hover:brightness-110 sm:inline-flex"
          >
            {ctaLabel}
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>

          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-400/15 bg-indigo-900/30 text-text-hi md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-indigo-400/15 bg-bg/95 backdrop-blur-glass md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {NAV.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium",
                    active
                      ? "bg-indigo-900/50 text-text-hi"
                      : "text-text-mid hover:bg-indigo-900/30 hover:text-text-hi",
                  )}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href={ctaHref}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-cyan px-4 py-2.5 text-sm font-semibold text-bg sm:hidden"
            >
              {ctaLabel}
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

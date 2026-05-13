"use client";

import { useEffect } from "react";
import { X, HelpCircle } from "lucide-react";

export type HelpStep = {
  title: string;
  body: string;
  /** URL opcional de imagen de ejemplo (captura de pantalla). */
  image?: string;
  /** Texto alt para accesibilidad. */
  imageAlt?: string;
};

export function HelpButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-indigo-400/25 bg-indigo-900/40 text-text-mid transition hover:border-cyan/50 hover:text-cyan"
    >
      <HelpCircle size={13} />
    </button>
  );
}

export function HelpDrawer({
  open,
  onClose,
  title,
  intro,
  steps,
  footerNote,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  intro?: string;
  steps: HelpStep[];
  footerNote?: string;
}) {
  // ESC cierra el drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Bloquea scroll del body cuando está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-bg/70 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Sheet lateral */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-drawer-title"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-indigo-400/25 bg-bg shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-indigo-400/20 p-5">
          <div>
            <div className="section-label mb-1">Guía paso a paso</div>
            <h2
              id="help-drawer-title"
              className="font-display text-lg font-bold text-text-hi"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía"
            className="rounded-lg border border-indigo-400/25 bg-indigo-900/40 p-1.5 text-text-mid hover:border-cyan/40 hover:text-text-hi"
          >
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {intro && <p className="mb-5 text-sm text-text-mid">{intro}</p>}

          <ol className="space-y-5">
            {steps.map((s, i) => (
              <li key={i} className="rounded-2xl border border-indigo-400/20 bg-indigo-900/20 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan to-fuchsia text-xs font-bold text-bg">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-text-hi">{s.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-text-mid">{s.body}</p>
                {s.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={s.image}
                    alt={s.imageAlt ?? s.title}
                    className="mt-3 w-full rounded-xl border border-indigo-400/20"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>

        {footerNote && (
          <footer className="border-t border-indigo-400/20 p-4 text-xs text-text-lo">
            {footerNote}
          </footer>
        )}
      </aside>
    </div>
  );
}

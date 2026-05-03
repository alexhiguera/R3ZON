"use client";

import type { LucideIcon } from "lucide-react";

type Accent = "cyan" | "fuchsia" | "ok" | "warn" | "danger";

const ACCENTS: Record<Accent, string> = {
  cyan:    "border-cyan/30 bg-cyan/10 text-cyan",
  fuchsia: "border-fuchsia/30 bg-fuchsia/10 text-fuchsia",
  ok:      "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  warn:    "border-amber-400/30 bg-amber-400/10 text-amber-300",
  danger:  "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

const DELTA_TONE: Record<"up" | "down" | "neutral", string> = {
  up:      "text-emerald-300",
  down:    "text-rose-300",
  neutral: "text-text-mid",
};

export function KpiCard({
  label,
  value,
  hint,
  delta,
  Icon,
  accent = "cyan",
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  delta?: { text: string; tone?: "up" | "down" | "neutral" };
  Icon: LucideIcon;
  accent?: Accent;
  loading?: boolean;
}) {
  return (
    <div className="card-glass p-5">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${ACCENTS[accent]}`}
        >
          <Icon size={15} />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-text-hi">
        {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-indigo-400/15" /> : value}
      </div>
      {(hint || delta) && !loading && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          {delta && (
            <span className={`font-medium ${DELTA_TONE[delta.tone ?? "neutral"]}`}>
              {delta.text}
            </span>
          )}
          {hint && <span className="text-text-lo">{hint}</span>}
        </div>
      )}
    </div>
  );
}

"use client";

import { Check } from "lucide-react";

type Props = {
  total: number;
  current: number;
  labels?: string[];
};

export function WizardProgress({ total, current, labels }: Props) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className="w-full">
      {/* Barra (visible siempre, indicador principal) */}
      <div className="flex items-center justify-between text-[11px] text-text-mid">
        <span className="font-semibold uppercase tracking-wider">
          Paso {current + 1} de {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-indigo-900/40">
        <div
          className="h-full bg-gradient-to-r from-cyan to-fuchsia transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Puntos por paso (solo desktop, ≥sm) */}
      {labels && (
        <ol className="mt-3 hidden items-center justify-between gap-2 sm:flex">
          {labels.map((label, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li
                key={label}
                className={`flex min-w-0 flex-1 items-center gap-1.5 text-[10px] ${
                  active ? "text-text-hi" : done ? "text-cyan" : "text-text-lo"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                    active
                      ? "border-cyan bg-cyan/15 text-cyan"
                      : done
                        ? "border-cyan/50 bg-cyan/10 text-cyan"
                        : "border-indigo-400/30 bg-indigo-900/40 text-text-lo"
                  }`}
                >
                  {done ? <Check size={9} /> : i + 1}
                </span>
                <span className="truncate">{label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

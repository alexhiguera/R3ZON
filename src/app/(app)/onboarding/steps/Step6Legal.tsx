"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

const REQUIRED = [
  { tipo: "terminos", label: "Términos y condiciones de uso", href: "/legal/terminos" },
  { tipo: "privacidad", label: "Política de privacidad (RGPD/LOPDGDD)", href: "/legal/privacidad" },
  { tipo: "cookies", label: "Política de cookies", href: "/legal/cookies" },
];

const OPCIONAL = [{ tipo: "marketing", label: "Acepto recibir comunicaciones comerciales" }];

export const LEGAL_VERSION = "2026-04-28";
export const LEGAL_REQUIRED = REQUIRED;
export const LEGAL_OPCIONAL = OPCIONAL;

type Props = {
  checked: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
};

export function Step6Legal({ checked, onChange }: Props) {
  const set = (k: string, v: boolean) => onChange({ ...checked, [k]: v });
  return (
    <div>
      <p className="text-sm text-text-mid">
        ANTARES cumple con el <b>RGPD</b> y la <b>LOPDGDD</b>. Para activar tu cuenta necesitamos tu
        consentimiento explícito.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {REQUIRED.map((d) => (
          <Row key={d.tipo} checked={!!checked[d.tipo]} onChange={(v) => set(d.tipo, v)} required>
            He leído y acepto los{" "}
            <Link href={d.href} target="_blank" className="font-semibold text-cyan hover:underline">
              {d.label}
            </Link>
          </Row>
        ))}
        <div className="my-2 h-px bg-indigo-400/15" />
        {OPCIONAL.map((d) => (
          <Row key={d.tipo} checked={!!checked[d.tipo]} onChange={(v) => set(d.tipo, v)}>
            {d.label} <span className="text-text-lo">(opcional)</span>
          </Row>
        ))}
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-text-lo">
        <ShieldCheck size={11} /> Tu consentimiento se registra con sello de tiempo, IP y versión
        legal {LEGAL_VERSION}.
      </p>
    </div>
  );
}

function Row({
  checked,
  onChange,
  required,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
        checked
          ? "border-cyan/40 bg-cyan/5"
          : "border-indigo-400/15 bg-indigo-900/20 hover:border-indigo-400/30"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-cyan"
      />
      <span className="text-sm text-text-mid">{children}</span>
    </label>
  );
}

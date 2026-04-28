"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const VERSION = "2026-04-28";

const REQUIRED = [
  {
    tipo: "terminos",
    label: "Términos y condiciones de uso",
    href: "/legal/terminos",
    obligatorio: true,
  },
  {
    tipo: "privacidad",
    label: "Política de privacidad (RGPD/LOPDGDD)",
    href: "/legal/privacidad",
    obligatorio: true,
  },
  {
    tipo: "cookies",
    label: "Política de cookies",
    href: "/legal/cookies",
    obligatorio: true,
  },
];

const OPCIONAL = [
  {
    tipo: "marketing",
    label: "Acepto recibir comunicaciones comerciales",
    obligatorio: false,
  },
];

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todoAceptado = REQUIRED.every((r) => checked[r.tipo]);

  const enviar = async () => {
    setLoading(true);
    setError(null);
    const consentimientos = [...REQUIRED, ...OPCIONAL].map((d) => ({
      tipo: d.tipo,
      version: VERSION,
      aceptado: !!checked[d.tipo],
    }));

    const { error } = await supabase.rpc("registrar_onboarding", {
      p_consentimientos: consentimientos,
      p_user_agent: navigator.userAgent,
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="card-glass overflow-hidden">
        <div className="rainbow-bar" />
        <div className="p-6 sm:p-8">
          <div className="section-label mb-2">Bienvenida · paso 1 de 1</div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Antes de empezar
          </h1>
          <div className="accent-bar mt-3" />
          <p className="mt-3 text-sm text-text-mid">
            R3ZON cumple con el <b>RGPD</b> y la <b>LOPDGDD</b>. Para activar tu
            cuenta necesitamos tu consentimiento explícito.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {REQUIRED.map((d) => (
              <Row
                key={d.tipo}
                checked={!!checked[d.tipo]}
                onChange={(v) => setChecked((s) => ({ ...s, [d.tipo]: v }))}
                required
              >
                He leído y acepto los{" "}
                <Link
                  href={d.href}
                  target="_blank"
                  className="font-semibold text-cyan hover:underline"
                >
                  {d.label}
                </Link>
              </Row>
            ))}

            <div className="my-2 h-px bg-indigo-400/15" />

            {OPCIONAL.map((d) => (
              <Row
                key={d.tipo}
                checked={!!checked[d.tipo]}
                onChange={(v) => setChecked((s) => ({ ...s, [d.tipo]: v }))}
              >
                {d.label} <span className="text-text-lo">(opcional)</span>
              </Row>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          <button
            onClick={enviar}
            disabled={!todoAceptado || loading}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia text-sm font-bold text-bg transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <CheckCircle size={16} />
            )}
            Aceptar y continuar
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[0.7rem] text-text-lo">
            <ShieldCheck size={11} /> Tu consentimiento se registra con sello de
            tiempo, IP y versión legal {VERSION}.
          </p>
        </div>
      </div>
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

"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

const LEGAL_VERSION = "2026-04-28";

export default function RegistroPage() {
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacidad, setPrivacidad] = useState(false);
  const [cookies, setCookies] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacidad) {
      setError("Debes aceptar la política de privacidad para continuar.");
      return;
    }
    setLoading(true);
    setError(null);
    const pendingConsents = [
      { tipo: "privacidad", aceptado: true,      version: LEGAL_VERSION },
      { tipo: "cookies",    aceptado: cookies,   version: LEGAL_VERSION },
      { tipo: "marketing",  aceptado: marketing, version: LEGAL_VERSION },
    ];
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_negocio: nombre,
          pending_consents: pendingConsents,
        },
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="font-display text-xl font-bold">Revisa tu email</h1>
        <p className="mt-2 text-sm text-text-mid">
          Te hemos enviado un enlace de confirmación a <b>{email}</b>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="section-label mb-2">Nueva cuenta</div>
        <h1 className="font-display text-2xl font-bold">Crea tu negocio</h1>
        <p className="mt-1 text-sm text-text-mid">
          14 días gratis. Sin tarjeta. Cancela cuando quieras.
        </p>
      </div>

      <OAuthButtons />

      <div className="flex items-center gap-3 text-xs text-text-lo">
        <div className="h-px flex-1 bg-indigo-400/15" />
        <span>o con email</span>
        <div className="h-px flex-1 bg-indigo-400/15" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field label="Nombre del negocio" value={nombre} onChange={setNombre} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field
          label="Contraseña (mín. 8 caracteres)"
          type="password"
          value={password}
          onChange={setPassword}
        />

        <div className="mt-2 space-y-2 rounded-xl border border-indigo-400/20 bg-indigo-900/20 p-3">
          <Consent
            checked={privacidad}
            onChange={setPrivacidad}
            required
            label={
              <>
                He leído y acepto la{" "}
                <Link href="/legal/privacidad" target="_blank" className="text-cyan hover:underline">
                  política de privacidad
                </Link>{" "}
                y el{" "}
                <Link href="/legal/aviso-legal" target="_blank" className="text-cyan hover:underline">
                  aviso legal
                </Link>{" "}
                <span className="text-rose-300">*</span>
              </>
            }
          />
          <Consent
            checked={cookies}
            onChange={setCookies}
            label={
              <>
                Acepto las cookies de preferencias y analíticas descritas en la{" "}
                <Link href="/legal/cookies" target="_blank" className="text-cyan hover:underline">
                  política de cookies
                </Link>
                .
              </>
            }
          />
          <Consent
            checked={marketing}
            onChange={setMarketing}
            label="Quiero recibir comunicaciones comerciales sobre novedades y ofertas (puedes retirar el consentimiento en cualquier momento)."
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !privacidad}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia text-sm font-bold text-bg transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
          Crear cuenta
        </button>
      </form>

      <div className="text-center text-sm text-text-mid">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-cyan hover:underline">
          Inicia sesión
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-mid">{label}</span>
      <input
        type={type}
        required
        minLength={type === "password" ? 8 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-4 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
      />
    </label>
  );
}

function Consent({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        className="mt-0.5 h-4 w-4 accent-cyan"
      />
      <span className="text-[11px] leading-relaxed text-text-mid">{label}</span>
    </label>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { AlertCircle, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { createClient } from "@/lib/supabase/client";

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) {
    return "Email o contraseña incorrectos. Comprueba tus datos e inténtalo de nuevo.";
  }
  if (msg.includes("Email not confirmed")) {
    return "Debes confirmar tu email. Revisa tu bandeja de entrada.";
  }
  if (msg.includes("Too many requests")) {
    return "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.";
  }
  if (msg.includes("User not found")) {
    return "No existe una cuenta con ese email.";
  }
  return "Algo salió mal. Inténtalo de nuevo.";
}

export default function LoginPage() {
  // useSearchParams() requiere Suspense en build estático (Next.js 16).
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";
  const oauthError = params.get("error") === "oauth";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    oauthError ? "No se pudo iniciar sesión con Google. Inténtalo de nuevo." : null,
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(translateError(error.message));
      return;
    }
    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="section-label mb-2">Acceso</div>
        <h1 className="font-display text-2xl font-bold">Bienvenido de nuevo</h1>
        <p className="mt-1 text-sm text-text-mid">Inicia sesión para gestionar tu negocio.</p>
      </div>

      <OAuthButtons />

      <div className="flex items-center gap-3 text-xs text-text-lo">
        <div className="h-px flex-1 bg-indigo-400/15" />
        <span>o con email</span>
        <div className="h-px flex-1 bg-indigo-400/15" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Contraseña" type="password" value={password} onChange={setPassword} />

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia text-sm font-bold text-bg transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
          Iniciar sesión
        </button>
      </form>

      <div className="text-center text-sm text-text-mid">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-cyan hover:underline">
          Regístrate
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-mid">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-4 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
      />
    </label>
  );
}

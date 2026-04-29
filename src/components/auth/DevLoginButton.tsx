"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Botón de acceso instantáneo para desarrollo.
 * Solo se monta cuando NODE_ENV === 'development' — en producción
 * el componente devuelve null y Next.js lo elimina del bundle.
 */
export function DevLoginButton({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  // Guard de producción: compilado fuera en build de prod.
  if (process.env.NODE_ENV !== "development") return null;

  const email    = process.env.NEXT_PUBLIC_DEV_EMAIL;
  const password = process.env.NEXT_PUBLIC_DEV_PASSWORD;

  if (!email || !password) return null;

  return <Inner email={email} password={password} redirectTo={redirectTo} />;
}

function Inner({
  email,
  password,
  redirectTo,
}: {
  email: string;
  password: string;
  redirectTo: string;
}) {
  const supabase = createClient();
  const router   = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const entrar = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "Usuario no existe aún. Ejecuta: npm run seed:admin"
          : error.message
      );
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Separador visual */}
      <div className="flex items-center gap-3 text-xs text-text-lo">
        <div className="h-px flex-1 bg-warn/20" />
        <span className="rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 font-mono text-[0.65rem] font-semibold text-warn">
          DEV MODE
        </span>
        <div className="h-px flex-1 bg-warn/20" />
      </div>

      <button
        onClick={entrar}
        disabled={loading}
        className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-warn/40 bg-warn/10 text-sm font-bold text-warn transition-all hover:bg-warn/20 active:scale-[0.99] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Zap size={16} className="transition-transform group-hover:scale-110" />
        )}
        Entrar directo (dev)
      </button>

      {error && (
        <p className="text-center text-xs text-danger">{error}</p>
      )}

      <p className="text-center text-[0.65rem] text-text-lo">
        Entra como <span className="font-mono text-warn">{email}</span>
        {" · "}invisible en producción
      </p>
    </div>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Verify2FA() {
  const supabase = createClient();
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.[0];
      if (!totp) return router.replace("/dashboard");
      setFactorId(totp.id);
    })();
  }, [router, supabase]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
    if (e1 || !ch) {
      setLoading(false);
      return setError(e1?.message ?? "Error iniciando challenge");
    }
    const { error: e2 } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code,
    });
    setLoading(false);
    if (e2) return setError(e2.message);
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
          <ShieldCheck size={18} />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold">Verificación en dos pasos</h1>
          <p className="text-xs text-text-mid">
            Introduce el código de 6 dígitos de tu app autenticadora.
          </p>
        </div>
      </div>

      <form onSubmit={verify} className="flex flex-col gap-3">
        <input
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
          placeholder="000000"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="h-14 rounded-xl border border-indigo-400/20 bg-indigo-900/30 text-center font-display text-2xl tracking-[0.4em] text-text-hi focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
        />
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia text-sm font-bold text-bg disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          Verificar
        </button>
      </form>
    </div>
  );
}

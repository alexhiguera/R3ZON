"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Configurar2FA() {
  const supabase = createClient();
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Limpia factores no verificados previos
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "R3ZON · " + new Date().toISOString().slice(0, 10),
      });
      if (error) return setError(error.message);
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
  }, [supabase]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
    if (e1 || !ch) {
      setLoading(false);
      return setError(e1?.message ?? "Error");
    }
    const { error: e2 } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code,
    });
    setLoading(false);
    if (e2) return setError(e2.message);
    router.push("/ajustes");
    router.refresh();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Seguridad"
        title="Activar 2FA"
        description="Escanea el QR con Google Authenticator, Authy o 1Password e introduce el código."
      />

      <div className="card-glass p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex h-56 w-56 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-white p-3">
            {qr ? (
              <img src={qr} alt="QR 2FA" className="h-full w-full" />
            ) : (
              <Loader2 className="animate-spin text-slate-700" />
            )}
          </div>

          <div className="flex w-full flex-col gap-4">
            <div>
              <div className="section-label mb-1.5">Clave manual</div>
              <button
                type="button"
                onClick={copy}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-indigo-400/20 bg-indigo-900/40 px-3 py-2.5 font-mono text-xs text-text-hi hover:border-cyan/40"
              >
                <span className="break-all">{secret || "···"}</span>
                {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
              </button>
            </div>

            <form onSubmit={verify} className="flex flex-col gap-3">
              <div>
                <div className="section-label mb-1.5">Código de 6 dígitos</div>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  pattern="\d{6}"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="h-14 w-full rounded-xl border border-indigo-400/20 bg-indigo-900/30 text-center font-display text-2xl tracking-[0.4em] focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
                />
              </div>

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
                {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                Activar 2FA
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

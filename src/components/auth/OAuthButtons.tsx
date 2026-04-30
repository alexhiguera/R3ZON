"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.6 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5c-2 1.4-4.5 2.3-7.1 2.3-5.3 0-9.6-3.1-11.3-7.5l-6.5 5C9.6 39.4 16.2 43.5 24 43.5z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.1 5c-.4.4 6.6-4.8 6.6-14.5 0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

export function OAuthButtons() {
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // No setLoading(false) — el navegador redirige, así que el spinner
    // permanece visible hasta que la página cambia.
  };

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white/95 text-sm font-semibold text-slate-900 transition-all hover:bg-white active:scale-[0.99] disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : <GoogleIcon />}
      <span>Continuar con Google</span>
    </button>
  );
}

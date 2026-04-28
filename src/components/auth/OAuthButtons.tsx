"use client";

import { createClient } from "@/lib/supabase/client";
import type { Provider } from "@supabase/supabase-js";

const PROVIDERS: {
  id: Provider;
  label: string;
  icon: React.ReactNode;
  className: string;
}[] = [
  {
    id: "google",
    label: "Continuar con Google",
    className: "bg-white/95 text-slate-900 hover:bg-white",
    icon: (
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.6 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5c-2 1.4-4.5 2.3-7.1 2.3-5.3 0-9.6-3.1-11.3-7.5l-6.5 5C9.6 39.4 16.2 43.5 24 43.5z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.1 5c-.4.4 6.6-4.8 6.6-14.5 0-1.2-.1-2.3-.4-3.5z"/>
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Continuar con Apple",
    className: "bg-black text-white hover:bg-black/85 border border-white/10",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M16.365 1.43c0 1.14-.43 2.27-1.13 3.07-.78.9-2.05 1.59-3.04 1.5-.13-1.11.4-2.25 1.1-2.97.78-.83 2.13-1.47 3.07-1.6zM21 17.27c-.34.78-.74 1.5-1.2 2.16-.62.91-1.13 1.54-1.52 1.9-.6.55-1.24.83-1.93.84-.5.01-1.1-.14-1.81-.46-.71-.31-1.36-.46-1.96-.46-.62 0-1.29.15-2.01.46-.72.31-1.3.47-1.74.49-.66.03-1.32-.26-1.97-.85-.42-.39-.94-1.04-1.57-1.96-.67-.97-1.22-2.1-1.66-3.39C2.06 14.78 1.83 13.4 1.83 12.07c0-1.52.33-2.83.99-3.93.52-.88 1.21-1.58 2.08-2.09.87-.51 1.81-.78 2.83-.79.53 0 1.22.16 2.07.48.85.32 1.4.49 1.64.49.18 0 .79-.19 1.85-.58 1-.36 1.85-.51 2.55-.45 1.88.15 3.29.89 4.22 2.22-1.68 1.02-2.51 2.45-2.49 4.28.02 1.43.54 2.62 1.55 3.57.46.44.97.78 1.54 1.02-.13.39-.27.76-.42 1.11z"/>
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Continuar con Facebook",
    className: "bg-[#1877F2] text-white hover:bg-[#166fe0]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.23 2.69.23v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
      </svg>
    ),
  },
];

export function OAuthButtons() {
  const supabase = createClient();

  const sign = async (provider: Provider) => {
    const redirect =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirect },
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => sign(p.id)}
          className={`flex h-12 w-full items-center justify-center gap-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] ${p.className}`}
        >
          {p.icon}
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
}

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PendingConsent = { tipo: string; aceptado: boolean; version: string };

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=oauth`);

  // Registrar consentimientos pendientes (onboarding) si los hay.
  try {
    const { data: userData } = await supabase.auth.getUser();
    const meta = (userData.user?.user_metadata ?? {}) as Record<string, unknown>;
    const pending = meta.pending_consents as PendingConsent[] | undefined;

    if (Array.isArray(pending) && pending.length > 0) {
      const ua = request.headers.get("user-agent");
      const fwd = request.headers.get("x-forwarded-for");
      const ip = fwd ? fwd.split(",")[0]!.trim() : null;

      for (const c of pending) {
        if (!c?.tipo || !c?.version) continue;
        await supabase.rpc("registrar_consentimiento", {
          p_tipo: c.tipo,
          p_version: c.version,
          p_aceptado: !!c.aceptado,
          p_ip: ip,
          p_user_agent: ua,
        });
      }

      await supabase.auth.updateUser({ data: { pending_consents: null } });
    }
  } catch (err) {
    console.error("[auth/callback] consent registration", err);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

// Sólo aceptamos rutas internas para `next` — evita open-redirect.
function safeNext(raw: string | null): string {
  if (!raw) return "/agenda";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/agenda";
  return raw;
}

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));

  // Sólo usuarios autenticados pueden iniciar el OAuth.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    // Visible para el usuario en la UI: redirige a la página de origen
    // con `?google_error=...` y los componentes muestran un toast.
    const dest = new URL(next, origin);
    dest.searchParams.set("google_error", "missing_google_credentials");
    return NextResponse.redirect(dest.toString());
  }

  // CSRF: state aleatorio en cookie httpOnly, validado en el callback.
  const state = randomBytes(24).toString("base64url");

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  `${origin}/api/integrations/google/callback`,
    response_type: "code",
    scope:         SCOPES,
    access_type:   "offline",       // necesario para obtener refresh_token
    prompt:        "consent",       // fuerza refresh_token incluso si ya autorizó antes
    include_granted_scopes: "true",
    state,
  });

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  const cookieOpts = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/api/integrations/google",
    maxAge:   600, // 10 min
  };
  res.cookies.set("g_oauth_state", state,    cookieOpts);
  res.cookies.set("g_oauth_next",  next,     cookieOpts);
  return res;
}

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

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);

  // Sólo usuarios autenticados pueden iniciar el OAuth.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/ajustes`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      `${origin}/ajustes?error=${encodeURIComponent("GOOGLE_CLIENT_ID no configurado")}`
    );
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
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/api/integrations/google",
    maxAge:   600, // 10 min
  });
  return res;
}

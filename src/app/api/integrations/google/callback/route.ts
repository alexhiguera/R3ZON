import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * OAuth 2 callback de Google → intercambia `code` por tokens y los persiste
 * cifrados vía la RPC `set_google_tokens` (pgcrypto + master key).
 *
 * Validaciones de seguridad:
 *   · `state` debe coincidir con la cookie httpOnly puesta por /connect.
 *   · El usuario debe estar autenticado (sin sesión Supabase la RPC fallaría
 *     porque el RLS depende de `auth.uid()`).
 *   · Nunca logueamos `code`, `access_token` ni `refresh_token`.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  // `next` viene del cookie que set /connect; Google no lo echo-back.
  const next = sanitizeNext(request.cookies.get("g_oauth_next")?.value) || "/agenda";

  // Usuario denegó el consentimiento o Google devolvió un error.
  if (error || !code) {
    return redirectWithError(origin, error || "oauth_cancelled", next);
  }

  // CSRF: state cookie ⇄ query state.
  const cookieState = request.cookies.get("g_oauth_state")?.value;
  if (!state || !cookieState || state !== cookieState) {
    return redirectWithError(origin, "invalid_state", next);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithError(origin, "google_credentials_missing", next);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(next)}`
    );
  }

  // Intercambio del code por tokens.
  let tokenJson: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
    scope?: string;
    token_type?: string;
  };
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  `${origin}/api/integrations/google/callback`,
        grant_type:    "authorization_code",
      }),
    });
    if (!res.ok) {
      // body se descarta deliberadamente (puede contener el code).
      console.error("google_token_exchange_failed", res.status);
      return redirectWithError(origin, "token_exchange_failed", next);
    }
    tokenJson = await res.json();
  } catch (err) {
    console.error("google_token_exchange_network_error", err);
    return redirectWithError(origin, "network_error", next);
  }

  // Sin refresh_token = futuras renovaciones imposibles. Forzamos a re-conectar.
  if (!tokenJson.refresh_token) {
    return redirectWithError(origin, "no_refresh_token", next);
  }

  const expiresAt = new Date(Date.now() + (tokenJson.expires_in - 30) * 1000);
  const email = decodeIdTokenEmail(tokenJson.id_token);

  const { error: rpcError } = await supabase.rpc("set_google_tokens", {
    p_access_token:  tokenJson.access_token,
    p_refresh_token: tokenJson.refresh_token,
    p_expires_at:    expiresAt.toISOString(),
    p_email:         email,
    p_scope:         tokenJson.scope ?? null,
  });

  if (rpcError) {
    console.error("set_google_tokens_failed", rpcError.message);
    return redirectWithError(origin, "persistence_failed", next);
  }

  // Borrar cookies de state/next — ya no son necesarias.
  const dest = new URL(next, origin);
  dest.searchParams.set("google", "connected");
  const res = NextResponse.redirect(dest.toString());
  const expire = { path: "/api/integrations/google", maxAge: 0 };
  res.cookies.set("g_oauth_state", "", expire);
  res.cookies.set("g_oauth_next",  "", expire);
  return res;
}

function sanitizeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function redirectWithError(origin: string, code: string, next: string) {
  const dest = new URL(next, origin);
  dest.searchParams.set("google_error", code);
  return NextResponse.redirect(dest.toString());
}

/**
 * Extrae el email del payload del id_token (JWT). NO verificamos firma
 * porque sólo lo usamos como label visible — la fuente fiable de email
 * vendría de la API userinfo de Google si fuera crítico.
 */
function decodeIdTokenEmail(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const [, payload] = idToken.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
    );
    return typeof decoded.email === "string" ? decoded.email : null;
  } catch {
    return null;
  }
}

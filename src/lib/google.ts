/**
 * Cliente ligero de Google OAuth 2 + Calendar API v3.
 *
 * Diseñado para Server Actions / Route Handlers:
 *   · Lee/guarda los tokens cifrados a través de RPC (set/get_google_tokens).
 *   · Refresca el access_token automáticamente al recibir un 401.
 *
 * No depende de `googleapis`: usa `fetch` nativo de Next.js 15 / Node 20.
 */

import { createClient } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CAL_BASE = "https://www.googleapis.com/calendar/v3";

export type GoogleTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO timestamptz
  sync_token: string | null;
  email: string | null;
};

export type GoogleCalendarEvent = {
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  etag?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
};

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export async function loadTokens(): Promise<GoogleTokens | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_google_tokens");
  if (error || !data || data.length === 0) return null;
  return data[0] as GoogleTokens;
}

export async function saveTokens(args: {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email?: string | null;
  scope?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_google_tokens", {
    p_access_token: args.accessToken,
    p_refresh_token: args.refreshToken,
    p_expires_at: args.expiresAt.toISOString(),
    p_email: args.email ?? null,
    p_scope: args.scope ?? null,
  });
  if (error) throw new Error(`set_google_tokens: ${error.message}`);
}

async function persistRefreshedAccessToken(accessToken: string, expiresAt: Date) {
  const supabase = await createClient();
  await supabase.rpc("update_google_access_token", {
    p_access_token: accessToken,
    p_expires_at: expiresAt.toISOString(),
  });
}

export async function persistSyncToken(syncToken: string) {
  const supabase = await createClient();
  await supabase.rpc("set_google_sync_token", { p_sync_token: syncToken });
}

// ---------------------------------------------------------------------------
// Refresh flow
// ---------------------------------------------------------------------------

/**
 * Intercambia el refresh_token por un access_token nuevo y lo persiste.
 * Lanza si Google rechaza el refresh (token revocado → re-conectar).
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados");
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google refresh failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };

  const expiresAt = new Date(Date.now() + (json.expires_in - 30) * 1000);
  await persistRefreshedAccessToken(json.access_token, expiresAt);
  return json.access_token;
}

// ---------------------------------------------------------------------------
// Fetch con auto-refresh ante 401
// ---------------------------------------------------------------------------

/**
 * Llama a la Google Calendar API. Si el access_token está caducado o Google
 * responde 401, refresca con el refresh_token y reintenta UNA vez.
 */
export async function googleFetch(
  path: string,
  init: RequestInit = {},
  tokens?: GoogleTokens,
): Promise<Response> {
  const t = tokens ?? (await loadTokens());
  if (!t) throw new Error("No Google connection for current user");

  // Refresh proactivo si el access_token está expirado.
  let accessToken = t.access_token;
  if (new Date(t.expires_at).getTime() <= Date.now()) {
    accessToken = await refreshAccessToken(t.refresh_token);
  }

  const url = path.startsWith("http") ? path : `${GOOGLE_CAL_BASE}${path}`;
  const doFetch = (token: string) =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

  let res = await doFetch(accessToken);

  // Reactivo: 401 → refresh + retry.
  if (res.status === 401) {
    accessToken = await refreshAccessToken(t.refresh_token);
    res = await doFetch(accessToken);
  }
  return res;
}

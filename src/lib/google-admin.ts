/**
 * Cliente Google Calendar para el path admin (webhook). NO depende de la
 * sesión de un usuario — recibe `userId` explícito y usa la service-role
 * key de Supabase para leer/escribir tokens vía RPCs SECURITY DEFINER.
 *
 * Sólo importable desde route handlers server-side (webhook). Si se importa
 * desde un client component → TypeScript lo permite pero falla en runtime
 * porque `SUPABASE_SERVICE_ROLE_KEY` no está expuesta al cliente.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CAL_BASE = "https://www.googleapis.com/calendar/v3";

export type AdminTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  sync_token: string | null;
  email: string | null;
  negocio_id: string;
};

export async function loadTokensFor(userId: string): Promise<AdminTokens | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_google_tokens_admin", { p_user_id: userId });
  if (error || !data || data.length === 0) return null;
  return data[0] as AdminTokens;
}

async function refreshAccessTokenAdmin(userId: string, refreshToken: string): Promise<string> {
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
    // No logueamos body — puede contener token.
    throw new Error(`google_refresh_admin_failed_${res.status}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + (json.expires_in - 30) * 1000);

  const supabase = createAdminClient();
  await supabase.rpc("update_google_access_token_admin", {
    p_user_id: userId,
    p_access_token: json.access_token,
    p_expires_at: expiresAt.toISOString(),
  });
  return json.access_token;
}

/**
 * Equivalente admin de `googleFetch` — recibe `userId` explícito.
 */
export async function googleFetchAdmin(
  userId: string,
  path: string,
  init: RequestInit = {},
  tokens?: AdminTokens,
): Promise<Response> {
  const t = tokens ?? (await loadTokensFor(userId));
  if (!t) throw new Error(`No google connection for user ${userId}`);

  let accessToken = t.access_token;
  if (new Date(t.expires_at).getTime() <= Date.now()) {
    accessToken = await refreshAccessTokenAdmin(userId, t.refresh_token);
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
  if (res.status === 401) {
    accessToken = await refreshAccessTokenAdmin(userId, t.refresh_token);
    res = await doFetch(accessToken);
  }
  return res;
}

export async function persistSyncTokenFor(userId: string, syncToken: string) {
  const supabase = createAdminClient();
  await supabase.rpc("set_google_sync_token_admin", {
    p_user_id: userId,
    p_sync_token: syncToken,
  });
}

"use server";

/**
 * Server Actions de cara al cliente que NO devuelven secretos.
 * El estado de conexión Google que ven los componentes UI vive aquí.
 */

import { createClient } from "@/lib/supabase/server";

export type GoogleStatus = {
  connected: boolean;
  email: string | null;
  expiresAt: string | null;
  scope: string | null;
  watchActive: boolean;
  watchExpiresAt: string | null;
  /** El servidor tiene `GOOGLE_CLIENT_ID/SECRET` y `GOOGLE_WEBHOOK_URL`. Si es false, los botones de Conectar/Sincronizar no funcionarán hasta que se configure. */
  serverConfigured: boolean;
  /** Lista de env vars que faltan (sólo info para UI; no contiene valores). */
  missingEnv: string[];
};

function checkServerEnv(): { ok: boolean; missing: string[] } {
  const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_WEBHOOK_URL"];
  const missing = required.filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

export async function getGoogleConnectionStatus(): Promise<GoogleStatus> {
  const env = checkServerEnv();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      connected: false,
      email: null,
      expiresAt: null,
      scope: null,
      watchActive: false,
      watchExpiresAt: null,
      serverConfigured: env.ok,
      missingEnv: env.missing,
    };
  }

  // RLS filtra al `auth.uid()`. Sólo seleccionamos columnas públicas — los
  // tokens cifrados no se exponen al cliente bajo ninguna circunstancia.
  const { data, error } = await supabase
    .from("google_connections")
    .select("google_account_email, expires_at, scope, channel_id, channel_expiration")
    .maybeSingle();

  if (error || !data) {
    return {
      connected: false,
      email: null,
      expiresAt: null,
      scope: null,
      watchActive: false,
      watchExpiresAt: null,
      serverConfigured: env.ok,
      missingEnv: env.missing,
    };
  }

  const watchActive = !!(
    data.channel_id &&
    data.channel_expiration &&
    new Date(data.channel_expiration) > new Date()
  );
  return {
    connected: true,
    email: data.google_account_email ?? null,
    expiresAt: data.expires_at ?? null,
    scope: data.scope ?? null,
    watchActive,
    watchExpiresAt: data.channel_expiration ?? null,
    serverConfigured: env.ok,
    missingEnv: env.missing,
  };
}

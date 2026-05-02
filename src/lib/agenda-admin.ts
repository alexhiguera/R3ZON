/**
 * Sync admin — usado por el webhook de Google Calendar para procesar cambios
 * en nombre de un usuario sin tener su sesión.
 *
 * NO `"use server"` deliberadamente: estas funciones reciben un `userId`
 * arbitrario. Si fueran Server Actions, un cliente malicioso podría
 * invocarlas pidiendo el sync de OTRO usuario. Sólo las llama el webhook
 * tras validar `(channel_id, channel_token)` contra la BD.
 */

import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  googleFetchAdmin,
  loadTokensFor,
  persistSyncTokenFor,
  type AdminTokens,
} from "@/lib/google-admin";

const CALENDAR_ID = "primary";
const WATCH_RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const WATCH_REQUEST_TTL_MS     = 6 * 24 * 60 * 60 * 1000;

type GoogleCalendarEventLite = {
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  etag?: string;
  start?: { dateTime?: string; date?: string };
  end?:   { dateTime?: string; date?: string };
};

type GoogleEventsList = {
  items: GoogleCalendarEventLite[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

function toIso(g?: { dateTime?: string; date?: string }): string | null {
  if (!g) return null;
  if (g.dateTime) return new Date(g.dateTime).toISOString();
  if (g.date)     return new Date(`${g.date}T00:00:00Z`).toISOString();
  return null;
}

function mapStatus(s: GoogleCalendarEventLite["status"]): "confirmada" | "tentativa" | "cancelada" {
  if (s === "cancelled") return "cancelada";
  if (s === "tentative") return "tentativa";
  return "confirmada";
}

export async function syncGoogleCalendarFor(userId: string): Promise<{
  inserted: number;
  updated:  number;
  cancelled: number;
}> {
  const tokens: AdminTokens | null = await loadTokensFor(userId);
  if (!tokens) throw new Error(`No google connection for user ${userId}`);

  const supabase = createAdminClient();
  const negocioId = tokens.negocio_id;

  const params = new URLSearchParams();
  params.set("singleEvents", "true");
  params.set("maxResults",   "250");

  if (tokens.sync_token) {
    params.set("syncToken", tokens.sync_token);
  } else {
    // Full sync: sin límite temporal — sincronizamos todas las citas.
    params.set("orderBy", "updated");
  }

  let inserted  = 0;
  let updated   = 0;
  let cancelled = 0;
  let nextSyncToken: string | null = null;
  let pageToken: string | undefined;

  do {
    if (pageToken) params.set("pageToken", pageToken); else params.delete("pageToken");

    let res = await googleFetchAdmin(
      userId,
      `/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params.toString()}`,
      {},
      tokens,
    );

    if (res.status === 410) {
      // sync_token caducado → full sync sin límite temporal.
      params.delete("syncToken");
      params.delete("timeMin");
      params.delete("timeMax");
      params.set("orderBy", "updated");
      res = await googleFetchAdmin(
        userId,
        `/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params.toString()}`,
        {},
        tokens,
      );
    }
    if (!res.ok) {
      throw new Error(`Google Calendar list (admin) failed: ${res.status}`);
    }

    const page = await res.json() as GoogleEventsList;
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
    pageToken     = page.nextPageToken;

    const items = page.items ?? [];
    if (items.length === 0) continue;

    const ids = items.map((e) => e.id).filter(Boolean);
    const { data: existing } = await supabase
      .from("agenda_eventos")
      .select("google_event_id")
      .eq("negocio_id", negocioId)
      .in("google_event_id", ids);
    const existingSet = new Set((existing ?? []).map((r) => r.google_event_id));

    const rows = items
      .map((ev) => {
        const start = toIso(ev.start);
        const end   = toIso(ev.end);
        if (!start || !end) return null;
        const status = mapStatus(ev.status);
        if (status === "cancelada") cancelled++;
        return {
          negocio_id:         negocioId,
          google_event_id:    ev.id,
          google_calendar_id: CALENDAR_ID,
          google_etag:        ev.etag ?? null,
          title:              ev.summary ?? "(sin título)",
          description:        ev.description ?? null,
          ubicacion:          ev.location ?? null,
          start_time:         start,
          end_time:           end,
          color:              ev.colorId ?? null,
          estado:             status,
          last_synced_at:     new Date().toISOString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) continue;

    const { error: upErr } = await supabase
      .from("agenda_eventos")
      .upsert(rows, { onConflict: "negocio_id,google_event_id" });
    if (upErr) throw new Error(`Upsert agenda_eventos (admin): ${upErr.message}`);

    for (const r of rows) {
      if (existingSet.has(r.google_event_id!)) updated++;
      else inserted++;
    }
  } while (pageToken);

  if (nextSyncToken) {
    await persistSyncTokenFor(userId, nextSyncToken);
  }

  return { inserted, updated, cancelled };
}

// ---------------------------------------------------------------------------
// Watch channel — variantes admin para el cron de renovación.
// ---------------------------------------------------------------------------

/**
 * Registra un nuevo watch channel para `userId` (admin path). Idéntico al
 * `registerCalendarWatch` user-context pero usando service-role.
 */
async function registerCalendarWatchFor(userId: string): Promise<void> {
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.startsWith("https://")) {
    throw new Error("GOOGLE_WEBHOOK_URL no configurada o no es HTTPS.");
  }

  const channelId    = randomUUID();
  const channelToken = randomBytes(32).toString("base64url");
  const expirationMs = Date.now() + WATCH_REQUEST_TTL_MS;

  const res = await googleFetchAdmin(userId, `/calendars/primary/events/watch`, {
    method: "POST",
    body: JSON.stringify({
      id:         channelId,
      type:       "web_hook",
      address:    webhookUrl,
      token:      channelToken,
      expiration: String(expirationMs),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`watch register admin ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { id: string; resourceId: string; expiration?: string };
  const expiration = data.expiration
    ? new Date(parseInt(data.expiration, 10))
    : new Date(expirationMs);

  const supabase = createAdminClient();
  // No hay RPC `set_google_watch_channel_admin`; escribimos directamente
  // saltando la RLS gracias al service-role.
  const { error } = await supabase
    .from("google_connections")
    .update({
      channel_id:          data.id,
      channel_token:       channelToken,
      channel_resource_id: data.resourceId,
      channel_expiration:  expiration.toISOString(),
      updated_at:          new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw new Error(`update watch channel admin: ${error.message}`);
}

/**
 * Lista todas las conexiones cuyo watch channel expira en <24h (o no tienen
 * canal) y renueva uno por uno. Pensado para llamarse desde un cron diario.
 *
 * Devuelve resumen para que el endpoint pueda loguearlo. No tira si una
 * conexión individual falla — sigue con el resto.
 */
export async function refreshExpiringWatchChannels(): Promise<{
  total: number;
  renewed: number;
  failed: number;
  errors: { userId: string; error: string }[];
}> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() + WATCH_RENEW_THRESHOLD_MS).toISOString();

  // Conexiones sin canal o con canal a punto de expirar.
  const { data, error } = await supabase
    .from("google_connections")
    .select("user_id, channel_expiration")
    .or(`channel_expiration.is.null,channel_expiration.lte.${cutoff}`);
  if (error) throw new Error(`list expiring channels: ${error.message}`);

  const rows = (data ?? []) as { user_id: string; channel_expiration: string | null }[];
  let renewed = 0;
  let failed  = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const row of rows) {
    try {
      await registerCalendarWatchFor(row.user_id);
      renewed++;
    } catch (err) {
      failed++;
      errors.push({
        userId: row.user_id,
        error:  err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { total: rows.length, renewed, failed, errors };
}

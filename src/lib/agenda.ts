"use server";

/**
 * Motor de sincronización Google Calendar ↔ tabla `agenda_eventos`.
 *
 * Estrategia:
 *   1. Si tenemos `sync_token` → sync incremental (sólo cambios desde la
 *      última vez). Si Google devuelve 410 GONE, hacemos full sync.
 *   2. Si NO hay sync_token → full sync de los próximos 90 días.
 *   3. Para cada evento remoto:
 *        · status = "cancelled" → upsert estado=cancelada (no borramos).
 *        · resto → upsert por (negocio_id, google_event_id).
 *   4. Persistimos el nuevo `nextSyncToken` para la siguiente llamada.
 */

import { createClient } from "@/lib/supabase/server";
import {
  googleFetch,
  loadTokens,
  persistSyncToken,
  type GoogleCalendarEvent,
} from "@/lib/google";

export type SyncResult = {
  inserted: number;
  updated: number;
  cancelled: number;
  syncToken: string | null;
};

type GoogleEventsList = {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

const CALENDAR_ID = "primary";

function toIsoOrNull(g?: { dateTime?: string; date?: string }): string | null {
  if (!g) return null;
  if (g.dateTime) return new Date(g.dateTime).toISOString();
  if (g.date)     return new Date(`${g.date}T00:00:00Z`).toISOString();
  return null;
}

function mapStatus(s: GoogleCalendarEvent["status"]): "confirmada" | "tentativa" | "cancelada" {
  if (s === "cancelled") return "cancelada";
  if (s === "tentative") return "tentativa";
  return "confirmada";
}

/**
 * Obtiene UNA página del feed de eventos respetando sync_token incremental.
 * Si Google devuelve 410 (sync_token caducado), reintenta sin él.
 */
async function fetchEventsPage(params: URLSearchParams): Promise<GoogleEventsList> {
  const path = `/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params.toString()}`;
  const res  = await googleFetch(path);

  if (res.status === 410) {
    // Sync token caducado → full sync.
    params.delete("syncToken");
    if (!params.has("timeMin")) {
      params.set("timeMin", new Date().toISOString());
    }
    const retry = await googleFetch(
      `/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params.toString()}`,
    );
    if (!retry.ok) throw new Error(`Google Calendar 410-retry failed: ${retry.status}`);
    return retry.json();
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar list failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Sincroniza eventos del usuario actual con `agenda_eventos`.
 * Llamable como Server Action desde un componente cliente.
 */
export async function syncGoogleCalendar(): Promise<SyncResult> {
  const tokens = await loadTokens();
  if (!tokens) throw new Error("Sin conexión con Google. Conecta tu cuenta primero.");

  const supabase = await createClient();

  // Determinamos negocio + cliente (FK) — el sync escribe con RLS bajo el
  // tenant del usuario autenticado, sólo necesitamos el id.
  const { data: perfil, error: errPerfil } = await supabase
    .from("perfiles_negocio")
    .select("id")
    .single();
  if (errPerfil || !perfil) throw new Error("No se encontró el perfil del negocio.");
  const negocioId = perfil.id as string;

  // Construimos el query inicial.
  const params = new URLSearchParams();
  params.set("singleEvents", "true");
  params.set("maxResults", "250");

  if (tokens.sync_token) {
    params.set("syncToken", tokens.sync_token);
  } else {
    // Full sync: ventana razonable (90 días hacia delante, 30 hacia atrás).
    const from = new Date(); from.setDate(from.getDate() - 30);
    const to   = new Date(); to.setDate(to.getDate() + 90);
    params.set("timeMin", from.toISOString());
    params.set("timeMax", to.toISOString());
    params.set("orderBy", "startTime");
  }

  let inserted = 0;
  let updated  = 0;
  let cancelled = 0;
  let nextSyncToken: string | null = null;
  let pageToken: string | undefined;

  do {
    if (pageToken) params.set("pageToken", pageToken); else params.delete("pageToken");

    const page = await fetchEventsPage(params);
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
    pageToken     = page.nextPageToken;

    const items = page.items ?? [];
    if (items.length === 0) continue;

    // Detectamos cuáles existen ya por google_event_id (insert vs update).
    const ids = items.map((e) => e.id).filter(Boolean);
    const { data: existing } = await supabase
      .from("agenda_eventos")
      .select("google_event_id")
      .in("google_event_id", ids);
    const existingSet = new Set((existing ?? []).map((r) => r.google_event_id));

    const rows = items
      .map((ev) => {
        const start = toIsoOrNull(ev.start);
        const end   = toIsoOrNull(ev.end);
        if (!start || !end) return null; // evento sin tiempos → ignoramos
        const status = mapStatus(ev.status);
        if (status === "cancelada") cancelled++;
        return {
          negocio_id:        negocioId,
          google_event_id:   ev.id,
          google_calendar_id: CALENDAR_ID,
          google_etag:       ev.etag ?? null,
          title:             ev.summary ?? "(sin título)",
          description:       ev.description ?? null,
          ubicacion:         ev.location ?? null,
          start_time:        start,
          end_time:          end,
          color:             ev.colorId ?? null,
          estado:            status,
          last_synced_at:    new Date().toISOString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) continue;

    const { error: upErr } = await supabase
      .from("agenda_eventos")
      .upsert(rows, { onConflict: "negocio_id,google_event_id" });
    if (upErr) throw new Error(`Upsert agenda_eventos: ${upErr.message}`);

    for (const r of rows) {
      if (existingSet.has(r.google_event_id!)) updated++;
      else inserted++;
    }
  } while (pageToken);

  if (nextSyncToken) {
    await persistSyncToken(nextSyncToken);
  }

  return { inserted, updated, cancelled, syncToken: nextSyncToken };
}

// ---------------------------------------------------------------------------
// Mutaciones (drag/resize/edición) — escriben en Supabase y, si el evento
// está vinculado a Google, hacen PATCH a Google Calendar.
// ---------------------------------------------------------------------------

export type AgendaEventoRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  color: string | null;
  estado: "confirmada" | "tentativa" | "cancelada";
  google_event_id: string | null;
  google_calendar_id: string | null;
  cliente_id: string | null;
  ubicacion: string | null;
};

/**
 * Lista los eventos del negocio actual en una ventana temporal.
 * Llamada por el calendario al cambiar de mes/semana.
 */
export async function listEvents(rangeStart: string, rangeEnd: string): Promise<AgendaEventoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_eventos")
    .select("id,title,description,start_time,end_time,color,estado,google_event_id,google_calendar_id,cliente_id,ubicacion")
    .gte("start_time", rangeStart)
    .lte("end_time",   rangeEnd)
    .neq("estado", "cancelada")
    .order("start_time", { ascending: true });
  if (error) throw new Error(`listEvents: ${error.message}`);
  return (data ?? []) as AgendaEventoRow[];
}

async function patchGoogleEvent(
  calendarId: string,
  googleEventId: string,
  patch: Record<string, unknown>,
) {
  const path = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`;
  const res  = await googleFetch(path, {
    method: "PATCH",
    body:   JSON.stringify(patch),
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Google PATCH ${res.status}: ${body}`);
  }
}

/**
 * Mueve/redimensiona un evento. Actualiza Supabase y, si procede, Google.
 * Pensado para dispararse desde `eventDrop` / `eventResize` de FullCalendar.
 */
export async function updateEventTime(args: {
  id: string;
  start: string;   // ISO
  end:   string;   // ISO
}): Promise<void> {
  const supabase = await createClient();

  // 1. Update local — necesitamos el google_event_id para sincronizar.
  const { data, error } = await supabase
    .from("agenda_eventos")
    .update({
      start_time: args.start,
      end_time:   args.end,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", args.id)
    .select("google_event_id, google_calendar_id")
    .single();
  if (error) throw new Error(`updateEventTime: ${error.message}`);

  // 2. Si está vinculado a Google → PATCH silencioso.
  if (data?.google_event_id) {
    await patchGoogleEvent(
      data.google_calendar_id || "primary",
      data.google_event_id,
      {
        start: { dateTime: new Date(args.start).toISOString() },
        end:   { dateTime: new Date(args.end).toISOString() },
      },
    );
  }
}

/**
 * Edita un evento existente (campos + tiempos). Atómico best-effort:
 * primero intenta PATCH a Google (si está vinculado); si falla, NO toca
 * Supabase para que ambos lados queden coherentes. Si Google va bien,
 * persiste en Supabase. Pensado para el modal de edición.
 */
export async function updateEvent(args: {
  id: string;
  title: string;
  description?: string | null;
  start: string;
  end:   string;
  color?: string | null;
  ubicacion?: string | null;
  cliente_id?: string | null;
}): Promise<void> {
  const supabase = await createClient();

  const { data: row, error: errRead } = await supabase
    .from("agenda_eventos")
    .select("google_event_id, google_calendar_id")
    .eq("id", args.id)
    .single();
  if (errRead) throw new Error(`updateEvent read: ${errRead.message}`);

  // 1. Si está vinculado a Google → PATCH primero (fuente fiable de error).
  if (row?.google_event_id) {
    await patchGoogleEvent(
      row.google_calendar_id || "primary",
      row.google_event_id,
      {
        summary:     args.title,
        description: args.description ?? "",
        location:    args.ubicacion ?? "",
        start: { dateTime: new Date(args.start).toISOString() },
        end:   { dateTime: new Date(args.end).toISOString() },
      },
    );
  }

  // 2. Persistir en Supabase.
  const { error } = await supabase
    .from("agenda_eventos")
    .update({
      title:       args.title,
      description: args.description ?? null,
      start_time:  args.start,
      end_time:    args.end,
      color:       args.color ?? null,
      ubicacion:   args.ubicacion ?? null,
      cliente_id:  args.cliente_id ?? null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", args.id);
  if (error) throw new Error(`updateEvent: ${error.message}`);
}

/**
 * Devuelve el detalle completo de un evento (para abrir el modal en edición).
 */
export async function getEvent(id: string): Promise<AgendaEventoRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_eventos")
    .select("id,title,description,start_time,end_time,color,estado,google_event_id,google_calendar_id,cliente_id,ubicacion")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as AgendaEventoRow;
}

/**
 * Crea un evento nuevo (local + Google si hay conexión activa).
 */
export async function createEvent(args: {
  title: string;
  description?: string | null;
  start: string;
  end:   string;
  color?: string | null;
  ubicacion?: string | null;
  cliente_id?: string | null;
}): Promise<AgendaEventoRow> {
  const supabase = await createClient();
  const { data: perfil } = await supabase.from("perfiles_negocio").select("id").single();
  if (!perfil) throw new Error("No hay perfil de negocio.");

  // Si hay tokens de Google, intentamos crear primero allí para guardar el id.
  // Si Google falla (token revocado, sin red, scope insuficiente…), seguimos
  // creando la cita localmente — no debe bloquear al usuario.
  let googleEventId: string | null = null;
  const googleCalId = "primary";
  try {
    const tokens = await loadTokens();
    if (tokens) {
      const res = await googleFetch(`/calendars/${googleCalId}/events`, {
        method: "POST",
        body: JSON.stringify({
          summary:     args.title,
          description: args.description ?? "",
          location:    args.ubicacion ?? "",
          start: { dateTime: new Date(args.start).toISOString() },
          end:   { dateTime: new Date(args.end).toISOString() },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        googleEventId = json.id ?? null;
      }
    }
  } catch {
    // Google no disponible → cita sólo local. La sincronización posterior
    // (botón Sincronizar) la enviará a Google si vuelve la conexión.
  }

  const { data, error } = await supabase
    .from("agenda_eventos")
    .insert({
      negocio_id:        perfil.id,
      title:             args.title,
      description:       args.description ?? null,
      start_time:        args.start,
      end_time:          args.end,
      color:             args.color ?? null,
      ubicacion:         args.ubicacion ?? null,
      cliente_id:        args.cliente_id ?? null,
      google_event_id:   googleEventId,
      google_calendar_id: googleEventId ? googleCalId : null,
      last_synced_at:    new Date().toISOString(),
    })
    .select("id,title,description,start_time,end_time,color,estado,google_event_id,google_calendar_id,cliente_id,ubicacion")
    .single();
  if (error) throw new Error(`createEvent: ${error.message}`);
  return data as AgendaEventoRow;
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agenda_eventos")
    .select("google_event_id, google_calendar_id")
    .eq("id", id)
    .single();

  if (data?.google_event_id) {
    const path = `/calendars/${encodeURIComponent(data.google_calendar_id || "primary")}/events/${encodeURIComponent(data.google_event_id)}`;
    await googleFetch(path, { method: "DELETE" });
  }
  const { error } = await supabase.from("agenda_eventos").delete().eq("id", id);
  if (error) throw new Error(`deleteEvent: ${error.message}`);
}

/**
 * Marca como desconectada la cuenta Google del usuario actual (borra tokens).
 */
export async function disconnectGoogle(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("google_connections").delete().neq("id", "");
  if (error) throw new Error(`disconnectGoogle: ${error.message}`);
}

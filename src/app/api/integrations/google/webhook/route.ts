import { type NextRequest, NextResponse } from "next/server";
import { syncGoogleCalendarFor } from "@/lib/agenda-admin";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook de Google Calendar (events.watch).
 *
 * Google envía un POST con headers:
 *   · X-Goog-Channel-ID         · canal que registramos en register watch.
 *   · X-Goog-Channel-Token      · secret aleatorio que validamos.
 *   · X-Goog-Resource-ID        · id del recurso observado.
 *   · X-Goog-Resource-State     · "sync" | "exists" | "not_exists".
 *   · X-Goog-Channel-Expiration · fecha caducidad RFC2616.
 *
 * Seguridad:
 *   · Sólo procesamos si (channel_id, channel_token) → fila válida.
 *   · Service-role sólo se usa aquí, server-side.
 *   · Devolvemos 200 incluso ante errores transitorios para evitar que
 *     Google reintente en avalancha (los reintentos los maneja Google
 *     sólo para 5xx, así que 200 = "vista, gracias").
 */
export async function POST(request: NextRequest) {
  const channelId = request.headers.get("x-goog-channel-id");
  const token = request.headers.get("x-goog-channel-token");
  const state = request.headers.get("x-goog-resource-state");

  // Ack inicial: Google envía un primer POST con state=sync nada más
  // crear el canal. No hay cambios que sincronizar; respondemos 200.
  if (state === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  if (!channelId || !token) {
    // Falta info → no podemos identificar el canal; 200 silencioso.
    return new NextResponse(null, { status: 200 });
  }

  // Resolver canal → user_id usando la RPC admin (service-role).
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("find_connection_by_channel", {
    p_channel_id: channelId,
    p_channel_token: token,
  });
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    // Canal huérfano o token inválido. Devolvemos 200 para que Google deje
    // de pegarle eventualmente (el canal se cancela cuando expire).
    return new NextResponse(null, { status: 200 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  const userId = row.user_id as string | undefined;
  if (!userId) {
    return new NextResponse(null, { status: 200 });
  }

  // Para "exists" / "update" disparamos un sync incremental.
  // Best-effort: cualquier error se loguea sin payload sensible.
  if (state === "exists" || state === "update" || !state) {
    try {
      await syncGoogleCalendarFor(userId);
    } catch (err) {
      console.error("webhook_sync_failed", err instanceof Error ? err.message : err);
    }
  }

  return new NextResponse(null, { status: 200 });
}

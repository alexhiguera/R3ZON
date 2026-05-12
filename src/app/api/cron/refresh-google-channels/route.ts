import { NextResponse, type NextRequest } from "next/server";
import { refreshExpiringWatchChannels } from "@/lib/agenda-admin";

/**
 * Cron diario: renueva los watch channels de Google Calendar que estén a
 * <24h de expirar (o no tengan canal). Sin esto, los usuarios que no abran
 * la agenda durante una semana dejarían de recibir notificaciones push.
 *
 * Protección: header `Authorization: Bearer ${CRON_SECRET}` o el equivalente
 * que use Vercel Cron (`x-vercel-cron: 1`). Si no llega el secret, 401.
 *
 * Conexión recomendada en producción:
 *   · Vercel Cron — añade en `vercel.json` un schedule `0 3 * * *` apuntando
 *     a esta URL; Vercel inyecta el header automáticamente.
 *   · Supabase pg_cron — `select cron.schedule('renew_google',
 *     '0 3 * * *', $$ select net.http_post(url, headers, body) $$);`
 *   · GitHub Actions — workflow scheduled que haga `curl -H Authorization`.
 */
export async function GET(request: NextRequest) {
  const authHeader  = request.headers.get("authorization");
  const vercelCron  = request.headers.get("x-vercel-cron");
  const expected    = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 500 }
    );
  }

  // Vercel Cron envía header propio Y autoriza con el bearer si lo configuras.
  // Aceptamos cualquiera de los dos.
  const ok =
    authHeader === `Bearer ${expected}` ||
    vercelCron === "1";

  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshExpiringWatchChannels();
    if (result.failed > 0) {
      console.error("cron_google_channels_failures", {
        failed: result.failed,
        renewed: result.renewed,
        errors: result.errors,
        ts: new Date().toISOString(),
      });
    } else {
      console.log("cron_google_channels_ok", { renewed: result.renewed, ts: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("cron_google_channels_crash", { error: msg, ts: new Date().toISOString() });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Permitimos POST también para que pg_cron + http extension funcione
// cómodamente (algunos endpoints sólo aceptan POST).
export const POST = GET;

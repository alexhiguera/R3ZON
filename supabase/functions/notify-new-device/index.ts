// supabase functions deploy notify-new-device --no-verify-jwt=false
//
// Variables de entorno requeridas (configurar en Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY        — API key de Resend (https://resend.com)
//   RESEND_FROM           — "R3ZON <noreply@tu-dominio.com>"
//
// Esta función se invoca desde el cliente vía supabase.functions.invoke()
// y usa el JWT del usuario autenticado para identificarlo.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });

  const { data: userRes, error: uerr } = await supabase.auth.getUser();
  if (uerr || !userRes.user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Health-check: comprueba que las variables están y que Resend responde,
  // pero NO envía email. Útil para verificar configuración sin disparar
  // correos a los usuarios reales.
  //   curl -X POST $URL/functions/v1/notify-new-device \
  //     -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  //     -d '{"mode":"health"}'
  if (body?.mode === "health") {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM");
    const checks: Record<string, unknown> = {
      RESEND_API_KEY_set: Boolean(apiKey),
      RESEND_FROM_set: Boolean(from),
      RESEND_FROM_value: from ?? null,
    };
    if (apiKey) {
      const ping = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      checks.resend_api_status = ping.status;
      checks.resend_api_ok = ping.ok;
      if (!ping.ok) checks.resend_api_error = await ping.text();
    }
    return new Response(JSON.stringify({ ok: true, checks }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { device_name } = body;
  const ip = req.headers.get("x-forwarded-for") ?? "desconocida";
  const ahora = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });

  const html = `
    <div style="font-family:'DM Sans',system-ui,sans-serif;background:#080714;color:#f0f4ff;padding:32px;border-radius:18px;max-width:560px;margin:0 auto">
      <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;margin:0 0 8px">
        Nuevo inicio de sesión
      </h1>
      <div style="height:3px;width:60px;background:linear-gradient(90deg,#22d3ee,#e879f9);border-radius:2px;margin:0 0 20px"></div>
      <p style="color:#c7d2fe;font-size:14px;line-height:1.6">
        Hemos detectado un acceso a tu cuenta R3ZON ANTARES desde un dispositivo nuevo.
      </p>
      <div style="background:rgba(49,46,129,0.4);border:1px solid rgba(129,140,248,0.2);border-radius:14px;padding:16px;margin:16px 0">
        <p style="margin:0 0 4px;font-size:12px;color:rgba(165,180,252,0.5);text-transform:uppercase;letter-spacing:0.15em">Dispositivo</p>
        <p style="margin:0 0 12px;font-weight:600">${device_name ?? "Desconocido"}</p>
        <p style="margin:0 0 4px;font-size:12px;color:rgba(165,180,252,0.5);text-transform:uppercase;letter-spacing:0.15em">Fecha</p>
        <p style="margin:0 0 12px">${ahora}</p>
        <p style="margin:0 0 4px;font-size:12px;color:rgba(165,180,252,0.5);text-transform:uppercase;letter-spacing:0.15em">IP</p>
        <p style="margin:0">${ip}</p>
      </div>
      <p style="color:#c7d2fe;font-size:13px;line-height:1.6">
        Si has sido tú, ignora este mensaje. Si <b>no reconoces</b> este acceso, cambia tu contraseña inmediatamente y activa la verificación en dos pasos.
      </p>
    </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM"),
      to: userRes.user.email,
      subject: "Nuevo inicio de sesión en R3ZON ANTARES",
      html,
    }),
  });

  if (!r.ok) {
    return new Response(JSON.stringify({ error: await r.text() }), { status: 500 });
  }

  await supabase
    .from("dispositivos_conocidos")
    .update({ notificado: true })
    .eq("user_id", userRes.user.id);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PRIVACIDAD_VERSION = "2026-04-28";
const TERMINOS_VERSION = "2026-04-28";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  rol: z.enum(["admin", "editor", "lector"]),
  nombre: z.string().trim().max(120).optional(),
  acepta_politicas: z.literal(true, {
    error: "Debes confirmar que el miembro aceptará las políticas al activar su cuenta.",
  }),
});

export const POST = withApiHandler("team/invite", async (request: NextRequest) => {
  // 1. Auth + tenant del solicitante.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: perfil, error: ePerfil } = await supabase
    .from("perfiles_negocio")
    .select("id, nombre_negocio")
    .eq("user_id", user.id)
    .single();
  if (ePerfil || !perfil) {
    return NextResponse.json({ error: "Sin negocio asociado" }, { status: 403 });
  }

  // 2. Validar payload.
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Payload inválido";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 3. Comprobar duplicado en este negocio.
  const { data: existente } = await supabase
    .from("miembros_negocio")
    .select("id, estado")
    .eq("negocio_id", perfil.id)
    .eq("email", body.email)
    .maybeSingle();
  if (existente) {
    return NextResponse.json(
      { error: `Ya hay un miembro con ese email (${existente.estado}).` },
      { status: 409 },
    );
  }

  // 4. Enviar invitación con SERVICE_ROLE_KEY.
  // Si createAdminClient lanza (SERVICE_ROLE_KEY ausente) lo captura el
  // wrapper `withApiHandler` y devuelve un 500 genérico al cliente.
  const admin = createAdminClient();

  const origin = new URL(request.url).origin;
  const { data: invited, error: eInvite } = await admin.auth.admin.inviteUserByEmail(body.email, {
    redirectTo: `${origin}/auth/callback?next=/equipo/aceptar`,
    data: {
      invited_to_negocio: perfil.id,
      invited_to_negocio_nombre: perfil.nombre_negocio,
      invited_rol: body.rol,
      invited_by: user.email,
    },
  });

  if (eInvite) {
    console.error("[api:team/invite] inviteUserByEmail", eInvite.message);
    return NextResponse.json({ error: "No se pudo enviar la invitación" }, { status: 500 });
  }

  // 5. Persistir la membresía pendiente con auditoría legal.
  const { error: eInsert } = await supabase.from("miembros_negocio").insert({
    negocio_id: perfil.id,
    user_id: invited?.user?.id ?? null,
    email: body.email,
    nombre: body.nombre ?? null,
    rol: body.rol,
    estado: "invitado",
    privacidad_version: PRIVACIDAD_VERSION,
    terminos_version: TERMINOS_VERSION,
    invited_by: user.id,
  });

  if (eInsert) {
    console.error("[api:team/invite] insert miembros_negocio", eInsert.message);
    // El email ya se envió. Devolvemos 207-ish: invitación enviada pero no persistida.
    return NextResponse.json(
      { warning: "Email enviado, pero el registro local falló" },
      { status: 207 },
    );
  }

  return NextResponse.json({ ok: true, email: body.email });
});

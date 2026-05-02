import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({ id: z.string().uuid() });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body;
  try { body = Body.parse(await request.json()); }
  catch { return NextResponse.json({ error: "Payload inválido" }, { status: 400 }); }

  // RLS (miembros_owner) ya valida que sólo el owner del negocio puede borrar.
  const { error } = await supabase
    .from("miembros_negocio")
    .update({ estado: "revocado", revoked_at: new Date().toISOString() })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

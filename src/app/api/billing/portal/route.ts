import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: perfil, error } = await supabase
    .from("perfiles_negocio")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();
  if (error || !perfil) {
    return NextResponse.json({ error: "Sin negocio asociado" }, { status: 403 });
  }
  if (!perfil.stripe_customer_id) {
    return NextResponse.json(
      { error: "Aún no tienes una suscripción. Elige un plan primero." },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;
  const session = await getStripe().billingPortal.sessions.create({
    customer:    perfil.stripe_customer_id,
    return_url:  `${origin}/ajustes`,
  });
  return NextResponse.json({ url: session.url });
}

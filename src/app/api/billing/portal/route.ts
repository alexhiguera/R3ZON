import { type NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const POST = withApiHandler("billing/portal", async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const session = await getStripe().billingPortal.sessions.create({
    customer: perfil.stripe_customer_id,
    return_url: `${origin}/ajustes`,
  });
  return NextResponse.json({ url: session.url });
});

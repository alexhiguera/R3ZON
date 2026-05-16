import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-handler";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Lista los métodos de pago guardados del cliente Stripe asociado al
 * negocio. Si Stripe no está configurado (falta STRIPE_SECRET_KEY) o el
 * negocio aún no tiene customer_id, devuelve lista vacía con
 * `configured:false` para que el cliente muestre el estado adecuado.
 */
export const GET = withApiHandler("billing/payment-methods", async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ configured: false, methods: [] });
  }

  const { data: perfil } = await supabase
    .from("perfiles_negocio")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!perfil?.stripe_customer_id) {
    return NextResponse.json({ configured: true, methods: [] });
  }

  const stripe = getStripe();
  const pms = await stripe.paymentMethods.list({
    customer: perfil.stripe_customer_id,
    type: "card",
  });

  const methods = pms.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand ?? "card",
    last4: pm.card?.last4 ?? "",
    exp_month: pm.card?.exp_month ?? null,
    exp_year: pm.card?.exp_year ?? null,
    is_default: false, // Stripe no devuelve default aquí; lo gestiona el portal.
  }));

  return NextResponse.json({ configured: true, methods });
});

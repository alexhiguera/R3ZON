import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Crea una sesión de Stripe Checkout en modo `setup` para que el usuario
 * guarde un nuevo método de pago sin pagar nada. Requiere que el negocio
 * ya tenga `stripe_customer_id` (si no, lo creamos al vuelo).
 *
 * Scaffold: requiere `STRIPE_SECRET_KEY` definido en entorno. Sin la env
 * `getStripe()` lanza; el cliente recibe 500 genérico vía withApiHandler.
 */
export const POST = withApiHandler("billing/setup-checkout", async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: perfil, error } = await supabase
    .from("perfiles_negocio")
    .select("id, stripe_customer_id, email_contacto")
    .eq("user_id", user.id)
    .single();
  if (error || !perfil) {
    return NextResponse.json({ error: "Sin negocio asociado" }, { status: 403 });
  }

  const stripe = getStripe();

  // Crea customer si no existe. `idempotencyKey` derivado del negocio evita
  // duplicados en Stripe si dos requests entran en paralelo: la 2ª recibe
  // el mismo customer en lugar de crear uno nuevo. Admin client para
  // persistir saltando RLS (columna Stripe no es escribible por el dueño).
  let customerId = perfil.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email: perfil.email_contacto ?? user.email ?? undefined,
        metadata: { negocio_id: perfil.id, user_id: user.id },
      },
      { idempotencyKey: `negocio-${perfil.id}-customer` },
    );
    customerId = customer.id;
    await createAdminClient()
      .from("perfiles_negocio")
      .update({ stripe_customer_id: customerId })
      .eq("id", perfil.id)
      .is("stripe_customer_id", null); // no pisa si otro request ya lo asignó
  }

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: `${origin}/ajustes?billing=metodo_anadido`,
    cancel_url:  `${origin}/ajustes?billing=cancelled`,
  });

  return NextResponse.json({ url: session.url });
});

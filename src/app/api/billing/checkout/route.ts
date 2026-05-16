import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api-handler";
import { getStripe, PLANS, type PlanId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  plan: z.enum(["pro", "business"]),
});

export const POST = withApiHandler("billing/checkout", async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body;
  try {
    body = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const plan = PLANS.find((p) => p.id === body.plan);
  if (!plan?.priceId) {
    return NextResponse.json(
      { error: `STRIPE_PRICE_${(body.plan as PlanId).toUpperCase()} no configurado` },
      { status: 500 },
    );
  }

  const { data: perfil, error: ePerfil } = await supabase
    .from("perfiles_negocio")
    .select("id, stripe_customer_id, email_contacto, nombre_negocio")
    .eq("user_id", user.id)
    .single();
  if (ePerfil || !perfil) {
    return NextResponse.json({ error: "Sin negocio asociado" }, { status: 403 });
  }

  const stripe = getStripe();
  const origin = new URL(request.url).origin;

  // 1. Garantizar Stripe Customer (creado on-demand y persistido).
  // `idempotencyKey` derivado del negocio evita duplicados si dos requests
  // entran en paralelo: la 2ª recibe el mismo customer.
  let customerId = perfil.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email: perfil.email_contacto ?? user.email ?? undefined,
        name: perfil.nombre_negocio ?? undefined,
        metadata: { negocio_id: perfil.id, user_id: user.id },
      },
      { idempotencyKey: `negocio-${perfil.id}-customer` },
    );
    customerId = customer.id;
    // Service role para evitar problemas con RLS al actualizar columnas Stripe.
    // El `.is(null)` evita pisar un valor escrito por otra request paralela.
    await createAdminClient()
      .from("perfiles_negocio")
      .update({ stripe_customer_id: customerId })
      .eq("id", perfil.id)
      .is("stripe_customer_id", null);
  }

  // 2. Crear Checkout Session.
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/ajustes?billing=success`,
    cancel_url: `${origin}/ajustes?billing=cancelled`,
    subscription_data: {
      metadata: { negocio_id: perfil.id, plan: plan.id },
    },
    client_reference_id: perfil.id,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe no devolvió URL" }, { status: 500 });
  }
  return NextResponse.json({ url: session.url });
});

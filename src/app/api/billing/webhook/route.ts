import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe envía el body en raw bytes y el SDK valida la firma sobre eso.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  const raw = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("stripe_webhook_invalid_signature", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event, stripe, admin);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        await persistInvoice(event.data.object as Stripe.Invoice, admin);
        break;
      }

      default:
        // Ignoramos el resto de eventos.
        break;
    }
  } catch (err) {
    console.error("stripe_webhook_handler_failed", event.type, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Error al procesar el evento" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
async function syncSubscription(
  event: Stripe.Event,
  stripe: Stripe,
  admin: ReturnType<typeof createAdminClient>,
) {
  // Resolver subscription + customer desde el evento.
  let subscription: Stripe.Subscription | null = null;
  let customerId: string | null = null;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    if (typeof session.subscription === "string") {
      subscription = await stripe.subscriptions.retrieve(session.subscription);
    } else if (session.subscription) {
      subscription = session.subscription;
    }
  } else {
    subscription = event.data.object as Stripe.Subscription;
    customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
  }

  if (!customerId) return;

  // Localizar el negocio por customerId (preferido) o por metadata.negocio_id.
  const negocioId =
    (subscription?.metadata?.negocio_id as string | undefined) ?? null;

  const query = admin.from("perfiles_negocio").select("id");
  const { data } = negocioId
    ? await query.eq("id", negocioId).maybeSingle()
    : await query.eq("stripe_customer_id", customerId).maybeSingle();

  if (!data) return;

  if (event.type === "customer.subscription.deleted" || !subscription) {
    await admin
      .from("perfiles_negocio")
      .update({
        stripe_subscription_id: null,
        subscription_status:    "canceled",
        subscription_price_id:  null,
        subscription_period_end: null,
        subscription_cancel_at_period_end: false,
        plan: "free",
      })
      .eq("id", data.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const periodEnd = subscription.items.data[0]?.current_period_end ?? null;

  await admin
    .from("perfiles_negocio")
    .update({
      stripe_customer_id:     customerId,
      stripe_subscription_id: subscription.id,
      subscription_status:    subscription.status,
      subscription_price_id:  priceId,
      subscription_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      subscription_cancel_at_period_end: subscription.cancel_at_period_end,
      plan: planFromPriceId(priceId),
    })
    .eq("id", data.id);
}

// ---------------------------------------------------------------------------
async function persistInvoice(
  invoice: Stripe.Invoice,
  admin: ReturnType<typeof createAdminClient>,
) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const { data: perfil } = await admin
    .from("perfiles_negocio")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!perfil) return;

  await admin.from("pagos_stripe").upsert(
    {
      negocio_id:         perfil.id,
      stripe_invoice_id:  invoice.id,
      // `invoice.charge` se eliminó en versiones recientes del SDK; el charge se
      // resuelve en la línea de PaymentIntent si lo necesitamos en el futuro.
      stripe_charge_id:   null,
      amount_cents:       invoice.amount_paid ?? invoice.amount_due ?? 0,
      currency:           invoice.currency ?? "eur",
      status:             invoice.status === "paid" ? "paid"
                          : invoice.status === "open" ? "failed"
                          : invoice.status ?? "unknown",
      description:        invoice.lines.data[0]?.description ?? null,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf_url:    invoice.invoice_pdf ?? null,
      paid_at:            invoice.status_transitions?.paid_at
                          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
                          : null,
    },
    { onConflict: "stripe_invoice_id" }
  );
}

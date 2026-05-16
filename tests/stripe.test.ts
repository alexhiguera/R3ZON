import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock supabase admin antes de importar la ruta ────────────────────────────
const updateMock = vi.fn().mockResolvedValue({ data: null, error: null });
const eqUpdateMock = vi
  .fn()
  .mockReturnValue({ then: (fn: any) => fn({ data: null, error: null }) });
const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
const selectMaybeMock = vi.fn();

const fromMock = vi.fn((table: string) => {
  if (table === "perfiles_negocio") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: selectMaybeMock,
        }),
      }),
      update: (payload: unknown) => {
        updateMock(payload);
        return { eq: eqUpdateMock };
      },
    };
  }
  if (table === "pagos_stripe") {
    return { upsert: upsertMock };
  }
  return {};
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

// ─── Stripe SDK con clave dummy y secret de webhook conocido ─────────────────
const WEBHOOK_SECRET = "whsec_test_secret_for_vitest";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.STRIPE_PRICE_PRO = "price_pro_123";
process.env.STRIPE_PRICE_BUSINESS = "price_biz_456";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true });

import { NextRequest } from "next/server";
// Ahora sí: importar la ruta y los helpers.
import { POST } from "@/app/api/billing/webhook/route";
import { planFromPriceId } from "@/lib/stripe";

function makeRequest(payload: object): NextRequest {
  const body = JSON.stringify(payload);
  const sig = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: WEBHOOK_SECRET,
  });
  return new NextRequest("http://localhost/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": sig, "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  updateMock.mockClear();
  upsertMock.mockClear();
  selectMaybeMock.mockReset();
  fromMock.mockClear();
});

describe("planFromPriceId", () => {
  it("mapea priceId pro → 'pro'", () => {
    expect(planFromPriceId("price_pro_123")).toBe("pro");
  });
  it("mapea priceId business → 'business'", () => {
    expect(planFromPriceId("price_biz_456")).toBe("business");
  });
  it("price desconocido → 'free'", () => {
    expect(planFromPriceId("price_unknown")).toBe("free");
  });
  it("null/undefined → 'free'", () => {
    expect(planFromPriceId(null)).toBe("free");
    expect(planFromPriceId(undefined)).toBe("free");
  });
});

describe("Stripe webhook — validación de firma", () => {
  it("rechaza con 400 si la firma es inválida", async () => {
    const req = new NextRequest("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=0,v1=invalid" },
      body: JSON.stringify({ id: "evt_1", type: "ping" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rechaza con 500 si falta el header stripe-signature", async () => {
    const req = new NextRequest("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("acepta con 200 cuando la firma es válida (evento ignorado)", async () => {
    const req = makeRequest({
      id: "evt_test",
      type: "ping",
      object: "event",
      data: { object: {} },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe("Stripe webhook — invoice.paid persiste pago", () => {
  it("hace upsert en pagos_stripe cuando el customer existe", async () => {
    selectMaybeMock.mockResolvedValueOnce({ data: { id: "negocio-uuid-1" }, error: null });

    const req = makeRequest({
      id: "evt_invoice_paid",
      type: "invoice.paid",
      object: "event",
      data: {
        object: {
          id: "in_123",
          object: "invoice",
          customer: "cus_123",
          amount_paid: 2900,
          amount_due: 2900,
          currency: "eur",
          status: "paid",
          lines: { data: [{ description: "Plan Pro mensual" }] },
          status_transitions: { paid_at: 1700000000 },
          hosted_invoice_url: "https://stripe.com/i/123",
          invoice_pdf: "https://stripe.com/i/123.pdf",
        },
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsertMock.mock.calls[0];
    expect(payload).toMatchObject({
      negocio_id: "negocio-uuid-1",
      stripe_invoice_id: "in_123",
      amount_cents: 2900,
      currency: "eur",
      status: "paid",
    });
    expect(opts).toEqual({ onConflict: "stripe_invoice_id" });
  });

  it("ignora invoice si no encuentra negocio asociado al customer", async () => {
    selectMaybeMock.mockResolvedValueOnce({ data: null, error: null });

    const req = makeRequest({
      id: "evt_invoice_orphan",
      type: "invoice.paid",
      object: "event",
      data: {
        object: {
          id: "in_orphan",
          object: "invoice",
          customer: "cus_unknown",
          amount_paid: 0,
          currency: "eur",
          status: "paid",
          lines: { data: [] },
        },
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

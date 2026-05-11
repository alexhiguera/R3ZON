"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
  Receipt,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Pago = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  paid_at: string | null;
  created_at: string;
};

type Sub = {
  plan: string;
  subscription_status: string | null;
  subscription_period_end: string | null;
  subscription_cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
};

// Catálogo replicado en cliente (los Price IDs viven en server).
const PLANS_PUBLIC = [
  {
    id: "pro" as const,
    nombre: "Pro",
    precio_eur_mes: 29,
    tagline: "Para autónomos y micro-empresas",
    features: [
      "Hasta 1.000 clientes",
      "Calendario + sync Google",
      "Kanban de tareas",
      "OCR de tickets (50/mes)",
      "Soporte por email",
    ],
    destacado: false,
  },
  {
    id: "business" as const,
    nombre: "Business",
    precio_eur_mes: 79,
    tagline: "Para equipos en crecimiento",
    features: [
      "Clientes ilimitados",
      "Hasta 10 miembros del equipo",
      "OCR ilimitado",
      "Integración n8n + webhooks",
      "Soporte prioritario",
      "Auditoría legal completa",
    ],
    destacado: true,
  },
];

type Toast = { kind: "ok" | "err"; msg: string } | null;

export function SuscripcionTab() {
  const supabase = createClient();
  const [sub, setSub]     = useState<Sub | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<string | null>(null);
  const [toast, setToast]     = useState<Toast>(null);

  const flash = (t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Mostrar feedback si Stripe nos devuelve a /ajustes?billing=success|cancelled.
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing === "success") {
      flash({ kind: "ok", msg: "¡Suscripción completada! Puede tardar unos segundos en aparecer." });
    } else if (billing === "cancelled") {
      flash({ kind: "err", msg: "Has cancelado el pago. No se ha cobrado nada." });
    } else if (billing === "metodo_anadido") {
      flash({ kind: "ok", msg: "Método de pago añadido correctamente." });
    }
    if (billing) {
      const url = new URL(window.location.href);
      url.searchParams.delete("billing");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: perfil }, { data: pagosData }] = await Promise.all([
        supabase
          .from("perfiles_negocio")
          .select("plan, subscription_status, subscription_period_end, subscription_cancel_at_period_end, stripe_customer_id")
          .single(),
        supabase
          .from("pagos_stripe")
          .select("id, amount_cents, currency, status, description, hosted_invoice_url, invoice_pdf_url, paid_at, created_at")
          .order("paid_at", { ascending: false, nullsFirst: false })
          .limit(12),
      ]);
      if (!alive) return;
      setSub((perfil as Sub) ?? null);
      setPagos((pagosData as Pago[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [supabase]);

  const irACheckout = async (plan: "pro" | "business") => {
    setBusy(`checkout-${plan}`);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      setBusy(null);
      flash({ kind: "err", msg: json.error ?? "No se pudo iniciar el checkout." });
      return;
    }
    window.location.href = json.url;
  };

  const irAlPortal = async () => {
    setBusy("portal");
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      setBusy(null);
      flash({ kind: "err", msg: json.error ?? "No se pudo abrir el portal." });
      return;
    }
    window.location.href = json.url;
  };

  if (loading) {
    return (
      <div className="card-glass flex items-center gap-2 p-6 text-sm text-text-mid">
        <Loader2 className="animate-spin" size={14} /> Cargando suscripción…
      </div>
    );
  }

  const tieneSuscripcion =
    !!sub?.stripe_customer_id &&
    !!sub?.subscription_status &&
    sub.subscription_status !== "canceled" &&
    sub.subscription_status !== "incomplete_expired";

  return (
    <div className="space-y-5">
      {toast && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Plan actual */}
      <PlanActual sub={sub} onPortal={irAlPortal} busy={busy === "portal"} tieneSuscripcion={tieneSuscripcion} />

      {/* Métodos de pago */}
      <MetodosPago onFlash={flash} />

      {/* Si NO tiene suscripción → tabla de precios */}
      {!tieneSuscripcion && (
        <div className="grid gap-5 md:grid-cols-2">
          {PLANS_PUBLIC.map((p) => (
            <PricingCard
              key={p.id}
              plan={p}
              actual={sub?.plan === p.id}
              onSelect={() => irACheckout(p.id)}
              busy={busy === `checkout-${p.id}`}
            />
          ))}
        </div>
      )}

      {/* Historial */}
      <HistorialPagos pagos={pagos} />
    </div>
  );
}

// ---------------------------------------------------------------------------

type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  exp_month: number | null;
  exp_year: number | null;
};

function MetodosPago({ onFlash }: { onFlash: (t: Toast) => void }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/billing/payment-methods");
      const json = await res.json().catch(() => ({}));
      if (!alive) return;
      setConfigured(json.configured ?? false);
      setMethods((json.methods as PaymentMethod[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const anadirMetodo = async () => {
    setAdding(true);
    const res = await fetch("/api/billing/setup-checkout", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      setAdding(false);
      onFlash({ kind: "err", msg: json.error ?? "No se pudo iniciar el alta del método." });
      return;
    }
    window.location.href = json.url;
  };

  return (
    <div className="card-glass overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-indigo-400/20 p-5">
        <div className="flex items-start gap-2">
          <CreditCard size={16} className="mt-0.5 text-text-mid" />
          <div>
            <div className="section-label mb-0.5">Métodos de pago</div>
            <p className="text-xs text-text-mid">
              Las tarjetas guardadas se utilizan para renovar tu suscripción.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={anadirMetodo}
          disabled={adding || configured === false}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-xs font-bold text-cyan hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
          title={configured === false ? "Stripe no está configurado todavía" : ""}
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Añadir método
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-text-mid">
            <Loader2 size={12} className="animate-spin" /> Cargando…
          </div>
        ) : configured === false ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs text-amber-200">
            <strong>Stripe pendiente de configurar.</strong>
            <p className="mt-1">
              Define <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRICE_PRO</code> y
              <code> STRIPE_PRICE_BUSINESS</code> en las variables de entorno y aplica los webhooks
              de <code>billing_ext.sql</code> para activar el alta de tarjetas, suscripciones y
              renovaciones.
            </p>
          </div>
        ) : methods.length === 0 ? (
          <div className="text-center text-xs italic text-text-lo">
            Aún no hay métodos de pago guardados.
          </div>
        ) : (
          <ul className="space-y-2">
            {methods.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-sm"
              >
                <span className="rounded-md border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan">
                  {m.brand}
                </span>
                <span className="font-mono text-text-hi">•••• •••• •••• {m.last4}</span>
                {m.exp_month && m.exp_year && (
                  <span className="ml-auto text-[11px] text-text-mid">
                    {String(m.exp_month).padStart(2, "0")}/{String(m.exp_year).slice(-2)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PlanActual({
  sub,
  onPortal,
  busy,
  tieneSuscripcion,
}: {
  sub: Sub | null;
  onPortal: () => void;
  busy: boolean;
  tieneSuscripcion: boolean;
}) {
  const planLabel = (sub?.plan ?? "free").toUpperCase();
  const renovacion = sub?.subscription_period_end
    ? new Date(sub.subscription_period_end).toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <div className="card-glass overflow-hidden">
      <div className="rainbow-bar" />
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/30 bg-gradient-to-br from-cyan/10 to-fuchsia/10 text-cyan">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="section-label mb-1">Plan actual</div>
            <h2 className="font-display text-xl font-bold text-text-hi">Plan {planLabel}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-mid">
              <StatusBadge status={sub?.subscription_status} />
              {renovacion && tieneSuscripcion && (
                <span>
                  {sub?.subscription_cancel_at_period_end ? "Termina el " : "Se renueva el "}
                  <strong className="text-text-hi">{renovacion}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {tieneSuscripcion && (
          <button
            type="button"
            onClick={onPortal}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2.5 text-sm font-bold text-bg disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : <ExternalLink size={14} />}
            Gestionar suscripción
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/25 bg-indigo-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-mid">
        Sin suscripción
      </span>
    );
  }
  const palette: Record<string, string> = {
    active:   "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    trialing: "border-cyan/30 bg-cyan/10 text-cyan",
    past_due: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    canceled: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
      palette[status] ?? palette.active
    }`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------

function PricingCard({
  plan,
  actual,
  onSelect,
  busy,
}: {
  plan: typeof PLANS_PUBLIC[number];
  actual: boolean;
  onSelect: () => void;
  busy: boolean;
}) {
  return (
    <article
      className={`card-glass flex flex-col p-6 ${
        plan.destacado ? "ring-1 ring-cyan/40" : ""
      }`}
    >
      {plan.destacado && (
        <div className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-cyan to-fuchsia px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg">
          <Sparkles size={10} /> Recomendado
        </div>
      )}
      <h3 className="font-display text-2xl font-bold text-text-hi">{plan.nombre}</h3>
      <p className="mt-1 text-xs text-text-mid">{plan.tagline}</p>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold text-text-hi">
          {plan.precio_eur_mes}€
        </span>
        <span className="text-sm text-text-mid">/mes</span>
      </div>

      <ul className="mt-5 space-y-2 text-sm text-text-mid">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-cyan" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        disabled={busy || actual}
        className={`mt-6 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 ${
          plan.destacado
            ? "bg-gradient-to-r from-cyan to-fuchsia text-bg"
            : "border border-indigo-400/30 bg-indigo-900/40 text-text-hi hover:border-cyan/40"
        }`}
      >
        {busy ? <Loader2 className="animate-spin" size={14} /> : <CreditCard size={14} />}
        {actual ? "Tu plan actual" : `Elegir ${plan.nombre}`}
      </button>
    </article>
  );
}

// ---------------------------------------------------------------------------

function HistorialPagos({ pagos }: { pagos: Pago[] }) {
  return (
    <div className="card-glass overflow-hidden">
      <div className="flex items-center gap-2 border-b border-indigo-400/20 p-5">
        <Receipt size={16} className="text-text-mid" />
        <div>
          <div className="section-label mb-0.5">Facturación</div>
          <p className="text-xs text-text-mid">
            Últimos pagos a r3zon. Para gestión completa de facturas usa «Gestionar suscripción».
          </p>
        </div>
      </div>

      {pagos.length === 0 ? (
        <div className="p-6 text-sm italic text-text-lo">
          Aún no hay pagos registrados.
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-indigo-900/40 text-[11px] uppercase tracking-wider text-text-mid">
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Concepto</th>
              <th className="px-4 py-3 font-semibold">Importe</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 text-right font-semibold">Factura</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-t border-indigo-400/10">
                <td className="px-4 py-3 text-text-mid">
                  {new Date(p.paid_at ?? p.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-text-hi">
                  {p.description ?? <span className="italic text-text-lo">—</span>}
                </td>
                <td className="px-4 py-3 text-text-hi">
                  {(p.amount_cents / 100).toLocaleString("es-ES", {
                    style: "currency",
                    currency: (p.currency ?? "eur").toUpperCase(),
                  })}
                </td>
                <td className="px-4 py-3">
                  <PagoBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {p.invoice_pdf_url ? (
                    <a
                      href={p.invoice_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-cyan hover:underline"
                    >
                      <Download size={11} /> PDF
                    </a>
                  ) : p.hosted_invoice_url ? (
                    <a
                      href={p.hosted_invoice_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-cyan hover:underline"
                    >
                      <ExternalLink size={11} /> Ver
                    </a>
                  ) : (
                    <span className="text-[11px] italic text-text-lo">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PagoBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
        <CheckCircle2 size={10} /> Pagado
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-200">
        <AlertCircle size={10} /> Fallido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
      {status}
    </span>
  );
}

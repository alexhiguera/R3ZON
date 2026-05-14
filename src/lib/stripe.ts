import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no configurada");
  _stripe = new Stripe(key, { typescript: true });
  return _stripe;
}

/** Catálogo de planes que ofrecemos. Los IDs de Price se inyectan por env. */
export type PlanId = "pro" | "business";

export type Plan = {
  id: PlanId;
  nombre: string;
  precio_eur_mes: number;
  tagline: string;
  features: string[];
  destacado?: boolean;
  /** Stripe Price ID — env var. Si está vacío, el plan no se puede contratar. */
  priceId: string | undefined;
};

export const PLANS: Plan[] = [
  {
    id: "pro",
    nombre: "Pro",
    precio_eur_mes: 29,
    tagline: "Para autónomos y micro-empresas",
    priceId: process.env.STRIPE_PRICE_PRO,
    features: [
      "Hasta 1.000 clientes",
      "Calendario + sync Google",
      "Kanban de tareas",
      "OCR de tickets (50/mes)",
      "Soporte por email",
    ],
  },
  {
    id: "business",
    nombre: "Business",
    precio_eur_mes: 79,
    tagline: "Para equipos en crecimiento",
    priceId: process.env.STRIPE_PRICE_BUSINESS,
    destacado: true,
    features: [
      "Clientes ilimitados",
      "Hasta 10 miembros del equipo",
      "OCR ilimitado",
      "Soporte prioritario",
      "Auditoría legal completa",
    ],
  },
];

export function planFromPriceId(priceId: string | null | undefined): PlanId | "free" {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  return "free";
}

export type PlanId = "pro" | "business";

export type Plan = {
  id: PlanId;
  nombre: string;
  precio_eur_mes: number;
  tagline: string;
  features: string[];
  destacado: boolean;
};

export const PLANS_PUBLIC: Plan[] = [
  {
    id: "pro",
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
    id: "business",
    nombre: "Business",
    precio_eur_mes: 79,
    tagline: "Para equipos en crecimiento",
    features: [
      "Clientes ilimitados",
      "Hasta 10 miembros del equipo",
      "OCR ilimitado",
      "Soporte prioritario",
      "Auditoría legal completa",
    ],
    destacado: true,
  },
];

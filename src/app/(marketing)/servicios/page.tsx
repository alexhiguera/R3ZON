import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  Kanban,
  Clock,
  ShoppingCart,
  Wallet,
  FileText,
  Boxes,
  Truck,
  type LucideIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Descubre los módulos de ANTARES: clientes, agenda, tareas, fichajes, TPV, documentos y finanzas en un único panel.",
};

type Service = {
  title: string;
  desc: string;
  bullets: string[];
  Icon: LucideIcon;
};

const SERVICES: Service[] = [
  {
    title: "Clientes",
    desc: "Tu CRM con ficha 360º, histórico de interacciones y segmentación.",
    bullets: ["Hasta 1.000 clientes en Pro", "Importación CSV", "Búsqueda instantánea"],
    Icon: Building2,
  },
  {
    title: "Proveedores",
    desc: "Gestiona tu cadena de suministro y plazos de pago.",
    bullets: ["Catálogo de proveedores", "Documentos asociados", "Vinculados a gastos"],
    Icon: Truck,
  },
  {
    title: "Agenda",
    desc: "Calendario con sincronización bidireccional con Google Calendar.",
    bullets: ["Citas con clientes", "Recordatorios", "Vista día/semana/mes"],
    Icon: Calendar,
  },
  {
    title: "Tareas",
    desc: "Kanban con prioridades, etiquetas y asignación a tu equipo.",
    bullets: ["Drag & drop", "Etiquetas y filtros", "Vista compacta o detallada"],
    Icon: Kanban,
  },
  {
    title: "Fichajes",
    desc: "Control horario legal con entradas, salidas y pausas.",
    bullets: ["Cumple normativa española", "Informes mensuales", "Por usuario y equipo"],
    Icon: Clock,
  },
  {
    title: "Listado / Catálogo",
    desc: "Inventario y catálogo unificado para TPV y documentos.",
    bullets: ["Stock por producto", "Variantes", "Activación selectiva"],
    Icon: Boxes,
  },
  {
    title: "TPV",
    desc: "Punto de venta para tienda física con tickets y caja.",
    bullets: ["Modo táctil", "Tickets imprimibles", "Cierre de caja"],
    Icon: ShoppingCart,
  },
  {
    title: "Documentos",
    desc: "Facturas, presupuestos y albaranes con OCR de tickets de gasto.",
    bullets: ["Facturación electrónica", "OCR automático", "PDF descargable"],
    Icon: FileText,
  },
  {
    title: "Finanzas",
    desc: "Ingresos, gastos y previsión de tesorería con un solo vistazo.",
    bullets: ["Categorización", "Gráficos por periodo", "Exportable a contable"],
    Icon: Wallet,
  },
];

export default function ServiciosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <header className="mx-auto mb-12 max-w-3xl text-center">
        <div className="accent-bar mx-auto mb-4" style={{ width: 64 }} />
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-text-hi sm:text-5xl">
          Todo lo que necesita tu negocio.
        </h1>
        <p className="mt-4 text-base text-text-mid sm:text-lg">
          Nueve módulos pensados para trabajar juntos. Empieza por el que más te
          urja y descubre el resto cuando te haga falta.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map(({ title, desc, bullets, Icon }) => (
          <article key={title} className="card-glass flex flex-col p-6">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/10 text-cyan">
              <Icon size={20} strokeWidth={2} />
            </div>
            <h2 className="font-display text-xl font-bold text-text-hi">
              {title}
            </h2>
            <p className="mt-1 text-sm text-text-mid">{desc}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-text-mid">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                  {b}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/precios"
          className="inline-flex items-center gap-1.5 rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-bg shadow-[0_0_28px_rgba(34,211,238,0.4)] transition hover:brightness-110"
        >
          Ver precios
          <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
        <Link
          href="/registro"
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-900/30 px-6 py-3 text-sm font-semibold text-text-hi transition hover:border-indigo-400/60"
        >
          Empezar gratis
        </Link>
      </div>
    </div>
  );
}

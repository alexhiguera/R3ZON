import {
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  FileText,
  HeartHandshake,
  Kanban,
  Shield,
  ShoppingCart,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-900/30 via-bg to-bg" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.18),transparent_60%)]" />

        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="accent-bar mx-auto mb-6" style={{ width: 72 }} />
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-text-hi sm:text-6xl">
              Toda tu operativa de negocio
              <span className="block bg-gradient-to-r from-cyan via-indigo-300 to-fuchsia bg-clip-text text-transparent">
                en un solo panel.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-text-mid sm:text-lg">
              Clientes, agenda, tareas, fichajes, TPV y finanzas. Sin integraciones imposibles, sin
              hojas de cálculo a medianoche. ANTARES es el sistema operativo que tu pequeña empresa
              necesita.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/registro"
                className="inline-flex items-center gap-1.5 rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-bg shadow-[0_0_28px_rgba(34,211,238,0.4)] transition hover:brightness-110"
              >
                Empezar gratis
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <Link
                href="/precios"
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-900/30 px-6 py-3 text-sm font-semibold text-text-hi transition hover:border-indigo-400/60"
              >
                Ver precios
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <div className="section-label mb-2">Todo lo que necesitas</div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-text-hi sm:text-4xl">
            Un panel, siete módulos.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ title, desc, Icon }) => (
            <article key={title} className="card-glass p-5">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/10 text-cyan">
                <Icon size={18} strokeWidth={2} />
              </div>
              <h3 className="font-display text-lg font-bold text-text-hi">{title}</h3>
              <p className="mt-1 text-sm text-text-mid">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Por qué */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <div className="section-label mb-2">Por qué ANTARES</div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-text-hi sm:text-4xl">
            Hecho para autónomos, no para corporaciones.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {WHYS.map(({ title, desc, Icon }) => (
            <article key={title} className="card-glass p-6">
              <Icon className="text-fuchsia" size={22} strokeWidth={2} />
              <h3 className="mt-3 font-display text-lg font-bold text-text-hi">{title}</h3>
              <p className="mt-1 text-sm text-text-mid">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        <div className="card-glass overflow-hidden">
          <div className="rainbow-bar" />
          <div className="p-8 text-center sm:p-12">
            <h2 className="font-display text-3xl font-bold tracking-tight text-text-hi sm:text-4xl">
              Empieza hoy. Sin tarjeta.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-text-mid">
              Crea tu cuenta gratis y prueba ANTARES con todos los módulos. Cuando estés listo,
              escala al plan que se ajuste a tu negocio.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/registro"
                className="inline-flex items-center gap-1.5 rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-bg shadow-[0_0_28px_rgba(34,211,238,0.4)] transition hover:brightness-110"
              >
                Crear cuenta gratis
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-900/30 px-6 py-3 text-sm font-semibold text-text-hi transition hover:border-indigo-400/60"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const MODULES = [
  { title: "Clientes", desc: "Ficha completa, histórico, segmentación.", Icon: Building2 },
  { title: "Agenda", desc: "Calendario con sincronización a Google.", Icon: Calendar },
  { title: "Tareas", desc: "Kanban con drag & drop y prioridades.", Icon: Kanban },
  { title: "Fichajes", desc: "Control horario legal con un clic.", Icon: Clock },
  { title: "TPV", desc: "Punto de venta con catálogo e inventario.", Icon: ShoppingCart },
  { title: "Finanzas", desc: "Ingresos, gastos y previsión de tesorería.", Icon: Wallet },
  { title: "Documentos", desc: "Facturas, presupuestos y OCR de tickets.", Icon: FileText },
];

const WHYS = [
  {
    title: "Cumplimiento sin dolor",
    desc: "Fichajes, factura electrónica y RGPD listos desde el día uno.",
    Icon: Shield,
  },
  {
    title: "Rápido de verdad",
    desc: "Procesamiento local cuando se puede. Cero esperas, cero fricción.",
    Icon: Zap,
  },
  {
    title: "Soporte humano",
    desc: "Te atienden personas que conocen el producto, no chatbots.",
    Icon: HeartHandshake,
  },
];

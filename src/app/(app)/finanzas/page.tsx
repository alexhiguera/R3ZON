"use client";

import { PiggyBank, Plus, Receipt, ScanLine, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MonthlyBars, TaxLine } from "@/components/finanzas/Charts";
import { PageHeader } from "@/components/ui/PageHeader";
import { agregarPorMes, eur, type MovimientoFila, totales } from "@/lib/finanzas";
import { createClient } from "@/lib/supabase/client";

export default function FinanzasPage() {
  const [filas, setFilas] = useState<MovimientoFila[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("finanzas")
        .select("tipo, fecha, base_imponible, iva_importe, irpf_importe, total")
        .order("fecha", { ascending: false });
      setFilas((data ?? []) as MovimientoFila[]);
      setCargando(false);
    })();
  }, []);

  const t = totales(filas);
  const mensual = agregarPorMes(filas);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Tu dinero"
        title="Finanzas"
        description="Lo que entra, lo que sale y lo que tendrás que apartar para Hacienda."
      />

      {/* Acciones rápidas */}
      <div className="grid gap-3 sm:grid-cols-2">
        <QuickAction
          href="/ocr"
          Icon={ScanLine}
          label="Escanear ticket"
          sub="Hazle una foto y lo añadimos solo"
          accent="cyan"
        />
        <QuickAction
          href="/finanzas/nuevo"
          Icon={Plus}
          label="Apuntar a mano"
          sub="Crear ingreso o gasto"
          accent="fuchsia"
        />
      </div>

      {/* KPIs grandes */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BigKPI
          label="Lo que has ganado"
          value={eur(t.ganado)}
          Icon={TrendingUp}
          accent="cyan"
          help="Suma de tus ingresos sin IVA"
        />
        <BigKPI
          label="Lo que has gastado"
          value={eur(t.gastado)}
          Icon={TrendingDown}
          accent="fuchsia"
          help="Suma de tus gastos sin IVA"
        />
        <BigKPI
          label="Te queda"
          value={eur(t.beneficio)}
          Icon={PiggyBank}
          accent={t.beneficio >= 0 ? "ok" : "danger"}
          help="Ganado menos gastado"
        />
        <BigKPI
          label="Apartar para Hacienda"
          value={eur(Math.max(0, t.ivaAPagar))}
          Icon={Receipt}
          accent="warn"
          help="IVA que tendrás que pagar (aprox.)"
        />
      </div>

      {/* Barras mensuales */}
      <Panel title="Tu año mes a mes" sub="Compara lo que ganas con lo que gastas en cada mes.">
        {cargando ? <Skeleton /> : <MonthlyBars data={mensual} />}
      </Panel>

      {/* Previsión de impuestos */}
      <Panel title="Impuestos previstos" sub="Lo que se va acumulando para tu próxima declaración.">
        {cargando ? <Skeleton /> : <TaxLine data={mensual} />}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ImpuestoCard
            titulo="IVA del trimestre"
            valor={eur(Math.max(0, t.ivaAPagar))}
            explicacion="Es el dinero del IVA que cobras a tus clientes menos el que has pagado tú en gastos. Esto le toca a Hacienda."
          />
          <ImpuestoCard
            titulo="IRPF retenido"
            valor={eur(t.irpfRetenido)}
            explicacion="Lo que tus clientes ya han retenido por ti y adelantado a Hacienda. Cuenta a tu favor en la renta."
          />
        </div>
      </Panel>

      {/* Últimos movimientos */}
      <Panel title="Últimos movimientos" sub="Lo más reciente primero.">
        {cargando ? (
          <Skeleton />
        ) : filas.length === 0 ? (
          <Empty />
        ) : (
          <UltimosMovimientos filas={filas.slice(0, 8)} />
        )}
      </Panel>
    </div>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────────────

function QuickAction({
  href,
  Icon,
  label,
  sub,
  accent,
}: {
  href: string;
  Icon: typeof Plus;
  label: string;
  sub: string;
  accent: "cyan" | "fuchsia";
}) {
  const cls =
    accent === "cyan"
      ? "border-cyan/30 bg-cyan/10 text-cyan"
      : "border-fuchsia/30 bg-fuchsia/10 text-fuchsia";
  return (
    <Link
      href={href}
      className="card-glass flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${cls}`}
      >
        <Icon size={20} />
      </span>
      <div className="flex-1">
        <div className="font-display text-base font-bold text-text-hi">{label}</div>
        <div className="text-xs text-text-mid">{sub}</div>
      </div>
    </Link>
  );
}

function BigKPI({
  label,
  value,
  Icon,
  accent,
  help,
}: {
  label: string;
  value: string;
  Icon: typeof TrendingUp;
  accent: "cyan" | "fuchsia" | "ok" | "danger" | "warn";
  help: string;
}) {
  const map = {
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
    fuchsia: "border-fuchsia/30 bg-fuchsia/10 text-fuchsia",
    ok: "border-ok/30 bg-ok/10 text-ok",
    danger: "border-danger/30 bg-danger/10 text-danger",
    warn: "border-warn/30 bg-warn/10 text-warn",
  };
  return (
    <div className="card-glass p-5">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${map[accent]}`}
        >
          <Icon size={15} />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-text-hi">{value}</div>
      <div className="mt-1 text-[0.7rem] text-text-lo">{help}</div>
    </div>
  );
}

function Panel({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-glass overflow-hidden">
      <div className="rainbow-bar" />
      <div className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-text-hi">{title}</h2>
        <p className="mb-4 text-xs text-text-mid">{sub}</p>
        {children}
      </div>
    </div>
  );
}

function ImpuestoCard({
  titulo,
  valor,
  explicacion,
}: {
  titulo: string;
  valor: string;
  explicacion: string;
}) {
  return (
    <div className="rounded-2xl border border-indigo-400/15 bg-indigo-900/20 p-4">
      <div className="section-label mb-1">{titulo}</div>
      <div className="font-display text-xl font-bold text-text-hi">{valor}</div>
      <p className="mt-2 text-xs leading-relaxed text-text-mid">{explicacion}</p>
    </div>
  );
}

function UltimosMovimientos({ filas }: { filas: MovimientoFila[] }) {
  return (
    <div className="divide-y divide-indigo-400/10">
      {filas.map((f, i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                f.tipo === "ingreso"
                  ? "border-ok/30 bg-ok/10 text-ok"
                  : "border-fuchsia/30 bg-fuchsia/10 text-fuchsia"
              }`}
            >
              {f.tipo === "ingreso" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            </span>
            <div>
              <div className="text-sm font-medium text-text-hi">
                {f.tipo === "ingreso" ? "Has cobrado" : "Has gastado"}
              </div>
              <div className="text-[0.7rem] text-text-lo">
                {new Date(f.fecha).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <div
            className={`font-display text-base font-bold ${
              f.tipo === "ingreso" ? "text-ok" : "text-text-hi"
            }`}
          >
            {f.tipo === "ingreso" ? "+" : "−"}
            {eur(Number(f.total))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-text-lo">Cargando…</div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <div className="font-display text-base font-bold text-text-hi">Aún no hay movimientos</div>
      <p className="max-w-sm text-sm text-text-mid">
        Empieza escaneando un ticket o apuntando a mano tu primer ingreso.
      </p>
    </div>
  );
}

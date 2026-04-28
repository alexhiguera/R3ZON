import { PageHeader } from "@/components/ui/PageHeader";
import { Calendar, Users, Wallet, Activity } from "lucide-react";

const KPIS = [
  { label: "Clientes",      value: "—", Icon: Users,    accent: "cyan"    as const },
  { label: "Citas hoy",     value: "—", Icon: Calendar, accent: "fuchsia" as const },
  { label: "Ingresos mes",  value: "—", Icon: Wallet,   accent: "cyan"    as const },
  { label: "Tareas activas",value: "—", Icon: Activity, accent: "fuchsia" as const },
];

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Panel principal"
        title="Buenos días"
        description="Resumen de tu negocio en tiempo real."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map(({ label, value, Icon, accent }) => (
          <div key={label} className="card-glass p-5">
            <div className="flex items-center justify-between">
              <span className="section-label">{label}</span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                  accent === "cyan"
                    ? "border-cyan/30 bg-cyan/10 text-cyan"
                    : "border-fuchsia/30 bg-fuchsia/10 text-fuchsia"
                }`}
              >
                <Icon size={15} />
              </span>
            </div>
            <div className="mt-3 font-display text-2xl font-bold text-text-hi">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

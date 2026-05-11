"use client";

import { useState } from "react";
import {
  Building2,
  Plug,
  Users,
  CreditCard,
  ShieldCheck,
  Receipt,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { NegocioTab } from "./NegocioTab";
import { FacturacionTab } from "./FacturacionTab";
import { IntegracionesTab } from "./IntegracionesTab";
import { EquipoTab } from "./EquipoTab";
import { SeguridadTab } from "./SeguridadTab";
import { SuscripcionTab } from "./SuscripcionTab";
import { AparienciaTab } from "./AparienciaTab";
import type { PerfilNegocio, TabId } from "./types";

const TABS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: "negocio",       label: "Negocio",       Icon: Building2 },
  { id: "apariencia",    label: "Apariencia",    Icon: Palette },
  { id: "facturacion",   label: "Facturación",   Icon: Receipt },
  { id: "integraciones", label: "Integraciones", Icon: Plug },
  { id: "equipo",        label: "Equipo",        Icon: Users },
  { id: "suscripcion",   label: "Suscripción",   Icon: CreditCard },
  { id: "seguridad",     label: "Seguridad",     Icon: ShieldCheck },
];

export function SettingsTabs({ perfil }: { perfil: PerfilNegocio }) {
  const [active, setActive] = useState<TabId>("negocio");

  return (
    <div className="grid gap-5 lg:grid-cols-[220px,1fr]">
      <nav
        role="tablist"
        aria-orientation="vertical"
        className="card-glass h-fit p-2 lg:sticky lg:top-4"
      >
        <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map(({ id, label, Icon }) => {
            const selected = active === id;
            return (
              <li key={id} className="flex-1 lg:flex-none">
                <button
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${id}`}
                  id={`tab-${id}`}
                  onClick={() => setActive(id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    selected
                      ? "border border-cyan/40 bg-cyan/10 text-cyan"
                      : "border border-transparent text-text-mid hover:border-indigo-400/25 hover:bg-indigo-900/40 hover:text-text-hi"
                  }`}
                >
                  <Icon size={15} />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
      >
        {active === "negocio"       && <NegocioTab perfil={perfil} />}
        {active === "apariencia"    && <AparienciaTab />}
        {active === "facturacion"   && <FacturacionTab />}
        {active === "integraciones" && <IntegracionesTab />}
        {active === "equipo" && <EquipoTab />}
        {active === "suscripcion" && <SuscripcionTab />}
        {active === "seguridad" && <SeguridadTab />}
      </section>
    </div>
  );
}

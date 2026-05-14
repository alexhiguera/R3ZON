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
  Boxes,
  Scale,
  Database,
  Accessibility,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { NegocioTab } from "./NegocioTab";
import { FacturacionTab } from "./FacturacionTab";
import { IntegracionesTab } from "./IntegracionesTab";
import { EquipoTab } from "./EquipoTab";
import { SeguridadTab } from "./SeguridadTab";
import { SuscripcionTab } from "./SuscripcionTab";
import { AparienciaTab } from "./AparienciaTab";
import { AccesibilidadTab } from "./AccesibilidadTab";
import { ListadoTab } from "./ListadoTab";
import { CumplimientoTab } from "./CumplimientoTab";
import { DatosTab } from "./DatosTab";
import type { PerfilNegocio, TabId } from "./types";

const TABS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: "negocio",       label: "Negocio",       Icon: Building2 },
  { id: "apariencia",    label: "Apariencia",    Icon: Palette },
  { id: "accesibilidad", label: "Accesibilidad", Icon: Accessibility },
  { id: "listado",       label: "Listado",       Icon: Boxes },
  { id: "facturacion",   label: "Facturación",   Icon: Receipt },
  { id: "integraciones", label: "Integraciones", Icon: Plug },
  { id: "equipo",        label: "Equipo",        Icon: Users },
  { id: "suscripcion",   label: "Suscripción",   Icon: CreditCard },
  { id: "seguridad",     label: "Seguridad",     Icon: ShieldCheck },
  { id: "datos",         label: "Datos",         Icon: Database },
  { id: "cumplimiento",  label: "Cumplimiento",  Icon: Scale },
];

function renderPanel(id: TabId, perfil: PerfilNegocio) {
  switch (id) {
    case "negocio":       return <NegocioTab perfil={perfil} />;
    case "apariencia":    return <AparienciaTab />;
    case "accesibilidad": return <AccesibilidadTab />;
    case "listado":       return <ListadoTab perfil={perfil} />;
    case "facturacion":   return <FacturacionTab />;
    case "integraciones": return <IntegracionesTab />;
    case "equipo":        return <EquipoTab />;
    case "suscripcion":   return <SuscripcionTab />;
    case "seguridad":     return <SeguridadTab />;
    case "datos":         return <DatosTab />;
    case "cumplimiento":  return <CumplimientoTab />;
  }
}

export function SettingsTabs({ perfil }: { perfil: PerfilNegocio }) {
  const [active, setActive] = useState<TabId>("negocio");
  const [openMobile, setOpenMobile] = useState<TabId | null>(null);

  return (
    <>
      {/* Móvil — acordeón con todas las secciones colapsadas */}
      <div className="flex flex-col gap-3 lg:hidden">
        {TABS.map(({ id, label, Icon }) => {
          const expanded = openMobile === id;
          return (
            <div
              key={id}
              className="card-glass overflow-hidden"
            >
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`m-panel-${id}`}
                onClick={() => setOpenMobile(expanded ? null : id)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold transition ${
                  expanded ? "text-cyan" : "text-text-hi hover:text-cyan"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={16} className={expanded ? "text-cyan" : "text-text-mid"} />
                  {label}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform ${expanded ? "rotate-180 text-cyan" : "text-text-mid"}`}
                />
              </button>
              {expanded && (
                <div
                  id={`m-panel-${id}`}
                  className="border-t border-indigo-400/15 px-3 py-4"
                >
                  {renderPanel(id, perfil)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop — tabs laterales como antes */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-[220px,1fr]">
        <nav
          role="tablist"
          aria-orientation="vertical"
          className="card-glass h-fit p-2 lg:sticky lg:top-4"
        >
          <ul className="flex flex-col gap-1">
            {TABS.map(({ id, label, Icon }) => {
              const selected = active === id;
              return (
                <li key={id} className="w-full">
                  <button
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`panel-${id}`}
                    id={`tab-${id}`}
                    onClick={() => setActive(id)}
                    className={`flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      selected
                        ? "border border-cyan/40 bg-cyan/10 text-cyan"
                        : "border border-transparent text-text-mid hover:border-indigo-400/25 hover:bg-indigo-900/40 hover:text-text-hi"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
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
          {renderPanel(active, perfil)}
        </section>
      </div>
    </>
  );
}

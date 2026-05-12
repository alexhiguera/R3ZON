"use client";

import { useState } from "react";
import { CalendarDays, List } from "lucide-react";
import CalendarViewLazy from "@/components/agenda/CalendarViewLazy";
import { CitasLista } from "@/components/agenda/CitasLista";

type Vista = "calendario" | "lista";

export default function Page() {
  const [vista, setVista] = useState<Vista>("calendario");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-label mb-1">Citas</div>
          <h1 className="font-display text-2xl font-bold text-text-hi sm:text-3xl">
            Agenda
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-mid">
            Calendario sincronizado con Google. Arrastra una cita para moverla,
            estira el borde para cambiar la duración. Cambia a vista de lista
            para verlas todas en un único listado.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Vista de citas"
          className="inline-flex rounded-2xl border border-indigo-400/20 bg-indigo-900/30 p-1"
        >
          <Tab
            active={vista === "calendario"}
            onClick={() => setVista("calendario")}
            Icon={CalendarDays}
            label="Calendario"
          />
          <Tab
            active={vista === "lista"}
            onClick={() => setVista("lista")}
            Icon={List}
            label="Lista"
          />
        </div>
      </div>

      {vista === "calendario" ? <CalendarViewLazy /> : <CitasLista />}
    </div>
  );
}

function Tab({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof CalendarDays;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-gradient-to-r from-cyan to-fuchsia text-bg shadow-glow"
          : "text-text-mid hover:text-text-hi"
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

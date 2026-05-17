"use client";

import { Briefcase, MapPin, ScrollText, Settings, ShieldCheck, Sparkles, User } from "lucide-react";

export function Step0Bienvenida({ nombre }: { nombre?: string | null }) {
  const items = [
    { icon: User, label: "Tus datos como usuario" },
    { icon: Briefcase, label: "Datos esenciales de tu negocio" },
    { icon: MapPin, label: "Dirección, contacto y logo" },
    { icon: Settings, label: "Preferencias (moneda y zona horaria)" },
    { icon: Sparkles, label: "Selección de módulos a usar" },
    { icon: ShieldCheck, label: "Consentimientos legales (RGPD)" },
    { icon: ScrollText, label: "Plan y límites" },
  ];

  return (
    <div>
      <p className="text-sm text-text-mid">
        {nombre ? (
          <>
            ¡Hola, <strong className="text-text-hi">{nombre}</strong>! Bienvenido a{" "}
            <strong className="text-text-hi">R3ZON ANTARES</strong>.
          </>
        ) : (
          <>
            ¡Bienvenido a <strong className="text-text-hi">R3ZON ANTARES</strong>!
          </>
        )}{" "}
        Vamos a dejar tu cuenta lista en unos minutos. Podrás continuar después si te falta algún
        dato.
      </p>

      <ul className="mt-6 space-y-2">
        {items.map(({ icon: Icon, label }, i) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 px-3 py-2.5 text-sm text-text-mid"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-[11px] font-bold text-cyan">
              {i + 1}
            </span>
            <Icon size={14} className="text-cyan" />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-text-lo">
        Tarda menos de 3 minutos. Tu progreso se guarda automáticamente.
      </p>
    </div>
  );
}

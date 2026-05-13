"use client";

import { useEffect, useState } from "react";
import {
  Accessibility,
  Sparkles,
  Eye,
  MousePointer2,
  Type,
  Underline,
  Keyboard,
  CheckCircle2,
} from "lucide-react";
import {
  applyA11yPrefs,
  loadA11yPrefs,
  saveA11yPrefs,
  DEFAULT_A11Y_PREFS,
  type A11yPrefs,
  type FontScale,
} from "@/lib/a11y-prefs";

const FONT_SIZES: { value: FontScale; label: string; sample: string }[] = [
  { value: "sm", label: "Pequeño",  sample: "Aa" },
  { value: "md", label: "Normal",   sample: "Aa" },
  { value: "lg", label: "Grande",   sample: "Aa" },
  { value: "xl", label: "Muy grande", sample: "Aa" },
];

export function AccesibilidadTab() {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_A11Y_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(loadA11yPrefs());
  }, []);

  function update<K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveA11yPrefs(next);
    applyA11yPrefs(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="space-y-5">
      <header className="card-glass overflow-hidden p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
            <Accessibility size={18} />
          </span>
          <div>
            <div className="section-label mb-1">Accesibilidad</div>
            <h2 className="font-display text-base font-bold text-text-hi">
              Adapta la interfaz a tus necesidades
            </h2>
            <p className="mt-1 text-sm text-text-mid">
              Estas preferencias se guardan en este dispositivo y se aplican en toda la
              aplicación. Puedes activarlas y desactivarlas en cualquier momento.
            </p>
          </div>
        </div>
      </header>

      {saved && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200"
        >
          <CheckCircle2 size={15} />
          Preferencias guardadas.
        </div>
      )}

      {/* Tamaño de texto */}
      <section className="card-glass p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-900/40 text-text-mid">
            <Type size={16} />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-text-hi">Tamaño de texto</h3>
            <p className="text-xs text-text-mid">
              Cambia el tamaño base de toda la interfaz.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FONT_SIZES.map((opt) => {
            const active = prefs.fontScale === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update("fontScale", opt.value)}
                aria-pressed={active}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "border-cyan/40 bg-cyan/10 text-cyan"
                    : "border-indigo-400/20 bg-indigo-900/30 text-text-mid hover:border-cyan/30"
                }`}
              >
                <div
                  className="mb-1 font-display font-bold"
                  style={{ fontSize: opt.value === "xl" ? "1.4rem" : opt.value === "lg" ? "1.2rem" : opt.value === "md" ? "1rem" : "0.875rem" }}
                >
                  {opt.sample}
                </div>
                <div className="text-[0.65rem] uppercase tracking-wider">{opt.label}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Toggles */}
      <section className="card-glass divide-y divide-indigo-400/10 p-1 sm:p-2">
        <ToggleRow
          icon={Sparkles}
          title="Reducir movimiento"
          description="Elimina animaciones y transiciones para evitar mareos o distracciones."
          checked={prefs.reduceMotion}
          onChange={(v) => update("reduceMotion", v)}
        />
        <ToggleRow
          icon={Eye}
          title="Alto contraste"
          description="Refuerza el contraste entre fondo y texto y reemplaza el efecto cristal por superficies sólidas."
          checked={prefs.highContrast}
          onChange={(v) => update("highContrast", v)}
        />
        <ToggleRow
          icon={Underline}
          title="Subrayar enlaces siempre"
          description="Muestra el subrayado en todos los enlaces para que sean más fáciles de identificar."
          checked={prefs.underlineLinks}
          onChange={(v) => update("underlineLinks", v)}
        />
        <ToggleRow
          icon={MousePointer2}
          title="Cursor grande"
          description="Aumenta el tamaño del puntero del ratón para localizarlo con facilidad."
          checked={prefs.largeCursor}
          onChange={(v) => update("largeCursor", v)}
        />
      </section>

      {/* Atajos de teclado */}
      <section className="card-glass p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-900/40 text-text-mid">
            <Keyboard size={16} />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-text-hi">Atajos de teclado</h3>
            <p className="text-xs text-text-mid">Toda la app es navegable con teclado.</p>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          <Shortcut keys={["⌘", "K"]}    desc="Abrir la búsqueda global" />
          <Shortcut keys={["Ctrl", "K"]} desc="Abrir la búsqueda global (Windows/Linux)" />
          <Shortcut keys={["Esc"]}        desc="Cerrar diálogo o panel actual" />
          <Shortcut keys={["Tab"]}        desc="Avanzar al siguiente elemento focusable" />
          <Shortcut keys={["⇧", "Tab"]}   desc="Volver al anterior" />
          <Shortcut keys={["↑", "↓"]}     desc="Navegar listas y menús" />
          <Shortcut keys={["Enter"]}      desc="Activar el elemento enfocado" />
        </ul>
      </section>

      <p className="text-[0.7rem] text-text-lo">
        Si tu sistema operativo ya solicita reducir el movimiento, se respeta automáticamente
        aunque desactives la opción aquí.
      </p>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: typeof Accessibility;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-900/40 text-text-mid">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-sm font-semibold text-text-hi">{title}</div>
        <p className="mt-0.5 text-xs text-text-mid">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-cyan/70" : "bg-indigo-900/80 border border-indigo-400/25"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function Shortcut({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/30 px-3 py-2 text-xs text-text-mid">
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md border border-indigo-400/30 bg-indigo-950/60 px-1.5 font-mono text-[0.7rem] text-text-hi"
          >
            {k}
          </kbd>
        ))}
      </div>
      <span className="flex-1">{desc}</span>
    </li>
  );
}

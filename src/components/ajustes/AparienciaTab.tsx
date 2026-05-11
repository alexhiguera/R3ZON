"use client";

import { Loader2, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { useThemeEngine } from "@/lib/theme/ThemeProvider";
import { themeSchema, type SchemaControl } from "@/lib/theme/theme";

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-1">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              selected
                ? "bg-cyan/15 text-cyan border border-cyan/40"
                : "text-text-mid border border-transparent hover:text-text-hi"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function PresetGrid({
  value,
  control,
  onChange,
}: {
  value: string;
  control: Extract<SchemaControl, { type: "preset" }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
      {control.options.map((o) => {
        const selected = value === o.value;
        const swatches = o.vars
          ? [o.vars["--indigo-600"], o.vars["--cyan"], o.vars["--fuchsia"], o.vars["--bg"]]
          : ["#4f46e5", "#22d3ee", "#e879f9", "#080714"];
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${
              selected
                ? "border-cyan/50 bg-cyan/10"
                : "border-indigo-400/15 bg-indigo-900/30 hover:border-indigo-400/35"
            }`}
          >
            <div className="flex gap-1">
              {swatches.map((c, i) => (
                <span
                  key={i}
                  className="h-5 w-5 rounded-md border border-white/10"
                  style={{ background: c }}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-text-hi">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-9 shrink-0 cursor-pointer rounded-lg border border-indigo-400/20 bg-transparent"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-indigo-400/20 bg-indigo-900/40 px-2 py-1.5 text-[0.7rem] text-text-hi"
      />
    </div>
  );
}

function FontPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; googleHref: string | null }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-indigo-400/20 bg-indigo-900/40 px-2.5 py-2 text-sm text-text-hi"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ fontFamily: o.value }}>
          {o.value}
        </option>
      ))}
    </select>
  );
}

export function AparienciaTab() {
  const { theme, setField, reset, loading, saving, saveError } = useThemeEngine();

  return (
    <div className="card-glass space-y-6 p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-hi">Apariencia</h2>
          <p className="mt-1 text-xs text-text-mid">
            Personaliza tema, tipografía y colores. Los cambios se guardan automáticamente y se aplican solo a tu usuario.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="flex items-center gap-1 text-xs text-text-lo">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando
            </span>
          ) : saving ? (
            <span className="flex items-center gap-1 text-xs text-cyan">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando
            </span>
          ) : saveError ? (
            <span className="flex items-center gap-1 text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5" /> {saveError}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-ok">
              <CheckCircle2 className="h-3.5 w-3.5" /> Sincronizado
            </span>
          )}
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 rounded-lg border border-indigo-400/25 bg-indigo-900/30 px-2.5 py-1.5 text-xs text-text-mid transition hover:border-indigo-400/45 hover:text-text-hi"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restablecer
          </button>
        </div>
      </header>

      <div className="space-y-5">
        {(() => {
          // Agrupa controles `color` consecutivos en una grilla horizontal
          // para que no ocupen una fila completa cada uno.
          const visibles = themeSchema.controls.filter((c) => {
            if (!c.when) return true;
            return Object.entries(c.when).every(([k, v]) => theme[k] === v);
          });

          // Para agrupar visualmente, los colores con id "doc.*" se rinden
          // bajo un encabezado "Documentos"; el resto van juntos en otro bloque.
          const grupoDe = (c: SchemaControl) =>
            c.id.startsWith("doc.") ? "doc" : "base";

          const bloques: Array<
            | { kind: "single"; control: SchemaControl }
            | { kind: "colors"; grupo: "doc" | "base"; controls: Extract<SchemaControl, { type: "color" }>[] }
          > = [];
          for (const c of visibles) {
            if (c.type === "color") {
              const g = grupoDe(c) as "doc" | "base";
              const last = bloques[bloques.length - 1];
              if (last && last.kind === "colors" && last.grupo === g) {
                last.controls.push(c);
              } else {
                bloques.push({ kind: "colors", grupo: g, controls: [c] });
              }
            } else {
              bloques.push({ kind: "single", control: c });
            }
          }

          return bloques.map((b, idx) => {
            if (b.kind === "colors") {
              const grilla = (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {b.controls.map((c) => (
                    <div key={c.id} className="space-y-1.5">
                      <span className="block text-[0.6rem] font-semibold uppercase tracking-wider text-text-lo">
                        {c.label}
                      </span>
                      <ColorPicker
                        value={theme[c.id] || c.default}
                        onChange={(v) => setField(c.id, v)}
                      />
                    </div>
                  ))}
                </div>
              );

              if (b.grupo === "doc") {
                return (
                  <section
                    key={`colors-${idx}`}
                    className="space-y-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-4"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-mid">
                      Documentos
                    </h3>
                    {grilla}
                  </section>
                );
              }

              return <div key={`colors-${idx}`}>{grilla}</div>;
            }

            const c = b.control;
            return (
              <div key={c.id} className="space-y-2">
                <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">
                  {c.label}
                </span>

                {c.type === "segmented" && (
                  <Segmented
                    value={theme[c.id]}
                    options={c.options}
                    onChange={(v) => setField(c.id, v)}
                  />
                )}

                {c.type === "preset" && (
                  <PresetGrid
                    value={theme[c.id]}
                    control={c}
                    onChange={(v) => setField(c.id, v)}
                  />
                )}

                {c.type === "font" && (
                  <FontPicker
                    value={theme[c.id]}
                    options={c.options}
                    onChange={(v) => setField(c.id, v)}
                  />
                )}
              </div>
            );
          });
        })()}
      </div>

    </div>
  );
}

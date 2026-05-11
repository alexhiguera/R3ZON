import rawSchema from "./theme-schema.json";

export type ControlBase = {
  id: string;
  label: string;
  default: string;
  var?: string;
  when?: Record<string, string>;
};

export type PresetOption = {
  value: string;
  label: string;
  vars?: Record<string, string>;
};
export type FontOption = { value: string; googleHref: string | null };
export type SegmentedOption = { value: string; label: string };

export type SchemaControl =
  | (ControlBase & { type: "segmented"; options: SegmentedOption[] })
  | (ControlBase & { type: "preset"; options: PresetOption[] })
  | (ControlBase & { type: "color" })
  | (ControlBase & { type: "font"; options: FontOption[] });

export type ThemeSchema = {
  version: number;
  controls: SchemaControl[];
};

export const themeSchema = rawSchema as unknown as ThemeSchema;

export type ThemeValues = Record<string, string>;

export const LOCAL_STORAGE_KEY = "r3zon:theme:v1";

export function getControl(id: string): SchemaControl | undefined {
  return themeSchema.controls.find((c) => c.id === id);
}

export function defaultTheme(): ThemeValues {
  const out: ThemeValues = {};
  for (const c of themeSchema.controls) out[c.id] = c.default;
  return out;
}

export function mergeWithDefaults(partial: ThemeValues | null | undefined): ThemeValues {
  return { ...defaultTheme(), ...(partial ?? {}) };
}

// Variables que viven en formato "r g b" para casarse con
// rgb(var(--x) / <alpha-value>) que usa Tailwind.
const RGB_VARS = new Set([
  "--bg",
  "--indigo-900",
  "--indigo-800",
  "--indigo-700",
  "--indigo-600",
  "--indigo-400",
  "--indigo-300",
  "--cyan",
  "--fuchsia",
  "--text-hi",
  "--text-mid",
]);

function hexToTriplet(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 0xff} ${(n >> 8) & 0xff} ${n & 0xff}`;
}

function setVar(name: string, value: string) {
  const v = RGB_VARS.has(name) ? hexToTriplet(value) ?? value : value;
  document.documentElement.style.setProperty(name, v);
}

function loadGoogleFont(family: string, href: string | null) {
  if (!href) return;
  const id = `font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${href}&display=swap`;
  document.head.appendChild(link);
}

export function applyTheme(values: ThemeValues) {
  if (typeof document === "undefined") return;
  const merged = mergeWithDefaults(values);

  const mode = merged["mode"] ?? "dark";
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.classList.toggle("light", mode === "light");

  const palette = getControl("palette");
  if (palette && palette.type === "preset") {
    const selected = palette.options.find((p) => p.value === merged["palette"]);
    if (selected?.vars) {
      for (const [k, v] of Object.entries(selected.vars)) setVar(k, v);
    }
  }

  // Light-mode tonal override sólo si la paleta no es "custom".
  // "Blanco roto" en lugar de blanco puro para no cegar.
  if (mode === "light" && merged["palette"] !== "custom") {
    setVar("--bg", "#eef0f6");          // blanco roto
    setVar("--text-hi", "#161529");
    setVar("--text-mid", "#4a4a6a");
    // Tonos claros para los indigos (cards y bordes coherentes en claro).
    setVar("--indigo-900", "#dde2f3");
    setVar("--indigo-800", "#cdd5ef");
    setVar("--indigo-700", "#b3bde6");
    setVar("--indigo-400", "#7079b5");
    setVar("--indigo-300", "#5b6498");
    // Variables de texto secundario (no son tripletes RGB).
    document.documentElement.style.setProperty("--text-lo", "rgba(90, 96, 130, 0.55)");
    document.documentElement.style.setProperty("--text-ghost", "rgba(90, 96, 130, 0.4)");
  } else if (mode === "dark") {
    document.documentElement.style.setProperty("--text-lo", "rgba(165, 180, 252, 0.5)");
    document.documentElement.style.setProperty("--text-ghost", "rgba(165, 180, 252, 0.42)");
  }

  for (const c of themeSchema.controls) {
    if (!c.var) continue;
    if (c.when) {
      const ok = Object.entries(c.when).every(([k, v]) => merged[k] === v);
      if (!ok) continue;
    }
    const value = merged[c.id];
    if (c.type === "color") setVar(c.var, value);
    if (c.type === "segmented") setVar(c.var, value);
    if (c.type === "font") {
      const opt = c.options.find((o) => o.value === value);
      loadGoogleFont(value, opt?.googleHref ?? null);
      setVar(c.var, `"${value}", system-ui, -apple-system, sans-serif`);
    }
  }
}

export function readLocalTheme(): ThemeValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ThemeValues) : null;
  } catch {
    return null;
  }
}

export function writeLocalTheme(values: ThemeValues) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* storage quota / private mode */
  }
}

/**
 * Preferencias de accesibilidad del usuario, persistidas en localStorage y
 * aplicadas como clases sobre <html>. Un boot script en `layout.tsx` aplica
 * las clases antes del primer paint para evitar FOUC.
 *
 * Claves expuestas:
 *  · a11y:reduce-motion     → html.reduce-motion
 *  · a11y:high-contrast     → html.alto-contraste
 *  · a11y:underline-links   → html.underline-links
 *  · a11y:large-cursor      → html.large-cursor
 *  · a11y:font-scale        → --font-scale en :root (reutiliza la del theme)
 */

export const A11Y_STORAGE_KEY = "r3zon:a11y:v1";

export type FontScale = "sm" | "md" | "lg" | "xl";

export type A11yPrefs = {
  reduceMotion: boolean;
  highContrast: boolean;
  underlineLinks: boolean;
  largeCursor: boolean;
  fontScale: FontScale;
};

export const FONT_SCALE_VALUE: Record<FontScale, number> = {
  sm: 0.9375,
  md: 1,
  lg: 1.0625,
  xl: 1.125,
};

export const DEFAULT_A11Y_PREFS: A11yPrefs = {
  reduceMotion: false,
  highContrast: false,
  underlineLinks: false,
  largeCursor: false,
  fontScale: "md",
};

export function loadA11yPrefs(): A11yPrefs {
  if (typeof window === "undefined") return DEFAULT_A11Y_PREFS;
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return DEFAULT_A11Y_PREFS;
    const parsed = JSON.parse(raw) as Partial<A11yPrefs>;
    return { ...DEFAULT_A11Y_PREFS, ...parsed };
  } catch {
    return DEFAULT_A11Y_PREFS;
  }
}

export function saveA11yPrefs(prefs: A11yPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
}

export function applyA11yPrefs(prefs: A11yPrefs): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("reduce-motion", prefs.reduceMotion);
  html.classList.toggle("alto-contraste", prefs.highContrast);
  html.classList.toggle("underline-links", prefs.underlineLinks);
  html.classList.toggle("large-cursor", prefs.largeCursor);
  const scale = FONT_SCALE_VALUE[prefs.fontScale] ?? 1;
  html.style.setProperty("--font-scale", String(scale));
}

/**
 * Script inline para `layout.tsx`. Aplica las clases antes del primer paint.
 * Mantiene la misma lógica que `applyA11yPrefs` pero sin depender del bundle.
 */
export const A11Y_BOOT_SCRIPT = `(() => {
  try {
    var raw = localStorage.getItem('${A11Y_STORAGE_KEY}');
    if (!raw) return;
    var p = JSON.parse(raw);
    var h = document.documentElement;
    if (p.reduceMotion)    h.classList.add('reduce-motion');
    if (p.highContrast)    h.classList.add('alto-contraste');
    if (p.underlineLinks)  h.classList.add('underline-links');
    if (p.largeCursor)     h.classList.add('large-cursor');
    var scales = { sm: 0.9375, md: 1, lg: 1.0625, xl: 1.125 };
    var s = scales[p.fontScale];
    if (s) h.style.setProperty('--font-scale', String(s));
  } catch (e) {}
})();`;

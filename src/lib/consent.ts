"use client";

/**
 * Consentimiento RGPD/LSSI mínimo viable.
 *
 * Persistido en localStorage (no en cookie) porque la única tecnología no
 * estrictamente necesaria que usamos es Vercel Analytics, que se carga vía
 * SDK propio (no third-party cookies). El acceso al storage es first-party
 * y no rastrea entre dominios.
 *
 * Cambia STORAGE_VERSION si la forma de Consent evoluciona — la app pedirá
 * consentimiento de nuevo.
 */
export type Consent = {
  essential: true;
  analytics: boolean;
  ts: string;
};

const STORAGE_KEY = "r3zon:consent:v1";

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (typeof parsed.analytics !== "boolean" || !parsed.ts) return null;
    return { essential: true, analytics: parsed.analytics, ts: parsed.ts };
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean): Consent {
  const c: Consent = { essential: true, analytics, ts: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    window.dispatchEvent(new CustomEvent<Consent>("r3zon:consent", { detail: c }));
  }
  return c;
}

export function clearConsent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("r3zon:consent", { detail: null }));
}

export const CONSENT_EVENT = "r3zon:consent";

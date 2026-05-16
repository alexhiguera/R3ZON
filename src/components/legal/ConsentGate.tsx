"use client";

import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, type Consent, readConsent } from "@/lib/consent";
import { CookieBanner } from "./CookieBanner";

/**
 * Renderiza el banner y carga Vercel Analytics solo si el usuario lo ha
 * consentido. Se re-evalúa cuando cambia la decisión en otra pestaña o vía
 * el evento sintético que dispara `writeConsent`.
 */
export function ConsentGate() {
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent | null>).detail ?? null);
    const onStorage = () => setConsent(readConsent());
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <>
      {consent?.analytics ? <Analytics /> : null}
      <CookieBanner />
    </>
  );
}

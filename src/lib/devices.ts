"use client";

/** Fingerprint estable y privacy-friendly: UA + plataforma + zona horaria + idioma. */
export async function deviceFingerprint(): Promise<{ hash: string; name: string }> {
  if (typeof window === "undefined") return { hash: "", name: "" };

  const ua = navigator.userAgent;
  const platform = (navigator as any).userAgentData?.platform ?? navigator.platform;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;
  const raw = [ua, platform, tz, lang].join("|");

  const buf = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { hash, name: humanName(ua, platform) };
}

function humanName(ua: string, platform: string) {
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /Chrome/.test(ua)
    ? "Chrome"
    : /Safari/.test(ua)
    ? "Safari"
    : /Firefox/.test(ua)
    ? "Firefox"
    : "Navegador";
  return `${browser} en ${platform || "dispositivo desconocido"}`;
}

"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Banner sticky bajo la topbar que avisa al usuario cuando el dispositivo
 * pierde la conexión. Se monta una vez en AppShell.
 *
 * Detección vía `navigator.onLine` + eventos `online/offline`. No depende de
 * fetch porque queremos cero ruido en red — solo reflejamos lo que el SO sabe.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  if (!mounted || online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 border-b border-amber-400/30 bg-amber-500/15 px-4 py-2 text-[0.78rem] font-medium text-amber-100 backdrop-blur-glass"
    >
      <WifiOff size={14} aria-hidden />
      <span>Sin conexión — los cambios podrían no guardarse hasta que vuelva la red.</span>
    </div>
  );
}

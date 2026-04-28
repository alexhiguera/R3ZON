"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { deviceFingerprint } from "@/lib/devices";

/**
 * Se monta en el AppShell. Tras autenticar, registra el dispositivo y, si es
 * nuevo, invoca la Edge Function `notify-new-device` (que envía email Resend).
 * Sin coste de servidor: la Edge Function corre en Supabase (tier free).
 */
export function DeviceTracker() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;

      const { hash, name } = await deviceFingerprint();
      if (!hash) return;

      const { data: esNuevo, error } = await supabase.rpc("registrar_dispositivo", {
        p_device_hash: hash,
        p_device_name: name,
        p_user_agent: navigator.userAgent,
      });

      if (error || cancelled) return;

      if (esNuevo) {
        await supabase.functions.invoke("notify-new-device", {
          body: { device_hash: hash, device_name: name },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

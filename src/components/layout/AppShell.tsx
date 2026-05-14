"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { DeviceTracker } from "@/components/auth/DeviceTracker";
import { ToastProvider } from "@/components/ui/Toast";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { DatabaseUnavailable } from "@/components/ui/DatabaseUnavailable";
import { createClient } from "@/lib/supabase/client";

// Rutas que ocupan todo el ancho disponible (sin el max-w por defecto).
const FULL_BLEED = ["/citas"];

type EstadoConexion = "checking" | "ok" | "down";

const TIMEOUT_MS = 5000;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>("checking");
  const pathname = usePathname() ?? "";
  const fullBleed = FULL_BLEED.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  useEffect(() => {
    let cancelado = false;
    const supabase = createClient();
    const ping = supabase.auth.getSession();
    const timeout = new Promise<{ error: { message: string } }>((resolve) => {
      setTimeout(
        () => resolve({ error: { message: "timeout" } }),
        TIMEOUT_MS
      );
    });
    Promise.race([ping, timeout])
      .then((res) => {
        if (cancelado) return;
        const error = (res as { error?: unknown }).error;
        if (error) {
          setEstadoConexion("down");
        } else {
          setEstadoConexion("ok");
        }
      })
      .catch(() => {
        if (!cancelado) setEstadoConexion("down");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (estadoConexion === "down") {
    return (
      <ToastProvider>
        <DatabaseUnavailable />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
    <OfflineBanner />
    <CommandPalette />
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[280px_1fr]">
      <DeviceTracker />
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-[100dvh] border-r border-indigo-400/10 bg-bg/60 backdrop-blur-glass lg:block">
        <Sidebar />
      </aside>

      {/* Sidebar mobile (drawer) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-indigo-400/15 bg-[#0b0a1d] shadow-2xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* Contenido */}
      <div className="flex min-h-[100dvh] flex-col">
        {/* Topbar mobile */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-indigo-400/10 bg-bg/80 px-4 py-3 backdrop-blur-glass lg:hidden">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 active:scale-95"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="font-display text-lg font-extrabold tracking-tight">R3ZON</div>
          <div className="accent-bar ml-1" style={{ width: 40, height: 2 }} />
        </header>

        <main
          className={
            fullBleed
              ? "w-full flex-1 px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:py-8"
              : "mx-auto w-full max-w-[1240px] flex-1 px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:py-8"
          }
        >
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}

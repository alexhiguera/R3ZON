"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { ModuloId } from "@/lib/sidebarModulos";
import { createClient } from "@/lib/supabase/client";

type Ctx = {
  modulosVistos: Set<ModuloId>;
  marcarVisto: (id: ModuloId) => Promise<void>;
};

const OnboardingCtx = createContext<Ctx | null>(null);

export function OnboardingProvider({
  initialModulosVistos,
  children,
}: {
  initialModulosVistos: string[];
  children: ReactNode;
}) {
  const [vistos, setVistos] = useState<Set<ModuloId>>(
    () => new Set(initialModulosVistos as ModuloId[]),
  );

  const marcarVisto = useCallback(async (id: ModuloId) => {
    setVistos((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const supabase = createClient();
    await supabase.rpc("marcar_modulo_visto", { p_modulo: id });
  }, []);

  const value = useMemo(() => ({ modulosVistos: vistos, marcarVisto }), [vistos, marcarVisto]);
  return <OnboardingCtx.Provider value={value}>{children}</OnboardingCtx.Provider>;
}

export function useOnboardingCtx(): Ctx {
  const ctx = useContext(OnboardingCtx);
  if (!ctx)
    return {
      modulosVistos: new Set<ModuloId>(),
      marcarVisto: async () => {},
    };
  return ctx;
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PlanNombre = "free" | "pro" | "business";

export type PlanLimites = {
  clientes: number | null; // null = ilimitado
  tareas: number | null;
  google_calendar: boolean;
  ocr_mes: number | null;
};

export const LIMITES: Record<PlanNombre, PlanLimites> = {
  free: { clientes: 5, tareas: 10, google_calendar: false, ocr_mes: 0 },
  pro: { clientes: 1000, tareas: null, google_calendar: true, ocr_mes: 50 },
  business: { clientes: null, tareas: null, google_calendar: true, ocr_mes: null },
};

export type UsoPlan = {
  plan: PlanNombre;
  limites: PlanLimites;
  contadores: { clientes: number; tareas: number };
  cargando: boolean;
};

export function usePlan(): UsoPlan {
  const [plan, setPlan] = useState<PlanNombre>("free");
  const [contadores, setContadores] = useState({ clientes: 0, tareas: 0 });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const [{ data: perfil }, { count: cClientes }, { count: cTareas }] = await Promise.all([
        supabase.from("perfiles_negocio").select("plan").single(),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase
          .from("tareas_kanban")
          .select("id", { count: "exact", head: true })
          .eq("completada", false),
      ]);
      if (!alive) return;
      setPlan((perfil?.plan as PlanNombre | undefined) ?? "free");
      setContadores({ clientes: cClientes ?? 0, tareas: cTareas ?? 0 });
      setCargando(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { plan, limites: LIMITES[plan], contadores, cargando };
}

/** Devuelve true si el negocio ha alcanzado el límite para el recurso dado. */
export function haAlcanzadoLimite(
  plan: PlanNombre,
  recurso: keyof Pick<PlanLimites, "clientes" | "tareas">,
  contadorActual: number,
): boolean {
  const limite = LIMITES[plan][recurso];
  if (limite === null) return false;
  return contadorActual >= limite;
}

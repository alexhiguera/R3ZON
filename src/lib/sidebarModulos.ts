"use client";

import {
  Boxes,
  Building2,
  Calendar,
  Clock,
  FileText,
  Kanban,
  LayoutDashboard,
  type LucideIcon,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PlanNombre } from "./usePlan";

export type ModuloId =
  | "dashboard"
  | "clientes"
  | "proveedores"
  | "citas"
  | "tareas"
  | "fichajes"
  | "listado"
  | "tpv"
  | "documentos"
  | "finanzas";

export type ModuloDef = {
  id: ModuloId;
  href: string;
  label: string;
  descripcion: string;
  Icon: LucideIcon;
  minPlan: PlanNombre;
  /** Núcleo: no se puede ocultar nunca. */
  obligatorio?: boolean;
};

export const MODULOS: ModuloDef[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Inicio",
    descripcion: "Resumen general del negocio.",
    Icon: LayoutDashboard,
    minPlan: "free",
    obligatorio: true,
  },
  {
    id: "clientes",
    href: "/clientes",
    label: "Clientes",
    descripcion: "Ficha de clientes, contactos y jerarquía.",
    Icon: Building2,
    minPlan: "free",
  },
  {
    id: "proveedores",
    href: "/proveedores",
    label: "Proveedores",
    descripcion: "Gestión de proveedores y compras.",
    Icon: Truck,
    minPlan: "free",
  },
  {
    id: "citas",
    href: "/citas",
    label: "Agenda",
    descripcion: "Calendario y citas con clientes.",
    Icon: Calendar,
    minPlan: "free",
  },
  {
    id: "tareas",
    href: "/tareas",
    label: "Tareas",
    descripcion: "Tablero Kanban de tareas internas.",
    Icon: Kanban,
    minPlan: "free",
  },
  {
    id: "fichajes",
    href: "/fichajes",
    label: "Fichajes",
    descripcion: "Control horario del equipo.",
    Icon: Clock,
    minPlan: "pro",
  },
  {
    id: "listado",
    href: "/listado",
    label: "Listado",
    descripcion: "Productos y servicios con stock.",
    Icon: Boxes,
    minPlan: "free",
  },
  {
    id: "tpv",
    href: "/tpv",
    label: "TPV",
    descripcion: "Punto de venta para mostrador.",
    Icon: ShoppingCart,
    minPlan: "pro",
  },
  {
    id: "documentos",
    href: "/documentos",
    label: "Documentos",
    descripcion: "Presupuestos, facturas y albaranes.",
    Icon: FileText,
    minPlan: "pro",
  },
  {
    id: "finanzas",
    href: "/finanzas",
    label: "Finanzas",
    descripcion: "Cuentas, gastos e ingresos consolidados.",
    Icon: Wallet,
    minPlan: "business",
  },
];

const ORDEN_PLAN: Record<PlanNombre, number> = { free: 0, pro: 1, business: 2 };

export function planPermite(userPlan: PlanNombre, minPlan: PlanNombre): boolean {
  return ORDEN_PLAN[userPlan] >= ORDEN_PLAN[minPlan];
}

const STORAGE_KEY = "r3zon:sidebar-hidden-modules:v1";

function leerOcultos(): Set<ModuloId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr as ModuloId[]);
  } catch {
    return new Set();
  }
}

function guardarOcultos(set: Set<ModuloId>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  window.dispatchEvent(new CustomEvent("r3zon:modulos-changed"));
}

/** Hook reactivo: devuelve el set de módulos ocultos manualmente por el usuario. */
export function useModulosOcultos(): {
  ocultos: Set<ModuloId>;
  alternar: (id: ModuloId) => void;
  montado: boolean;
} {
  const [ocultos, setOcultos] = useState<Set<ModuloId>>(new Set());
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setOcultos(leerOcultos());
    setMontado(true);
    const refrescar = () => setOcultos(leerOcultos());
    window.addEventListener("r3zon:modulos-changed", refrescar);
    window.addEventListener("storage", refrescar);
    return () => {
      window.removeEventListener("r3zon:modulos-changed", refrescar);
      window.removeEventListener("storage", refrescar);
    };
  }, []);

  const alternar = (id: ModuloId) => {
    setOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      guardarOcultos(next);
      return next;
    });
  };

  return { ocultos, alternar, montado };
}

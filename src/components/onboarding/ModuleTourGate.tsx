"use client";

import { usePathname } from "next/navigation";
import { MODULOS, type ModuloId } from "@/lib/sidebarModulos";
import { ModuloTourBoot } from "./ModuloOnboardingModal";

/** Detecta el módulo de la ruta actual y monta su mini-tour si procede.
 *  Renderizado por (app)/layout.tsx, así cubre las 10 páginas sin tocar cada una. */
export function ModuleTourGate() {
  const pathname = usePathname() ?? "";
  const match = MODULOS.find((m) => pathname === m.href || pathname.startsWith(`${m.href}/`));
  if (!match) return null;
  // El tour solo se dispara la primera visita "raíz" del módulo, no en subrutas
  // de detalle (evita aparecer encima de un formulario de creación, por ej.).
  if (pathname !== match.href) return null;
  return <ModuloTourBoot id={match.id as ModuloId} label={match.label} />;
}

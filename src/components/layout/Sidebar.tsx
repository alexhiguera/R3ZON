"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULOS, planPermite, useModulosOcultos } from "@/lib/sidebarModulos";
import { usePlan } from "@/lib/usePlan";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const { plan, cargando } = usePlan();
  const { ocultos, montado } = useModulosOcultos();

  const navVisible = MODULOS.filter((m) => {
    if (m.obligatorio) return true;
    if (!cargando && !planPermite(plan, m.minPlan)) return false;
    if (montado && ocultos.has(m.id)) return false;
    return true;
  });

  return (
    <nav className="flex h-full flex-col">
      {/* Cabecera: logo + botón colapsar (solo desktop) */}
      <div
        className={cn(
          "flex shrink-0 items-center pt-4 pb-3",
          collapsed ? "flex-col gap-3 px-3" : "gap-3 px-6",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn("flex items-center gap-3", collapsed && "justify-center")}
        >
          <div className="relative h-12 w-12 shrink-0">
            <img
              src="/R3ZON-ANTARES-negativo.svg"
              alt="R3ZON ANTARES"
              className="h-12 w-12 dark:block hidden"
            />
            <img
              src="/R3ZON-ANTARES.svg"
              alt="R3ZON ANTARES"
              className="h-12 w-12 dark:hidden block"
            />
          </div>
          {!collapsed && (
            <div>
              <div className="font-display text-xl font-extrabold tracking-tight text-text-hi">
                ANTARES
              </div>
              <div className="accent-bar mt-1" style={{ width: 56 }} />
            </div>
          )}
        </Link>

        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            title={collapsed ? "Expandir" : "Colapsar"}
            className={cn(
              "hidden h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/15 bg-indigo-900/30 text-text-mid transition hover:border-indigo-400/40 hover:text-text-hi lg:flex",
              !collapsed && "ml-auto",
            )}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        )}
      </div>

      {/* Navegación (scrolleable) */}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2",
          collapsed ? "px-2" : "px-4",
        )}
      >
        {!collapsed && <div className="section-label mb-1 px-3">Navegación</div>}
        <div className="flex flex-col gap-1.5">
          {navVisible.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                className={cn(
                  "group",
                  collapsed ? "flex items-center justify-center rounded-xl p-1.5" : "btn-big",
                  active
                    ? collapsed
                      ? ""
                      : "bg-glass border border-indigo-400/30 text-text-hi shadow-glass"
                    : collapsed
                      ? "hover:bg-indigo-900/40"
                      : "border border-transparent text-text-mid hover:bg-indigo-900/40 hover:text-text-hi",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                    active
                      ? "border-cyan/40 bg-cyan/10 text-cyan"
                      : "border-indigo-400/20 bg-indigo-900/40 text-indigo-300 group-hover:border-indigo-400/40",
                  )}
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
                {!collapsed && <span className="text-[0.95rem]">{label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Usuario (fijo abajo) */}
      <div
        className={cn(
          "shrink-0 border-t border-indigo-400/10 bg-bg/60 pb-4 pt-3 backdrop-blur-glass",
          collapsed ? "px-2" : "px-4",
        )}
      >
        <UserMenu onNavigate={onNavigate} compact={collapsed} />
      </div>
    </nav>
  );
}

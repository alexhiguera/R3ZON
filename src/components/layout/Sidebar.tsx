"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Kanban,
  Clock,
  FileText,
  Boxes,
  ShoppingCart,
  Wallet,
  Truck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

type NavItem = { href: string; label: string; Icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Inicio",        Icon: LayoutDashboard },
  { href: "/clientes",  label: "Clientes",      Icon: Building2 },
  { href: "/proveedores", label: "Proveedores", Icon: Truck },
  { href: "/citas",     label: "Agenda",        Icon: Calendar },
  { href: "/tareas",    label: "Tareas",        Icon: Kanban },
  { href: "/fichajes",  label: "Fichajes",      Icon: Clock },
  { href: "/listado",   label: "Listado",       Icon: Boxes },
  { href: "/tpv",       label: "TPV",           Icon: ShoppingCart },
  { href: "/documentos", label: "Documentos",   Icon: FileText },
  { href: "/finanzas",  label: "Finanzas",      Icon: Wallet },
  { href: "/ajustes",   label: "Ajustes",       Icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col">
      {/* Logo (fijo arriba) */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex shrink-0 items-center gap-3 px-6 pt-4 pb-3"
      >
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-glow">
          <span className="font-display text-lg font-extrabold text-white">R3</span>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-cyan shadow-[0_0_10px_#22d3ee]" />
        </div>
        <div>
          <div className="font-display text-xl font-extrabold tracking-tight text-text-hi">
            R3ZON
          </div>
          <div className="accent-bar mt-1" style={{ width: 56 }} />
        </div>
      </Link>

      {/* Navegación (scrolleable) */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
        <div className="section-label mb-1 px-3">Navegación</div>
        <div className="flex flex-col gap-1.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "btn-big group",
                  active
                    ? "bg-glass border border-indigo-400/30 text-text-hi shadow-glass"
                    : "border border-transparent text-text-mid hover:bg-indigo-900/40 hover:text-text-hi"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                    active
                      ? "border-cyan/40 bg-cyan/10 text-cyan"
                      : "border-indigo-400/20 bg-indigo-900/40 text-indigo-300 group-hover:border-indigo-400/40"
                  )}
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="text-[0.95rem]">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Usuario (fijo abajo) */}
      <div className="shrink-0 border-t border-indigo-400/10 bg-bg/60 px-4 pb-4 pt-3 backdrop-blur-glass">
        <UserMenu onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

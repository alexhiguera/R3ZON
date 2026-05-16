"use client";

import { ChevronDown, Loader2, LogOut, Repeat, Settings, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserInfo = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  plan: string;
};

export function UserMenu({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u || !alive) return;
      const meta = (u.user_metadata ?? {}) as { display_name?: string; avatar_url?: string };
      const { data: perfil } = await supabase
        .from("perfiles_negocio")
        .select("plan")
        .eq("user_id", u.id)
        .maybeSingle();
      if (!alive) return;
      setUser({
        id: u.id,
        email: u.email ?? "",
        displayName: meta.display_name ?? (u.email ?? "").split("@")[0] ?? "Usuario",
        avatarUrl: meta.avatar_url ?? null,
        plan: (perfil?.plan as string | undefined) ?? "free",
      });
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  // Cerrar al hacer click fuera o pulsar Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cerrarSesion = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const cambiarCuenta = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const initials = (user?.displayName ?? "U").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl border border-indigo-400/25 bg-[#13123a] p-1.5 shadow-2xl"
        >
          <Link
            href="/perfil"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-hi transition hover:bg-indigo-900/40"
            role="menuitem"
          >
            <User size={15} className="text-indigo-300" /> Mi perfil
          </Link>
          <Link
            href="/ajustes"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-hi transition hover:bg-indigo-900/40"
            role="menuitem"
          >
            <Settings size={15} className="text-indigo-300" /> Ajustes
          </Link>
          <button
            type="button"
            onClick={cambiarCuenta}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-mid transition hover:bg-indigo-900/40 hover:text-text-hi disabled:opacity-50"
            role="menuitem"
          >
            <Repeat size={15} /> Cambiar de cuenta
          </button>
          <div className="my-1 h-px bg-indigo-400/15" />
          <button
            type="button"
            onClick={cerrarSesion}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
            role="menuitem"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            Cerrar sesión
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? "flex w-full items-center justify-center rounded-2xl border border-indigo-400/20 bg-glass p-1.5 transition hover:border-indigo-400/40"
            : "flex w-full items-center gap-3 rounded-2xl border border-indigo-400/20 bg-glass p-3 text-left transition hover:border-indigo-400/40"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        title={compact ? (user?.displayName ?? "Usuario") : undefined}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan/30 bg-gradient-to-br from-cyan/15 to-fuchsia/15 text-cyan">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.displayName}
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <span className="font-display text-sm font-bold">{initials}</span>
          )}
        </span>
        {!compact && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-text-hi">
                {user?.displayName ?? "Cargando…"}
              </div>
              <div className="truncate text-[0.7rem] text-text-lo">
                {user?.plan ? `Plan ${user.plan}` : ""}
              </div>
            </div>
            <ChevronDown
              size={15}
              className={`text-text-mid transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>
    </div>
  );
}

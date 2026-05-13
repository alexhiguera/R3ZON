"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Loader2,
  Crown,
  CheckCircle2,
  Clock,
  Ban,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InvitarMiembroModal } from "./InvitarMiembroModal";

type Miembro = {
  user_id: string | null;
  email: string;
  nombre: string | null;
  rol: "admin" | "editor" | "lector" | string;
  estado: "activo" | "invitado" | "revocado" | string;
  es_owner: boolean;
  invited_at: string;
  accepted_at: string | null;
  miembro_id: string | null;
};

type Toast = { kind: "ok" | "err"; msg: string } | null;

export function EquipoTab() {
  const supabase = createClient();
  const [rows, setRows]       = useState<Miembro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [open, setOpen]       = useState(false);
  const [toast, setToast]     = useState<Toast>(null);
  const { confirm: confirmDialog, dialog: confirmDialogNode } = useConfirmDialog();

  const flash = (t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3500);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from("v_equipo_negocio")
      .select("*")
      .order("es_owner", { ascending: false })
      .order("invited_at", { ascending: false });
    if (e) setError(e.message);
    else setRows((data as Miembro[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  const revocar = async (id: string) => {
    const ok = await confirmDialog({
      title: "Revocar acceso",
      message: "Este miembro perderá inmediatamente el acceso al negocio. Podrás volver a invitarle más adelante.",
      confirmLabel: "Revocar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch("/api/team/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { flash({ kind: "err", msg: json.error ?? "Error al revocar" }); return; }
    flash({ kind: "ok", msg: "Miembro revocado." });
    cargar();
  };

  return (
    <div className="space-y-5">
      <div className="card-glass p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="section-label mb-1">Equipo</div>
            <h2 className="font-display text-base font-bold text-text-hi">
              Miembros del negocio
            </h2>
            <p className="mt-1 text-sm text-text-mid">
              Invita a tus trabajadores y asigna su rol. Cada invitación queda registrada con auditoría legal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2 text-xs font-bold text-bg"
          >
            <UserPlus size={13} /> Invitar miembro
          </button>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="card-glass overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-text-mid">
            <Loader2 className="animate-spin" size={14} /> Cargando equipo…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-300">{error}</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-indigo-900/40 text-[11px] uppercase tracking-wider text-text-mid">
              <tr>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.miembro_id ?? m.email} className="border-t border-indigo-400/10">
                  <td className="px-4 py-3 text-text-hi">
                    <div className="flex items-center gap-2">
                      {m.es_owner && <Crown size={13} className="text-amber-300" />}
                      {m.nombre ?? <span className="italic text-text-lo">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-mid">{m.email}</td>
                  <td className="px-4 py-3"><RolPill rol={m.rol} /></td>
                  <td className="px-4 py-3"><EstadoPill estado={m.estado} /></td>
                  <td className="px-4 py-3 text-right">
                    {m.es_owner ? (
                      <span className="text-[11px] italic text-text-lo">Titular</span>
                    ) : m.miembro_id && m.estado !== "revocado" ? (
                      <button
                        type="button"
                        onClick={() => revocar(m.miembro_id!)}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200"
                      >
                        <Trash2 size={11} /> Revocar
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm italic text-text-lo">
                    Aún no hay miembros invitados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <InvitarMiembroModal
        open={open}
        onClose={() => setOpen(false)}
        onInvited={() => { flash({ kind: "ok", msg: "Invitación enviada." }); cargar(); }}
      />
      {confirmDialogNode}
    </div>
  );
}

function RolPill({ rol }: { rol: string }) {
  const map: Record<string, string> = {
    admin:  "border-fuchsia/40 bg-fuchsia/10 text-fuchsia-200",
    editor: "border-cyan/40 bg-cyan/10 text-cyan",
    lector: "border-indigo-400/30 bg-indigo-900/40 text-text-mid",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[rol] ?? map.lector}`}>
      {rol}
    </span>
  );
}

function EstadoPill({ estado }: { estado: string }) {
  if (estado === "activo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
        <CheckCircle2 size={10} /> Activo
      </span>
    );
  }
  if (estado === "invitado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
        <Clock size={10} /> Invitado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-200">
      <Ban size={10} /> Revocado
    </span>
  );
}

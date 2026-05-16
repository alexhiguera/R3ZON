"use client";

import { AlertCircle, Boxes, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import type { PerfilNegocio } from "./types";

export function ListadoTab({ perfil }: { perfil: PerfilNegocio }) {
  const supabase = createClient();
  const [stockMode, setStockMode] = useState<boolean>(perfil.stock_mode_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const flash = (t: typeof toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3500);
  };

  async function toggle(next: boolean) {
    setStockMode(next);
    setSaving(true);
    const { error } = await supabase
      .from("perfiles_negocio")
      .update({ stock_mode_enabled: next, updated_at: new Date().toISOString() })
      .eq("id", perfil.id);
    setSaving(false);
    if (error) {
      // Revertir si falla.
      setStockMode(!next);
      flash({ kind: "err", msg: `No se pudo guardar: ${formatSupabaseError(error)}` });
      return;
    }
    flash({ kind: "ok", msg: next ? "Modo stock activado." : "Modo stock desactivado." });
  }

  return (
    <div className="space-y-5">
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

      <div className="card-glass p-5 sm:p-7">
        <div className="section-label mb-4">Listado de productos y servicios</div>

        <div className="flex items-start gap-4 rounded-2xl border border-indigo-400/15 bg-indigo-900/30 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
            <Boxes size={18} />
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-text-hi">Modo stock</div>
                <p className="mt-1 text-xs text-text-mid">
                  Activa el control de inventario: stock actual, mínimo, movimientos y etiquetas (En
                  stock / Stock bajo / Agotado) en cada fila. Si lo desactivas, los productos siguen
                  funcionando como catálogo pero sin contadores.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={stockMode}
                disabled={saving}
                onClick={() => toggle(!stockMode)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
                  stockMode ? "border-cyan/40 bg-cyan/30" : "border-indigo-400/30 bg-indigo-900/60"
                } disabled:opacity-50`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    stockMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {saving && (
              <div className="mt-2 flex items-center gap-1 text-[11px] text-text-lo">
                <Loader2 size={11} className="animate-spin" /> Guardando…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

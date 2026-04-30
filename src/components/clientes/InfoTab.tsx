"use client";

import { useState } from "react";
import { Edit3, Save, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "./types";

const FIELDS: { key: keyof Cliente; label: string; type?: string }[] = [
  { key: "nombre",            label: "Nombre" },
  { key: "cif",               label: "CIF / NIF" },
  { key: "sector",            label: "Sector" },
  { key: "sitio_web",         label: "Sitio web" },
  { key: "email",             label: "Email corporativo", type: "email" },
  { key: "telefono",          label: "Teléfono" },
  { key: "direccion",         label: "Dirección" },
  { key: "ciudad",            label: "Ciudad" },
  { key: "codigo_postal",     label: "Código postal" },
  { key: "pais",              label: "País" },
  { key: "num_empleados",     label: "Nº de empleados", type: "number" },
  { key: "facturacion_anual", label: "Facturación anual (€)", type: "number" },
];

export function InfoTab({
  cliente,
  onUpdate,
}: {
  cliente: Cliente;
  onUpdate: (e: Cliente) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Cliente>(cliente);

  const guardar = async () => {
    setSaving(true);
    const supabase = createClient();
    const payload: Partial<Cliente> = {
      nombre: form.nombre,
      cif: form.cif,
      sector: form.sector,
      sitio_web: form.sitio_web,
      email: form.email,
      telefono: form.telefono,
      direccion: form.direccion,
      ciudad: form.ciudad,
      codigo_postal: form.codigo_postal,
      pais: form.pais,
      num_empleados: form.num_empleados,
      facturacion_anual: form.facturacion_anual,
      estado: form.estado,
      notas: form.notas,
    };
    const { data, error } = await supabase
      .from("clientes")
      .update(payload)
      .eq("id", cliente.id)
      .select("*")
      .single();
    setSaving(false);
    if (!error && data) {
      onUpdate(data as Cliente);
      setEditando(false);
    }
  };

  return (
    <div className="card-glass p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        <div className="section-label">Información general</div>
        {!editando ? (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs font-medium text-text-mid hover:border-cyan/40 hover:text-text-hi"
          >
            <Edit3 size={13} /> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setForm(cliente); setEditando(false); }}
              className="rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs text-text-mid"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-3 py-2 text-xs font-bold text-bg disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
              Guardar
            </button>
          </div>
        )}
      </div>

      {editando && (
        <div className="mb-5">
          <span className="mb-1.5 block text-xs font-medium text-text-mid">Estado</span>
          <div className="flex gap-2">
            {(["prospecto", "activa", "inactiva"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setForm((f) => ({ ...f, estado: s }))}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold capitalize ${
                  form.estado === s
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-indigo-400/20 bg-indigo-900/30 text-text-mid"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, type }) => {
          const raw = form[key];
          const display =
            raw == null || raw === ""
              ? null
              : Array.isArray(raw)
              ? raw.join(", ")
              : String(raw);
          return (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-mid">{label}</span>
              {editando ? (
                <input
                  type={type ?? "text"}
                  value={(raw as string | number | null) ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [key]: type === "number"
                        ? (e.target.value === "" ? null : Number(e.target.value))
                        : e.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
                />
              ) : (
                <div className="rounded-xl border border-indigo-400/10 bg-indigo-900/20 px-3 py-2.5 text-sm text-text-hi">
                  {display ?? <span className="italic text-text-lo">Sin especificar</span>}
                </div>
              )}
            </label>
          );
        })}
      </div>

      <div className="mt-4">
        <span className="mb-1.5 block text-xs font-medium text-text-mid">Notas internas</span>
        {editando ? (
          <textarea
            value={form.notas ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
            rows={3}
            className="w-full resize-none rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        ) : (
          <div className="rounded-xl border border-indigo-400/10 bg-indigo-900/20 px-3 py-2.5 text-sm text-text-hi">
            {form.notas || <span className="italic text-text-lo">Sin notas</span>}
          </div>
        )}
      </div>
    </div>
  );
}

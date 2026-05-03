"use client";

import { useState } from "react";
import {
  Plus, Mail, Phone, MessageCircle, Pencil, Trash2,
  Crown, UserPlus2, Loader2, Save, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Contacto } from "./types";

type ContactoForm = {
  id?: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  puesto: string;
  departamento: string;
  reports_to: string | null;
  es_decisor: boolean;
};

const EMPTY: ContactoForm = {
  nombre: "", apellidos: "", email: "", telefono: "",
  puesto: "", departamento: "", reports_to: null, es_decisor: false,
};

export function ContactosTab({
  clienteId,
  negocioId,
  contactos,
  onChange,
}: {
  clienteId: string;
  negocioId: string;
  contactos: Contacto[];
  onChange: (c: Contacto[]) => void;
}) {
  const [editing, setEditing] = useState<ContactoForm | null>(null);
  const [saving, setSaving] = useState(false);

  const abrirNuevo = () => setEditing({ ...EMPTY });
  const abrirEditar = (c: Contacto) =>
    setEditing({
      id: c.id,
      nombre: c.nombre,
      apellidos: c.apellidos ?? "",
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      puesto: c.puesto ?? "",
      departamento: c.departamento ?? "",
      reports_to: c.reports_to,
      es_decisor: c.es_decisor,
    });

  const guardar = async () => {
    if (!editing || !editing.nombre.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      cliente_id: clienteId,
      negocio_id: negocioId,
      nombre: editing.nombre.trim(),
      apellidos: editing.apellidos.trim() || null,
      email: editing.email.trim() || null,
      telefono: editing.telefono.trim() || null,
      puesto: editing.puesto.trim() || null,
      departamento: editing.departamento.trim() || null,
      reports_to: editing.reports_to,
      es_decisor: editing.es_decisor,
    };

    if (editing.id) {
      const { data } = await supabase
        .from("contactos_cliente")
        .update(payload)
        .eq("id", editing.id)
        .select("*")
        .single();
      if (data) {
        onChange(contactos.map((c) => (c.id === data.id ? (data as Contacto) : c)));
      }
    } else {
      const { data } = await supabase
        .from("contactos_cliente")
        .insert(payload)
        .select("*")
        .single();
      if (data) onChange([...contactos, data as Contacto]);
    }
    setSaving(false);
    setEditing(null);
  };

  const eliminar = async (c: Contacto) => {
    if (!confirm(`¿Eliminar a ${c.nombre}? Los que reportaban a esta persona quedarán sin superior.`)) return;
    const supabase = createClient();
    await supabase.from("contactos_cliente").delete().eq("id", c.id);
    onChange(
      contactos
        .filter((x) => x.id !== c.id)
        .map((x) => (x.reports_to === c.id ? { ...x, reports_to: null } : x))
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="section-label mb-1">Personas</div>
          <p className="text-sm text-text-mid">
            Personas dentro de la organización del cliente con las que tienes relación.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 text-sm font-bold text-bg"
        >
          <Plus size={14} /> Añadir contacto
        </button>
      </div>

      {contactos.length === 0 ? (
        <EmptyState onAdd={abrirNuevo} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contactos.map((c) => {
            const superior = contactos.find((x) => x.id === c.reports_to);
            return (
              <div key={c.id} className="card-glass flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 font-display text-sm font-bold uppercase text-indigo-300">
                    {c.nombre.charAt(0)}
                    {c.apellidos?.charAt(0) ?? ""}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-sm font-bold text-text-hi">
                        {c.nombre} {c.apellidos ?? ""}
                      </span>
                      {c.es_decisor && (
                        <span title="Decisor" className="text-warn">
                          <Crown size={13} />
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-text-mid">
                      {c.puesto || "Sin puesto"}
                      {c.departamento && ` · ${c.departamento}`}
                    </div>
                    {superior && (
                      <div className="mt-1 truncate text-[0.68rem] text-text-lo">
                        Reporta a:{" "}
                        <span className="text-indigo-300">
                          {superior.nombre} {superior.apellidos ?? ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      aria-label={`Enviar email a ${c.nombre}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                      title="Email"
                    >
                      <Mail size={14} />
                    </a>
                  )}
                  {c.telefono && (
                    <>
                      <a
                        href={`tel:${c.telefono}`}
                        aria-label={`Llamar a ${c.nombre}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                        title="Llamar"
                      >
                        <Phone size={14} />
                      </a>
                      <a
                        href={`https://wa.me/${c.telefono.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir WhatsApp con ${c.nombre}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                        title="WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => abrirEditar(c)}
                    aria-label={`Editar contacto ${c.nombre}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => eliminar(c)}
                    aria-label={`Eliminar contacto ${c.nombre}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-danger/40 hover:text-danger"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ContactoModal
          form={editing}
          contactos={contactos}
          saving={saving}
          onChange={setEditing}
          onSave={guardar}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card-glass flex flex-col items-center gap-3 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300">
        <UserPlus2 size={24} />
      </span>
      <div className="font-display text-lg font-bold text-text-hi">
        Aún no hay contactos
      </div>
      <p className="max-w-sm text-sm text-text-mid">
        Empieza añadiendo a la persona de mayor cargo (CEO o director). Después podrás añadir
        a quienes le reportan y se construirá el organigrama automáticamente.
      </p>
      <button
        onClick={onAdd}
        className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 text-sm font-bold text-bg"
      >
        <Plus size={14} /> Añadir primer contacto
      </button>
    </div>
  );
}

function ContactoModal({
  form, contactos, saving, onChange, onSave, onClose,
}: {
  form: ContactoForm;
  contactos: Contacto[];
  saving: boolean;
  onChange: (f: ContactoForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  // Para evitar ciclos: no permitir reportar a uno mismo ni a sus descendientes.
  const descendientesIds = (id: string): Set<string> => {
    const out = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      out.add(cur);
      contactos
        .filter((c) => c.reports_to === cur)
        .forEach((c) => stack.push(c.id));
    }
    return out;
  };
  const bloqueados = form.id ? descendientesIds(form.id) : new Set<string>();
  const opciones = contactos.filter((c) => !bloqueados.has(c.id));

  const set = <K extends keyof ContactoForm>(k: K, v: ContactoForm[K]) =>
    onChange({ ...form, [k]: v });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contacto-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card-glass flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden">
        <div className="rainbow-bar shrink-0" />
        <div className="flex shrink-0 items-center justify-between border-b border-indigo-400/10 p-5">
          <h2 id="contacto-modal-title" className="font-display text-lg font-bold text-text-hi">
            {form.id ? "Editar contacto" : "Nuevo contacto"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar editor de contacto"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-lo hover:bg-indigo-900/40 hover:text-text-hi"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid flex-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          <Field label="Nombre *" value={form.nombre} onChange={(v) => set("nombre", v)} />
          <Field label="Apellidos" value={form.apellidos} onChange={(v) => set("apellidos", v)} />
          <Field label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
          <Field label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} type="tel" />
          <Field label="Puesto" value={form.puesto} onChange={(v) => set("puesto", v)} placeholder="Director Comercial" />
          <Field label="Departamento" value={form.departamento} onChange={(v) => set("departamento", v)} placeholder="Ventas" />

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-text-mid">¿A quién reporta?</span>
            <select
              value={form.reports_to ?? ""}
              onChange={(e) => set("reports_to", e.target.value || null)}
              className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
            >
              <option value="">— Nadie (es la persona más alta del organigrama) —</option>
              {opciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellidos ?? ""} {c.puesto ? `· ${c.puesto}` : ""}
                </option>
              ))}
            </select>
            <span className="text-[0.68rem] text-text-lo">
              Selecciona al superior directo. Esto define la jerarquía del organigrama.
            </span>
          </label>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.es_decisor}
              onChange={(e) => set("es_decisor", e.target.checked)}
              className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30 accent-cyan"
            />
            <span className="text-sm text-text-mid">
              <span className="font-semibold text-text-hi">Es decisor</span>
              <span className="ml-1 text-text-lo">— toma decisiones de compra</span>
            </span>
          </label>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-indigo-400/10 bg-indigo-900/20 p-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-4 py-2.5 text-sm text-text-mid"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.nombre.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-5 py-2.5 text-sm font-bold text-bg disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-mid">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
      />
    </label>
  );
}

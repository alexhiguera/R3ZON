"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Calendar, MessageSquare, Zap,
  Phone, Mail, MessageCircle, Edit3, Save, Loader2,
  Trash2, Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Help, Tooltip } from "@/components/ui/Tooltip";
import { TabHistorial } from "@/components/crm/TabHistorial";
import { TabComunicaciones } from "@/components/crm/TabComunicaciones";
import { TabAutomatizacion } from "@/components/crm/TabAutomatizacion";

type Tab = "info" | "citas" | "comunicaciones" | "automatizacion";

const TABS: { id: Tab; label: string; Icon: any; tooltip: string }[] = [
  { id: "info",           label: "Información", Icon: User,          tooltip: "Datos personales y de contacto del cliente." },
  { id: "citas",          label: "Historial",   Icon: Calendar,      tooltip: "Todas las citas pasadas y futuras de este cliente." },
  { id: "comunicaciones", label: "Mensajes",    Icon: MessageSquare, tooltip: "Registro de emails, WhatsApps y notas que le has enviado." },
  { id: "automatizacion", label: "Automático",  Icon: Zap,           tooltip: "Conecta con n8n o Make para enviar mensajes automáticos." },
];

export default function FichaClientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("info");
  const [cliente, setCliente] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();
      setCliente(data);
      setForm(data ?? {});
      setCargando(false);
    })();
  }, [id]);

  const guardar = async () => {
    setSaving(true);
    const { nombre, apellidos, email, telefono, nif, direccion, notas, etiquetas } = form;
    await supabase
      .from("clientes")
      .update({ nombre, apellidos, email, telefono, nif, direccion, notas, etiquetas })
      .eq("id", id);
    setCliente({ ...cliente, ...form });
    setSaving(false);
    setEditando(false);
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar a ${cliente?.nombre}? Esta acción no se puede deshacer.`)) return;
    await supabase.from("clientes").delete().eq("id", id);
    router.push("/clientes");
  };

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center text-text-lo">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }
  if (!cliente) {
    return (
      <div className="text-center text-text-mid">
        <p>Cliente no encontrado.</p>
        <Link href="/clientes" className="text-cyan hover:underline">Volver</Link>
      </div>
    );
  }

  const nombreCompleto = [cliente.nombre, cliente.apellidos].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
      >
        <ArrowLeft size={14} /> Clientes
      </Link>

      {/* Header de la ficha */}
      <div className="card-glass overflow-hidden">
        <div className="rainbow-bar" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 font-display text-2xl font-bold uppercase text-indigo-300">
            {cliente.nombre.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-text-hi">{nombreCompleto}</h1>
            <div className="accent-bar mt-1.5" style={{ width: 48 }} />
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-lo">
              {cliente.email && <span>✉ {cliente.email}</span>}
              {cliente.telefono && <span>📞 {cliente.telefono}</span>}
              {cliente.nif && <span>ID: {cliente.nif}</span>}
            </div>
          </div>
          {/* Acciones rápidas */}
          <div className="flex items-center gap-2">
            {cliente.telefono && (
              <>
                <Tooltip text="Llamar" side="bottom">
                  <a
                    href={`tel:${cliente.telefono}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                  >
                    <Phone size={16} />
                  </a>
                </Tooltip>
                <Tooltip text="Abrir WhatsApp" side="bottom">
                  <a
                    href={`https://wa.me/${cliente.telefono.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                  >
                    <MessageCircle size={16} />
                  </a>
                </Tooltip>
              </>
            )}
            {cliente.email && (
              <Tooltip text="Enviar email" side="bottom">
                <a
                  href={`mailto:${cliente.email}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                >
                  <Mail size={16} />
                </a>
              </Tooltip>
            )}
            <Tooltip text="Eliminar cliente" side="bottom">
              <button
                onClick={eliminar}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-danger/40 hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-t border-indigo-400/10 px-2">
          {TABS.map(({ id: tid, label, Icon, tooltip }) => (
            <Tooltip key={tid} text={tooltip} side="bottom">
              <button
                onClick={() => setTab(tid)}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  tab === tid
                    ? "border-b-2 border-cyan text-text-hi"
                    : "text-text-lo hover:text-text-mid"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Contenido de la pestaña */}
      {tab === "info" && (
        <InfoTab
          form={form}
          editando={editando}
          saving={saving}
          onChange={(k, v) => setForm((f: any) => ({ ...f, [k]: v }))}
          onEdit={() => setEditando(true)}
          onSave={guardar}
          onCancel={() => { setForm(cliente); setEditando(false); }}
        />
      )}
      {tab === "citas" && <TabHistorial clienteId={id} clienteNombre={nombreCompleto} />}
      {tab === "comunicaciones" && (
        <TabComunicaciones
          clienteId={id}
          clienteNombre={nombreCompleto}
          email={cliente.email}
          telefono={cliente.telefono}
        />
      )}
      {tab === "automatizacion" && (
        <TabAutomatizacion clienteId={id} cliente={cliente} onUpdate={setCliente} />
      )}
    </div>
  );
}

// ─── Pestaña de información ────────────────────────────────────────────────
function InfoTab({
  form, editando, saving, onChange, onEdit, onSave, onCancel,
}: any) {
  const fields = [
    { key: "nombre",    label: "Nombre",     tooltip: "Nombre de pila." },
    { key: "apellidos", label: "Apellidos",  tooltip: "Apellidos del cliente." },
    { key: "email",     label: "Email",      tooltip: "Email principal de contacto." },
    { key: "telefono",  label: "Teléfono",   tooltip: "Con prefijo internacional para WhatsApp (ej: +34 612…)." },
    { key: "nif",       label: "DNI / CIF",  tooltip: "Necesario para emitir facturas." },
    { key: "direccion", label: "Dirección",  tooltip: "Dirección postal completa." },
  ];

  return (
    <div className="card-glass p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        <div className="section-label">Datos personales</div>
        {!editando ? (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs font-medium text-text-mid hover:border-cyan/40 hover:text-text-hi"
          >
            <Edit3 size={13} /> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded-xl border border-indigo-400/25 bg-indigo-900/40 px-3 py-2 text-xs text-text-mid"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-3 py-2 text-xs font-bold text-bg disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
              Guardar
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, tooltip }) => (
          <label key={key} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-mid">
              {label} <Help text={tooltip} />
            </span>
            {editando ? (
              <input
                value={form[key] ?? ""}
                onChange={(e) => onChange(key, e.target.value)}
                className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
              />
            ) : (
              <div className="rounded-xl border border-indigo-400/10 bg-indigo-900/20 px-3 py-2.5 text-sm text-text-hi">
                {form[key] || <span className="text-text-lo italic">Sin especificar</span>}
              </div>
            )}
          </label>
        ))}
      </div>

      {/* Notas */}
      <div className="mt-4">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-mid">
          Notas internas <Help text="Solo tú las verás. Anotaciones privadas sobre el cliente." />
        </span>
        {editando ? (
          <textarea
            value={form.notas ?? ""}
            onChange={(e) => onChange("notas", e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        ) : (
          <div className="rounded-xl border border-indigo-400/10 bg-indigo-900/20 px-3 py-2.5 text-sm text-text-hi">
            {form.notas || <span className="text-text-lo italic">Sin notas</span>}
          </div>
        )}
      </div>
    </div>
  );
}

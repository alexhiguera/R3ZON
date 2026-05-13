"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Truck,
  Receipt,
  CalendarClock,
  Repeat,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { eur } from "@/lib/formato";
import {
  ESTADO_GASTO_BADGE,
  TIPO_GASTO_LABEL,
  gastoMensualizado,
  type EstadoGasto,
  type GastoProveedor,
  type Proveedor,
  type Recurrencia,
  type TipoGasto,
} from "@/lib/proveedores";

type TabId = "proveedores" | "general" | "previsto" | "suscripcion";

const TABS: { id: TabId; label: string; Icon: typeof Truck; eyebrow: string }[] = [
  { id: "proveedores",  label: "Proveedores",     Icon: Truck,         eyebrow: "Directorio" },
  { id: "general",      label: "Gastos generales",Icon: Receipt,       eyebrow: "One-shot" },
  { id: "previsto",     label: "Gastos previstos",Icon: CalendarClock, eyebrow: "A futuro" },
  { id: "suscripcion",  label: "Suscripciones",   Icon: Repeat,        eyebrow: "Recurrentes" },
];

export default function ProveedoresPage() {
  const [tab, setTab] = useState<TabId>("proveedores");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Compras"
        title="Proveedores"
        description="Directorio de proveedores y registro de gastos: puntuales, previstos y suscripciones recurrentes."
      />

      <div className="grid gap-5 lg:grid-cols-[220px,1fr]">
        <nav role="tablist" className="card-glass h-fit p-2 lg:sticky lg:top-4">
          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] lg:m-0 lg:flex-col lg:overflow-visible lg:p-0 lg:pb-0">
            {TABS.map(({ id, label, Icon }) => {
              const selected = tab === id;
              return (
                <li key={id} className="shrink-0 lg:w-full">
                  <button
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setTab(id)}
                    className={`flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      selected
                        ? "border border-cyan/40 bg-cyan/10 text-cyan"
                        : "border border-transparent text-text-mid hover:border-indigo-400/25 hover:bg-indigo-900/40 hover:text-text-hi"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section>
          {tab === "proveedores" ? <TabProveedores /> : <TabGastos tipo={tab} />}
        </section>
      </div>
    </div>
  );
}

// ───────────────────────────── PROVEEDORES ─────────────────────────────
function TabProveedores() {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const negocioId = useNegocioId();
  const [items, setItems] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<Partial<Proveedor> | null>(null);
  const { confirm: confirmDialog, dialog: confirmDialogNode } = useConfirmDialog();

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre");
      if (!alive) return;
      if (error) toast.err(error.message);
      else setItems((data as Proveedor[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [supabase, toast]);

  const visibles = items.filter((p) =>
    !busqueda.trim()
      ? true
      : p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.cif ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  async function eliminar(p: Proveedor) {
    const ok = await confirmDialog({
      title: `Eliminar proveedor`,
      message: `Se eliminará "${p.nombre}". Sus gastos asociados quedarán sin proveedor.`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.from("proveedores").delete().eq("id", p.id);
    if (error) toast.err(formatSupabaseError(error));
    else {
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      toast.ok("Proveedor eliminado");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-glass flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 text-text-lo" size={14} />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o CIF…"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditando({ activo: true })}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 text-sm font-bold text-white shadow-glow"
        >
          <Plus size={14} /> Nuevo proveedor
        </button>
      </div>

      {loading ? (
        <div className="card-glass flex h-32 items-center justify-center">
          <Loader2 className="animate-spin text-text-lo" size={20} />
        </div>
      ) : visibles.length === 0 ? (
        <div className="card-glass flex flex-col items-center gap-2 p-10 text-center text-text-mid">
          <Truck size={28} className="text-indigo-400/40" />
          <div className="font-display text-base font-bold">Sin proveedores todavía</div>
          <p className="text-xs">Crea proveedores para asociarles gastos y suscripciones.</p>
        </div>
      ) : (
        <div className="card-glass divide-y divide-indigo-400/10 overflow-hidden">
          {visibles.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-900/20">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-900/40 text-indigo-300">
                <Truck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-text-hi">{p.nombre}</span>
                  {p.cif && <span className="font-mono text-[0.7rem] text-text-lo">{p.cif}</span>}
                  {!p.activo && (
                    <span className="rounded-md border border-text-lo/30 bg-text-lo/10 px-1.5 py-0.5 text-[0.65rem] uppercase text-text-mid">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-mid">
                  {p.categoria ?? "Sin categoría"} · {p.email ?? p.telefono ?? "—"}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditando(p)}
                  aria-label="Editar"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/30 text-text-mid hover:text-text-hi"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => eliminar(p)}
                  aria-label="Eliminar"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-danger hover:bg-danger/15"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProveedorModal
        inicial={editando}
        negocioId={negocioId}
        onCerrar={() => setEditando(null)}
        onGuardado={(saved, esNuevo) => {
          setItems((prev) =>
            esNuevo ? [saved, ...prev] : prev.map((x) => (x.id === saved.id ? saved : x))
          );
          setEditando(null);
        }}
      />
      {confirmDialogNode}
    </div>
  );
}

function ProveedorModal({
  inicial,
  negocioId,
  onCerrar,
  onGuardado,
}: {
  inicial: Partial<Proveedor> | null;
  negocioId: string | null;
  onCerrar: () => void;
  onGuardado: (saved: Proveedor, esNuevo: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [p, setP] = useState<Partial<Proveedor>>(inicial ?? {});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (inicial) setP(inicial); }, [inicial]);

  if (!inicial) return null;
  const inicialNN = inicial;
  const esNuevo = !inicialNN.id;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!negocioId || !p.nombre?.trim()) return;
    setGuardando(true);
    const payload = {
      negocio_id: negocioId,
      nombre: p.nombre.trim(),
      cif: p.cif?.trim() || null,
      email: p.email?.trim() || null,
      telefono: p.telefono?.trim() || null,
      direccion: p.direccion?.trim() || null,
      web: p.web?.trim() || null,
      persona_contacto: p.persona_contacto?.trim() || null,
      categoria: p.categoria?.trim() || null,
      notas: p.notas?.trim() || null,
      activo: p.activo ?? true,
    };
    const q = esNuevo
      ? supabase.from("proveedores").insert(payload).select().single()
      : supabase.from("proveedores").update(payload).eq("id", inicialNN.id!).select().single();
    const { data, error } = await q;
    setGuardando(false);
    if (error) { toast.err(error.message); return; }
    toast.ok(esNuevo ? "Proveedor creado" : "Proveedor actualizado");
    onGuardado(data as Proveedor, esNuevo);
  }

  return (
    <Modal
      open={!!inicial}
      onClose={onCerrar}
      title={esNuevo ? "Nuevo proveedor" : `Editar · ${inicial.nombre ?? ""}`}
      size="md"
    >
      <form onSubmit={guardar} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombre" full>
          <Input value={p.nombre ?? ""} onChange={(e) => setP({ ...p, nombre: e.target.value })}
            required autoFocus />
        </Field>
        <Field label="CIF / NIF">
          <Input value={p.cif ?? ""} onChange={(e) => setP({ ...p, cif: e.target.value })} />
        </Field>
        <Field label="Categoría">
          <Input value={p.categoria ?? ""} onChange={(e) => setP({ ...p, categoria: e.target.value })}
            placeholder="Software, Material, Servicios…" />
        </Field>
        <Field label="Email">
          <Input type="email" value={p.email ?? ""} onChange={(e) => setP({ ...p, email: e.target.value })} />
        </Field>
        <Field label="Teléfono">
          <Input type="tel" value={p.telefono ?? ""} onChange={(e) => setP({ ...p, telefono: e.target.value })} />
        </Field>
        <Field label="Web">
          <Input value={p.web ?? ""} onChange={(e) => setP({ ...p, web: e.target.value })} placeholder="https://…" />
        </Field>
        <Field label="Persona de contacto">
          <Input value={p.persona_contacto ?? ""} onChange={(e) => setP({ ...p, persona_contacto: e.target.value })} />
        </Field>
        <Field label="Dirección" full>
          <Input value={p.direccion ?? ""} onChange={(e) => setP({ ...p, direccion: e.target.value })} />
        </Field>
        <Field label="Notas" full>
          <Textarea rows={2} value={p.notas ?? ""} onChange={(e) => setP({ ...p, notas: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-xs text-text-mid sm:col-span-2">
          <input
            type="checkbox"
            checked={p.activo ?? true}
            onChange={(e) => setP({ ...p, activo: e.target.checked })}
            className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30"
          />
          Proveedor activo
        </label>
        <div className="mt-2 flex gap-2 sm:col-span-2">
          <button type="button" onClick={onCerrar}
            className="flex-1 rounded-lg border border-indigo-400/20 bg-indigo-900/20 py-2.5 text-sm font-semibold text-text-mid">
            Cancelar
          </button>
          <button type="submit" disabled={guardando || !negocioId || !p.nombre?.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ───────────────────────────── GASTOS ─────────────────────────────
function TabGastos({ tipo }: { tipo: Exclude<TabId, "proveedores"> }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const negocioId = useNegocioId();
  const [gastos, setGastos] = useState<GastoProveedor[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Partial<GastoProveedor> | null>(null);
  const { confirm: confirmDialog, dialog: confirmDialogNode } = useConfirmDialog();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [g, p] = await Promise.all([
        supabase.from("gastos_proveedor").select("*").eq("tipo", tipo).order("fecha", { ascending: false }),
        supabase.from("proveedores").select("id,nombre,negocio_id").order("nombre"),
      ]);
      if (!alive) return;
      if (g.error) toast.err(g.error.message);
      else setGastos((g.data as GastoProveedor[]) ?? []);
      if (p.error) toast.err(p.error.message);
      else setProveedores((p.data as Proveedor[]) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [supabase, toast, tipo]);

  async function eliminar(g: GastoProveedor) {
    const ok = await confirmDialog({
      title: "Eliminar gasto",
      message: `Se eliminará "${g.concepto}" del registro de gastos.`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.from("gastos_proveedor").delete().eq("id", g.id);
    if (error) toast.err(formatSupabaseError(error));
    else { setGastos((prev) => prev.filter((x) => x.id !== g.id)); toast.ok("Eliminado"); }
  }

  const total = gastos.reduce((sum, g) => sum + Number(g.importe) || 0, 0);
  const totalMes = tipo === "suscripcion" ? gastos.reduce((s, g) => s + gastoMensualizado(g), 0) : null;
  const tipoLabel = TIPO_GASTO_LABEL[tipo];

  const nombreProveedor = (id: string | null) => {
    if (!id) return "—";
    return proveedores.find((p) => p.id === id)?.nombre ?? "(eliminado)";
  };

  return (
    <div className="space-y-4">
      <div className="card-glass flex flex-wrap items-center gap-3 p-4">
        <div className="flex-1">
          <div className="section-label">{tipoLabel}</div>
          <div className="mt-0.5 flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold text-text-hi">{eur(total)}</span>
            {totalMes !== null && (
              <span className="text-xs text-text-mid">
                ≈ <strong className="text-text-hi">{eur(totalMes)}</strong> /mes
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditando({
            tipo,
            estado: tipo === "general" ? "pagado" : "pendiente",
            fecha: new Date().toISOString().slice(0, 10),
            importe: 0,
            iva_pct: 21,
            recurrencia: tipo === "suscripcion" ? "mensual" : null,
          })}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 text-sm font-bold text-white shadow-glow"
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {loading ? (
        <div className="card-glass flex h-32 items-center justify-center">
          <Loader2 className="animate-spin text-text-lo" size={20} />
        </div>
      ) : gastos.length === 0 ? (
        <div className="card-glass flex flex-col items-center gap-2 p-10 text-center text-text-mid">
          <Receipt size={28} className="text-indigo-400/40" />
          <div className="font-display text-base font-bold">Sin {tipoLabel.toLowerCase()} todavía</div>
        </div>
      ) : (
        <div className="card-glass divide-y divide-indigo-400/10 overflow-hidden">
          {gastos.map((g) => {
            const badge = ESTADO_GASTO_BADGE[g.estado];
            return (
              <div key={g.id} className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-900/20">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-text-hi">{g.concepto}</span>
                    <span className={`rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {g.recurrencia && (
                      <span className="rounded-md border border-cyan/30 bg-cyan/10 px-1.5 py-0.5 text-[0.65rem] uppercase text-cyan">
                        {g.recurrencia}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-mid">
                    {nombreProveedor(g.proveedor_id)} · {new Date(g.fecha).toLocaleDateString("es-ES")}
                    {g.proximo_cobro && (
                      <> · Próximo: <strong className="text-text-hi">
                        {new Date(g.proximo_cobro).toLocaleDateString("es-ES")}
                      </strong></>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-base font-bold text-text-hi">{eur(Number(g.importe))}</div>
                  <div className="text-[0.7rem] text-text-lo">+{g.iva_pct}% IVA</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditando(g)}
                    aria-label="Editar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/30 text-text-mid hover:text-text-hi"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => eliminar(g)}
                    aria-label="Eliminar"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-danger hover:bg-danger/15"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GastoModal
        inicial={editando}
        proveedores={proveedores}
        negocioId={negocioId}
        onCerrar={() => setEditando(null)}
        onGuardado={(saved, esNuevo) => {
          setGastos((prev) =>
            esNuevo ? [saved, ...prev] : prev.map((x) => (x.id === saved.id ? saved : x))
          );
          setEditando(null);
        }}
      />
      {confirmDialogNode}
    </div>
  );
}

function GastoModal({
  inicial,
  proveedores,
  negocioId,
  onCerrar,
  onGuardado,
}: {
  inicial: Partial<GastoProveedor> | null;
  proveedores: Proveedor[];
  negocioId: string | null;
  onCerrar: () => void;
  onGuardado: (saved: GastoProveedor, esNuevo: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [g, setG] = useState<Partial<GastoProveedor>>(inicial ?? {});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (inicial) setG(inicial); }, [inicial]);

  if (!inicial) return null;
  const inicialNN = inicial;
  const esNuevo = !inicialNN.id;
  const tipo = (g.tipo ?? "general") as TipoGasto;
  const esSuscripcion = tipo === "suscripcion";

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!negocioId || !g.concepto?.trim()) return;
    setGuardando(true);
    const payload = {
      negocio_id:    negocioId,
      proveedor_id:  g.proveedor_id || null,
      tipo,
      concepto:      g.concepto.trim(),
      categoria:     g.categoria?.trim() || null,
      fecha:         g.fecha || new Date().toISOString().slice(0, 10),
      importe:       Number(g.importe) || 0,
      iva_pct:       Number(g.iva_pct) || 0,
      recurrencia:   esSuscripcion ? ((g.recurrencia ?? "mensual") as Recurrencia) : null,
      proximo_cobro: esSuscripcion ? (g.proximo_cobro || null) : null,
      estado:        (g.estado ?? "pendiente") as EstadoGasto,
      notas:         g.notas?.trim() || null,
    };
    const q = esNuevo
      ? supabase.from("gastos_proveedor").insert(payload).select().single()
      : supabase.from("gastos_proveedor").update(payload).eq("id", inicialNN.id!).select().single();
    const { data, error } = await q;
    setGuardando(false);
    if (error) { toast.err(error.message); return; }
    toast.ok(esNuevo ? "Gasto registrado" : "Gasto actualizado");
    onGuardado(data as GastoProveedor, esNuevo);
  }

  return (
    <Modal
      open={!!inicial}
      onClose={onCerrar}
      title={esNuevo ? `Nuevo · ${TIPO_GASTO_LABEL[tipo]}` : `Editar · ${inicial.concepto ?? ""}`}
      size="md"
    >
      <form onSubmit={guardar} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Concepto" full>
          <Input value={g.concepto ?? ""} onChange={(e) => setG({ ...g, concepto: e.target.value })}
            placeholder="Hosting Vercel, Material oficina…" required autoFocus />
        </Field>
        <Field label="Proveedor" full>
          <Select
            value={g.proveedor_id ?? ""}
            onChange={(e) => setG({ ...g, proveedor_id: e.target.value || null })}
          >
            <option value="">— Sin proveedor —</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Select>
        </Field>
        <Field label="Importe (€)">
          <Input type="number" step="0.01" value={g.importe ?? 0}
            onChange={(e) => setG({ ...g, importe: parseFloat(e.target.value) || 0 })} />
        </Field>
        <Field label="IVA %">
          <Input type="number" step="0.01" value={g.iva_pct ?? 21}
            onChange={(e) => setG({ ...g, iva_pct: parseFloat(e.target.value) || 0 })} />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={g.fecha ?? ""}
            onChange={(e) => setG({ ...g, fecha: e.target.value })} />
        </Field>
        <Field label="Categoría">
          <Input value={g.categoria ?? ""}
            onChange={(e) => setG({ ...g, categoria: e.target.value })}
            placeholder="Software, Material…" />
        </Field>
        <Field label="Estado">
          <Select value={g.estado ?? "pendiente"}
            onChange={(e) => setG({ ...g, estado: e.target.value as EstadoGasto })}>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="cancelado">Cancelado</option>
          </Select>
        </Field>

        {esSuscripcion && (
          <>
            <Field label="Recurrencia">
              <Select value={g.recurrencia ?? "mensual"}
                onChange={(e) => setG({ ...g, recurrencia: e.target.value as Recurrencia })}>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </Select>
            </Field>
            <Field label="Próximo cobro" full>
              <Input type="date" value={g.proximo_cobro ?? ""}
                onChange={(e) => setG({ ...g, proximo_cobro: e.target.value })} />
            </Field>
          </>
        )}

        <Field label="Notas" full>
          <Textarea rows={2} value={g.notas ?? ""}
            onChange={(e) => setG({ ...g, notas: e.target.value })} />
        </Field>

        <div className="mt-2 flex gap-2 sm:col-span-2">
          <button type="button" onClick={onCerrar}
            className="flex-1 rounded-lg border border-indigo-400/20 bg-indigo-900/20 py-2.5 text-sm font-semibold text-text-mid">
            Cancelar
          </button>
          <button type="submit" disabled={guardando || !negocioId || !g.concepto?.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}

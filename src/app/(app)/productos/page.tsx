"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  estadoStock,
  eur,
  type EstadoStock,
  type Producto,
  type TipoProducto,
} from "@/lib/inventario";

const UNIDADES = ["ud", "kg", "l", "g", "ración", "hora"];

const ESTADO_BADGE: Record<EstadoStock, { cls: string; label: string }> = {
  ok:        { cls: "border-ok/30 bg-ok/10 text-ok",                 label: "En stock" },
  bajo:      { cls: "border-warn/30 bg-warn/10 text-warn",           label: "Stock bajo" },
  agotado:   { cls: "border-danger/30 bg-danger/10 text-danger",     label: "Agotado" },
  sin_stock: { cls: "border-text-lo/30 bg-text-lo/10 text-text-mid", label: "Sin inventario" },
};

export default function ProductosPage() {
  const supabase = createClient();
  const negocioId = useNegocioId();
  const toast = useToast();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [editando, setEditando] = useState<Partial<Producto> | null>(null);

  const cargar = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("nombre");
    if (error) toast.err(error.message);
    else setProductos((data ?? []) as Producto[]);
    setCargando(false);
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const categorias = useMemo(() => {
    const s = new Set<string>();
    for (const p of productos) if (p.categoria) s.add(p.categoria);
    return [...s].sort();
  }, [productos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (filtroCategoria !== "todas" && p.categoria !== filtroCategoria) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo ?? "").toLowerCase().includes(q) ||
        (p.descripcion ?? "").toLowerCase().includes(q)
      );
    });
  }, [productos, busqueda, filtroCategoria]);

  async function eliminar(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    const prev = productos;
    setProductos((s) => s.filter((x) => x.id !== p.id));
    const { error } = await supabase.from("productos").delete().eq("id", p.id);
    if (error) {
      setProductos(prev);
      toast.err(`No se pudo eliminar: ${error.message}`);
    } else {
      toast.ok(`Eliminado ${p.nombre}`);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Tu lista única de productos y servicios. Lo que crees aquí estará disponible en TPV y Stock."
      />

      <div className="card-glass flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-3 text-text-lo" size={14} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, código o descripción…"
            className="h-10 w-full rounded-lg border border-indigo-400/20 bg-indigo-900/30 pl-9 pr-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none"
          />
        </div>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="h-10 rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi"
        >
          <option value="todas">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="button"
          onClick={() =>
            setEditando({
              nombre: "", precio_venta: 0, precio_coste: 0, iva_pct: 21,
              tipo: "producto", unidad: "ud", stock_tracking: true,
              stock_actual: 0, stock_minimo: 0, activo: true,
            })
          }
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 text-sm font-bold text-white shadow-glow"
        >
          <Plus size={14} /> Nuevo producto
        </button>
      </div>

      {cargando ? (
        <div className="card-glass flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-text-lo" size={20} />
        </div>
      ) : visibles.length === 0 ? (
        <EmptyState onCrear={() => setEditando({
          nombre: "", precio_venta: 0, precio_coste: 0, iva_pct: 21,
          tipo: "producto", unidad: "ud", stock_tracking: true,
          stock_actual: 0, stock_minimo: 0, activo: true,
        })} />
      ) : (
        <div className="card-glass overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-indigo-400/10">
            {visibles.map((p) => {
              const est = estadoStock(p);
              const badge = ESTADO_BADGE[est];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-900/20"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold"
                    style={{ background: p.color || "#4f46e5" }}
                  >
                    {p.nombre.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-text-hi">{p.nombre}</span>
                      {p.codigo && (
                        <span className="font-mono text-[0.7rem] text-text-lo">
                          {p.codigo}
                        </span>
                      )}
                      <span className={`rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {!p.activo && (
                        <span className="rounded-md border border-text-lo/30 bg-text-lo/10 px-1.5 py-0.5 text-[0.65rem] uppercase text-text-mid">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-mid">
                      {p.categoria ?? "Sin categoría"} ·{" "}
                      {p.tipo === "servicio" ? "Servicio" : `${p.stock_actual} ${p.unidad}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-base font-bold text-text-hi">
                      {eur(Number(p.precio_venta))}
                    </div>
                    <div className="text-[0.7rem] text-text-lo">+{p.iva_pct}% IVA</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
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
              );
            })}
          </div>
        </div>
      )}

      {editando && (
        <ProductoModal
          inicial={editando}
          negocioId={negocioId}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar(); }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function ProductoModal({
  inicial,
  negocioId,
  onCerrar,
  onGuardado,
}: {
  inicial: Partial<Producto>;
  negocioId: string | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [p, setP] = useState<Partial<Producto>>(inicial);
  const [guardando, setGuardando] = useState(false);
  const esNuevo = !inicial.id;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!negocioId || !p.nombre) return;
    setGuardando(true);

    const payload = {
      negocio_id:     negocioId,
      codigo:         p.codigo || null,
      nombre:         p.nombre,
      descripcion:    p.descripcion || null,
      categoria:      p.categoria || null,
      tipo:           (p.tipo ?? "producto") as TipoProducto,
      unidad:         p.unidad ?? "ud",
      precio_venta:   Number(p.precio_venta) || 0,
      precio_coste:   Number(p.precio_coste) || 0,
      iva_pct:        Number(p.iva_pct) || 0,
      stock_tracking: p.tipo === "servicio" ? false : (p.stock_tracking ?? true),
      stock_actual:   Number(p.stock_actual) || 0,
      stock_minimo:   Number(p.stock_minimo) || 0,
      color:          p.color || null,
      activo:         p.activo ?? true,
    };

    const q = esNuevo
      ? supabase.from("productos").insert(payload)
      : supabase.from("productos").update(payload).eq("id", inicial.id!);

    const { error } = await q;
    setGuardando(false);
    if (error) {
      toast.err(error.message);
      return;
    }
    toast.ok(esNuevo ? "Producto creado" : "Producto actualizado");
    onGuardado();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCerrar}
    >
      <form
        onSubmit={guardar}
        onClick={(e) => e.stopPropagation()}
        className="card-glass max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-text-hi">
            {esNuevo ? "Nuevo producto" : `Editar · ${inicial.nombre}`}
          </h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-mid hover:text-text-hi">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" full>
            <input value={p.nombre ?? ""} onChange={(e) => setP({ ...p, nombre: e.target.value })}
              required className={inputCls} autoFocus />
          </Field>
          <Field label="Código / SKU">
            <input value={p.codigo ?? ""} onChange={(e) => setP({ ...p, codigo: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Categoría">
            <input value={p.categoria ?? ""} onChange={(e) => setP({ ...p, categoria: e.target.value })}
              placeholder="Bebidas, Postres, Camisetas…" className={inputCls} />
          </Field>
          <Field label="Tipo">
            <select value={p.tipo ?? "producto"} onChange={(e) => setP({ ...p, tipo: e.target.value as TipoProducto })}
              className={inputCls}>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
            </select>
          </Field>
          <Field label="Unidad">
            <select value={p.unidad ?? "ud"} onChange={(e) => setP({ ...p, unidad: e.target.value })} className={inputCls}>
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Precio venta (€)">
            <input type="number" step="0.01" value={p.precio_venta ?? 0}
              onChange={(e) => setP({ ...p, precio_venta: parseFloat(e.target.value) || 0 })} className={inputCls} />
          </Field>
          <Field label="Precio coste (€)">
            <input type="number" step="0.01" value={p.precio_coste ?? 0}
              onChange={(e) => setP({ ...p, precio_coste: parseFloat(e.target.value) || 0 })} className={inputCls} />
          </Field>
          <Field label="IVA %">
            <input type="number" step="0.01" value={p.iva_pct ?? 21}
              onChange={(e) => setP({ ...p, iva_pct: parseFloat(e.target.value) || 0 })} className={inputCls} />
          </Field>
          <Field label="Color (TPV)">
            <input type="color" value={p.color ?? "#4f46e5"}
              onChange={(e) => setP({ ...p, color: e.target.value })}
              className="h-10 w-full rounded-lg border border-indigo-400/20 bg-indigo-900/30" />
          </Field>

          {p.tipo !== "servicio" && (
            <>
              <Field label="Stock inicial" full>
                <input type="number" step="0.001" value={p.stock_actual ?? 0}
                  onChange={(e) => setP({ ...p, stock_actual: parseFloat(e.target.value) || 0 })}
                  className={inputCls} disabled={!esNuevo}
                />
                {!esNuevo && (
                  <span className="mt-1 text-[0.7rem] text-text-lo">
                    El stock actual se ajusta desde el módulo Stock con un movimiento.
                  </span>
                )}
              </Field>
              <Field label="Stock mínimo (alerta)">
                <input type="number" step="0.001" value={p.stock_minimo ?? 0}
                  onChange={(e) => setP({ ...p, stock_minimo: parseFloat(e.target.value) || 0 })}
                  className={inputCls} />
              </Field>
              <label className="col-span-2 flex items-center gap-2 text-xs text-text-mid">
                <input type="checkbox" checked={p.stock_tracking ?? true}
                  onChange={(e) => setP({ ...p, stock_tracking: e.target.checked })}
                  className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30" />
                Rastrear stock (desactiva para productos sin inventario, p.ej. comida preparada al momento)
              </label>
            </>
          )}

          <Field label="Descripción" full>
            <textarea value={p.descripcion ?? ""} rows={2}
              onChange={(e) => setP({ ...p, descripcion: e.target.value })}
              className={`${inputCls} h-auto resize-none py-2`} />
          </Field>

          <label className="col-span-2 flex items-center gap-2 text-xs text-text-mid">
            <input type="checkbox" checked={p.activo ?? true}
              onChange={(e) => setP({ ...p, activo: e.target.checked })}
              className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30" />
            Activo (visible en TPV y catálogo)
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCerrar}
            className="flex-1 rounded-lg border border-indigo-400/20 bg-indigo-900/20 py-2.5 text-sm font-semibold text-text-mid">
            Cancelar
          </button>
          <button type="submit" disabled={guardando || !negocioId || !p.nombre}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="card-glass flex flex-col items-center gap-3 py-12 text-center text-text-mid">
      <Package size={28} className="text-indigo-400/40" />
      <div className="font-display text-lg font-bold">Aún no hay productos</div>
      <p className="max-w-xs text-sm">
        Empieza creando tu catálogo. Los productos aparecerán automáticamente en TPV.
      </p>
      <button onClick={onCrear}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-bold text-white">
        <Plus size={15} /> Crear el primero
      </button>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "col-span-2" : ""}`}>
      <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">{label}</span>
      {children}
    </label>
  );
}

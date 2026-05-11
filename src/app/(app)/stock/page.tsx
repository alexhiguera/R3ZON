"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Plus,
  Minus,
  Sliders,
  Loader2,
  X,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ETIQUETA_MOVIMIENTO,
  estadoStock,
  type EstadoStock,
  type Producto,
  type StockMovimiento,
  type TipoMovimientoStock,
} from "@/lib/inventario";

const ICONO_MOV: Record<TipoMovimientoStock, typeof ArrowDownLeft> = {
  entrada:    ArrowDownLeft,
  salida:     ArrowUpRight,
  ajuste:     Sliders,
  venta_tpv:  ShoppingCart,
  devolucion: RotateCcw,
};

const COLOR_MOV: Record<TipoMovimientoStock, string> = {
  entrada:    "text-ok",
  salida:     "text-fuchsia",
  ajuste:     "text-warn",
  venta_tpv:  "text-cyan",
  devolucion: "text-text-mid",
};

const COLOR_ESTADO: Record<EstadoStock, string> = {
  ok:        "border-ok/30 bg-ok/10 text-ok",
  bajo:      "border-warn/30 bg-warn/10 text-warn",
  agotado:   "border-danger/30 bg-danger/10 text-danger",
  sin_stock: "border-text-lo/30 bg-text-lo/10 text-text-mid",
};

export default function StockPage() {
  const supabase = createClient();
  const negocioId = useNegocioId();
  const toast = useToast();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<(StockMovimiento & { nombre?: string })[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"todos" | EstadoStock>("todos");
  const [editando, setEditando] = useState<Producto | null>(null);

  async function cargar() {
    setCargando(true);
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from("productos").select("*").order("nombre"),
      supabase
        .from("stock_movimientos")
        .select("*, productos(nombre)")
        .order("ts", { ascending: false })
        .limit(50),
    ]);
    setProductos((p ?? []) as Producto[]);
    setMovimientos(
      ((m ?? []) as (StockMovimiento & { productos: { nombre: string } | null })[]).map((x) => ({
        ...x,
        nombre: x.productos?.nombre ?? "—",
      })),
    );
    setCargando(false);
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const est = estadoStock(p);
      if (filtro !== "todos" && est !== filtro) return false;
      if (q && !p.nombre.toLowerCase().includes(q) && !(p.codigo ?? "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [productos, busqueda, filtro]);

  const agotados = productos.filter((p) => estadoStock(p) === "agotado").length;
  const bajos = productos.filter((p) => estadoStock(p) === "bajo").length;
  const conStock = productos.filter((p) => estadoStock(p) === "ok").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Inventario"
        title="Stock"
        description="Estado actual de tu inventario y registro de movimientos. Las ventas TPV descuentan stock automáticamente."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Con stock"  valor={conStock} tono="ok" />
        <KpiCard label="Stock bajo" valor={bajos}    tono="warn" />
        <KpiCard label="Agotados"   valor={agotados} tono="danger" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr,360px]">
        <section className="flex flex-col gap-3">
          <div className="card-glass flex flex-wrap items-center gap-3 p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-3 text-text-lo" size={14} />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto…"
                className="h-10 w-full rounded-lg border border-indigo-400/20 bg-indigo-900/30 pl-9 pr-3 text-sm text-text-hi" />
            </div>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}
              className="h-10 rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi">
              <option value="todos">Todos</option>
              <option value="ok">Con stock</option>
              <option value="bajo">Stock bajo</option>
              <option value="agotado">Agotados</option>
              <option value="sin_stock">Sin inventario</option>
            </select>
          </div>

          {cargando ? (
            <div className="card-glass flex h-48 items-center justify-center">
              <Loader2 className="animate-spin text-text-lo" size={20} />
            </div>
          ) : visibles.length === 0 ? (
            <div className="card-glass py-12 text-center text-sm text-text-mid">
              No hay productos que coincidan.
            </div>
          ) : (
            <div className="card-glass overflow-hidden">
              <div className="grid grid-cols-1 divide-y divide-indigo-400/10">
                {visibles.map((p) => {
                  const est = estadoStock(p);
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold"
                        style={{ background: p.color || "#4f46e5" }}>
                        {p.nombre.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-text-hi">{p.nombre}</span>
                          {p.codigo && (
                            <span className="font-mono text-[0.7rem] text-text-lo">{p.codigo}</span>
                          )}
                          <span className={`rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${COLOR_ESTADO[est]}`}>
                            {est === "ok" ? "OK" : est === "bajo" ? "Bajo" : est === "agotado" ? "Agotado" : "Sin stock"}
                          </span>
                        </div>
                        <div className="text-xs text-text-mid">
                          {p.categoria ?? "Sin categoría"}
                          {p.stock_minimo > 0 && ` · mínimo ${p.stock_minimo} ${p.unidad}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl font-bold text-text-hi">
                          {p.stock_tracking ? `${p.stock_actual} ${p.unidad}` : "—"}
                        </div>
                      </div>
                      {p.stock_tracking && (
                        <button onClick={() => setEditando(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan/30 bg-cyan/10 px-2.5 py-1.5 text-xs font-semibold text-cyan">
                          <Sliders size={11} /> Movimiento
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-3">
          <div className="card-glass p-4">
            <div className="section-label mb-3">Últimos movimientos</div>
            {movimientos.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-mid">Aún no hay movimientos.</div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {movimientos.map((m) => {
                  const Icono = ICONO_MOV[m.tipo];
                  const positivo = m.cantidad > 0;
                  return (
                    <li key={m.id} className="flex items-center gap-2 rounded-lg border border-indigo-400/10 bg-indigo-900/20 p-2 text-xs">
                      <Icono size={12} className={`shrink-0 ${COLOR_MOV[m.tipo]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-text-hi">{m.nombre}</div>
                        <div className="text-[0.65rem] text-text-lo">
                          {ETIQUETA_MOVIMIENTO[m.tipo]} · {new Date(m.ts).toLocaleString("es-ES")}
                        </div>
                      </div>
                      <span className={`font-bold ${positivo ? "text-ok" : "text-danger"}`}>
                        {positivo ? "+" : ""}{m.cantidad}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {editando && (
        <MovimientoModal
          producto={editando}
          negocioId={negocioId}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar(); }}
        />
      )}
    </div>
  );
}

function KpiCard({ label, valor, tono }: { label: string; valor: number; tono: "ok" | "warn" | "danger" }) {
  const map = {
    ok:     "border-ok/30 bg-ok/10 text-ok",
    warn:   "border-warn/30 bg-warn/10 text-warn",
    danger: "border-danger/30 bg-danger/10 text-danger",
  };
  return (
    <div className="card-glass p-4">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${map[tono]}`}>
          <Boxes size={14} />
        </span>
      </div>
      <div className="mt-2 font-display text-3xl font-bold text-text-hi">{valor}</div>
    </div>
  );
}

function MovimientoModal({
  producto,
  negocioId,
  onCerrar,
  onGuardado,
}: {
  producto: Producto;
  negocioId: string | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [tipo, setTipo] = useState<"entrada" | "salida" | "ajuste">("entrada");
  const [cantidad, setCantidad] = useState<number>(1);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!negocioId || cantidad === 0) return;
    setGuardando(true);

    // Para "ajuste" la cantidad es el delta absoluto (positivo o negativo).
    // Para entrada/salida garantizamos signo +/−.
    let delta = Number(cantidad) || 0;
    if (tipo === "salida") delta = -Math.abs(delta);
    if (tipo === "entrada") delta = Math.abs(delta);
    // ajuste: deja el signo tal cual viene

    const { error } = await supabase.from("stock_movimientos").insert({
      negocio_id: negocioId,
      producto_id: producto.id,
      tipo,
      cantidad: delta,
      motivo: motivo || null,
    });
    setGuardando(false);
    if (error) {
      toast.err(error.message);
      return;
    }
    toast.ok(`Movimiento registrado en ${producto.nombre}`);
    onGuardado();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCerrar}>
      <form onSubmit={guardar} onClick={(e) => e.stopPropagation()}
        className="card-glass w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-text-hi">Movimiento de stock</h2>
          <button type="button" onClick={onCerrar} className="text-text-mid hover:text-text-hi">
            <X size={16} />
          </button>
        </div>

        <div className="mb-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3 text-sm">
          <div className="font-semibold text-text-hi">{producto.nombre}</div>
          <div className="text-xs text-text-mid">
            Stock actual: <strong>{producto.stock_actual} {producto.unidad}</strong>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {(["entrada", "salida", "ajuste"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold capitalize ${
                tipo === t
                  ? t === "entrada" ? "border-ok/40 bg-ok/10 text-ok"
                    : t === "salida" ? "border-fuchsia/40 bg-fuchsia/10 text-fuchsia"
                    : "border-warn/40 bg-warn/10 text-warn"
                  : "border-indigo-400/15 bg-indigo-900/20 text-text-mid"
              }`}>
              {t === "entrada" ? <Plus size={14} /> : t === "salida" ? <Minus size={14} /> : <Sliders size={14} />}
              {t}
            </button>
          ))}
        </div>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">
            Cantidad ({producto.unidad}) {tipo === "ajuste" && "— delta firmado"}
          </span>
          <input type="number" step="0.001" value={cantidad}
            onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
            className="h-10 rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi"
            autoFocus required />
        </label>

        <label className="mb-4 flex flex-col gap-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">Motivo (opcional)</span>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Reposición proveedor, merma, recuento físico…"
            className="h-10 rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi" />
        </label>

        <div className="flex gap-2">
          <button type="button" onClick={onCerrar}
            className="flex-1 rounded-lg border border-indigo-400/20 bg-indigo-900/20 py-2.5 text-sm font-semibold text-text-mid">
            Cancelar
          </button>
          <button type="submit" disabled={guardando || cantidad === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Registrar
          </button>
        </div>
      </form>
    </div>
  );
}

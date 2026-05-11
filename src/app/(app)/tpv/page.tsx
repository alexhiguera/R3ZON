"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle2,
  X,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  Users,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";
import { useToast } from "@/components/ui/Toast";
import {
  añadirItem,
  calcularTotalVenta,
  cambiarCantidad,
  colorCategoria,
  eliminarItem,
  estadoStock,
  eur,
  type ItemTPV,
  type Producto,
} from "@/lib/inventario";

type MetodoPagoTPV = "efectivo" | "tarjeta" | "bizum" | "otro";

const METODOS: { id: MetodoPagoTPV; label: string; Icon: typeof Banknote }[] = [
  { id: "efectivo", label: "Efectivo", Icon: Banknote },
  { id: "tarjeta",  label: "Tarjeta",  Icon: CreditCard },
  { id: "bizum",    label: "Bizum",    Icon: Smartphone },
  { id: "otro",     label: "Otro",     Icon: Wallet },
];

export default function TPVPage() {
  const supabase = createClient();
  const negocioId = useNegocioId();
  const toast = useToast();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");

  const [items, setItems] = useState<ItemTPV[]>([]);
  const [mesa, setMesa] = useState("");
  const [cobrando, setCobrando] = useState(false);
  const [modalCobro, setModalCobro] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("categoria")
        .order("nombre");
      if (error) toast.err(error.message);
      else setProductos((data ?? []) as Producto[]);
      setCargando(false);
    })();
  }, [supabase, toast]);

  const categorias = useMemo(() => {
    const s = new Set<string>();
    for (const p of productos) if (p.categoria) s.add(p.categoria);
    return ["todas", ...[...s].sort()];
  }, [productos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (categoria !== "todas" && p.categoria !== categoria) return false;
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q) || (p.codigo ?? "").toLowerCase().includes(q);
    });
  }, [productos, busqueda, categoria]);

  const totales = useMemo(() => calcularTotalVenta(items), [items]);

  function agregar(p: Producto) {
    if (estadoStock(p) === "agotado") {
      toast.err(`${p.nombre} está agotado`);
      return;
    }
    setItems((prev) => añadirItem(prev, p));
  }

  function descartarTicket() {
    if (items.length === 0) return;
    if (!confirm("¿Vaciar el ticket en curso?")) return;
    setItems([]);
    setMesa("");
  }

  async function cobrar(metodo: MetodoPagoTPV) {
    if (!negocioId || items.length === 0) return;
    setCobrando(true);

    // 1. Crear venta abierta
    const { data: venta, error: errV } = await supabase
      .from("tpv_ventas")
      .insert({
        negocio_id: negocioId,
        mesa: mesa || null,
        estado: "abierta",
      })
      .select("id")
      .single();
    if (errV || !venta) {
      setCobrando(false);
      toast.err(`No se pudo abrir la venta: ${errV?.message ?? "desconocido"}`);
      return;
    }

    // 2. Insertar items
    const filas = items.map((it) => ({
      negocio_id:    negocioId,
      venta_id:      venta.id,
      producto_id:   it.producto_id,
      nombre:        it.nombre,
      cantidad:      it.cantidad,
      precio_unit:   it.precio_unit,
      iva_pct:       it.iva_pct,
      descuento_pct: it.descuento_pct,
    }));
    const { error: errI } = await supabase.from("tpv_venta_items").insert(filas);
    if (errI) {
      setCobrando(false);
      toast.err(`No se pudieron añadir los items: ${errI.message}`);
      return;
    }

    // 3. Cerrar (recalcula totales y descuenta stock automáticamente vía RPC)
    const { error: errC } = await supabase.rpc("cerrar_venta_tpv", {
      p_venta_id: venta.id,
      p_metodo_pago: metodo,
    });
    setCobrando(false);
    setModalCobro(false);
    if (errC) {
      toast.err(`Error al cerrar: ${errC.message}`);
      return;
    }

    toast.ok(`Cobrado ${eur(totales.total)} (${metodo})`);
    setItems([]);
    setMesa("");

    // Refrescar productos para mostrar stock actualizado
    const { data } = await supabase
      .from("productos").select("*").eq("activo", true)
      .order("categoria").order("nombre");
    setProductos((data ?? []) as Producto[]);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      {/* Cabecera */}
      <div className="card-glass flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2 text-sm text-text-hi">
          <ShoppingCart size={16} className="text-cyan" />
          <span className="font-display text-lg font-bold">TPV</span>
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-3 text-text-lo" size={14} />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto o código…"
            className="h-10 w-full rounded-lg border border-indigo-400/20 bg-indigo-900/30 pl-9 pr-3 text-sm text-text-hi" />
        </div>
        <input value={mesa} onChange={(e) => setMesa(e.target.value)}
          placeholder="Mesa / cuenta"
          className="h-10 w-32 rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi" />
      </div>

      <div className="grid flex-1 min-h-0 gap-3 lg:grid-cols-[1fr,420px]">
        {/* ─── REJILLA DE PRODUCTOS ────────────────────────────────── */}
        <section className="flex min-h-0 flex-col gap-2">
          {categorias.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {categorias.map((c) => (
                <button key={c} onClick={() => setCategoria(c)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${
                    categoria === c
                      ? "border-cyan/50 bg-cyan/10 text-cyan"
                      : "border-indigo-400/15 bg-indigo-900/20 text-text-mid hover:text-text-hi"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {cargando ? (
            <div className="card-glass flex flex-1 items-center justify-center">
              <Loader2 className="animate-spin text-text-lo" size={20} />
            </div>
          ) : visibles.length === 0 ? (
            <div className="card-glass flex flex-1 items-center justify-center text-sm text-text-mid">
              No hay productos activos para mostrar.
            </div>
          ) : (
            <div className="grid auto-rows-[100px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {visibles.map((p) => {
                const est = estadoStock(p);
                const agotado = est === "agotado";
                return (
                  <button key={p.id} onClick={() => agregar(p)} disabled={agotado}
                    style={{ background: p.color || colorCategoria(p.categoria) }}
                    className="group relative flex flex-col items-start justify-between rounded-2xl p-2.5 text-left text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95">
                    <div className="line-clamp-2 text-sm font-bold leading-tight">{p.nombre}</div>
                    <div className="flex w-full items-end justify-between">
                      <span className="text-[0.65rem] opacity-80">
                        {p.stock_tracking ? `${p.stock_actual}${p.unidad}` : ""}
                      </span>
                      <span className="rounded-md bg-black/25 px-1.5 py-0.5 text-xs font-bold">
                        {eur(Number(p.precio_venta))}
                      </span>
                    </div>
                    {est === "bajo" && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-warn text-[0.55rem] font-bold text-bg">
                        <AlertCircle size={10} />
                      </span>
                    )}
                    {agotado && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 text-[0.7rem] font-bold uppercase">
                        Agotado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── TICKET EN CURSO ────────────────────────────────────── */}
        <aside className="card-glass flex min-h-0 flex-col">
          <div className="border-b border-indigo-400/15 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="section-label">Ticket</div>
                <div className="font-display text-sm font-bold text-text-hi">
                  {items.length === 0 ? "Vacío" : `${totales.num_unidades} unidades · ${items.length} líneas`}
                </div>
              </div>
              {items.length > 0 && (
                <button onClick={descartarTicket}
                  className="text-xs text-danger hover:text-danger/80">
                  Descartar
                </button>
              )}
            </div>
            {mesa && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[0.7rem] text-cyan">
                <Users size={11} /> Mesa {mesa}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-text-mid">
                <ShoppingCart size={24} className="text-indigo-400/40" />
                <div>Pulsa un producto para añadirlo al ticket.</div>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {items.map((it, i) => (
                  <li key={`${it.producto_id}-${i}`}
                    className="rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-text-hi">{it.nombre}</div>
                        <div className="text-[0.7rem] text-text-lo">
                          {eur(it.precio_unit)} × {it.cantidad}
                          {it.descuento_pct > 0 && ` · −${it.descuento_pct}%`}
                        </div>
                      </div>
                      <div className="font-display text-sm font-bold text-text-hi">
                        {eur(it.cantidad * it.precio_unit * (1 - it.descuento_pct / 100))}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button onClick={() => setItems(cambiarCantidad(items, i, it.cantidad - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/30 text-text-mid">
                        <Minus size={11} />
                      </button>
                      <input type="number" step="0.001" value={it.cantidad}
                        onChange={(e) => setItems(cambiarCantidad(items, i, parseFloat(e.target.value) || 0))}
                        className="h-7 w-16 rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-2 text-center text-xs text-text-hi" />
                      <button onClick={() => setItems(cambiarCantidad(items, i, it.cantidad + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/30 text-text-mid">
                        <Plus size={11} />
                      </button>
                      <div className="flex-1" />
                      <button onClick={() => setItems(eliminarItem(items, i))} aria-label="Eliminar"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-danger">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-indigo-400/15 p-4">
            <div className="space-y-1 text-sm">
              <FilaTotal label="Subtotal" valor={eur(totales.subtotal)} />
              <FilaTotal label="IVA"      valor={eur(totales.iva_total)} />
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-white">
              <span className="font-display text-sm font-bold uppercase tracking-wide">Total</span>
              <span className="font-display text-2xl font-extrabold">{eur(totales.total)}</span>
            </div>
            <button onClick={() => setModalCobro(true)}
              disabled={items.length === 0}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan text-base font-bold text-bg shadow-glow disabled:cursor-not-allowed disabled:bg-text-lo disabled:opacity-40">
              <Wallet size={16} /> Cobrar
            </button>
          </div>
        </aside>
      </div>

      {modalCobro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !cobrando && setModalCobro(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="card-glass w-full max-w-md p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="section-label">Cobrar</div>
                <div className="font-display text-3xl font-extrabold text-text-hi">{eur(totales.total)}</div>
              </div>
              {!cobrando && (
                <button onClick={() => setModalCobro(false)} className="text-text-mid hover:text-text-hi">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {METODOS.map(({ id, label, Icon }) => (
                <button key={id} disabled={cobrando}
                  onClick={() => cobrar(id)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 py-5 text-cyan transition-transform hover:-translate-y-0.5 disabled:opacity-50">
                  {cobrando ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
                  <span className="text-sm font-bold">{label}</span>
                </button>
              ))}
            </div>

            <p className="mt-3 text-center text-[0.7rem] text-text-lo">
              Al cobrar, el stock se descuenta automáticamente para los productos rastreados.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaTotal({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between text-text-mid">
      <span>{label}</span>
      <span className="font-medium text-text-hi">{valor}</span>
    </div>
  );
}

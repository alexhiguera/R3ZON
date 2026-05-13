"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Package,
  Briefcase,
  Plus,
  Minus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  ScanLine,
  Upload,
  ChevronDown,
  Sliders,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseQuery } from "@/lib/useSupabaseQuery";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { BarcodeScanModal } from "@/components/productos/BarcodeScanModal";
import {
  ETIQUETA_MOVIMIENTO,
  estadoStock,
  eur,
  type EstadoStock,
  type Producto,
  type StockMovimiento,
  type TipoMovimientoStock,
  type TipoProducto,
} from "@/lib/inventario";
import { COLOR_MOV_STOCK, ESTADO_STOCK_BADGE } from "@/lib/ui-constants";

const PRODUCTO_IMG_BUCKET = "producto-imagenes";
const PRODUCTO_IMG_MAX_BYTES = 3 * 1024 * 1024;
const PRODUCTO_IMG_ACCEPT = ["image/png", "image/jpeg", "image/webp"];

const UNIDADES = ["ud", "kg", "l", "g", "ración", "hora"];

const COLUMNAS_LISTA =
  "id,nombre,codigo,categoria,tipo,unidad,precio_venta,iva_pct," +
  "stock_tracking,stock_actual,stock_minimo,color,imagen_url,activo,created_at,updated_at";

const ICONO_MOV: Record<TipoMovimientoStock, typeof ArrowDownLeft> = {
  entrada:    ArrowDownLeft,
  salida:     ArrowUpRight,
  ajuste:     Sliders,
  venta_tpv:  ShoppingCart,
  devolucion: RotateCcw,
};

type MovimientoConNombre = StockMovimiento & {
  productos: { nombre: string } | null;
};

type FiltroTipo = "todos" | "producto" | "servicio";
type FiltroEstado = "todos" | EstadoStock;

const PAGE_MOV = 50;

export default function ListadoPage() {
  const negocioId = useNegocioId();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);

  // Modo stock global (lo lee del perfil del negocio).
  const { data: perfilData } = useSupabaseQuery<{ stock_mode_enabled: boolean } | null>(
    (sb) => sb.from("perfiles_negocio").select("stock_mode_enabled").single(),
    { context: "perfil.stock_mode" },
  );
  const stockMode = perfilData?.stock_mode_enabled ?? true;

  const {
    data: productosData,
    loading: cargandoProd,
    refresh,
    setData,
  } = useSupabaseQuery<Producto[]>(
    (sb) => sb.from("productos").select(COLUMNAS_LISTA).order("nombre"),
    { context: "listado" },
  );
  const productos: Producto[] = productosData ?? [];

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const { confirm: confirmDialog, dialog: confirmDialogNode } = useConfirmDialog();
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [editando, setEditando] = useState<Partial<Producto> | null>(null);
  const [movimientoDe, setMovimientoDe] = useState<Producto | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  // Movimientos recientes (solo si modo stock está activo).
  const [movimientosRaw, setMovimientosRaw] = useState<MovimientoConNombre[]>([]);
  const [hayMasMov, setHayMasMov] = useState(false);
  const [cargandoMasMov, setCargandoMasMov] = useState(false);

  const cargarMov = useCallback(
    async (cursor: string | null = null, append = false) => {
      let q = supabase
        .from("stock_movimientos")
        .select(
          "id,producto_id,tipo,cantidad,motivo,ts,user_id,negocio_id,referencia,productos(nombre)",
        )
        .order("ts", { ascending: false });
      if (cursor) q = q.lt("ts", cursor);
      const { data, error } = await q.limit(PAGE_MOV);
      if (error) {
        toast.err(`Error al cargar movimientos: ${error.message}`);
        if (append) setCargandoMasMov(false);
        return;
      }
      const filas = (data ?? []) as unknown as MovimientoConNombre[];
      setMovimientosRaw((prev) => (append ? [...prev, ...filas] : filas));
      setHayMasMov(filas.length === PAGE_MOV);
      if (append) setCargandoMasMov(false);
    },
    [supabase, toast],
  );

  useEffect(() => {
    if (stockMode) cargarMov();
  }, [cargarMov, stockMode]);

  const refreshMov = useCallback(() => { cargarMov(); }, [cargarMov]);

  async function cargarMasMov() {
    const ultimo = movimientosRaw[movimientosRaw.length - 1];
    if (!ultimo) return;
    setCargandoMasMov(true);
    await cargarMov(ultimo.ts, true);
  }

  const movimientos = useMemo(
    () => movimientosRaw.map((m) => ({ ...m, nombre: m.productos?.nombre ?? "—" })),
    [movimientosRaw],
  );

  const categorias = useMemo(() => {
    const s = new Set<string>();
    for (const p of productos) if (p.categoria) s.add(p.categoria);
    return [...s].sort();
  }, [productos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false;
      if (filtroCategoria !== "todas" && p.categoria !== filtroCategoria) return false;
      if (stockMode && filtroEstado !== "todos") {
        const est = estadoStock(p);
        if (est !== filtroEstado) return false;
      }
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo ?? "").toLowerCase().includes(q)
      );
    });
  }, [productos, busqueda, filtroTipo, filtroCategoria, filtroEstado, stockMode]);

  async function eliminar(p: Producto) {
    const ok = await confirmDialog({
      title: `Eliminar producto`,
      message: `Se borrará "${p.nombre}" del catálogo. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setData((prev) => prev?.filter((x) => x.id !== p.id) ?? prev);
    const { error } = await supabase.from("productos").delete().eq("id", p.id);
    if (error) {
      toast.err(`No se pudo eliminar: ${formatSupabaseError(error)}`);
      refresh();
    } else {
      toast.ok(`Eliminado ${p.nombre}`);
    }
  }

  const productoVacio = (): Partial<Producto> => ({
    nombre: "", precio_venta: 0, precio_coste: 0, iva_pct: 21,
    tipo: "producto", unidad: "ud", stock_tracking: stockMode,
    stock_actual: 0, stock_minimo: 0, activo: true,
  });

  // KPIs sólo cuando el modo stock está activo.
  const inventariables = productos.filter((p) => p.tipo !== "servicio");
  const agotados = inventariables.filter((p) => estadoStock(p) === "agotado").length;
  const bajos    = inventariables.filter((p) => estadoStock(p) === "bajo").length;
  const conStock = inventariables.filter((p) => estadoStock(p) === "ok").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Catálogo e inventario"
        title="Listado"
        description={
          stockMode
            ? "Tus productos y servicios en un solo sitio. Las ventas TPV descuentan stock automáticamente."
            : "Tus productos y servicios. El modo stock está desactivado en Ajustes → Listado."
        }
      />

      {stockMode && (
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Con stock"  valor={conStock} tono="ok" />
          <KpiCard label="Stock bajo" valor={bajos}    tono="warn" />
          <KpiCard label="Agotados"   valor={agotados} tono="danger" />
        </div>
      )}

      <div className={stockMode ? "grid gap-5 lg:grid-cols-[1fr,360px]" : "grid gap-5"}>
        <section className="flex flex-col gap-3">
          <div className="card-glass flex flex-wrap items-center gap-3 p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-3 text-text-lo" size={14} />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o código…"
                className="pl-9"
              />
            </div>

            {/* Filtro Producto / Servicio */}
            <div className="inline-flex rounded-lg border border-indigo-400/20 bg-indigo-900/30 p-0.5">
              {([
                { v: "todos",    label: "Todos",      Icon: Boxes },
                { v: "producto", label: "Productos",  Icon: Package },
                { v: "servicio", label: "Servicios",  Icon: Briefcase },
              ] as const).map(({ v, label, Icon }) => {
                const sel = filtroTipo === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFiltroTipo(v)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${
                      sel
                        ? "bg-cyan/15 text-cyan border border-cyan/40"
                        : "border border-transparent text-text-mid hover:text-text-hi"
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                );
              })}
            </div>

            <Select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-auto"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>

            {stockMode && (
              <Select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
                className="w-auto"
              >
                <option value="todos">Cualquier stock</option>
                <option value="ok">Con stock</option>
                <option value="bajo">Stock bajo</option>
                <option value="agotado">Agotados</option>
                <option value="sin_stock">Sin inventario</option>
              </Select>
            )}

            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan/40 bg-cyan/10 px-4 text-sm font-bold text-cyan hover:bg-cyan/20"
            >
              <ScanLine size={14} /> Escanear
            </button>
            <button
              type="button"
              onClick={() => setEditando(productoVacio())}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 text-sm font-bold text-white shadow-glow"
            >
              <Plus size={14} /> Nuevo
            </button>
          </div>

          <BarcodeScanModal
            open={scanOpen}
            onClose={() => setScanOpen(false)}
            onResult={(r) => {
              setScanOpen(false);
              if (r.kind === "existente") setEditando(r.producto);
              else setEditando({ ...productoVacio(), codigo: r.codigo });
            }}
          />

          {cargandoProd ? (
            <div className="card-glass flex h-48 items-center justify-center">
              <Loader2 className="animate-spin text-text-lo" size={20} />
            </div>
          ) : visibles.length === 0 ? (
            <EmptyState onCrear={() => setEditando(productoVacio())} />
          ) : (
            <ul className="flex flex-col gap-2">
              {visibles.map((p) => (
                <FilaProducto
                  key={p.id}
                  producto={p}
                  stockMode={stockMode}
                  onEditar={() => abrirEdicion(p, supabase, setEditando, toast)}
                  onEliminar={() => eliminar(p)}
                  onMovimiento={() => setMovimientoDe(p)}
                />
              ))}
            </ul>
          )}
        </section>

        {stockMode && (
          <aside className="flex flex-col gap-3">
            <div className="card-glass p-4">
              <div className="section-label mb-3">Últimos movimientos</div>
              {movimientos.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-mid">
                  Aún no hay movimientos.
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {movimientos.map((m) => {
                    const Icono = ICONO_MOV[m.tipo];
                    const positivo = m.cantidad > 0;
                    return (
                      <li key={m.id}
                        className="flex items-center gap-2 rounded-lg border border-indigo-400/10 bg-indigo-900/20 p-2 text-xs">
                        <Icono size={12} className={`shrink-0 ${COLOR_MOV_STOCK[m.tipo]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-text-hi">{m.nombre}</div>
                          <div className="text-[0.65rem] text-text-lo">
                            {ETIQUETA_MOVIMIENTO[m.tipo]} ·{" "}
                            {new Date(m.ts).toLocaleString("es-ES")}
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
              {hayMasMov && (
                <button
                  type="button"
                  onClick={cargarMasMov}
                  disabled={cargandoMasMov}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-indigo-400/20 bg-indigo-900/30 text-xs font-semibold text-indigo-200 hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
                >
                  {cargandoMasMov ? <Loader2 size={12} className="animate-spin" /> : null}
                  Cargar {PAGE_MOV} más
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      <ProductoModal
        inicial={editando}
        stockMode={stockMode}
        negocioId={negocioId}
        onCerrar={() => setEditando(null)}
        onGuardado={() => { setEditando(null); refresh(); }}
      />

      <MovimientoModal
        producto={movimientoDe}
        negocioId={negocioId}
        onCerrar={() => setMovimientoDe(null)}
        onGuardado={() => { setMovimientoDe(null); refresh(); refreshMov(); }}
      />
      {confirmDialogNode}
    </div>
  );
}

// ── Fila ────────────────────────────────────────────────────────────────────
function FilaProducto({
  producto,
  stockMode,
  onEditar,
  onEliminar,
  onMovimiento,
}: {
  producto: Producto;
  stockMode: boolean;
  onEditar: () => void;
  onEliminar: () => void;
  onMovimiento: () => void;
}) {
  const p = producto;
  // Servicios nunca muestran etiqueta "sin inventario": no son inventariables.
  const mostrarBadge = stockMode && p.tipo !== "servicio";
  const est = mostrarBadge ? estadoStock(p) : null;
  const badge = est ? ESTADO_STOCK_BADGE[est] : null;

  return (
    <li className="flex items-stretch gap-3">
      {/* Etiqueta de stock: a la izquierda, separada de la fila pero alineada. */}
      <div className="hidden w-32 shrink-0 items-center sm:flex">
        {badge && (
          <span
            className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider ${badge.cls}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-indigo-400/15 bg-indigo-900/30 px-4 py-3 hover:border-indigo-400/30">
        {p.imagen_url ? (
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-indigo-400/20 bg-indigo-900/30">
            <Image
              src={p.imagen_url}
              alt={p.nombre}
              fill
              sizes="40px"
              className="object-cover"
            />
          </span>
        ) : (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold"
            style={{ background: p.color || "#4f46e5" }}
          >
            {p.nombre.slice(0, 2).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-text-hi">{p.nombre}</span>
            {p.codigo && (
              <span className="font-mono text-[0.7rem] text-text-lo">{p.codigo}</span>
            )}
            {p.tipo === "servicio" && (
              <span className="inline-flex items-center gap-1 rounded-md border border-fuchsia/30 bg-fuchsia/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-fuchsia">
                <Briefcase size={9} /> Servicio
              </span>
            )}
            {!p.activo && (
              <span className="rounded-md border border-text-lo/30 bg-text-lo/10 px-1.5 py-0.5 text-[0.65rem] uppercase text-text-mid">
                Inactivo
              </span>
            )}
          </div>
          <div className="text-xs text-text-mid">
            {p.categoria ?? "Sin categoría"} ·{" "}
            {p.tipo === "servicio"
              ? "Servicio"
              : stockMode && p.stock_tracking
                ? `${p.stock_actual} ${p.unidad}`
                : `${p.unidad}`}
            {stockMode && p.stock_tracking && p.stock_minimo > 0 &&
              ` · mín ${p.stock_minimo}`}
          </div>
        </div>

        <div className="text-right">
          <div className="font-display text-base font-bold text-text-hi">
            {eur(Number(p.precio_venta))}
          </div>
          <div className="text-[0.7rem] text-text-lo">+{p.iva_pct}% IVA</div>
        </div>

        <div className="flex shrink-0 gap-1">
          {stockMode && p.tipo !== "servicio" && p.stock_tracking && (
            <button
              onClick={onMovimiento}
              aria-label="Movimiento de stock"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan/20"
            >
              <Sliders size={13} />
            </button>
          )}
          <button
            onClick={onEditar}
            aria-label="Editar"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/30 text-text-mid hover:text-text-hi"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onEliminar}
            aria-label="Eliminar"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-danger hover:bg-danger/15"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </li>
  );
}

// ── KPI ─────────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  valor,
  tono,
}: {
  label: string;
  valor: number;
  tono: "ok" | "warn" | "danger";
}) {
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

// ── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="card-glass flex flex-col items-center gap-3 py-12 text-center text-text-mid">
      <Package size={28} className="text-indigo-400/40" />
      <div className="font-display text-lg font-bold">Aún no hay nada en tu listado</div>
      <p className="max-w-xs text-sm">
        Empieza creando un producto o servicio. Aparecerán en TPV y Documentos.
      </p>
      <button
        onClick={onCrear}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-bold text-white"
      >
        <Plus size={15} /> Crear el primero
      </button>
    </div>
  );
}

// ── Edición de producto ─────────────────────────────────────────────────────
async function abrirEdicion(
  p: Producto,
  supabase: ReturnType<typeof createClient>,
  setEditando: (p: Partial<Producto> | null) => void,
  toast: { err: (msg: string) => void },
) {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("id", p.id)
    .single();
  if (error) {
    toast.err(`No se pudo cargar el producto: ${error.message}`);
    return;
  }
  setEditando(data as Producto);
}

function ProductoModal({
  inicial,
  stockMode,
  negocioId,
  onCerrar,
  onGuardado,
}: {
  inicial: Partial<Producto> | null;
  stockMode: boolean;
  negocioId: string | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [p, setP] = useState<Partial<Producto>>(inicial ?? {});
  const [guardando, setGuardando] = useState(false);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [verAdicional, setVerAdicional] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useStateSync(inicial, setP);

  if (!inicial) return null;
  const inicialNonNull = inicial;
  const esNuevo = !inicialNonNull.id;

  async function subirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!PRODUCTO_IMG_ACCEPT.includes(file.type)) {
      toast.err("Formato no soportado (usa PNG, JPG o WEBP).");
      return;
    }
    if (file.size > PRODUCTO_IMG_MAX_BYTES) {
      toast.err("La imagen supera 3 MB.");
      return;
    }
    if (!negocioId) return;
    setSubiendoImg(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${negocioId}/producto-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(PRODUCTO_IMG_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) {
      setSubiendoImg(false);
      if (/bucket .* not found/i.test(upErr.message)) {
        toast.err("Bucket 'producto-imagenes' no existe. Aplica supabase/inventario_imagenes_ext.sql.");
      } else toast.err(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from(PRODUCTO_IMG_BUCKET).getPublicUrl(path);
    setP((cur) => ({ ...cur, imagen_url: pub.publicUrl }));
    setSubiendoImg(false);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!negocioId || !p.nombre) return;
    setGuardando(true);

    const esServicio = (p.tipo ?? "producto") === "servicio";
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
      stock_tracking: esServicio ? false : (stockMode ? (p.stock_tracking ?? true) : false),
      stock_actual:   Number(p.stock_actual) || 0,
      stock_minimo:   Number(p.stock_minimo) || 0,
      color:          p.color || null,
      imagen_url:     p.imagen_url || null,
      activo:         p.activo ?? true,
    };

    const q = esNuevo
      ? supabase.from("productos").insert(payload)
      : supabase.from("productos").update(payload).eq("id", inicialNonNull.id!);

    const { error } = await q;
    setGuardando(false);
    if (error) {
      toast.err(error.message);
      return;
    }
    toast.ok(esNuevo ? "Creado" : "Actualizado");
    onGuardado();
  }

  return (
    <Modal
      open={!!inicial}
      onClose={onCerrar}
      title={esNuevo ? "Nuevo producto / servicio" : `Editar · ${inicial.nombre ?? ""}`}
      size="lg"
    >
      <form onSubmit={guardar}>
        {/* Imagen */}
        <div className="mb-4 flex items-center gap-4 rounded-2xl border border-indigo-400/15 bg-indigo-900/30 p-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-indigo-400/20 bg-indigo-900/40">
            {p.imagen_url ? (
              <Image src={p.imagen_url} alt={p.nombre ?? "producto"} fill sizes="80px" className="object-cover" />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-lg font-bold text-white"
                style={{ background: p.color || "#4f46e5" }}
              >
                {(p.nombre ?? "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 text-xs text-text-mid">
            <div className="font-semibold text-text-hi">Imagen</div>
            <p>PNG · JPG · WEBP — máx 3 MB.</p>
            <div className="mt-2 flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={PRODUCTO_IMG_ACCEPT.join(",")}
                onChange={subirImagen}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={subiendoImg}
                className="inline-flex items-center gap-1 rounded-lg border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-[11px] font-semibold text-cyan hover:bg-cyan/20 disabled:opacity-50"
              >
                {subiendoImg ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                {p.imagen_url ? "Cambiar imagen" : "Subir imagen"}
              </button>
              {p.imagen_url && (
                <button
                  type="button"
                  onClick={() => setP({ ...p, imagen_url: null })}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20"
                >
                  <Trash2 size={11} /> Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" full>
            <Input value={p.nombre ?? ""} onChange={(e) => setP({ ...p, nombre: e.target.value })}
              required autoFocus />
          </Field>
          <Field label="Código / SKU" hint="Compatible con pistola de barras.">
            <Input value={p.codigo ?? ""} onChange={(e) => setP({ ...p, codigo: e.target.value })} />
          </Field>
          <Field label="Tipo">
            <Select value={p.tipo ?? "producto"} onChange={(e) => setP({ ...p, tipo: e.target.value as TipoProducto })}>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
            </Select>
          </Field>
          <Field label="Categoría" full>
            <Input value={p.categoria ?? ""} onChange={(e) => setP({ ...p, categoria: e.target.value })}
              placeholder="Bebidas, Postres, Camisetas…" />
          </Field>
          <Field label="Precio venta (€)">
            <Input type="number" step="0.01" value={p.precio_venta ?? 0}
              onChange={(e) => setP({ ...p, precio_venta: parseFloat(e.target.value) || 0 })} />
          </Field>
          <Field label="IVA %">
            <Input type="number" step="0.01" value={p.iva_pct ?? 21}
              onChange={(e) => setP({ ...p, iva_pct: parseFloat(e.target.value) || 0 })} />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setVerAdicional((v) => !v)}
          aria-expanded={verAdicional}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-4 py-2.5 text-sm font-semibold text-text-hi transition hover:border-indigo-400/40"
        >
          <span>Información adicional</span>
          <ChevronDown size={15} className={`transition-transform ${verAdicional ? "rotate-180" : ""}`} />
        </button>

        {verAdicional && (
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3">
            <Field label="Unidad">
              <Select value={p.unidad ?? "ud"} onChange={(e) => setP({ ...p, unidad: e.target.value })}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </Field>
            <Field label="Precio coste (€)">
              <Input type="number" step="0.01" value={p.precio_coste ?? 0}
                onChange={(e) => setP({ ...p, precio_coste: parseFloat(e.target.value) || 0 })} />
            </Field>
            <Field label="Color (TPV)">
              <Input type="color" value={p.color ?? "#4f46e5"}
                onChange={(e) => setP({ ...p, color: e.target.value })} />
            </Field>

            {stockMode && p.tipo !== "servicio" && (
              <>
                <Field
                  label="Stock inicial"
                  hint={!esNuevo ? "Se ajusta con un movimiento." : undefined}
                >
                  <Input type="number" step="0.001" value={p.stock_actual ?? 0}
                    onChange={(e) => setP({ ...p, stock_actual: parseFloat(e.target.value) || 0 })}
                    disabled={!esNuevo} />
                </Field>
                <Field label="Stock mínimo (alerta)">
                  <Input type="number" step="0.001" value={p.stock_minimo ?? 0}
                    onChange={(e) => setP({ ...p, stock_minimo: parseFloat(e.target.value) || 0 })} />
                </Field>
                <label className="col-span-2 flex items-center gap-2 text-xs text-text-mid">
                  <input type="checkbox" checked={p.stock_tracking ?? true}
                    onChange={(e) => setP({ ...p, stock_tracking: e.target.checked })}
                    className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30" />
                  Rastrear stock
                </label>
              </>
            )}

            <Field label="Descripción" full>
              <Textarea value={p.descripcion ?? ""} rows={2}
                onChange={(e) => setP({ ...p, descripcion: e.target.value })} />
            </Field>

            <label className="col-span-2 flex items-center gap-2 text-xs text-text-mid">
              <input type="checkbox" checked={p.activo ?? true}
                onChange={(e) => setP({ ...p, activo: e.target.checked })}
                className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30" />
              Activo (visible en TPV y catálogo)
            </label>
          </div>
        )}

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
    </Modal>
  );
}

// ── Movimiento de stock ─────────────────────────────────────────────────────
function MovimientoModal({
  producto,
  negocioId,
  onCerrar,
  onGuardado,
}: {
  producto: Producto | null;
  negocioId: string | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [tipo, setTipo] = useState<"entrada" | "salida" | "ajuste">("entrada");
  const [cantidad, setCantidad] = useState<number>(1);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!producto) return null;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!negocioId || cantidad === 0 || !producto) return;
    setGuardando(true);

    let delta = Number(cantidad) || 0;
    if (tipo === "salida") delta = -Math.abs(delta);
    if (tipo === "entrada") delta = Math.abs(delta);

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
    <Modal open={!!producto} onClose={onCerrar} size="sm" title="Movimiento de stock">
      <form onSubmit={guardar}>
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

        <Field
          label={`Cantidad (${producto.unidad})${tipo === "ajuste" ? " — delta firmado" : ""}`}
        >
          <Input
            type="number"
            step="0.001"
            value={cantidad}
            onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
            autoFocus
            required
          />
        </Field>

        <div className="mt-3">
          <Field label="Motivo (opcional)">
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Reposición proveedor, merma, recuento físico…"
            />
          </Field>
        </div>

        <div className="mt-4 flex gap-2">
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
    </Modal>
  );
}

// Helper: sincroniza el estado interno cuando cambia el `inicial` por props.
function useStateSync<T>(
  value: T | null,
  setter: React.Dispatch<React.SetStateAction<T>>,
) {
  useEffect(() => {
    if (value) setter(value);
  }, [value, setter]);
}

"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Briefcase,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  ScanLine,
  Search,
  ShoppingCart,
  Sliders,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/inventario/EmptyState";
import { FilaProducto } from "@/components/inventario/FilaProducto";
import { KpiCard } from "@/components/inventario/KpiCard";
import { MovimientoModal } from "@/components/inventario/MovimientoModal";
import { ProductoModal } from "@/components/inventario/ProductoModal";
import { useMovimientosStock } from "@/components/inventario/useMovimientosStock";
import { BarcodeScanModal } from "@/components/productos/BarcodeScanModal";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import {
  type EstadoStock,
  ETIQUETA_MOVIMIENTO,
  estadoStock,
  type Producto,
  type TipoMovimientoStock,
} from "@/lib/inventario";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { COLOR_MOV_STOCK } from "@/lib/ui-constants";
import { useNegocioId } from "@/lib/useNegocioId";
import { useSupabaseQuery } from "@/lib/useSupabaseQuery";

const COLUMNAS_LISTA =
  "id,nombre,codigo,categoria,tipo,unidad,precio_venta,iva_pct," +
  "stock_tracking,stock_actual,stock_minimo,color,imagen_url,activo,created_at,updated_at";

const ICONO_MOV: Record<TipoMovimientoStock, typeof ArrowDownLeft> = {
  entrada: ArrowDownLeft,
  salida: ArrowUpRight,
  ajuste: Sliders,
  venta_tpv: ShoppingCart,
  devolucion: RotateCcw,
};

type FiltroTipo = "todos" | "producto" | "servicio";
type FiltroEstado = "todos" | EstadoStock;

export default function ListadoPage() {
  const negocioId = useNegocioId();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const { confirm: confirmDialog, dialog: confirmDialogNode } = useConfirmDialog();

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
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [editando, setEditando] = useState<Partial<Producto> | null>(null);
  const [movimientoDe, setMovimientoDe] = useState<Producto | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const {
    movimientos,
    hayMas: hayMasMov,
    cargandoMas: cargandoMasMov,
    refresh: refreshMov,
    cargarMas: cargarMasMov,
    pageSize,
  } = useMovimientosStock(stockMode, supabase);

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
      return p.nombre.toLowerCase().includes(q) || (p.codigo ?? "").toLowerCase().includes(q);
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

  async function abrirEdicion(p: Producto) {
    const { data, error } = await supabase.from("productos").select("*").eq("id", p.id).single();
    if (error) {
      toast.err(`No se pudo cargar el producto: ${error.message}`);
      return;
    }
    setEditando(data as Producto);
  }

  const productoVacio = (): Partial<Producto> => ({
    nombre: "",
    precio_venta: 0,
    precio_coste: 0,
    iva_pct: 21,
    tipo: "producto",
    unidad: "ud",
    stock_tracking: stockMode,
    stock_actual: 0,
    stock_minimo: 0,
    activo: true,
  });

  // KPIs sólo cuando el modo stock está activo.
  const inventariables = productos.filter((p) => p.tipo !== "servicio");
  const agotados = inventariables.filter((p) => estadoStock(p) === "agotado").length;
  const bajos = inventariables.filter((p) => estadoStock(p) === "bajo").length;
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
          <KpiCard label="Con stock" valor={conStock} tono="ok" />
          <KpiCard label="Stock bajo" valor={bajos} tono="warn" />
          <KpiCard label="Agotados" valor={agotados} tono="danger" />
        </div>
      )}

      <div className={stockMode ? "grid gap-5 lg:grid-cols-[1fr,360px]" : "grid gap-5"}>
        <section className="flex flex-col gap-3">
          <div className="card-glass flex flex-wrap items-center gap-3 p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search
                className="pointer-events-none absolute left-3 top-3 text-text-lo"
                size={14}
              />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o código…"
                className="pl-9"
              />
            </div>

            <div className="inline-flex rounded-lg border border-indigo-400/20 bg-indigo-900/30 p-0.5">
              {(
                [
                  { v: "todos", label: "Todos", Icon: Boxes },
                  { v: "producto", label: "Productos", Icon: Package },
                  { v: "servicio", label: "Servicios", Icon: Briefcase },
                ] as const
              ).map(({ v, label, Icon }) => {
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
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
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
                  onEditar={() => abrirEdicion(p)}
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
                      <li
                        key={m.id}
                        className="flex items-center gap-2 rounded-lg border border-indigo-400/10 bg-indigo-900/20 p-2 text-xs"
                      >
                        <Icono size={12} className={`shrink-0 ${COLOR_MOV_STOCK[m.tipo]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-text-hi">{m.nombre}</div>
                          <div className="text-[0.65rem] text-text-lo">
                            {ETIQUETA_MOVIMIENTO[m.tipo]} · {new Date(m.ts).toLocaleString("es-ES")}
                          </div>
                        </div>
                        <span className={`font-bold ${positivo ? "text-ok" : "text-danger"}`}>
                          {positivo ? "+" : ""}
                          {m.cantidad}
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
                  Cargar {pageSize} más
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
        onGuardado={() => {
          setEditando(null);
          refresh();
        }}
      />

      <MovimientoModal
        producto={movimientoDe}
        negocioId={negocioId}
        onCerrar={() => setMovimientoDe(null)}
        onGuardado={() => {
          setMovimientoDe(null);
          refresh();
          refreshMov();
        }}
      />
      {confirmDialogNode}
    </div>
  );
}

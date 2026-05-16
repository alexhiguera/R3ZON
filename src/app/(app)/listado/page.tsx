"use client";

import { Boxes, Briefcase, Loader2, Package, Plus, ScanLine, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/inventario/EmptyState";
import { FilaProducto } from "@/components/inventario/FilaProducto";
import { KpiCard } from "@/components/inventario/KpiCard";
import { MovimientoModal } from "@/components/inventario/MovimientoModal";
import { ProductoModal } from "@/components/inventario/ProductoModal";
import { BarcodeScanModal } from "@/components/productos/BarcodeScanModal";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { type EstadoStock, estadoStock, type Producto } from "@/lib/inventario";
import { createClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase-errors";
import { useNegocioId } from "@/lib/useNegocioId";
import { useSupabaseQuery } from "@/lib/useSupabaseQuery";

const COLUMNAS_LISTA =
  "id,nombre,codigo,categoria,tipo,unidad,precio_venta,iva_pct," +
  "stock_tracking,stock_actual,stock_minimo,color,imagen_url,activo,created_at,updated_at";

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

      <div className="grid gap-5">
        <section className="flex flex-col gap-3">
          {/* Buscador + acciones primarias. En móvil la búsqueda ocupa el ancho
              y los dos botones (Escanear + Nuevo) van debajo a 50/50; en
              ≥sm todo en línea. Filtros en otra fila para no apretar. */}
          <div className="card-glass flex flex-col gap-3 p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-lo"
                  size={14}
                />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o código…"
                  className="h-12 pl-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 px-4 text-sm font-bold text-cyan hover:bg-cyan/20"
                >
                  <ScanLine size={16} /> Escanear
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(productoVacio())}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 text-sm font-bold text-bg"
                >
                  <Plus size={16} /> Nuevo
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-1 sm:inline-flex">
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
                      className={`flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
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

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:gap-3">
                <Select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="h-10"
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
                    className="h-10"
                  >
                    <option value="todos">Cualquier stock</option>
                    <option value="ok">Con stock</option>
                    <option value="bajo">Stock bajo</option>
                    <option value="agotado">Agotados</option>
                    <option value="sin_stock">Sin inventario</option>
                  </Select>
                )}
              </div>
            </div>
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
        }}
      />
      {confirmDialogNode}
    </div>
  );
}

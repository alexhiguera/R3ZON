import { Briefcase, Pencil, Sliders, Trash2 } from "lucide-react";
import Image from "next/image";
import { estadoStock, eur, type Producto } from "@/lib/inventario";
import { ESTADO_STOCK_BADGE } from "@/lib/ui-constants";

export function FilaProducto({
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
            <Image src={p.imagen_url} alt={p.nombre} fill sizes="40px" className="object-cover" />
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
            {p.codigo && <span className="font-mono text-[0.7rem] text-text-lo">{p.codigo}</span>}
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
            {stockMode && p.stock_tracking && p.stock_minimo > 0 && ` · mín ${p.stock_minimo}`}
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

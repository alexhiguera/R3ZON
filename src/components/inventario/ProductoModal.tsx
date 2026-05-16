import { CheckCircle2, ChevronDown, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Producto, TipoProducto } from "@/lib/inventario";
import { createClient } from "@/lib/supabase/client";

const PRODUCTO_IMG_BUCKET = "producto-imagenes";
const PRODUCTO_IMG_MAX_BYTES = 3 * 1024 * 1024;
const PRODUCTO_IMG_ACCEPT = ["image/png", "image/jpeg", "image/webp"];

const UNIDADES = ["ud", "kg", "l", "g", "ración", "hora"];

// Helper: sincroniza el estado interno cuando cambia el `inicial` por props.
function useStateSync<T>(value: T | null, setter: React.Dispatch<React.SetStateAction<T>>) {
  useEffect(() => {
    if (value) setter(value);
  }, [value, setter]);
}

export function ProductoModal({
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
        toast.err(
          "Bucket 'producto-imagenes' no existe. Aplica supabase/inventario_imagenes_ext.sql.",
        );
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
      negocio_id: negocioId,
      codigo: p.codigo || null,
      nombre: p.nombre,
      descripcion: p.descripcion || null,
      categoria: p.categoria || null,
      tipo: (p.tipo ?? "producto") as TipoProducto,
      unidad: p.unidad ?? "ud",
      precio_venta: Number(p.precio_venta) || 0,
      precio_coste: Number(p.precio_coste) || 0,
      iva_pct: Number(p.iva_pct) || 0,
      stock_tracking: esServicio ? false : stockMode ? (p.stock_tracking ?? true) : false,
      stock_actual: Number(p.stock_actual) || 0,
      stock_minimo: Number(p.stock_minimo) || 0,
      color: p.color || null,
      imagen_url: p.imagen_url || null,
      activo: p.activo ?? true,
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
              <Image
                src={p.imagen_url}
                alt={p.nombre ?? "producto"}
                fill
                sizes="80px"
                className="object-cover"
              />
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
                {subiendoImg ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Upload size={11} />
                )}
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
            <Input
              value={p.nombre ?? ""}
              onChange={(e) => setP({ ...p, nombre: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <Field label="Código / SKU" hint="Compatible con pistola de barras.">
            <Input
              value={p.codigo ?? ""}
              onChange={(e) => setP({ ...p, codigo: e.target.value })}
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={p.tipo ?? "producto"}
              onChange={(e) => setP({ ...p, tipo: e.target.value as TipoProducto })}
            >
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
            </Select>
          </Field>
          <Field label="Categoría" full>
            <Input
              value={p.categoria ?? ""}
              onChange={(e) => setP({ ...p, categoria: e.target.value })}
              placeholder="Bebidas, Postres, Camisetas…"
            />
          </Field>
          <Field label="Precio venta (€)">
            <Input
              type="number"
              step="0.01"
              value={p.precio_venta ?? 0}
              onChange={(e) => setP({ ...p, precio_venta: parseFloat(e.target.value) || 0 })}
            />
          </Field>
          <Field label="IVA %">
            <Input
              type="number"
              step="0.01"
              value={p.iva_pct ?? 21}
              onChange={(e) => setP({ ...p, iva_pct: parseFloat(e.target.value) || 0 })}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setVerAdicional((v) => !v)}
          aria-expanded={verAdicional}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-4 py-2.5 text-sm font-semibold text-text-hi transition hover:border-indigo-400/40"
        >
          <span>Información adicional</span>
          <ChevronDown
            size={15}
            className={`transition-transform ${verAdicional ? "rotate-180" : ""}`}
          />
        </button>

        {verAdicional && (
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3">
            <Field label="Unidad">
              <Select
                value={p.unidad ?? "ud"}
                onChange={(e) => setP({ ...p, unidad: e.target.value })}
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Precio coste (€)">
              <Input
                type="number"
                step="0.01"
                value={p.precio_coste ?? 0}
                onChange={(e) => setP({ ...p, precio_coste: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Color (TPV)">
              <Input
                type="color"
                value={p.color ?? "#4f46e5"}
                onChange={(e) => setP({ ...p, color: e.target.value })}
              />
            </Field>

            {stockMode && p.tipo !== "servicio" && (
              <>
                <Field
                  label="Stock inicial"
                  hint={!esNuevo ? "Se ajusta con un movimiento." : undefined}
                >
                  <Input
                    type="number"
                    step="0.001"
                    value={p.stock_actual ?? 0}
                    onChange={(e) => setP({ ...p, stock_actual: parseFloat(e.target.value) || 0 })}
                    disabled={!esNuevo}
                  />
                </Field>
                <Field label="Stock mínimo (alerta)">
                  <Input
                    type="number"
                    step="0.001"
                    value={p.stock_minimo ?? 0}
                    onChange={(e) => setP({ ...p, stock_minimo: parseFloat(e.target.value) || 0 })}
                  />
                </Field>
                <label className="col-span-2 flex items-center gap-2 text-xs text-text-mid">
                  <input
                    type="checkbox"
                    checked={p.stock_tracking ?? true}
                    onChange={(e) => setP({ ...p, stock_tracking: e.target.checked })}
                    className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30"
                  />
                  Rastrear stock
                </label>
              </>
            )}

            <Field label="Descripción" full>
              <Textarea
                value={p.descripcion ?? ""}
                rows={2}
                onChange={(e) => setP({ ...p, descripcion: e.target.value })}
              />
            </Field>

            <label className="col-span-2 flex items-center gap-2 text-xs text-text-mid">
              <input
                type="checkbox"
                checked={p.activo ?? true}
                onChange={(e) => setP({ ...p, activo: e.target.checked })}
                className="h-4 w-4 rounded border-indigo-400/30 bg-indigo-900/30"
              />
              Activo (visible en TPV y catálogo)
            </label>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 rounded-lg border border-indigo-400/20 bg-indigo-900/20 py-2.5 text-sm font-semibold text-text-mid"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || !negocioId || !p.nombre}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {guardando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}

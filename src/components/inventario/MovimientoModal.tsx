import { CheckCircle2, Loader2, Minus, Plus, Sliders } from "lucide-react";
import { useMemo, useState } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Producto } from "@/lib/inventario";
import { createClient } from "@/lib/supabase/client";

export function MovimientoModal({
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
            Stock actual:{" "}
            <strong>
              {producto.stock_actual} {producto.unidad}
            </strong>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {(["entrada", "salida", "ajuste"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold capitalize ${
                tipo === t
                  ? t === "entrada"
                    ? "border-ok/40 bg-ok/10 text-ok"
                    : t === "salida"
                      ? "border-fuchsia/40 bg-fuchsia/10 text-fuchsia"
                      : "border-warn/40 bg-warn/10 text-warn"
                  : "border-indigo-400/15 bg-indigo-900/20 text-text-mid"
              }`}
            >
              {t === "entrada" ? (
                <Plus size={14} />
              ) : t === "salida" ? (
                <Minus size={14} />
              ) : (
                <Sliders size={14} />
              )}
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
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 rounded-lg border border-indigo-400/20 bg-indigo-900/20 py-2.5 text-sm font-semibold text-text-mid"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || cantidad === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {guardando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Registrar
          </button>
        </div>
      </form>
    </Modal>
  );
}

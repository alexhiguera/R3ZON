"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Star, Loader2, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";
import { useToast } from "@/components/ui/Toast";
import { formatSupabaseError } from "@/lib/supabase-errors";

export type MetodoPago = {
  id: string;
  etiqueta: string;
  tipo: string;
  detalle: string | null;
  predeterminado: boolean;
};

const TIPOS = [
  "transferencia",
  "bizum",
  "tarjeta",
  "efectivo",
  "domiciliacion",
  "paypal",
  "otros",
] as const;

export function FacturacionTab() {
  const supabase = createClient();
  const negocioId = useNegocioId();
  const toast = useToast();

  const [items, setItems] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [añadiendo, setAñadiendo] = useState(false);

  const [nuevoEtiqueta, setNuevoEtiqueta] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<(typeof TIPOS)[number]>("transferencia");
  const [nuevoDetalle, setNuevoDetalle] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("metodos_pago")
        .select("id,etiqueta,tipo,detalle,predeterminado")
        .order("predeterminado", { ascending: false })
        .order("etiqueta");
      if (error) toast.err(formatSupabaseError(error));
      else setItems((data ?? []) as MetodoPago[]);
      setCargando(false);
    })();
  }, [supabase, toast]);

  async function añadir(e: React.FormEvent) {
    e.preventDefault();
    if (!negocioId || !nuevoEtiqueta.trim()) return;
    setAñadiendo(true);
    const { data, error } = await supabase
      .from("metodos_pago")
      .insert({
        negocio_id: negocioId,
        etiqueta: nuevoEtiqueta.trim(),
        tipo: nuevoTipo,
        detalle: nuevoDetalle.trim() || null,
        predeterminado: items.length === 0,
      })
      .select("id,etiqueta,tipo,detalle,predeterminado")
      .single();
    setAñadiendo(false);
    if (error || !data) {
      toast.err(formatSupabaseError(error, "No se ha podido guardar el método de pago."));
      return;
    }
    setItems((prev) => [...prev, data as MetodoPago]);
    setNuevoEtiqueta("");
    setNuevoDetalle("");
    toast.ok("Método de pago guardado");
  }

  async function eliminar(id: string) {
    const prev = items;
    setItems((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("metodos_pago").delete().eq("id", id);
    if (error) {
      setItems(prev);
      toast.err(formatSupabaseError(error));
    }
  }

  async function marcarPredeterminado(id: string) {
    const prev = items;
    setItems((p) => p.map((x) => ({ ...x, predeterminado: x.id === id })));
    // RPC atómica: ambos UPDATE en la misma transacción → no hay ventana
    // sin predeterminado y respeta el índice único parcial.
    const { error } = await supabase.rpc("set_metodo_pago_predeterminado", { p_id: id });
    if (error) {
      setItems(prev);
      toast.err(formatSupabaseError(error));
    }
  }

  return (
    <div className="card-glass p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
          <CreditCard size={18} />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-text-hi">Métodos de pago</h2>
          <p className="text-xs text-text-mid">
            Se sugieren al emitir facturas, tickets y presupuestos. Marca uno como predeterminado.
          </p>
        </div>
      </div>

      {cargando ? (
        <div className="flex h-24 items-center justify-center text-text-lo">
          <Loader2 className="animate-spin" size={18} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-indigo-400/20 bg-indigo-900/10 p-6 text-center text-sm text-text-mid">
          Aún no has guardado ningún método de pago.
        </div>
      ) : (
        <ul className="mb-5 flex flex-col gap-2">
          {items.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => !m.predeterminado && marcarPredeterminado(m.id)}
                aria-label="Marcar como predeterminado"
                className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                  m.predeterminado
                    ? "border-warn/40 bg-warn/10 text-warn"
                    : "border-indigo-400/20 text-text-lo hover:text-warn"
                }`}
              >
                <Star size={14} fill={m.predeterminado ? "currentColor" : "none"} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text-hi">{m.etiqueta}</div>
                <div className="truncate text-xs text-text-mid">
                  <span className="capitalize">{m.tipo}</span>
                  {m.detalle ? ` · ${m.detalle}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => eliminar(m.id)}
                aria-label="Eliminar"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-danger/30 bg-danger/5 text-danger hover:bg-danger/15"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={añadir}
        className="grid gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/10 p-4 sm:grid-cols-12"
      >
        <label className="flex flex-col gap-1 sm:col-span-4">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">
            Etiqueta
          </span>
          <input
            value={nuevoEtiqueta}
            onChange={(e) => setNuevoEtiqueta(e.target.value)}
            placeholder="Transferencia BBVA"
            className="h-10 rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi"
            required
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-3">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">
            Tipo
          </span>
          <select
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value as (typeof TIPOS)[number])}
            className="h-10 rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-lo">
            Detalle (IBAN, teléfono, instrucciones…)
          </span>
          <input
            value={nuevoDetalle}
            onChange={(e) => setNuevoDetalle(e.target.value)}
            placeholder="ES12 3456 7890 1234 5678 9012"
            className="h-10 rounded-lg border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi"
          />
        </label>
        <button
          type="submit"
          disabled={añadiendo || !negocioId}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50 sm:col-span-12"
        >
          {añadiendo ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Añadir método de pago
        </button>
      </form>
    </div>
  );
}

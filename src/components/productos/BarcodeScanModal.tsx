"use client";

import { AlertCircle, Loader2, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { Producto } from "@/lib/inventario";
import { createClient } from "@/lib/supabase/client";

type ScanResult = { kind: "existente"; producto: Producto } | { kind: "nuevo"; codigo: string };

export function BarcodeScanModal({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (r: ScanResult) => void;
}) {
  const supabase = createClient();
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCodigo("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  async function procesar(raw: string) {
    const c = raw.trim();
    if (!c) return;
    setBuscando(true);
    setError(null);
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("codigo", c)
      .maybeSingle();
    setBuscando(false);
    if (error && error.code !== "PGRST116") {
      setError(error.message);
      return;
    }
    if (data) onResult({ kind: "existente", producto: data as Producto });
    else onResult({ kind: "nuevo", codigo: c });
  }

  return (
    <Modal open={open} onClose={onClose} title="Escanear código de barras" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          procesar(codigo);
        }}
        className="space-y-4"
      >
        <div className="rounded-2xl border border-cyan/30 bg-cyan/5 p-5 text-center">
          <ScanLine size={36} className="mx-auto text-cyan" />
          <p className="mt-2 text-sm text-text-mid">
            Apunta la pistola y dispara, o teclea el código manualmente y pulsa Enter.
          </p>
        </div>

        <input
          ref={inputRef}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoFocus
          placeholder="Esperando código…"
          className="w-full rounded-xl border border-indigo-400/30 bg-indigo-900/40 px-4 py-3 text-center font-mono text-lg tracking-widest text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none"
        />

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-indigo-400/20 bg-indigo-900/20 py-2.5 text-sm font-semibold text-text-mid"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={buscando || !codigo.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia py-2.5 text-sm font-bold text-bg disabled:opacity-50"
          >
            {buscando ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
            Procesar
          </button>
        </div>

        <p className="text-center text-[10px] text-text-lo">
          Si el código ya existe, abriremos su ficha. Si es nuevo, se prellena el formulario.
        </p>
      </form>
    </Modal>
  );
}

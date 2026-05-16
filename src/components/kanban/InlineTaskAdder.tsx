"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Tarea } from "@/lib/kanban";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";

/**
 * Mini-formulario in-line dentro de una columna del kanban.
 * Sólo pide título; el resto se queda con sus defaults (prioridad normal,
 * sin descripción ni fecha). El usuario puede editar después haciendo click
 * en la tarjeta.
 *
 * UX: Enter crea, Escape cancela, click fuera también cancela.
 */
export function InlineTaskAdder({
  columnaSlug,
  onCreated,
  onCancel,
}: {
  columnaSlug: string;
  onCreated: (t: Tarea) => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const negocioId = useNegocioId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [titulo, setTitulo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cancelar al hacer click fuera (sólo si el campo está vacío para no
  // perder lo escrito por accidente).
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as Node)) return;
      if (titulo.trim() === "") onCancel();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [titulo, onCancel]);

  const crear = async () => {
    const t = titulo.trim();
    if (!t) return;
    if (!negocioId) {
      setError("Cargando perfil del negocio…");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("tareas_kanban")
      .insert({
        negocio_id: negocioId,
        titulo: t,
        columna: columnaSlug,
        prioridad: "normal",
        posicion: 9999,
        completada: false,
      })
      .select()
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated(data as Tarea);
    setTitulo("");
    // Mantener el input abierto para añadir varias seguidas — UX rápida.
    inputRef.current?.focus();
  };

  return (
    <div
      ref={wrapRef}
      className="flex flex-col gap-2 rounded-2xl border border-cyan/40 bg-indigo-900/40 p-2.5 shadow-lg shadow-cyan/5"
    >
      <input
        ref={inputRef}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            crear();
          }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Título de la tarea…"
        disabled={busy}
        className="h-9 rounded-lg border border-indigo-400/25 bg-indigo-900/40 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/60 focus:outline-none"
      />
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-2 py-1 text-[11px] text-danger">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={crear}
          disabled={busy || !titulo.trim() || !negocioId}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan to-fuchsia py-1.5 text-xs font-bold text-bg disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
          Crear tarea
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-mid hover:bg-indigo-900/40 hover:text-text-hi"
        >
          <X size={13} />
        </button>
      </div>
      <span className="text-[10px] text-text-lo">
        Enter para crear · Esc para cancelar · Click la tarjeta para añadir más detalles
      </span>
    </div>
  );
}

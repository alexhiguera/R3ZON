"use client";

import { useRef, useState } from "react";
import { X, Plus, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip, Help } from "@/components/ui/Tooltip";
import { COLORES_COLUMNA, type Columna } from "@/lib/kanban";

type Props = {
  columnas: Columna[];
  onClose: () => void;
  onUpdate: (cols: Columna[]) => void;
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
}

export function ColumnManager({ columnas, onClose, onUpdate }: Props) {
  const supabase = createClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState<Columna[]>(columnas);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoColor, setNuevoColor] = useState(COLORES_COLUMNA[0]);
  const [saving, setSaving] = useState(false);

  const agregarColumna = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const slug = slugify(nombre);
    if (cols.some((c) => c.slug === slug)) return;

    setSaving(true);
    const { data: perfil } = await supabase.from("perfiles_negocio").select("id").single();
    const { data, error } = await supabase
      .from("kanban_columnas")
      .insert({
        negocio_id: perfil!.id,
        nombre,
        slug,
        color: nuevoColor,
        posicion: cols.length,
      })
      .select()
      .single();

    setSaving(false);
    if (error || !data) return;
    const updated = [...cols, data as Columna];
    setCols(updated);
    onUpdate(updated);
    setNuevoNombre("");
  };

  const renombrar = async (id: string, nombre: string) => {
    await supabase.from("kanban_columnas").update({ nombre }).eq("id", id);
    const updated = cols.map((c) => (c.id === id ? { ...c, nombre } : c));
    setCols(updated);
    onUpdate(updated);
  };

  const cambiarColor = async (id: string, color: string) => {
    await supabase.from("kanban_columnas").update({ color }).eq("id", id);
    const updated = cols.map((c) => (c.id === id ? { ...c, color } : c));
    setCols(updated);
    onUpdate(updated);
  };

  const eliminarColumna = async (id: string, slug: string) => {
    const count = await supabase
      .from("tareas_kanban")
      .select("id", { count: "exact", head: true })
      .eq("columna", slug);
    const n = count.count ?? 0;
    if (n > 0) {
      if (
        !confirm(
          `Esta columna tiene ${n} tarea(s). Al eliminarla, las tareas quedarán sin columna. ¿Continuar?`
        )
      )
        return;
    }
    await supabase.from("kanban_columnas").delete().eq("id", id);
    const updated = cols.filter((c) => c.id !== id);
    setCols(updated);
    onUpdate(updated);
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="card-glass w-full max-w-md overflow-hidden">
        <div className="rainbow-bar" />

        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <h2 className="font-display text-lg font-bold text-text-hi">
              Gestionar columnas
            </h2>
            <p className="text-xs text-text-mid">
              Añade, renombra o elimina columnas del tablero.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/20 text-indigo-300 hover:text-text-hi"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5">
          {/* Lista de columnas existentes */}
          {cols.map((col) => (
            <ColRow
              key={col.id}
              col={col}
              onRename={(nombre) => renombrar(col.id, nombre)}
              onColorChange={(color) => cambiarColor(col.id, color)}
              onDelete={() => eliminarColumna(col.id, col.slug)}
              isDeletable={cols.length > 1}
            />
          ))}

          {/* Formulario nueva columna */}
          <div className="mt-2 rounded-2xl border border-dashed border-indigo-400/25 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="section-label">Nueva columna</span>
              <Help text="Crea columnas personalizadas como 'Presupuesto', 'En producción' o 'Entregado'." />
            </div>
            <div className="flex gap-2">
              <input
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") agregarColumna(); }}
                placeholder="Nombre de la columna…"
                className="h-10 flex-1 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none"
              />
              {/* Selector de color */}
              <div className="flex items-center gap-1">
                {COLORES_COLUMNA.map((c) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => setNuevoColor(c)}
                    className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: nuevoColor === c ? `2px solid ${c}` : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
              <button
                onClick={agregarColumna}
                disabled={saving || !nuevoNombre.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-fuchsia text-bg disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColRow({
  col,
  onRename,
  onColorChange,
  onDelete,
  isDeletable,
}: {
  col: Columna;
  onRename: (n: string) => void;
  onColorChange: (c: string) => void;
  onDelete: () => void;
  isDeletable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(col.nombre);

  const commit = () => {
    if (val.trim() && val !== col.nombre) onRename(val.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-indigo-400/15 bg-indigo-900/20 px-3 py-2">
      {/* Dot de color */}
      <div
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: col.color }}
      />

      {/* Nombre */}
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          className="h-7 flex-1 rounded-lg border border-cyan/40 bg-indigo-900/40 px-2 text-sm text-text-hi focus:outline-none"
        />
      ) : (
        <span
          className="flex-1 cursor-text text-sm text-text-hi"
          onDoubleClick={() => setEditing(true)}
        >
          {col.nombre}
        </span>
      )}

      {/* Selector de color */}
      <div className="flex gap-1">
        {COLORES_COLUMNA.slice(0, 4).map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className="h-4 w-4 rounded-full hover:scale-110"
            style={{
              backgroundColor: c,
              outline: col.color === c ? `2px solid ${c}` : "none",
              outlineOffset: 2,
            }}
          />
        ))}
      </div>

      {editing ? (
        <button onClick={commit} className="text-ok">
          <Check size={14} />
        </button>
      ) : (
        <button onClick={() => setEditing(true)} className="text-[0.65rem] text-text-lo hover:text-text-mid">
          Editar
        </button>
      )}

      <Tooltip
        text={
          isDeletable
            ? "Eliminar esta columna. Las tareas quedarán sin asignar."
            : "No puedes eliminar la única columna del tablero."
        }
        side="left"
      >
        <button
          onClick={onDelete}
          disabled={!isDeletable}
          className="text-indigo-400/30 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>
    </div>
  );
}

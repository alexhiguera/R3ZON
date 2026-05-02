"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Plus, Trash2, Check, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip } from "@/components/ui/Tooltip";
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const persistOrden = async (next: Columna[]) => {
    const updates = next.map((c, i) => ({ id: c.id, posicion: i }));
    const { error } = await supabase.rpc("reordenar_columnas_batch", {
      p_updates: updates,
    });
    if (error) {
      await Promise.all(
        updates.map((u) =>
          supabase.from("kanban_columnas").update({ posicion: u.posicion }).eq("id", u.id)
        )
      );
    }
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIdx = cols.findIndex((c) => c.id === active.id);
    const newIdx = cols.findIndex((c) => c.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(cols, oldIdx, newIdx).map((c, i) => ({ ...c, posicion: i }));
    setCols(next);
    onUpdate(next);
    await persistOrden(next);
  };

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
              Arrastra el icono <GripVertical size={11} className="inline -mt-0.5" /> para reordenarlas.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/20 text-indigo-300 transition-colors hover:border-indigo-400/40 hover:text-text-hi"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 p-5">
          {/* Lista sortable */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={cols.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
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
              </div>
            </SortableContext>
          </DndContext>

          {/* Nueva columna — inline compacto */}
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-900/20 p-2">
            <button
              onClick={() => {
                const idx = COLORES_COLUMNA.indexOf(nuevoColor);
                setNuevoColor(COLORES_COLUMNA[(idx + 1) % COLORES_COLUMNA.length]);
              }}
              title="Cambiar color"
              aria-label="Cambiar color"
              className="h-6 w-6 shrink-0 rounded-full border-2 border-indigo-400/30 transition-transform hover:scale-110"
              style={{ backgroundColor: nuevoColor }}
            />
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") agregarColumna(); }}
              placeholder="Nueva columna…"
              className="h-9 flex-1 rounded-lg border border-indigo-400/15 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none"
            />
            <Tooltip text="Añadir columna" side="left">
              <button
                onClick={agregarColumna}
                disabled={saving || !nuevoNombre.trim()}
                aria-label="Añadir columna"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/20 text-indigo-300 transition-colors hover:border-cyan/40 hover:bg-cyan/5 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </Tooltip>
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
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(col.nombre);

  const commit = () => {
    if (val.trim() && val !== col.nombre) onRename(val.trim());
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-indigo-400/15 bg-indigo-900/20 px-2 py-2 transition-colors hover:border-indigo-400/30"
    >
      {/* Grip handle */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
        className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center text-indigo-400/40 hover:text-text-mid active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>

      {/* Color dot */}
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
          className="flex-1 cursor-text truncate text-sm text-text-hi"
          onDoubleClick={() => setEditing(true)}
        >
          {col.nombre}
        </span>
      )}

      {/* Selector compacto de color */}
      <div className="flex gap-1">
        {COLORES_COLUMNA.slice(0, 4).map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            aria-label={`Color ${c}`}
            className="h-3.5 w-3.5 rounded-full transition-transform hover:scale-125"
            style={{
              backgroundColor: c,
              outline: col.color === c ? `2px solid ${c}` : "none",
              outlineOffset: 2,
            }}
          />
        ))}
      </div>

      {editing ? (
        <button
          onClick={commit}
          aria-label="Confirmar"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ok hover:bg-ok/10"
        >
          <Check size={14} />
        </button>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="rounded-md px-1.5 py-0.5 text-[0.65rem] text-text-lo transition-colors hover:bg-indigo-900/40 hover:text-text-mid"
        >
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
          aria-label="Eliminar"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-400/30 transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Trash2 size={13} />
        </button>
      </Tooltip>
    </div>
  );
}

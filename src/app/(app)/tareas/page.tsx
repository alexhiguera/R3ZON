"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Settings2, Loader2, Kanban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tooltip } from "@/components/ui/Tooltip";
import { TaskCard } from "@/components/kanban/TaskCard";
import { TaskModal } from "@/components/kanban/TaskModal";
import { ColumnManager } from "@/components/kanban/ColumnManager";
import { type Columna, type Tarea } from "@/lib/kanban";

// ─── Columna droppable ─────────────────────────────────────────────────────
import { useDroppable } from "@dnd-kit/core";

function DroppableColumn({
  col,
  tareas,
  onAddTask,
  onTaskClick,
}: {
  col: Columna;
  tareas: Tarea[];
  onAddTask: () => void;
  onTaskClick: (t: Tarea) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.slug, data: { type: "column" } });

  return (
    <div
      className={`flex w-72 shrink-0 flex-col gap-2 rounded-2xl border p-3 transition-colors lg:w-80
        ${isOver
          ? "border-cyan/50 bg-cyan/5"
          : "border-indigo-400/15 bg-indigo-900/20"
        }`}
    >
      {/* Header de columna */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: col.color }}
          />
          <span className="font-display text-sm font-bold text-text-hi">
            {col.nombre}
          </span>
          <span className="rounded-full border border-indigo-400/20 bg-indigo-900/40 px-1.5 py-0.5 text-[0.6rem] font-semibold text-text-lo">
            {tareas.length}
          </span>
        </div>
        <Tooltip text={`Añadir tarea en "${col.nombre}"`} side="left">
          <button
            onClick={onAddTask}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-400/20 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
          >
            <Plus size={13} />
          </button>
        </Tooltip>
      </div>

      {/* Zona de drop */}
      <div
        ref={setNodeRef}
        className="flex min-h-[80px] flex-col gap-2"
      >
        <SortableContext
          items={tareas.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tareas.map((t) => (
            <TaskCard
              key={t.id}
              tarea={t}
              onClick={() => onTaskClick(t)}
            />
          ))}
        </SortableContext>

        {tareas.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-indigo-400/15 py-6 text-xs text-text-lo">
            Arrastra aquí o usa +
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────
export default function TareasPage() {
  const supabase = createClient();

  const [columnas, setColumnas]   = useState<Columna[]>([]);
  const [tareas, setTareas]       = useState<Tarea[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [activeTarea, setActiveTarea] = useState<Tarea | null>(null);    // en arrastre
  const [modalTarea, setModalTarea]   = useState<Partial<Tarea> | null | undefined>(undefined); // undefined=cerrado
  const [columnaModal, setColumnaModal] = useState("");
  const [showColMgr, setShowColMgr]   = useState(false);

  // Referencia para detectar columna origen durante drag
  const tareasRef = useRef<Tarea[]>([]);
  tareasRef.current = tareas;

  const cargar = useCallback(async () => {
    const [{ data: cols }, { data: tk }] = await Promise.all([
      supabase.from("kanban_columnas").select("*").order("posicion"),
      supabase.from("tareas_kanban")
        .select("*")
        .eq("completada", false)
        .order("posicion"),
    ]);
    setColumnas((cols ?? []) as Columna[]);
    setTareas((tk ?? []) as Tarea[]);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Tareas agrupadas por columna
  const tareasPorColumna = useMemo(() => {
    const map: Record<string, Tarea[]> = {};
    columnas.forEach((c) => { map[c.slug] = []; });
    tareas.forEach((t) => {
      if (map[t.columna]) map[t.columna].push(t);
      else {
        // Columna eliminada: asignar a la primera
        if (columnas.length > 0) map[columnas[0].slug].push({ ...t, columna: columnas[0].slug });
      }
    });
    return map;
  }, [tareas, columnas]);

  // ── DnD sensors ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  function findContainer(id: string): string | null {
    // id puede ser slug (columna) o uuid (tarea)
    if (tareasPorColumna[id]) return id;                       // es una columna
    const t = tareasRef.current.find((t) => t.id === id);
    return t?.columna ?? null;
  }

  function onDragStart({ active }: DragStartEvent) {
    const tarea = tareasRef.current.find((t) => t.id === active.id);
    if (tarea) setActiveTarea(tarea);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;

    const srcCol = findContainer(active.id as string);
    const dstCol = findContainer(over.id as string);
    if (!srcCol || !dstCol || srcCol === dstCol) return;

    // Mover tarea entre columnas en el estado local (optimista)
    setTareas((prev) =>
      prev.map((t) =>
        t.id === active.id ? { ...t, columna: dstCol } : t
      )
    );
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTarea(null);
    if (!over) return;

    const srcCol = findContainer(active.id as string);
    const dstCol = findContainer(over.id as string);
    if (!srcCol || !dstCol) return;

    // Reordenar dentro de la misma columna
    if (srcCol === dstCol) {
      const grupo = tareasPorColumna[srcCol];
      const oldIdx = grupo.findIndex((t) => t.id === active.id);
      const newIdx = grupo.findIndex((t) => t.id === over.id);
      if (oldIdx === newIdx) return;

      const reordenadas = arrayMove(grupo, oldIdx, newIdx).map((t, i) => ({
        ...t,
        posicion: i,
      }));
      setTareas((prev) => {
        const resto = prev.filter((t) => t.columna !== srcCol);
        return [...resto, ...reordenadas];
      });
      // Persistir posiciones
      for (const t of reordenadas) {
        await supabase
          .from("tareas_kanban")
          .update({ posicion: t.posicion })
          .eq("id", t.id);
      }
      return;
    }

    // Cambio de columna — persistir
    await supabase
      .from("tareas_kanban")
      .update({ columna: dstCol, updated_at: new Date().toISOString() })
      .eq("id", active.id as string);
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const abrirNuevaTarea = (slug: string) => {
    setColumnaModal(slug);
    setModalTarea(null);  // null = nueva
  };

  const abrirEditarTarea = (t: Tarea) => {
    setColumnaModal(t.columna);
    setModalTarea(t);
  };

  const onSaveTarea = (saved: Tarea) => {
    setTareas((prev) => {
      const existe = prev.find((t) => t.id === saved.id);
      return existe
        ? prev.map((t) => (t.id === saved.id ? saved : t))
        : [saved, ...prev];
    });
  };

  const onDeleteTarea = (id: string) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Gestión"
        title="Tablero de tareas"
        description="Arrastra las tarjetas para cambiar su estado. Haz clic en una para editarla."
      />

      {/* Barra de herramientas */}
      <div className="flex items-center gap-3">
        <Tooltip
          text="Añade, renombra o elimina columnas para adaptarlas a tu flujo de trabajo."
          side="bottom"
        >
          <button
            onClick={() => setShowColMgr(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-sm font-medium text-text-mid hover:border-indigo-400/40 hover:text-text-hi"
          >
            <Settings2 size={15} /> Columnas
          </button>
        </Tooltip>
        {columnas[0] && (
          <Tooltip text="Crea una nueva tarea en la primera columna." side="bottom">
            <button
              onClick={() => abrirNuevaTarea(columnas[0].slug)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2.5 text-sm font-bold text-bg"
            >
              <Plus size={15} /> Nueva tarea
            </button>
          </Tooltip>
        )}
      </div>

      {cargando && (
        <div className="flex h-64 items-center justify-center text-text-lo">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}

      {!cargando && columnas.length === 0 && (
        <div className="card-glass flex flex-col items-center gap-3 py-16 text-center">
          <Kanban size={32} className="text-indigo-400/30" />
          <div className="font-display text-lg font-bold">Sin columnas</div>
          <p className="max-w-xs text-sm text-text-mid">
            Ejecuta el SQL de extensión en Supabase para inicializar el tablero.
          </p>
        </div>
      )}

      {/* Tablero */}
      {!cargando && columnas.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columnas.map((col) => (
              <DroppableColumn
                key={col.slug}
                col={col}
                tareas={tareasPorColumna[col.slug] ?? []}
                onAddTask={() => abrirNuevaTarea(col.slug)}
                onTaskClick={abrirEditarTarea}
              />
            ))}
          </div>

          {/* Overlay visible mientras se arrastra */}
          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activeTarea ? (
              <TaskCard
                tarea={activeTarea}
                onClick={() => {}}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal de tarea */}
      {modalTarea !== undefined && (
        <TaskModal
          tarea={modalTarea}
          columnaActual={columnaModal}
          columnas={columnas}
          onClose={() => setModalTarea(undefined)}
          onSave={onSaveTarea}
          onDelete={onDeleteTarea}
        />
      )}

      {/* Gestor de columnas */}
      {showColMgr && (
        <ColumnManager
          columnas={columnas}
          onClose={() => setShowColMgr(false)}
          onUpdate={setColumnas}
        />
      )}
    </div>
  );
}

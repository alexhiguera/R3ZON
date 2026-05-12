"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Settings2, Loader2, Kanban, GripHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/components/ui/Toast";
import { usePlan, haAlcanzadoLimite } from "@/lib/usePlan";
import { TaskCard } from "@/components/kanban/TaskCard";
import { TaskModal } from "@/components/kanban/TaskModal";
import { InlineTaskAdder } from "@/components/kanban/InlineTaskAdder";
import { ColumnManager } from "@/components/kanban/ColumnManager";
import { type Columna, type Tarea } from "@/lib/kanban";

// Prefijo para distinguir el id sortable de columna del slug usado en
// la zona droppable de tareas. Así un mismo `slug` no choca consigo mismo.
const COL_SORT_PREFIX = "col:";

// ─── Columna sortable + droppable ─────────────────────────────────────────
function SortableColumn({
  col,
  tareas,
  inlineAdding,
  onStartInlineAdd,
  onCancelInlineAdd,
  onInlineCreated,
  onTaskClick,
}: {
  col: Columna;
  tareas: Tarea[];
  inlineAdding: boolean;
  onStartInlineAdd: () => void;
  onCancelInlineAdd: () => void;
  onInlineCreated: (t: Tarea) => void;
  onTaskClick: (t: Tarea) => void;
}) {
  // Sortable horizontal — la columna entera puede moverse, pero solo el
  // header actúa como activador (grip). Así arrastrar tareas no mueve la columna.
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: COL_SORT_PREFIX + col.slug,
    data: { type: "column", slug: col.slug },
  });

  // Droppable interno para soltar tareas dentro de la columna.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: col.slug,
    data: { type: "column-body", slug: col.slug },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-72 shrink-0 flex-col gap-2 rounded-2xl border p-3 transition-colors lg:w-80
        ${isOver
          ? "border-cyan/50 bg-cyan/5 shadow-lg shadow-cyan/10"
          : "border-indigo-400/15 bg-indigo-900/20"
        }`}
    >
      {/* Header — activador del drag horizontal de la columna */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reordenar columna ${col.nombre}`}
            className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-text-lo hover:bg-indigo-900/40 hover:text-text-hi active:cursor-grabbing"
          >
            <GripHorizontal size={12} />
          </button>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: col.color }}
          />
          <span className="truncate font-display text-sm font-bold text-text-hi">
            {col.nombre}
          </span>
          <span className="rounded-full border border-indigo-400/20 bg-indigo-900/40 px-1.5 py-0.5 text-[0.6rem] font-semibold text-text-lo">
            {tareas.length}
          </span>
        </div>
        <Tooltip text={`Añadir tarea rápida en "${col.nombre}"`} side="left">
          <button
            onClick={onStartInlineAdd}
            aria-label="Añadir tarea"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-400/20 text-indigo-300 transition-colors hover:border-cyan/40 hover:bg-cyan/5 hover:text-cyan"
          >
            <Plus size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Zona de drop para tareas */}
      <div
        ref={setDropRef}
        className="flex min-h-[80px] flex-col gap-2"
      >
        <SortableContext
          items={tareas.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tareas.map((t) => (
            <TaskCard key={t.id} tarea={t} onClick={() => onTaskClick(t)} />
          ))}
        </SortableContext>

        {inlineAdding && (
          <InlineTaskAdder
            columnaSlug={col.slug}
            onCreated={onInlineCreated}
            onCancel={onCancelInlineAdd}
          />
        )}

        {tareas.length === 0 && !inlineAdding && (
          <button
            onClick={onStartInlineAdd}
            className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-indigo-400/15 py-6 text-xs text-text-lo transition-colors hover:border-cyan/30 hover:text-cyan"
          >
            Arrastra aquí o pulsa + para crear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────
export default function TareasPage() {
  const supabase = createClient();
  const toast = useToast();
  const { plan, limites, contadores } = usePlan();
  const tareaLimiteAlcanzado = haAlcanzadoLimite(plan, "tareas", contadores.tareas);

  const [columnas, setColumnas] = useState<Columna[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activeTarea, setActiveTarea] = useState<Tarea | null>(null);
  const [activeCol, setActiveCol] = useState<Columna | null>(null);
  const [modalTarea, setModalTarea] = useState<Partial<Tarea> | null | undefined>(undefined);
  const [columnaModal, setColumnaModal] = useState("");
  const [showColMgr, setShowColMgr] = useState(false);
  const [inlineCol, setInlineCol] = useState<string | null>(null);

  const tareasRef = useRef<Tarea[]>([]);
  tareasRef.current = tareas;
  const columnasRef = useRef<Columna[]>([]);
  columnasRef.current = columnas;

  const cargar = useCallback(async () => {
    const [{ data: cols, error: eCols }, { data: tk, error: eTk }] = await Promise.all([
      supabase.from("kanban_columnas").select("*").order("posicion"),
      supabase.from("tareas_kanban")
        .select("*")
        .eq("completada", false)
        .order("posicion"),
    ]);
    if (eCols || eTk) {
      toast.err("No se pudieron cargar las tareas. Comprueba tu conexión e inténtalo de nuevo.");
    }
    setColumnas((cols ?? []) as Columna[]);
    setTareas((tk ?? []) as Tarea[]);
    setCargando(false);
  }, [toast]);

  useEffect(() => { cargar(); }, [cargar]);

  const tareasPorColumna = useMemo(() => {
    const map: Record<string, Tarea[]> = {};
    columnas.forEach((c) => { map[c.slug] = []; });
    tareas.forEach((t) => {
      if (map[t.columna]) map[t.columna].push(t);
      else if (columnas.length > 0) {
        map[columnas[0].slug].push({ ...t, columna: columnas[0].slug });
      }
    });
    return map;
  }, [tareas, columnas]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  // Encuentra el slug de columna que contiene una tarjeta o equivale a un id de columna.
  function findContainer(id: string): string | null {
    if (id.startsWith(COL_SORT_PREFIX)) return id.slice(COL_SORT_PREFIX.length);
    if (tareasPorColumna[id]) return id;
    const t = tareasRef.current.find((x) => x.id === id);
    return t?.columna ?? null;
  }

  function onDragStart({ active }: DragStartEvent) {
    const type = active.data.current?.type;
    if (type === "column") {
      const slug = (active.data.current as { slug: string }).slug;
      const c = columnasRef.current.find((x) => x.slug === slug) ?? null;
      setActiveCol(c);
    } else {
      const tarea = tareasRef.current.find((t) => t.id === active.id);
      if (tarea) setActiveTarea(tarea);
    }
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;
    if (active.data.current?.type === "column") return; // las columnas no se reordenan en over

    const srcCol = findContainer(active.id as string);
    const dstCol = findContainer(over.id as string);
    if (!srcCol || !dstCol || srcCol === dstCol) return;

    setTareas((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, columna: dstCol } : t))
    );
  }

  async function persistTareasBatch(
    afectadas: { id: string; columna: string; posicion: number }[]
  ) {
    if (afectadas.length === 0) return;
    const { error } = await supabase.rpc("reordenar_tareas_batch", {
      p_updates: afectadas,
    });
    if (error) {
      // Fallback: actualizaciones paralelas si la RPC no existe aún en BD.
      console.warn("RPC batch tareas no disponible, fallback paralelo:", error.message);
      await Promise.all(
        afectadas.map((u) =>
          supabase
            .from("tareas_kanban")
            .update({ columna: u.columna, posicion: u.posicion, updated_at: new Date().toISOString() })
            .eq("id", u.id)
        )
      );
    }
  }

  async function persistColumnasBatch(updates: { id: string; posicion: number }[]) {
    if (updates.length === 0) return;
    const { error } = await supabase.rpc("reordenar_columnas_batch", {
      p_updates: updates,
    });
    if (error) {
      console.warn("RPC batch columnas no disponible, fallback paralelo:", error.message);
      await Promise.all(
        updates.map((u) =>
          supabase.from("kanban_columnas").update({ posicion: u.posicion }).eq("id", u.id)
        )
      );
    }
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    const draggedColumn = activeCol;
    setActiveTarea(null);
    setActiveCol(null);
    if (!over) return;

    // ── Reordenar columnas ─────────────────────────────────────────────────
    if (active.data.current?.type === "column") {
      if (!draggedColumn || active.id === over.id) return;
      const overSlug = findContainer(over.id as string);
      if (!overSlug || overSlug === draggedColumn.slug) return;
      const oldIdx = columnas.findIndex((c) => c.slug === draggedColumn.slug);
      const newIdx = columnas.findIndex((c) => c.slug === overSlug);
      if (oldIdx < 0 || newIdx < 0) return;

      const reordered = arrayMove(columnas, oldIdx, newIdx).map((c, i) => ({
        ...c,
        posicion: i,
      }));
      setColumnas(reordered);
      try {
        await persistColumnasBatch(
          reordered.map((c) => ({ id: c.id, posicion: c.posicion }))
        );
      } catch (err) {
        console.error("Persistir columnas:", err);
      }
      return;
    }

    // ── Mover/Reordenar tareas ─────────────────────────────────────────────
    const srcCol = findContainer(active.id as string);
    const dstCol = findContainer(over.id as string);
    if (!srcCol || !dstCol) return;

    // Reorden interno
    if (srcCol === dstCol) {
      const grupo = tareasPorColumna[srcCol];
      const oldIdx = grupo.findIndex((t) => t.id === active.id);
      const newIdx = grupo.findIndex((t) => t.id === over.id);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

      const reordenadas = arrayMove(grupo, oldIdx, newIdx).map((t, i) => ({
        ...t,
        posicion: i,
      }));
      setTareas((prev) => {
        const resto = prev.filter((t) => t.columna !== srcCol);
        return [...resto, ...reordenadas];
      });
      try {
        await persistTareasBatch(
          reordenadas.map((t) => ({ id: t.id, columna: t.columna, posicion: t.posicion }))
        );
      } catch (err) {
        console.error("Persistir orden tareas:", err);
      }
      return;
    }

    // Cambio de columna — recalcular posiciones origen y destino.
    const srcGrupo = tareasPorColumna[srcCol].filter((t) => t.id !== active.id);
    const dstGrupo = [...tareasPorColumna[dstCol]];
    const movida = tareasRef.current.find((t) => t.id === active.id);
    if (!movida) return;

    // Si el over es una tarjeta, insertar en su índice; si es la columna, al final.
    let insertIdx = dstGrupo.length;
    const overId = over.id as string;
    if (!tareasPorColumna[overId]) {
      const idx = dstGrupo.findIndex((t) => t.id === overId);
      if (idx >= 0) insertIdx = idx;
    }
    dstGrupo.splice(insertIdx, 0, { ...movida, columna: dstCol });

    const srcReordenado = srcGrupo.map((t, i) => ({ ...t, posicion: i }));
    const dstReordenado = dstGrupo.map((t, i) => ({ ...t, posicion: i, columna: dstCol }));

    setTareas((prev) => {
      const resto = prev.filter((t) => t.columna !== srcCol && t.columna !== dstCol);
      return [...resto, ...srcReordenado, ...dstReordenado];
    });

    try {
      await persistTareasBatch(
        [...srcReordenado, ...dstReordenado].map((t) => ({
          id: t.id,
          columna: t.columna,
          posicion: t.posicion,
        }))
      );
    } catch (err) {
      console.error("Persistir cambio de columna:", err);
    }
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const abrirNuevaTarea = (slug: string) => {
    setColumnaModal(slug);
    setModalTarea(null);
  };

  const empezarInline = (slug: string) => {
    setInlineCol(slug);
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
        description="Arrastra las tarjetas para cambiar su estado. Las columnas también se pueden reordenar desde el icono de su cabecera."
      />

      {/* Banner de límite plan Free */}
      {plan === "free" && limites.tareas !== null && (
        <div className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${
          tareaLimiteAlcanzado
            ? "border-danger/30 bg-danger/10 text-danger"
            : contadores.tareas >= limites.tareas - 2
            ? "border-warn/30 bg-warn/10 text-warn"
            : "border-indigo-400/20 bg-indigo-900/20 text-text-mid"
        }`}>
          <span>
            {tareaLimiteAlcanzado
              ? `Has alcanzado el límite de ${limites.tareas} tareas activas del plan Free.`
              : `Plan Free: ${contadores.tareas} / ${limites.tareas} tareas activas.`}
          </span>
          <a href="/ajustes?tab=suscripcion" className="shrink-0 rounded-lg border border-current px-3 py-1 text-xs font-semibold hover:opacity-80">
            Mejorar plan
          </a>
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="flex items-center gap-3">
        <Tooltip
          text="Añade, renombra, reordena o elimina columnas para adaptarlas a tu flujo."
          side="bottom"
        >
          <button
            onClick={() => setShowColMgr(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-sm font-medium text-text-mid transition-colors hover:border-indigo-400/40 hover:text-text-hi"
          >
            <Settings2 size={15} /> Columnas
          </button>
        </Tooltip>
        {columnas[0] && (
          <Tooltip
            text={tareaLimiteAlcanzado
              ? `Límite del plan Free: ${limites.tareas} tareas activas. Mejora tu plan.`
              : "Crea una nueva tarea en la primera columna."}
            side="bottom"
          >
            <button
              onClick={() => !tareaLimiteAlcanzado && abrirNuevaTarea(columnas[0].slug)}
              disabled={tareaLimiteAlcanzado}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2.5 text-sm font-bold text-bg shadow-glow transition-shadow hover:shadow-glass disabled:cursor-not-allowed disabled:opacity-50"
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
            Configura tu primer flujo creando las columnas que necesitas
            (por ejemplo: Pendiente · En curso · Hecho).
          </p>
          <button
            onClick={() => setShowColMgr(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2.5 text-sm font-bold text-bg shadow-glow"
          >
            <Settings2 size={15} /> Crear columnas
          </button>
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
          <SortableContext
            items={columnas.map((c) => COL_SORT_PREFIX + c.slug)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {columnas.map((col) => (
                <SortableColumn
                  key={col.id}
                  col={col}
                  tareas={tareasPorColumna[col.slug] ?? []}
                  inlineAdding={inlineCol === col.slug}
                  onStartInlineAdd={() => empezarInline(col.slug)}
                  onCancelInlineAdd={() => setInlineCol(null)}
                  onInlineCreated={(t) => onSaveTarea(t)}
                  onTaskClick={abrirEditarTarea}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
            {activeTarea ? (
              <TaskCard tarea={activeTarea} onClick={() => {}} isDragOverlay />
            ) : activeCol ? (
              <div className="flex w-72 flex-col gap-2 rounded-2xl border border-cyan/40 bg-indigo-900/40 p-3 shadow-2xl shadow-cyan/20 lg:w-80">
                <div className="flex items-center gap-2 px-1">
                  <GripHorizontal size={12} className="text-cyan" />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: activeCol.color }}
                  />
                  <span className="font-display text-sm font-bold text-text-hi">
                    {activeCol.nombre}
                  </span>
                </div>
                <div className="h-16 rounded-xl border border-dashed border-indigo-400/20" />
              </div>
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

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, GripVertical } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { PRIORIDAD_META, type Tarea } from "@/lib/kanban";

type Props = {
  tarea: Tarea;
  onClick: () => void;
  isDragOverlay?: boolean;
};

export function TaskCard({ tarea, onClick, isDragOverlay = false }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tarea.id, data: { type: "task", tarea } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const vencida =
    tarea.fecha_limite && !tarea.completada
      ? new Date(tarea.fecha_limite) < new Date()
      : false;

  const meta = PRIORIDAD_META[tarea.prioridad];

  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-24 w-full rounded-2xl border-2 border-dashed border-indigo-400/25 bg-indigo-900/20"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col gap-2.5 rounded-2xl border p-3.5 transition-all
        ${isDragOverlay
          ? "rotate-1 scale-105 shadow-2xl shadow-indigo-900/50"
          : "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/30 cursor-pointer"
        }
        ${tarea.completada
          ? "border-indigo-400/10 bg-indigo-900/20 opacity-60"
          : vencida
          ? "border-danger/30 bg-danger/5"
          : "border-indigo-400/15 bg-indigo-900/30"
        }`}
      onClick={!isDragOverlay ? onClick : undefined}
    >
      {/* Handle de arrastre */}
      <Tooltip text="Arrastra para mover esta tarea a otra columna." side="left">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2.5 top-2.5 cursor-grab touch-none text-indigo-400/30 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Mover tarea"
        >
          <GripVertical size={14} />
        </button>
      </Tooltip>

      {/* Título */}
      <div
        className={`pr-5 text-sm font-medium leading-snug ${
          tarea.completada ? "line-through text-text-lo" : "text-text-hi"
        }`}
      >
        {tarea.titulo}
      </div>

      {/* Descripción preview */}
      {tarea.descripcion && (
        <p className="line-clamp-2 text-[0.7rem] leading-relaxed text-text-lo">
          {tarea.descripcion}
        </p>
      )}

      {/* Footer: prioridad + fecha */}
      <div className="flex items-center justify-between gap-2">
        <Tooltip text={`Prioridad ${meta.label.toLowerCase()}.`} side="bottom">
          <span className={`flex items-center gap-1 text-[0.65rem] font-semibold ${meta.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </Tooltip>

        {tarea.fecha_limite && (
          <Tooltip
            text={vencida ? "¡Fecha límite superada!" : "Fecha límite de esta tarea."}
            side="bottom"
          >
            <span
              className={`flex items-center gap-1 text-[0.65rem] font-medium ${
                vencida ? "text-danger" : "text-text-lo"
              }`}
            >
              <Calendar size={10} />
              {new Date(tarea.fecha_limite).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { PRIORIDAD_META, type Tarea } from "@/lib/kanban";

type Props = {
  tarea: Tarea;
  onClick: () => void;
  isDragOverlay?: boolean;
};

export function TaskCard({ tarea, onClick, isDragOverlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarea.id,
    data: { type: "task", tarea },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const vencida =
    tarea.fecha_limite && !tarea.completada ? new Date(tarea.fecha_limite) < new Date() : false;

  const meta = PRIORIDAD_META[tarea.prioridad];

  // Drop indicator: cuando la tarjeta se está arrastrando, dejamos un hueco
  // resaltado con borde cyan + glow suave que indica visualmente dónde caerá.
  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-24 w-full animate-pulse rounded-2xl border-2 border-dashed border-cyan/50 bg-cyan/5 shadow-inner shadow-cyan/10"
      />
    );
  }

  // Click vs drag: PointerSensor exige 8px de movimiento para iniciar drag,
  // así que el onClick sólo dispara si fue un tap real (no un arrastre).
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isDragOverlay ? attributes : {})}
      {...(!isDragOverlay ? listeners : {})}
      onClick={!isDragOverlay ? onClick : undefined}
      className={`group relative flex select-none flex-col gap-2.5 rounded-2xl border p-3.5 transition-all touch-none
        ${
          isDragOverlay
            ? "rotate-1 scale-105 shadow-2xl shadow-indigo-900/50 cursor-grabbing"
            : "cursor-grab hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-900/30 active:cursor-grabbing"
        }
        ${
          tarea.completada
            ? "border-indigo-400/10 bg-indigo-900/20 opacity-60"
            : vencida
              ? "border-danger/30 bg-danger/5"
              : "border-indigo-400/15 bg-indigo-900/30"
        }`}
    >
      {/* Título */}
      <div
        className={`text-sm font-medium leading-snug ${
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

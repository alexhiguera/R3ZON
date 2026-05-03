"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Loader2, Trash2, Calendar, Flag, User, CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";
import { Help, Tooltip } from "@/components/ui/Tooltip";
import { PRIORIDAD_META, type Columna, type Tarea } from "@/lib/kanban";

type Props = {
  tarea: Partial<Tarea> | null;   // null = modo creación
  columnaActual: string;
  columnas: Columna[];
  onClose: () => void;
  onSave: (t: Tarea) => void;
  onDelete: (id: string) => void;
};

export function TaskModal({ tarea, columnaActual, columnas, onClose, onSave, onDelete }: Props) {
  const supabase = createClient();
  const negocioId = useNegocioId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const esNueva = !tarea?.id;

  const [titulo, setTitulo] = useState(tarea?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? "");
  const [columna, setColumna] = useState(tarea?.columna ?? columnaActual);
  const [prioridad, setPrioridad] = useState<Tarea["prioridad"]>(tarea?.prioridad ?? "normal");
  const [fechaLimite, setFechaLimite] = useState(tarea?.fecha_limite?.slice(0, 10) ?? "");
  const [completada, setCompletada] = useState(tarea?.completada ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const guardar = async () => {
    if (!titulo.trim()) return setError("El título no puede estar vacío.");
    if (esNueva && !negocioId) {
      return setError("Cargando perfil del negocio… inténtalo en un segundo.");
    }
    setLoading(true);
    setError(null);

    const payload = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      columna,
      prioridad,
      fecha_limite: fechaLimite || null,
      completada,
    };

    if (esNueva) {
      const { data, error } = await supabase
        .from("tareas_kanban")
        // negocio_id explícito por si el trigger `tg_fill_negocio_id` no está
        // aplicado en la BD — la RLS rechazaría el insert sin él.
        .insert({ ...payload, posicion: 9999, negocio_id: negocioId })
        .select()
        .single();
      setLoading(false);
      if (error) return setError(error.message);
      onSave(data as Tarea);
    } else {
      const { data, error } = await supabase
        .from("tareas_kanban")
        .update(payload)
        .eq("id", tarea!.id)
        .select()
        .single();
      setLoading(false);
      if (error) return setError(error.message);
      onSave(data as Tarea);
    }
    onClose();
  };

  const eliminar = async () => {
    if (!tarea?.id) return;
    if (!confirm("¿Eliminar esta tarea?")) return;
    await supabase.from("tareas_kanban").delete().eq("id", tarea.id);
    onDelete(tarea.id);
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="card-glass flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden">
        <div className="rainbow-bar shrink-0" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-5">
          <h2 id="task-modal-title" className="font-display text-lg font-bold text-text-hi">
            {esNueva ? "Nueva tarea" : "Editar tarea"}
          </h2>
          <div className="flex items-center gap-2">
            {!esNueva && (
              <Tooltip text="Eliminar esta tarea permanentemente." side="bottom">
                <button
                  onClick={eliminar}
                  aria-label="Eliminar tarea"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/20 text-indigo-300 hover:border-danger/40 hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </Tooltip>
            )}
            <button
              onClick={onClose}
              aria-label="Cerrar editor de tareas"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/20 text-indigo-300 hover:text-text-hi"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {/* Título */}
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-mid">
              Título <Help text="Describe brevemente qué hay que hacer." />
            </span>
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Enviar presupuesto a Juan"
              className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
            />
          </label>

          {/* Descripción */}
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-mid">
              Descripción
              <Help text="Detalles adicionales, pasos o información extra. Opcional." />
            </span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Notas o pasos a seguir…"
              className="resize-none rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-3 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
            />
          </label>

          {/* Columna + Prioridad */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-mid">
                <User size={11} /> Columna
                <Help text="En qué fase del trabajo está esta tarea." />
              </span>
              <select
                value={columna}
                onChange={(e) => setColumna(e.target.value)}
                className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none"
              >
                {columnas.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-mid">
                <Flag size={11} /> Prioridad
                <Help text="¿Con qué urgencia hay que hacerla? 'Urgente' aparece destacada en rojo." />
              </span>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as Tarea["prioridad"])}
                className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none"
              >
                {Object.entries(PRIORIDAD_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Fecha límite */}
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-mid">
              <Calendar size={11} /> Fecha límite
              <Help text="Opcional. Si se supera, la tarjeta aparecerá resaltada en rojo." />
            </span>
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="h-11 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 text-sm text-text-hi focus:border-cyan/50 focus:outline-none"
            />
          </label>

          {/* Completada */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3">
            <input
              type="checkbox"
              checked={completada}
              onChange={(e) => setCompletada(e.target.checked)}
              className="h-5 w-5 accent-cyan"
            />
            <div>
              <div className="text-sm font-medium text-text-hi">Marcar como completada</div>
              <div className="text-xs text-text-lo">
                La tarea quedará archivada pero no se borrará.
              </div>
            </div>
            <CheckCircle
              size={18}
              className={completada ? "ml-auto text-ok" : "ml-auto text-indigo-400/30"}
            />
          </label>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          {/* Botón guardar */}
          <button
            onClick={guardar}
            disabled={loading || (esNueva && !negocioId)}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia text-sm font-bold text-bg disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
            {esNueva ? "Crear tarea" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

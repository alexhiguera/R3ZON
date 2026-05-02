"use client";

/**
 * EventModal — diálogo de creación/edición de cita.
 *
 * · Combobox de clientes con búsqueda en tiempo real (consulta a Supabase
 *   con debounce 250ms; query no bloqueante).
 * · Campos: título, cliente, inicio, fin, ubicación, notas, color.
 * · Validaciones cliente:
 *     – título requerido
 *     – inicio en el futuro (en creación)
 *     – fin > inicio
 * · Guardado atómico: creación llama a `createEvent` (Google + Supabase);
 *   edición llama a `updateEvent` (Google PATCH primero; si falla, no toca DB).
 * · Insignia explicativa: "Esta cita se verá también en tu móvil…"
 *
 * Sigue la pauta visual del proyecto: overlay glass + panel `card-glass`,
 * cabecera con `rainbow-bar`. No usa Shadcn/UI (el proyecto no la tiene
 * instalada y mantiene su propio sistema de modales — Kanban TaskModal).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Loader2, Trash2, MapPin, FileText, User2,
  Smartphone, Search, Calendar as CalendarIcon, Palette,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Help } from "@/components/ui/Tooltip";
import {
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/lib/agenda";

// ---------------------------------------------------------------------------

export type EventModalInitial = {
  id?: string;                    // si viene → modo edición
  title?: string;
  description?: string | null;
  start: Date;
  end:   Date;
  color?: string | null;
  ubicacion?: string | null;
  cliente_id?: string | null;
  google_event_id?: string | null;
};

type Cliente = {
  id: string;
  nombre: string;
  cif: string | null;
  email: string | null;
};

const COLORES: { id: string; label: string; bg: string }[] = [
  { id: "indigo",  label: "Indigo",   bg: "bg-indigo-500" },
  { id: "cyan",    label: "Cian",     bg: "bg-cyan-400" },
  { id: "fuchsia", label: "Fucsia",   bg: "bg-fuchsia-400" },
  { id: "green",   label: "Verde",    bg: "bg-emerald-400" },
  { id: "orange",  label: "Naranja",  bg: "bg-orange-400" },
  { id: "red",     label: "Rojo",     bg: "bg-red-400" },
];

// Devuelve un ISO local (sin Z) apto para `<input type="datetime-local">`.
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------

export function EventModal({
  initial,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: EventModalInitial;
  onClose: () => void;
  onSaved:  () => void;
  onDeleted?: () => void;
}) {
  const isEdit = !!initial.id;

  // ---- estado del formulario ----
  const [title,       setTitle]       = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [start,       setStart]       = useState(toLocalInput(initial.start));
  const [end,         setEnd]         = useState(toLocalInput(initial.end));
  const [ubicacion,   setUbicacion]   = useState(initial.ubicacion ?? "");
  const [color,       setColor]       = useState<string>(initial.color ?? "indigo");
  const [clienteId,   setClienteId]   = useState<string | null>(initial.cliente_id ?? null);

  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ---- combobox clientes ----
  const supabase = createClient();
  const [search,    setSearch]    = useState("");
  const [results,   setResults]   = useState<Cliente[]>([]);
  const [open,      setOpen]      = useState(false);
  const [selected,  setSelected]  = useState<Cliente | null>(null);
  const searchAbort = useRef<AbortController | null>(null);

  // Si venimos en modo edición con cliente_id, cargamos su nombre para mostrarlo.
  useEffect(() => {
    if (!clienteId) return;
    (async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id,nombre,cif,email")
        .eq("id", clienteId)
        .single();
      if (data) setSelected(data as Cliente);
    })();
    // sólo en mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Búsqueda con debounce.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      searchAbort.current?.abort();
      const ctrl = new AbortController();
      searchAbort.current = ctrl;

      let q = supabase
        .from("clientes")
        .select("id,nombre,cif,email")
        .order("nombre", { ascending: true })
        .limit(8);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`nombre.ilike.${term},cif.ilike.${term},email.ilike.${term}`);
      }
      const { data } = await q.abortSignal(ctrl.signal);
      if (!ctrl.signal.aborted) setResults((data ?? []) as Cliente[]);
    }, 250);
    return () => clearTimeout(t);
  }, [search, open, supabase]);

  // Cerrar con Escape.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // ---- validación ----
  const validation = useMemo(() => {
    if (!title.trim())   return "Pon un título a la cita.";
    if (!start || !end)  return "Indica fecha y hora de inicio y fin.";
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "Fechas inválidas.";
    if (e <= s) return "La hora de fin debe ser posterior a la de inicio.";
    return null;
  }, [title, start, end, isEdit]);

  // ---- guardar ----
  const submit = async () => {
    if (validation) { setError(validation); return; }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title:       title.trim(),
        description: description.trim() || null,
        start:       new Date(start).toISOString(),
        end:         new Date(end).toISOString(),
        color,
        ubicacion:   ubicacion.trim() || null,
        cliente_id:  clienteId,
      };
      if (isEdit && initial.id) {
        await updateEvent({ id: initial.id, ...payload });
      } else {
        await createEvent(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!initial.id) return;
    if (!confirm("¿Eliminar esta cita? Se borrará también de Google Calendar.")) return;
    setDeleting(true);
    try {
      await deleteEvent(initial.id);
      onDeleted?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo borrar.");
    } finally {
      setDeleting(false);
    }
  };

  // -----------------------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
    >
      <div className="card-glass relative w-full max-w-2xl overflow-hidden">
        <div className="rainbow-bar" />

        {/* Cabecera */}
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <div className="section-label mb-1">{isEdit ? "Editar cita" : "Nueva cita"}</div>
            <h2 id="event-modal-title" className="font-display text-xl font-bold text-text-hi">
              {isEdit ? title || "Cita" : "Crear una cita"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-text-mid hover:bg-indigo-500/15 hover:text-text-hi"
          >
            <X size={18} />
          </button>
        </div>

        {/* Insignia: sync móvil */}
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-2xl border border-cyan/30 bg-cyan/5 px-3 py-2 text-xs text-cyan">
          <Smartphone size={14} className="mt-0.5 shrink-0" />
          <span className="leading-relaxed">
            Esta cita se verá también en tu móvil gracias a la sincronización con Google.
          </span>
        </div>

        {/* Cuerpo */}
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          {/* Título */}
          <div className="sm:col-span-2">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-text-mid">
              Título de la cita
              <Help text="Lo que verás en el calendario. Ej: 'Corte Pedro' o 'Reunión presupuesto'." />
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Consulta inicial con Pedro"
              className="w-full rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-sm text-text-hi placeholder:text-text-ghost focus:border-cyan/50 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Combobox cliente */}
          <div className="sm:col-span-2">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-text-mid">
              <User2 size={13} /> Cliente
              <Help text="Vincula esta cita a uno de tus clientes para verla luego en su ficha." />
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-left text-sm text-text-hi hover:border-indigo-400/40"
              >
                <span className="flex items-center gap-2">
                  <Search size={14} className="text-text-mid" />
                  {selected
                    ? selected.nombre
                    : <span className="text-text-ghost">Sin cliente vinculado</span>}
                </span>
                {selected && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setSelected(null); setClienteId(null); }}
                    className="text-xs text-text-mid hover:text-danger"
                  >
                    quitar
                  </span>
                )}
              </button>

              {open && (
                <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-indigo-400/25 bg-[rgba(20,18,60,0.98)] shadow-2xl backdrop-blur-md">
                  <div className="border-b border-indigo-400/15 p-2">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nombre, CIF o email…"
                      className="w-full rounded-lg bg-indigo-900/40 px-3 py-2 text-sm text-text-hi placeholder:text-text-ghost focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {results.length === 0 && (
                      <li className="px-3 py-2 text-xs text-text-ghost">Sin resultados</li>
                    )}
                    {results.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(c);
                            setClienteId(c.id);
                            setOpen(false);
                            setSearch("");
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-indigo-500/15"
                        >
                          <span className="text-text-hi">{c.nombre}</span>
                          <span className="text-xs text-text-mid">
                            {[c.cif, c.email].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Inicio */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-text-mid">
              <CalendarIcon size={13} /> Empieza
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-sm text-text-hi focus:border-cyan/50 focus:outline-none"
            />
          </div>

          {/* Fin */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-text-mid">
              <CalendarIcon size={13} /> Termina
            </label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-sm text-text-hi focus:border-cyan/50 focus:outline-none"
            />
          </div>

          {/* Ubicación */}
          <div className="sm:col-span-2">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-text-mid">
              <MapPin size={13} /> Ubicación
              <Help text="Opcional. Aparecerá en Google Maps si la abres desde el calendario del móvil." />
            </label>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej: C/ Mayor 12, Madrid · o videollamada"
              className="w-full rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-sm text-text-hi placeholder:text-text-ghost focus:border-cyan/50 focus:outline-none"
            />
          </div>

          {/* Notas */}
          <div className="sm:col-span-2">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-text-mid">
              <FileText size={13} /> Notas
              <Help text="Detalles, recordatorios o cualquier nota interna sobre la cita." />
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Lo que necesites recordar antes de la cita…"
              className="w-full resize-none rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-3 py-2.5 text-sm text-text-hi placeholder:text-text-ghost focus:border-cyan/50 focus:outline-none"
            />
          </div>

          {/* Color picker */}
          <div className="sm:col-span-2">
            <label className="mb-2 flex items-center gap-1 text-xs font-semibold text-text-mid">
              <Palette size={13} /> Color de la cita
              <Help text="Te servirá para distinguir tipos de cita de un vistazo en el calendario." />
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  aria-label={c.label}
                  aria-pressed={color === c.id}
                  className={`flex h-9 items-center gap-2 rounded-full border px-3 text-xs transition ${
                    color === c.id
                      ? "border-text-hi bg-white/10 text-text-hi"
                      : "border-indigo-400/25 bg-indigo-900/20 text-text-mid hover:border-indigo-400/50"
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded-full ${c.bg}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Footer acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-400/15 bg-indigo-900/20 px-6 py-4">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger hover:bg-danger/20 disabled:opacity-60"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Eliminar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-text-mid hover:text-text-hi"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={loading || !!validation}
              title={validation ?? ""}
              className="btn-big bg-gradient-to-r from-cyan to-fuchsia px-5 text-sm font-semibold text-bg shadow-glow hover:brightness-110 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isEdit ? "Guardar cambios" : "Crear cita"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

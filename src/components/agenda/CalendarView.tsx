"use client";

/**
 * CalendarView — calendario principal del módulo Agenda.
 *
 * · FullCalendar con vistas Mes / Semana / Día.
 * · Drag & drop + resize → updateEventTime() actualiza Supabase y Google.
 * · Botón "Sincronizar" → syncGoogleCalendar() (Server Action).
 * · Indicador "Sincronizando..." con spinner discreto en la barra superior.
 *
 * El componente es CLIENTE (interactividad de FullCalendar) pero TODAS las
 * mutaciones llaman a Server Actions del módulo `@/lib/agenda`.
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin     from "@fullcalendar/daygrid";
import timeGridPlugin    from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventInput, LocaleInput } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { Loader2, RefreshCw, Plus, CheckCircle2, AlertCircle } from "lucide-react";

import {
  listEvents,
  syncGoogleCalendar,
  updateEventTime,
  getEvent,
  type AgendaEventoRow,
} from "@/lib/agenda";
import { getGoogleConnectionStatus } from "@/app/actions/google";
import { formatGoogleError } from "@/lib/google-errors";
import { EventModal, type EventModalInitial } from "./EventModal";

import "./calendar.css";

// Locale español inline — evitamos el subpath import (`@fullcalendar/core/locales/es`)
// que falla en algunos bundlers según la versión del package.
// `week` ya no es parte de LocaleInput en versiones recientes de FullCalendar
// (se configura vía `firstDay` en el componente). Casteamos para evitar el
// error de tipo y mantener compatibilidad si vuelve a aceptarse en el futuro.
const esLocale = {
  code: "es",
  week: { dow: 1, doy: 4 },
  buttonText: {
    prev:  "Anterior",
    next:  "Siguiente",
    today: "Hoy",
    month: "Mes",
    week:  "Semana",
    day:   "Día",
    list:  "Agenda",
  },
  weekText: "Sm",
  allDayText: "Todo el día",
  moreLinkText: (n: number) => `+ ${n} más`,
  noEventsText: "No hay eventos",
};

type Toast = { kind: "ok" | "error" | "info"; text: string } | null;

function toFcEvent(r: AgendaEventoRow): EventInput {
  return {
    id:    r.id,
    title: r.title,
    start: r.start_time,
    end:   r.end_time,
    extendedProps: {
      description: r.description,
      googleEventId: r.google_event_id,
      cliente_id: r.cliente_id,
    },
    // FullCalendar respeta data-* en el render via classNames + eventDidMount
    classNames: r.color ? [`r3zon-color-${r.color}`] : [],
  };
}

export default function CalendarView() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [isSyncing,   setIsSyncing]   = useState(false);   // sync con Google
  const [isLoading,   setIsLoading]   = useState(false);   // refresh local
  const [toast, setToast] = useState<Toast>(null);
  const [modal, setModal] = useState<EventModalInitial | null>(null);
  const [, startTx] = useTransition();

  // -----------------------------------------------------------------------
  // Carga del rango visible (se invoca al cambiar mes/semana).
  // -----------------------------------------------------------------------
  const reloadRange = useCallback(async (start: Date, end: Date) => {
    setIsLoading(true);
    try {
      const rows = await listEvents(start.toISOString(), end.toISOString());
      setEvents(rows.map(toFcEvent));
    } catch (err) {
      console.error(err);
      setToast({ kind: "error", text: "No se pudieron cargar los eventos." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Sync con Google (manual, vía botón).
  // Si el usuario nunca ha conectado, redirigimos al OAuth de Calendar y al
  // volver auto-disparamos el sync (ver efecto que detecta ?google=connected).
  // -----------------------------------------------------------------------
  const runSync = useCallback(async () => {
    setIsSyncing(true);
    setToast({ kind: "info", text: "Sincronizando con Google Calendar…" });
    try {
      const result = await syncGoogleCalendar();
      setToast({
        kind: "ok",
        text: `Listo · ${result.inserted} nuevos · ${result.updated} actualizados`,
      });
      const api = calendarRef.current?.getApi();
      if (api) {
        await reloadRange(api.view.activeStart, api.view.activeEnd);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Error al sincronizar";
      // Server Actions serializan errores como mensaje plano; detectamos
      // 429/rate_limit por contenido para mostrar un toast más claro.
      const isRateLimit =
        (err as { code?: string } | null)?.code === "rate_limit" ||
        /\b429\b|rate limit/i.test(raw);
      const msg = isRateLimit
        ? "Google Calendar ha limitado las peticiones. Espera un minuto y vuelve a sincronizar."
        : raw;
      setToast({ kind: "error", text: msg });
    } finally {
      setIsSyncing(false);
    }
  }, [reloadRange]);

  const handleSync = useCallback(() => {
    startTx(async () => {
      const status = await getGoogleConnectionStatus();
      if (!status.serverConfigured) {
        setToast({
          kind: "error",
          text:
            `Servidor sin configurar: faltan ${status.missingEnv.join(", ")}. ` +
            `Define las variables en .env.local y reinicia.`,
        });
        return;
      }
      if (!status.connected) {
        // Primera vez: redirige al OAuth scoped a Calendar. Al volver,
        // ?google=connected dispara el sync automáticamente.
        window.location.href = "/api/integrations/google/connect?next=/agenda";
        return;
      }
      await runSync();
    });
  }, [runSync]);

  // Detectar retorno desde callback de OAuth (?google=connected) y auto-sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("google") === "connected") {
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
      void runSync();
    }
    const errorCode = url.searchParams.get("google_error");
    if (errorCode) {
      url.searchParams.delete("google_error");
      window.history.replaceState({}, "", url.toString());
      setToast({ kind: "error", text: formatGoogleError(errorCode) });
    }
  }, [runSync]);

  // Auto-ocultar toasts a los 4s.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  // -----------------------------------------------------------------------
  // Drag & drop + resize → actualización SILENCIOSA.
  // -----------------------------------------------------------------------
  const persistTime = useCallback(async (
    info: EventDropArg | EventResizeDoneArg,
  ) => {
    const id = info.event.id;
    const start = info.event.start;
    const end   = info.event.end ?? info.event.start;
    if (!id || !start || !end) return;

    setIsSyncing(true);
    try {
      await updateEventTime({
        id,
        start: start.toISOString(),
        end:   end.toISOString(),
      });
      setToast({ kind: "ok", text: "Cita actualizada" });
    } catch (err: unknown) {
      info.revert();
      const msg = err instanceof Error ? err.message : "No se pudo actualizar";
      setToast({ kind: "error", text: msg });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="card-glass overflow-hidden">
      <div className="rainbow-bar" />

      {/* Barra superior: estado de sync + acciones rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-400/15 px-5 py-4">
        <div className="flex items-center gap-2 text-sm">
          {isSyncing ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-700/40 px-3 py-1 text-indigo-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sincronizando con Google…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-900/40 px-3 py-1 text-text-mid">
              <CheckCircle2 className="h-4 w-4 text-ok" />
              Al día
            </span>
          )}
          {isLoading && (
            <span className="text-xs text-text-mid/70">cargando…</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="btn-big bg-indigo-700/40 px-4 text-text-hi hover:bg-indigo-600/55 disabled:opacity-60"
            aria-label="Sincronizar con Google Calendar"
            title="Trae los eventos de Google Calendar"
          >
            <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
            Sincronizar
          </button>

          <button
            type="button"
            onClick={() => {
              const now  = new Date();
              now.setMinutes(0, 0, 0);
              now.setHours(now.getHours() + 1);
              const next = new Date(now.getTime() + 60 * 60 * 1000);
              setModal({ start: now, end: next });
            }}
            className="btn-big bg-gradient-to-r from-cyan to-fuchsia px-4 font-semibold text-bg shadow-glow hover:brightness-110"
            aria-label="Crear nueva cita"
          >
            <Plus className="h-5 w-5" />
            Nueva cita
          </button>
        </div>
      </div>

      {/* Toast inline (no intrusivo) */}
      {toast && (
        <div
          className={`mx-5 mt-4 flex items-center gap-2 rounded-2xl px-4 py-2 text-sm ${
            toast.kind === "error"
              ? "bg-red-500/15 text-red-200"
              : toast.kind === "ok"
              ? "bg-green-500/15 text-green-200"
              : "bg-indigo-500/15 text-indigo-200"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.kind === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : toast.kind === "ok" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {toast.text}
        </div>
      )}

      {/* Calendario */}
      <div className="r3zon-calendar p-4 sm:p-6">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale as LocaleInput}
          firstDay={1}
          height="auto"
          headerToolbar={{
            left:   "prev,next today",
            center: "title",
            right:  "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{
            today: "Hoy",
            month: "Mes",
            week:  "Semana",
            day:   "Día",
          }}
          allDaySlot={true}
          allDayText="Todo el día"
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          nowIndicator
          weekNumbers={false}
          editable
          eventResizableFromStart
          selectable
          selectMirror
          dayMaxEvents={3}
          events={events}
          datesSet={(arg) => {
            void reloadRange(arg.start, arg.end);
          }}
          select={(arg) => {
            setModal({ start: arg.start, end: arg.end });
            calendarRef.current?.getApi().unselect();
          }}
          eventClick={(arg) => {
            const id = arg.event.id;
            if (!id) return;
            void getEvent(id).then((row) => {
              if (!row) return;
              setModal({
                id: row.id,
                title: row.title,
                description: row.description,
                start: new Date(row.start_time),
                end:   new Date(row.end_time),
                color: row.color,
                ubicacion: row.ubicacion,
                cliente_id: row.cliente_id,
                google_event_id: row.google_event_id,
              });
            });
          }}
          eventDrop={(arg)   => void persistTime(arg)}
          eventResize={(arg) => void persistTime(arg)}
          eventTimeFormat={{
            hour:   "2-digit",
            minute: "2-digit",
            meridiem: false,
            hour12: false,
          }}
        />
      </div>

      {modal && (
        <EventModal
          initial={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            const api = calendarRef.current?.getApi();
            if (api) void reloadRange(api.view.activeStart, api.view.activeEnd);
            setToast({ kind: "ok", text: "Cita guardada" });
          }}
          onDeleted={() => {
            const api = calendarRef.current?.getApi();
            if (api) void reloadRange(api.view.activeStart, api.view.activeEnd);
            setToast({ kind: "ok", text: "Cita eliminada" });
          }}
        />
      )}
    </div>
  );
}

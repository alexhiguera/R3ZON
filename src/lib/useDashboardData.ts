"use client";

import { useEffect, useState } from "react";
import type { DashboardTask } from "@/components/dashboard/PendingTasks";
import type { DashboardActivityItem } from "@/components/dashboard/RecentActivity";
import type { DashboardCliente } from "@/components/dashboard/RecentClients";
import { type AgendaEventoRow, listEvents } from "@/lib/agenda";
import type { MovimientoFila } from "@/lib/finanzas";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";

export type DashboardKpis = {
  clientesTotal: number;
  clientesNuevosMes: number;
  citasHoy: number;
  proximaCita: AgendaEventoRow | null;
  ingresosMes: number;
  ingresosMesAnterior: number;
  tareasPendientes: number;
  tareasVencidas: number;
};

export type DashboardData = {
  loading: boolean;
  error: string | null;
  kpis: DashboardKpis;
  finanzasAnio: MovimientoFila[];
  citas: AgendaEventoRow[];
  tareas: DashboardTask[];
  clientes: DashboardCliente[];
  actividad: DashboardActivityItem[];
};

const EMPTY_KPIS: DashboardKpis = {
  clientesTotal: 0,
  clientesNuevosMes: 0,
  citasHoy: 0,
  proximaCita: null,
  ingresosMes: 0,
  ingresosMesAnterior: 0,
  tareasPendientes: 0,
  tareasVencidas: 0,
};

export function useDashboardData(): DashboardData {
  const negocioId = useNegocioId();
  const [state, setState] = useState<Omit<DashboardData, "loading"> & { loading: boolean }>({
    loading: true,
    error: null,
    kpis: EMPTY_KPIS,
    finanzasAnio: [],
    citas: [],
    tareas: [],
    clientes: [],
    actividad: [],
  });

  useEffect(() => {
    if (!negocioId) return;
    let alive = true;

    (async () => {
      const supabase = createClient();
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const inicioMesAnt = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const inicioAnio = new Date(now.getFullYear(), 0, 1).toISOString();
      const finAnio = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();
      const inicioHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const finHoy = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      ).toISOString();
      const enSieteDias = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const hoyISO = now.toISOString();

      try {
        const [
          clientesTotalRes,
          clientesMesRes,
          clientesRecientesRes,
          citasHoyRes,
          proximaCitaRes,
          citasProximasRes,
          finanzasRes,
          ingresosMesRes,
          ingresosMesAntRes,
          tareasPendRes,
          tareasVencidasRes,
          tareasListaRes,
          actividadRes,
        ] = await Promise.all([
          supabase.from("clientes").select("id", { count: "exact", head: true }),
          supabase
            .from("clientes")
            .select("id", { count: "exact", head: true })
            .gte("created_at", inicioMes),
          supabase
            .from("clientes")
            .select("id, nombre, sector, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("agenda_eventos")
            .select("id", { count: "exact", head: true })
            .gte("start_time", inicioHoy)
            .lte("start_time", finHoy)
            .neq("estado", "cancelada"),
          supabase
            .from("agenda_eventos")
            .select(
              "id,title,description,start_time,end_time,color,estado,google_event_id,google_calendar_id,cliente_id,ubicacion",
            )
            .gte("start_time", hoyISO)
            .neq("estado", "cancelada")
            .order("start_time", { ascending: true })
            .limit(1),
          listEvents(hoyISO, enSieteDias).catch(() => [] as AgendaEventoRow[]),
          supabase
            .from("finanzas")
            .select("tipo, fecha, base_imponible, iva_importe, irpf_importe, total")
            .gte("fecha", inicioAnio)
            .lte("fecha", finAnio),
          supabase.from("finanzas").select("total").eq("tipo", "ingreso").gte("fecha", inicioMes),
          supabase
            .from("finanzas")
            .select("total")
            .eq("tipo", "ingreso")
            .gte("fecha", inicioMesAnt)
            .lt("fecha", inicioMes),
          supabase
            .from("tareas_kanban")
            .select("id", { count: "exact", head: true })
            .eq("completada", false),
          supabase
            .from("tareas_kanban")
            .select("id", { count: "exact", head: true })
            .eq("completada", false)
            .lt("fecha_limite", hoyISO)
            .not("fecha_limite", "is", null),
          supabase
            .from("tareas_kanban")
            .select("id, titulo, prioridad, fecha_limite, completada")
            .eq("completada", false)
            .order("fecha_limite", { ascending: true, nullsFirst: false })
            .limit(5),
          supabase
            .from("comunicaciones")
            .select("id, tipo, asunto, contenido, created_at, cliente_id, clientes(nombre)")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (!alive) return;

        const sumIngresos = (rows: { total: number | null }[] | null) =>
          (rows ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0);

        const proximaCita = (proximaCitaRes.data?.[0] as AgendaEventoRow | undefined) ?? null;

        const actividad: DashboardActivityItem[] = (
          (actividadRes.data ?? []) as Array<{
            id: string;
            tipo: string;
            asunto: string | null;
            contenido: string | null;
            created_at: string;
            clientes?: { nombre: string | null } | { nombre: string | null }[] | null;
          }>
        ).map((row) => {
          const cli = Array.isArray(row.clientes) ? row.clientes[0] : row.clientes;
          return {
            id: row.id,
            tipo: row.tipo,
            asunto: row.asunto,
            contenido: row.contenido,
            created_at: row.created_at,
            cliente_nombre: cli?.nombre ?? null,
          };
        });

        setState({
          loading: false,
          error: null,
          kpis: {
            clientesTotal: clientesTotalRes.count ?? 0,
            clientesNuevosMes: clientesMesRes.count ?? 0,
            citasHoy: citasHoyRes.count ?? 0,
            proximaCita,
            ingresosMes: sumIngresos(ingresosMesRes.data),
            ingresosMesAnterior: sumIngresos(ingresosMesAntRes.data),
            tareasPendientes: tareasPendRes.count ?? 0,
            tareasVencidas: tareasVencidasRes.count ?? 0,
          },
          finanzasAnio: (finanzasRes.data ?? []) as MovimientoFila[],
          citas: citasProximasRes,
          tareas: (tareasListaRes.data ?? []) as DashboardTask[],
          clientes: (clientesRecientesRes.data ?? []) as DashboardCliente[],
          actividad,
        });
      } catch (e) {
        if (!alive) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "Error cargando dashboard",
        }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [negocioId]);

  return state;
}

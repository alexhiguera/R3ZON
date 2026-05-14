"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Clock,
  Loader2,
  Save,
  Target,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import {
  type Fichaje,
  calcularJornada,
  fichajesDelDia,
  formatearDuracion,
} from "@/lib/fichajes";

type Miembro = {
  user_id: string;
  miembro_id: string | null;
  email: string;
  nombre: string | null;
  rol: string;
  es_owner: boolean;
  horas_objetivo_dia: number | null;
};

type Periodo = "hoy" | "semana" | "mes";

function rangoPeriodo(p: Periodo): { desde: Date; hasta: Date; dias: Date[] } {
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setHours(0, 0, 0, 0);
  if (p === "semana") desde.setDate(desde.getDate() - 6);
  else if (p === "mes") desde.setDate(desde.getDate() - 29);

  const dias: Date[] = [];
  const cursor = new Date(desde);
  while (cursor <= hasta) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { desde, hasta, dias };
}

export function PanelAdmin({
  negocioId,
  horasDefaultInicial,
}: {
  negocioId: string;
  horasDefaultInicial: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [horasDefault, setHorasDefault] = useState<string>(
    String(horasDefaultInicial),
  );
  const [guardandoDefault, setGuardandoDefault] = useState(false);

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [fichajesAll, setFichajesAll] = useState<Fichaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [expandido, setExpandido] = useState<string | null>(null);

  const { desde, dias } = useMemo(() => rangoPeriodo(periodo), [periodo]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [equipoRes, horasMiembrosRes, fichajesRes] = await Promise.all([
      supabase
        .from("v_equipo_negocio")
        .select("user_id,miembro_id,email,nombre,rol,es_owner")
        .eq("negocio_id", negocioId),
      supabase
        .from("miembros_negocio")
        .select("id,horas_objetivo_dia")
        .eq("negocio_id", negocioId),
      supabase
        .from("fichajes")
        .select("id,user_id,negocio_id,tipo,ts,gps_lat,gps_lng,gps_accuracy_m,observaciones")
        .eq("negocio_id", negocioId)
        .gte("ts", desde.toISOString())
        .order("ts", { ascending: false }),
    ]);

    if (equipoRes.error) {
      toast.err(`Error al cargar equipo: ${equipoRes.error.message}`);
      setCargando(false);
      return;
    }
    if (fichajesRes.error) {
      toast.err(`Error al cargar fichajes: ${fichajesRes.error.message}`);
      setCargando(false);
      return;
    }

    const horasMap = new Map<string, number | null>();
    for (const m of horasMiembrosRes.data ?? []) {
      horasMap.set(m.id as string, (m.horas_objetivo_dia as number | null) ?? null);
    }

    const equipo = (equipoRes.data ?? []).map((m) => ({
      user_id: m.user_id as string,
      miembro_id: (m.miembro_id as string | null) ?? null,
      email: (m.email as string) ?? "",
      nombre: (m.nombre as string | null) ?? null,
      rol: (m.rol as string) ?? "miembro",
      es_owner: !!m.es_owner,
      horas_objetivo_dia: m.miembro_id
        ? horasMap.get(m.miembro_id as string) ?? null
        : null,
    }));

    setMiembros(equipo);
    setFichajesAll((fichajesRes.data ?? []) as Fichaje[]);
    setCargando(false);
  }, [supabase, toast, negocioId, desde]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardarDefault() {
    const horas = Number(horasDefault);
    if (!Number.isFinite(horas) || horas < 0 || horas > 24) {
      toast.err("Las horas deben estar entre 0 y 24.");
      return;
    }
    setGuardandoDefault(true);
    const { error } = await supabase.rpc("set_horas_objetivo_default", {
      p_horas: horas,
    });
    setGuardandoDefault(false);
    if (error) toast.err(error.message);
    else toast.ok("Horas por defecto actualizadas.");
  }

  async function guardarMiembro(miembroId: string, valor: string) {
    const trimmed = valor.trim();
    const horas = trimmed === "" ? null : Number(trimmed);
    if (horas !== null && (!Number.isFinite(horas) || horas < 0 || horas > 24)) {
      toast.err("Las horas deben estar entre 0 y 24.");
      return;
    }
    const { error } = await supabase.rpc("set_horas_objetivo_miembro", {
      p_miembro_id: miembroId,
      p_horas: horas,
    });
    if (error) {
      toast.err(error.message);
      return;
    }
    toast.ok(
      horas === null
        ? "Override eliminado — usa las horas por defecto."
        : "Horas del trabajador actualizadas.",
    );
    setMiembros((prev) =>
      prev.map((m) =>
        m.miembro_id === miembroId ? { ...m, horas_objetivo_dia: horas } : m,
      ),
    );
  }

  return (
    <div className="card-glass p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Users size={18} className="text-cyan" />
        <h2 className="font-display text-lg font-bold text-text-hi">
          Panel del administrador
        </h2>
        <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan">
          owner
        </span>
      </div>

      {/* Configuración horas por defecto */}
      <div className="mb-5 grid gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-900/20 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-text-mid">
            <Target size={13} /> Horas/día por defecto
          </label>
          <p className="mb-2 text-[11px] text-text-lo">
            Valor estándar de la jornada. Aplica a todos los trabajadores salvo
            que se ajuste un valor específico debajo.
          </p>
          <input
            type="number"
            step="0.25"
            min={0}
            max={24}
            value={horasDefault}
            onChange={(e) => setHorasDefault(e.target.value)}
            className="w-full rounded-xl border border-indigo-400/20 bg-indigo-900/40 px-3 py-2 text-sm text-text-hi focus:border-cyan/50 focus:outline-none sm:w-40"
          />
        </div>
        <button
          type="button"
          onClick={guardarDefault}
          disabled={guardandoDefault}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 text-sm font-bold text-bg disabled:opacity-60"
        >
          {guardandoDefault ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar
        </button>
      </div>

      {/* Selector de periodo */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="section-label">Trabajadores</div>
        <div role="tablist" className="flex gap-1 rounded-xl border border-indigo-400/20 bg-indigo-900/20 p-1 text-xs">
          {(["hoy", "semana", "mes"] as Periodo[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                periodo === p
                  ? "bg-gradient-to-r from-cyan to-fuchsia text-bg"
                  : "text-text-mid hover:text-text-hi"
              }`}
            >
              {p === "hoy" ? "Hoy" : p === "semana" ? "7 días" : "30 días"}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center gap-2 p-6 text-sm text-text-mid">
          <Loader2 size={14} className="animate-spin" /> Cargando equipo…
        </div>
      ) : miembros.length === 0 ? (
        <div className="rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-4 text-sm italic text-text-lo">
          No hay miembros adicionales en el equipo todavía.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {miembros.map((m) => {
            const fichajesUser = fichajesAll.filter((f) => f.user_id === m.user_id);
            const totalMs = dias.reduce((acc, d) => {
              const dia = fichajesDelDia(fichajesUser, d);
              return acc + calcularJornada(dia).trabajado_ms;
            }, 0);
            const horasDefaultNum = Number(horasDefault) > 0 ? Number(horasDefault) : horasDefaultInicial;
            const horasObjetivoMiembro = m.horas_objetivo_dia ?? horasDefaultNum;
            const objetivoMs = horasObjetivoMiembro * dias.length * 3600 * 1000;
            const ratio = objetivoMs > 0 ? totalMs / objetivoMs : 0;
            const expanded = expandido === m.user_id;
            const usaOverride = m.horas_objetivo_dia !== null;

            return (
              <li
                key={m.user_id}
                className="overflow-hidden rounded-2xl border border-indigo-400/15 bg-indigo-900/15"
              >
                <button
                  type="button"
                  onClick={() => setExpandido(expanded ? null : m.user_id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                >
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-text-hi">
                        {m.nombre || m.email}
                      </span>
                      {m.es_owner && (
                        <span className="rounded-full border border-cyan/30 bg-cyan/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-cyan">
                          owner
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-text-lo">{m.email}</div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-[10px] uppercase tracking-wider text-text-lo">
                      Trabajado
                    </div>
                    <div className="font-display text-sm font-bold text-text-hi">
                      {formatearDuracion(totalMs)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-text-lo">
                      vs objetivo
                    </div>
                    <div
                      className={`font-display text-sm font-bold ${
                        ratio >= 1
                          ? "text-emerald-400"
                          : ratio >= 0.8
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {Math.round(ratio * 100)}%
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-indigo-400/15 px-4 py-3">
                    {/* Override horas */}
                    {m.miembro_id ? (
                      <OverrideHoras
                        miembroId={m.miembro_id}
                        valorInicial={m.horas_objetivo_dia}
                        usaDefault={!usaOverride}
                        horasDefault={Number(horasDefault) > 0 ? Number(horasDefault) : horasDefaultInicial}
                        onSave={(v) => guardarMiembro(m.miembro_id!, v)}
                      />
                    ) : (
                      <div className="mb-3 flex items-center gap-1.5 text-xs text-text-lo">
                        <AlertTriangle size={12} className="text-amber-400" />
                        El titular del negocio no admite override por miembro.
                      </div>
                    )}

                    <div className="section-label mb-2">Detalle por día</div>
                    <ul className="flex flex-col gap-1">
                      {dias
                        .slice()
                        .reverse()
                        .map((d) => {
                          const fdia = fichajesDelDia(fichajesUser, d);
                          const r = calcularJornada(fdia);
                          return (
                            <li
                              key={d.toISOString()}
                              className="flex items-center justify-between gap-3 rounded-lg border border-indigo-400/10 bg-indigo-900/20 px-3 py-1.5 text-xs"
                            >
                              <span className="capitalize text-text-mid">
                                {d.toLocaleDateString("es-ES", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                              <span className="flex items-center gap-2 text-text-lo">
                                <Clock size={11} />
                                <span className="font-medium text-text-hi">
                                  {formatearDuracion(r.trabajado_ms)}
                                </span>
                                {r.descanso_ms > 0 && (
                                  <span>· {formatearDuracion(r.descanso_ms)} desc.</span>
                                )}
                                {fdia.length === 0 && <span>· sin fichajes</span>}
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OverrideHoras({
  valorInicial,
  usaDefault,
  horasDefault,
  onSave,
}: {
  miembroId: string;
  valorInicial: number | null;
  usaDefault: boolean;
  horasDefault: number;
  onSave: (valor: string) => void | Promise<void>;
}) {
  const [valor, setValor] = useState<string>(
    valorInicial === null ? "" : String(valorInicial),
  );
  const [guardando, setGuardando] = useState(false);

  return (
    <div className="mb-3 grid gap-2 rounded-xl border border-indigo-400/15 bg-indigo-900/25 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <div>
        <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-text-mid">
          Horas/día específicas
        </label>
        <p className="mb-2 text-[10px] text-text-lo">
          Deja en blanco para usar las {horasDefault}h del negocio.
          {usaDefault ? " Actualmente usa las del negocio." : ""}
        </p>
        <input
          type="number"
          step="0.25"
          min={0}
          max={24}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={`${horasDefault}`}
          className="w-full rounded-lg border border-indigo-400/20 bg-indigo-900/40 px-3 py-1.5 text-sm text-text-hi focus:border-cyan/50 focus:outline-none sm:w-32"
        />
      </div>
      <button
        type="button"
        onClick={async () => {
          setGuardando(true);
          await onSave(valor);
          setGuardando(false);
        }}
        disabled={guardando}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-3 text-xs font-bold text-cyan disabled:opacity-60"
      >
        {guardando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        Guardar
      </button>
    </div>
  );
}

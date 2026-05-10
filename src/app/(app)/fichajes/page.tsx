"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Play,
  MapPin,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import {
  type Fichaje,
  type TipoFichaje,
  ETIQUETA_TIPO,
  calcularJornada,
  estadoTrabajador,
  fichajesDelDia,
  formatearDuracion,
  siguientesPermitidos,
} from "@/lib/fichajes";

type Coords = { lat: number; lng: number; accuracy: number };

function obtenerGPS(timeoutMs = 8000): Promise<Coords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

const ICONO_TIPO: Record<TipoFichaje, typeof LogIn> = {
  entrada: LogIn,
  salida: LogOut,
  inicio_descanso: Coffee,
  fin_descanso: Play,
};

export default function FichajesPage() {
  const supabase = createClient();
  const toast = useToast();

  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState<TipoFichaje | null>(null);
  const [fichajes, setFichajes] = useState<Fichaje[]>([]);
  const [tick, setTick] = useState(0);

  // Refresca el contador de jornada cada minuto.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const cargar = useCallback(async () => {
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);

    const { data, error } = await supabase
      .from("fichajes")
      .select("id,user_id,negocio_id,tipo,ts,gps_lat,gps_lng,gps_accuracy_m,observaciones")
      .gte("ts", desde.toISOString())
      .order("ts", { ascending: false });

    if (error) {
      toast.err(`Error al cargar fichajes: ${error.message}`);
      setCargando(false);
      return;
    }
    setFichajes((data ?? []) as Fichaje[]);
    setCargando(false);
  }, [supabase, toast]);

  useEffect(() => { cargar(); }, [cargar]);

  const ultimoTipo: TipoFichaje | null = fichajes[0]?.tipo ?? null;
  const estado = estadoTrabajador(ultimoTipo);
  const permitidos = siguientesPermitidos(ultimoTipo);

  const fichajesHoy = useMemo(() => fichajesDelDia(fichajes), [fichajes]);

  // `tick` fuerza recálculo del tramo abierto.
  const resumenHoy = useMemo(
    () => calcularJornada(fichajesHoy, new Date(Date.now() + tick * 0)),
    [fichajesHoy, tick],
  );

  async function fichar(tipo: TipoFichaje) {
    if (enviando) return;
    setEnviando(tipo);

    const gps = await obtenerGPS();
    if (!gps) toast.info("GPS no disponible — fichaje sin coordenadas.");

    const { data, error } = await supabase.rpc("registrar_fichaje", {
      p_tipo: tipo,
      p_gps_lat: gps?.lat ?? null,
      p_gps_lng: gps?.lng ?? null,
      p_gps_accuracy_m: gps?.accuracy ?? null,
      p_user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    });

    setEnviando(null);

    if (error) {
      const msg = error.message.includes("TRANSICION_INVALIDA")
        ? "Ese fichaje no está permitido en tu estado actual."
        : error.message;
      toast.err(msg);
      return;
    }

    toast.ok(`${ETIQUETA_TIPO[tipo]} registrada.`);
    if (data) setFichajes((prev) => [data as Fichaje, ...prev]);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Recursos humanos"
        title="Fichajes"
        description="Registro de jornada conforme al Real Decreto-ley 8/2019. La marca temporal la fija el servidor; la ubicación la captura el dispositivo en el momento del fichaje."
      />

      {cargando ? (
        <div className="card-glass flex h-48 items-center justify-center text-text-lo">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <>
          <EstadoActual estado={estado} ultimo={fichajes[0] ?? null} resumen={resumenHoy} />

          {/* Botonera */}
          <div className="card-glass p-5">
            <div className="section-label mb-3">Registrar fichaje</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["entrada", "inicio_descanso", "fin_descanso", "salida"] as TipoFichaje[]).map(
                (t) => {
                  const habilitado = permitidos.includes(t);
                  const Icono = ICONO_TIPO[t];
                  const enviandoEste = enviando === t;
                  return (
                    <button
                      key={t}
                      onClick={() => fichar(t)}
                      disabled={!habilitado || enviando !== null}
                      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-5 text-sm font-bold transition-all
                        ${habilitado
                          ? "border-cyan/40 bg-gradient-to-br from-cyan/10 to-fuchsia/10 text-text-hi hover:border-cyan/70 hover:shadow-glow"
                          : "cursor-not-allowed border-indigo-400/10 bg-indigo-900/10 text-text-lo opacity-40"
                        }
                        ${enviandoEste ? "animate-pulse" : ""}
                      `}
                    >
                      {enviandoEste
                        ? <Loader2 size={22} className="animate-spin" />
                        : <Icono size={22} />
                      }
                      <span className="text-center text-xs leading-tight">
                        {ETIQUETA_TIPO[t]}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
            <p className="mt-3 text-xs text-text-lo">
              Solo están activos los fichajes válidos según tu estado actual. Los registros
              son inmutables una vez guardados (RD-ley 8/2019).
            </p>
          </div>

          <ListaFichajes fichajes={fichajes} />
        </>
      )}
    </div>
  );
}

// ── Estado actual ─────────────────────────────────────────────────────────────
function EstadoActual({
  estado,
  ultimo,
  resumen,
}: {
  estado: "fuera" | "trabajando" | "en_descanso";
  ultimo: Fichaje | null;
  resumen: ReturnType<typeof calcularJornada>;
}) {
  const color =
    estado === "trabajando"
      ? "text-emerald-400"
      : estado === "en_descanso"
      ? "text-amber-400"
      : "text-text-mid";

  const etiqueta =
    estado === "trabajando"
      ? "En el trabajo"
      : estado === "en_descanso"
      ? "En descanso"
      : "Fuera del trabajo";

  return (
    <div className="card-glass p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 ${color}`}>
            <Clock size={22} />
          </div>
          <div>
            <div className="section-label">Estado actual</div>
            <div className={`font-display text-xl font-bold ${color}`}>{etiqueta}</div>
            {ultimo && (
              <div className="text-xs text-text-lo">
                Último: {ETIQUETA_TIPO[ultimo.tipo]} ·{" "}
                {new Date(ultimo.ts).toLocaleString("es-ES")}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="section-label">Hoy trabajado</div>
          <div className="font-display text-2xl font-bold text-text-hi">
            {formatearDuracion(resumen.trabajado_ms)}
          </div>
          <div className="text-xs text-text-lo">
            Descanso: {formatearDuracion(resumen.descanso_ms)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Histórico ─────────────────────────────────────────────────────────────────
function ListaFichajes({ fichajes }: { fichajes: Fichaje[] }) {
  if (fichajes.length === 0) {
    return (
      <div className="card-glass flex flex-col items-center gap-3 py-12 text-center text-text-mid">
        <Clock size={28} className="text-indigo-400/40" />
        <div className="font-display text-lg font-bold">Sin fichajes todavía</div>
        <p className="max-w-xs text-sm">
          Registra tu primera entrada y aquí aparecerá el histórico de jornada.
        </p>
      </div>
    );
  }

  // Agrupar por día (etiqueta local).
  const grupos = new Map<string, Fichaje[]>();
  for (const f of fichajes) {
    const clave = new Date(f.ts).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(f);
  }

  return (
    <div className="card-glass p-5">
      <div className="section-label mb-4">Histórico (últimos 30 días)</div>
      <div className="flex flex-col gap-6">
        {[...grupos.entries()].map(([dia, items]) => {
          const resumen = calcularJornada(items);
          return (
            <div key={dia}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <div className="font-display text-sm font-bold capitalize text-text-hi">
                  {dia}
                </div>
                <div className="shrink-0 text-xs text-text-lo">
                  {formatearDuracion(resumen.trabajado_ms)} trabajados
                  {resumen.descanso_ms > 0 && ` · ${formatearDuracion(resumen.descanso_ms)} descanso`}
                  {!resumen.cerrada && " · en curso"}
                </div>
              </div>
              <ul className="flex flex-col gap-1.5">
                {items.map((f) => {
                  const Icono = ICONO_TIPO[f.tipo];
                  const tieneGPS = f.gps_lat !== null && f.gps_lng !== null;
                  return (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 rounded-xl border border-indigo-400/10 bg-indigo-900/20 px-3 py-2 text-sm"
                    >
                      <Icono size={15} className="shrink-0 text-cyan" />
                      <span className="font-medium text-text-hi">
                        {ETIQUETA_TIPO[f.tipo]}
                      </span>
                      <span className="text-text-mid">
                        {new Date(f.ts).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-text-lo">
                        {tieneGPS ? (
                          <>
                            <MapPin size={12} className="text-emerald-400" />
                            <span title={`±${Math.round(f.gps_accuracy_m ?? 0)}m`}>
                              {f.gps_lat!.toFixed(4)}, {f.gps_lng!.toFixed(4)}
                            </span>
                            <CheckCircle2 size={12} className="text-emerald-400" />
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={12} className="text-amber-400" />
                            <span>sin GPS</span>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

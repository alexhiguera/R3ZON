"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Plus, Building2, Globe, MapPin, ChevronRight,
  SlidersHorizontal, Users2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListSkeleton } from "@/components/clientes/Skeleton";

type ClienteRow = {
  id: string;
  nombre: string;
  cif: string | null;
  sector: string | null;
  ciudad: string | null;
  sitio_web: string | null;
  num_empleados: number | null;
  estado: "activa" | "prospecto" | "inactiva";
  etiquetas: string[];
};

const ESTADO_STYLES: Record<ClienteRow["estado"], string> = {
  activa:    "border-ok/40 bg-ok/10 text-ok",
  prospecto: "border-cyan/40 bg-cyan/10 text-cyan",
  inactiva:  "border-warn/40 bg-warn/10 text-warn",
};
const ESTADO_LABELS: Record<ClienteRow["estado"], string> = {
  activa: "Activo", prospecto: "Prospecto", inactiva: "Inactivo",
};

type Filtro = "todas" | ClienteRow["estado"];

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (q = "", f: Filtro = "todas") => {
    const supabase = createClient();
    let query = supabase
      .from("clientes")
      .select("id,nombre,cif,sector,ciudad,sitio_web,num_empleados,estado,etiquetas")
      .order("nombre", { ascending: true });

    if (f !== "todas") query = query.eq("estado", f);
    if (q.trim()) {
      query = query.or(
        `nombre.ilike.%${q}%,cif.ilike.%${q}%,sector.ilike.%${q}%,ciudad.ilike.%${q}%`
      );
    }
    const { data } = await query.limit(60);
    setClientes((data ?? []) as ClienteRow[]);
    setCargando(false);
  }, []);

  useEffect(() => {
    setCargando(true);
    const t = setTimeout(() => cargar(busqueda, filtro), 250);
    return () => clearTimeout(t);
  }, [busqueda, filtro, cargar]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="CRM B2B"
        title="Clientes"
        description="Gestiona tus cuentas (empresas) y la jerarquía interna de sus contactos."
      />

      {/* Barra superior */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400/50"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, CIF, sector o ciudad…"
            className="h-12 w-full rounded-xl border border-indigo-400/20 bg-indigo-900/30 pl-10 pr-4 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </div>
        <Link
          href="/clientes/nuevo"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-5 text-sm font-bold text-bg active:scale-[0.99]"
        >
          <Plus size={16} /> Nuevo cliente
        </Link>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        <SlidersHorizontal size={14} className="mt-2.5 text-indigo-400/40" />
        {(["todas", "activa", "prospecto", "inactiva"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filtro === f
                ? "border-cyan/50 bg-cyan/10 text-cyan"
                : "border-indigo-400/20 bg-indigo-900/30 text-text-mid hover:border-indigo-400/40"
            }`}
          >
            {f === "todas" ? "Todos" : ESTADO_LABELS[f]}
          </button>
        ))}
      </div>

      {cargando && <ListSkeleton count={6} />}

      {!cargando && clientes.length === 0 && (
        <div className="card-glass flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300">
            <Building2 size={24} />
          </span>
          <div className="font-display text-lg font-bold text-text-hi">
            {busqueda || filtro !== "todas"
              ? "Sin resultados"
              : "Aún no tienes clientes"}
          </div>
          <p className="max-w-xs text-sm text-text-mid">
            {busqueda || filtro !== "todas"
              ? "Prueba a cambiar el filtro o el término de búsqueda."
              : "Da de alta tu primera empresa cliente para empezar a gestionar contactos y organigrama."}
          </p>
          {!busqueda && filtro === "todas" && (
            <Link
              href="/clientes/nuevo"
              className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 text-sm font-bold text-bg"
            >
              <Plus size={14} /> Crear cliente
            </Link>
          )}
        </div>
      )}

      {!cargando && clientes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clientes.map((e) => (
            <Link
              key={e.id}
              href={`/clientes/${e.id}`}
              className="card-glass group flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 font-display text-base font-bold uppercase text-indigo-300">
                  {e.nombre.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-base font-bold text-text-hi">
                    {e.nombre}
                  </div>
                  <div className="truncate text-xs text-text-lo">
                    {e.sector || "Sector sin definir"}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-indigo-400/30 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-300"
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.7rem] text-text-lo">
                {e.ciudad && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} /> {e.ciudad}
                  </span>
                )}
                {e.sitio_web && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Globe size={11} /> {e.sitio_web.replace(/^https?:\/\//, "")}
                  </span>
                )}
                {e.num_empleados != null && (
                  <span className="inline-flex items-center gap-1">
                    <Users2 size={11} /> {e.num_empleados}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold ${ESTADO_STYLES[e.estado]}`}
                >
                  {ESTADO_LABELS[e.estado]}
                </span>
                <div className="flex-1" />
                {(e.etiquetas ?? []).slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-indigo-400/25 bg-indigo-900/30 px-2 py-0.5 text-[0.62rem] font-semibold text-indigo-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

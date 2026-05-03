"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Plus, Building2, Phone, Mail, MessageCircle,
  ChevronRight, SlidersHorizontal, Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tooltip } from "@/components/ui/Tooltip";

type ClienteRow = {
  id: string;
  nombre: string;
  cif: string | null;
  sector: string | null;
  email: string | null;
  telefono: string | null;
  sitio_web: string | null;
  estado: "activa" | "prospecto" | "inactiva";
  etiquetas: string[] | null;
  created_at: string;
};

const ETIQUETA_COLORS: Record<string, string> = {
  vip:      "border-cyan/40 bg-cyan/10 text-cyan",
  nuevo:    "border-ok/40 bg-ok/10 text-ok",
  inactivo: "border-warn/40 bg-warn/10 text-warn",
  empresa:  "border-fuchsia/40 bg-fuchsia/10 text-fuchsia",
};

const ESTADO_BADGE: Record<ClienteRow["estado"], string> = {
  activa:    "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  prospecto: "border-cyan/30 bg-cyan/10 text-cyan",
  inactiva:  "border-rose-400/30 bg-rose-500/10 text-rose-200",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (q = "") => {
    const supabase = createClient();
    let query = supabase
      .from("clientes")
      .select("id,nombre,cif,sector,email,telefono,sitio_web,estado,etiquetas,created_at")
      .order("created_at", { ascending: false });

    if (q.trim()) {
      query = query.or(
        `nombre.ilike.%${q}%,cif.ilike.%${q}%,email.ilike.%${q}%,sector.ilike.%${q}%`
      );
    }
    const { data } = await query.limit(50);
    setClientes((data ?? []) as ClienteRow[]);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="CRM"
        title="Clientes"
        description="Empresas y entidades con las que trabajas. Cada cliente puede tener varios contactos asociados."
      />

      {/* Barra de búsqueda + nuevo */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400/50"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por razón social, CIF, email o sector…"
            className="h-12 w-full rounded-xl border border-indigo-400/20 bg-indigo-900/30 pl-10 pr-4 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </div>
        <Tooltip text="Filtros avanzados próximamente" side="bottom">
          <button className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/30 text-indigo-300 hover:border-indigo-400/40">
            <SlidersHorizontal size={16} />
          </button>
        </Tooltip>
        <Link
          href="/clientes/nuevo"
          className="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 text-sm font-bold text-bg"
        >
          <Plus size={16} /> Nuevo
        </Link>
      </div>

      {/* Estado vacío */}
      {!cargando && clientes.length === 0 && (
        <div className="card-glass flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300">
            <Building2 size={24} />
          </span>
          <div className="font-display text-lg font-bold text-text-hi">
            {busqueda ? "Sin resultados" : "Aún no tienes clientes"}
          </div>
          <p className="max-w-xs text-sm text-text-mid">
            {busqueda
              ? "Prueba con otra razón social, CIF o sector."
              : "Crea tu primer cliente y empieza a registrar contactos, citas y facturación."}
          </p>
          {!busqueda && (
            <Link
              href="/clientes/nuevo"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 py-2.5 text-sm font-bold text-bg shadow-glow"
            >
              <Plus size={15} /> Añadir primer cliente
            </Link>
          )}
        </div>
      )}

      {/* Cuadrícula de clientes */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {clientes.map((c) => (
          <article
            key={c.id}
            className="card-glass group relative flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5"
          >
            {/* Stretched link — cubre la tarjeta sin envolver los enlaces de acción */}
            <Link
              href={`/clientes/${c.id}`}
              aria-label={c.nombre}
              className="absolute inset-0 z-0 rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
            />

            {/* Avatar + nombre + estado */}
            <div className="relative z-10 flex items-center gap-3 pointer-events-none">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 font-display text-lg font-bold uppercase text-indigo-300">
                {c.nombre.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-bold text-text-hi">
                  {c.nombre}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-lo">
                  {c.cif ? <span className="truncate">{c.cif}</span> : null}
                  {c.cif && c.sector ? <span>·</span> : null}
                  {c.sector ? <span className="truncate">{c.sector}</span> : null}
                </div>
              </div>
              <ChevronRight
                size={16}
                className="shrink-0 text-indigo-400/30 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-300"
              />
            </div>

            {/* Estado */}
            <div className="relative z-10 flex items-center gap-2 pointer-events-none">
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ESTADO_BADGE[c.estado]}`}>
                {c.estado}
              </span>
              {(c.etiquetas ?? []).slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold ${
                    ETIQUETA_COLORS[tag] ?? "border-indigo-400/25 bg-indigo-900/30 text-indigo-300"
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Acciones rápidas — los enlaces necesitan pointer-events para superponerse al stretched link */}
            <div className="relative z-10 flex items-center gap-2">
              {c.telefono && (
                <>
                  <Tooltip text="Llamar" side="bottom">
                    <a
                      href={`tel:${c.telefono}`}
                      className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                    >
                      <Phone size={13} />
                    </a>
                  </Tooltip>
                  <Tooltip text="WhatsApp" side="bottom">
                    <a
                      href={`https://wa.me/${c.telefono.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                    >
                      <MessageCircle size={13} />
                    </a>
                  </Tooltip>
                </>
              )}
              {c.email && (
                <Tooltip text="Email" side="bottom">
                  <a
                    href={`mailto:${c.email}`}
                    className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                  >
                    <Mail size={13} />
                  </a>
                </Tooltip>
              )}
              {c.sitio_web && (
                <Tooltip text="Web" side="bottom">
                  <a
                    href={c.sitio_web.startsWith("http") ? c.sitio_web : `https://${c.sitio_web}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                  >
                    <Globe size={13} />
                  </a>
                </Tooltip>
              )}
              <div className="pointer-events-none flex-1" />
              <span className="pointer-events-none text-[0.65rem] text-text-lo">
                Alta {new Date(c.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

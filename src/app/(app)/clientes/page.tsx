"use client";

import {
  Building2,
  ChevronRight,
  Download,
  Globe,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { descargarCSV } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import { ESTADO_CLIENTE_BADGE } from "@/lib/ui-constants";
import { haAlcanzadoLimite, usePlan } from "@/lib/usePlan";

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
  vip: "border-cyan/40 bg-cyan/10 text-cyan",
  nuevo: "border-ok/40 bg-ok/10 text-ok",
  inactivo: "border-warn/40 bg-warn/10 text-warn",
  empresa: "border-fuchsia/40 bg-fuchsia/10 text-fuchsia",
};

const PAGE_SIZE = 50;

type Vista = "lista" | "tarjetas";
const VISTA_KEY = "clientes:vista";

export default function ClientesPage() {
  const toast = useToast();
  const { plan, limites, contadores } = usePlan();
  const limiteAlcanzado = haAlcanzadoLimite(plan, "clientes", contadores.clientes);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [vista, setVista] = useState<Vista>("lista");

  useEffect(() => {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(VISTA_KEY) : null;
    if (v === "lista" || v === "tarjetas") setVista(v);
  }, []);

  const cambiarVista = (v: Vista) => {
    setVista(v);
    if (typeof window !== "undefined") window.localStorage.setItem(VISTA_KEY, v);
  };

  const cargar = useCallback(
    async (q = "", cursor: string | null = null, append = false) => {
      const supabase = createClient();
      let query = supabase
        .from("clientes")
        .select("id,nombre,cif,sector,email,telefono,sitio_web,estado,etiquetas,created_at")
        .order("created_at", { ascending: false });

      if (q.trim()) {
        query = query.or(
          `nombre.ilike.%${q}%,cif.ilike.%${q}%,email.ilike.%${q}%,sector.ilike.%${q}%`,
        );
      }
      if (cursor) query = query.lt("created_at", cursor);
      const { data, error } = await query.limit(PAGE_SIZE);
      if (error) {
        toast.err(
          "No se pudieron cargar los clientes. Comprueba tu conexión e inténtalo de nuevo.",
        );
        if (append) setCargandoMas(false);
        else setCargando(false);
        return;
      }
      const filas = (data ?? []) as ClienteRow[];
      setClientes((prev) => (append ? [...prev, ...filas] : filas));
      setHayMas(filas.length === PAGE_SIZE);
      if (append) setCargandoMas(false);
      else setCargando(false);
    },
    [toast],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  async function cargarMas() {
    const ultimo = clientes[clientes.length - 1];
    if (!ultimo) return;
    setCargandoMas(true);
    await cargar(busqueda, ultimo.created_at, true);
  }

  async function exportarCSV() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("nombre,cif,sector,email,telefono,sitio_web,estado,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.err("No se pudo exportar. Inténtalo de nuevo.");
      return;
    }
    descargarCSV(
      (data ?? []).map((c) => ({
        Nombre: c.nombre,
        CIF: c.cif ?? "",
        Sector: c.sector ?? "",
        Email: c.email ?? "",
        Teléfono: c.telefono ?? "",
        Web: c.sitio_web ?? "",
        Estado: c.estado,
        Alta: c.created_at.slice(0, 10),
      })),
      `clientes-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="CRM"
        title="Clientes"
        description="Empresas y entidades con las que trabajas. Cada cliente puede tener varios contactos asociados."
      />

      {/* Banner de límite plan Free */}
      {plan === "free" && limites.clientes !== null && (
        <div
          className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${
            limiteAlcanzado
              ? "border-danger/30 bg-danger/10 text-danger"
              : contadores.clientes >= limites.clientes - 1
                ? "border-warn/30 bg-warn/10 text-warn"
                : "border-indigo-400/20 bg-indigo-900/20 text-text-mid"
          }`}
        >
          <span>
            {limiteAlcanzado
              ? `Has alcanzado el límite de ${limites.clientes} clientes del plan Free.`
              : `Plan Free: ${contadores.clientes} / ${limites.clientes} clientes.`}
          </span>
          <a
            href="/ajustes?tab=suscripcion"
            className="shrink-0 rounded-lg border border-current px-3 py-1 text-xs font-semibold hover:opacity-80"
          >
            Mejorar plan
          </a>
        </div>
      )}

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
        <div className="flex h-12 items-center gap-0.5 rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-1">
          <Tooltip text="Vista lista" side="bottom">
            <button
              onClick={() => cambiarVista("lista")}
              aria-pressed={vista === "lista"}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                vista === "lista" ? "bg-cyan/15 text-cyan" : "text-indigo-300 hover:text-text-hi"
              }`}
            >
              <ListIcon size={15} />
            </button>
          </Tooltip>
          <Tooltip text="Vista tarjetas" side="bottom">
            <button
              onClick={() => cambiarVista("tarjetas")}
              aria-pressed={vista === "tarjetas"}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                vista === "tarjetas" ? "bg-cyan/15 text-cyan" : "text-indigo-300 hover:text-text-hi"
              }`}
            >
              <LayoutGrid size={15} />
            </button>
          </Tooltip>
        </div>
        <Tooltip text="Filtros avanzados próximamente" side="bottom">
          <button className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/30 text-indigo-300 hover:border-indigo-400/40">
            <SlidersHorizontal size={16} />
          </button>
        </Tooltip>
        <Tooltip text="Exportar clientes a CSV" side="bottom">
          <button
            onClick={exportarCSV}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/30 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
          >
            <Download size={16} />
          </button>
        </Tooltip>
        {limiteAlcanzado ? (
          <Tooltip
            text={`Límite del plan Free: ${limites.clientes} clientes. Mejora tu plan para añadir más.`}
            side="bottom"
          >
            <span className="flex h-12 cursor-not-allowed items-center gap-2 rounded-xl bg-indigo-900/40 px-4 text-sm font-bold text-indigo-500 opacity-60">
              <Plus size={16} /> Nuevo
            </span>
          </Tooltip>
        ) : (
          <Link
            href="/clientes/nuevo"
            className="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia px-4 text-sm font-bold text-bg"
          >
            <Plus size={16} /> Nuevo
          </Link>
        )}
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

      {/* Listado de clientes */}
      {clientes.length > 0 && vista === "lista" && (
        <div className="card-glass overflow-hidden">
          <ul className="divide-y divide-indigo-400/10">
            {clientes.map((c) => (
              <li
                key={c.id}
                className="group relative flex items-center gap-3 px-4 py-3 hover:bg-indigo-900/20"
              >
                <Link
                  href={`/clientes/${c.id}`}
                  aria-label={c.nombre}
                  className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
                />
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 font-display text-sm font-bold uppercase text-indigo-300 pointer-events-none">
                  {c.nombre.charAt(0)}
                </div>
                <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-sm font-semibold text-text-hi">
                      {c.nombre}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ESTADO_CLIENTE_BADGE[c.estado]}`}
                    >
                      {c.estado}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-lo">
                    {c.cif && <span>{c.cif}</span>}
                    {c.sector && <span>{c.sector}</span>}
                    {c.email && <span className="truncate">{c.email}</span>}
                    {c.telefono && <span>{c.telefono}</span>}
                  </div>
                </div>
                <div className="relative z-10 hidden shrink-0 items-center gap-1.5 sm:flex">
                  {c.telefono && (
                    <Tooltip text="Llamar" side="bottom">
                      <a
                        href={`tel:${c.telefono}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                      >
                        <Phone size={13} />
                      </a>
                    </Tooltip>
                  )}
                  {c.telefono && (
                    <Tooltip text="WhatsApp" side="bottom">
                      <a
                        href={`https://wa.me/${c.telefono.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                      >
                        <MessageCircle size={13} />
                      </a>
                    </Tooltip>
                  )}
                  {c.email && (
                    <Tooltip text="Email" side="bottom">
                      <a
                        href={`mailto:${c.email}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                      >
                        <Mail size={13} />
                      </a>
                    </Tooltip>
                  )}
                  {c.sitio_web && (
                    <Tooltip text="Web" side="bottom">
                      <a
                        href={
                          c.sitio_web.startsWith("http") ? c.sitio_web : `https://${c.sitio_web}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                      >
                        <Globe size={13} />
                      </a>
                    </Tooltip>
                  )}
                </div>
                <ChevronRight
                  size={15}
                  className="relative z-10 pointer-events-none shrink-0 text-indigo-400/40 group-hover:text-indigo-300"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cuadrícula de clientes */}
      {vista === "tarjetas" && (
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
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ESTADO_CLIENTE_BADGE[c.estado]}`}
                >
                  {c.estado}
                </span>
                {(c.etiquetas ?? []).slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold ${
                      ETIQUETA_COLORS[tag] ??
                      "border-indigo-400/25 bg-indigo-900/30 text-indigo-300"
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
                  Alta{" "}
                  {new Date(c.created_at).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {hayMas && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={cargarMas}
            disabled={cargandoMas}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-900/30 px-4 text-sm font-semibold text-indigo-200 hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
          >
            {cargandoMas ? <Loader2 size={14} className="animate-spin" /> : null}
            Cargar {PAGE_SIZE} más
          </button>
        </div>
      )}
    </div>
  );
}

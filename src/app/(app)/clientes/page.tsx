"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Plus, Users, Phone, Mail, MessageCircle,
  ChevronRight, SlidersHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tooltip } from "@/components/ui/Tooltip";

type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  etiquetas: string[];
  fecha_alta: string;
  ultima_visita: string | null;
};

const ETIQUETA_COLORS: Record<string, string> = {
  vip:       "border-cyan/40 bg-cyan/10 text-cyan",
  nuevo:     "border-ok/40 bg-ok/10 text-ok",
  inactivo:  "border-warn/40 bg-warn/10 text-warn",
  empresa:   "border-fuchsia/40 bg-fuchsia/10 text-fuchsia",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (q = "") => {
    const supabase = createClient();
    let query = supabase
      .from("clientes")
      .select("id,nombre,apellidos,email,telefono,etiquetas,fecha_alta,ultima_visita")
      .order("fecha_alta", { ascending: false });

    if (q.trim()) {
      query = query.or(
        `nombre.ilike.%${q}%,apellidos.ilike.%${q}%,email.ilike.%${q}%`
      );
    }
    const { data } = await query.limit(50);
    setClientes((data ?? []) as Cliente[]);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  const nombreCompleto = (c: Cliente) =>
    [c.nombre, c.apellidos].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="CRM"
        title="Clientes"
        description="Todas las personas con las que trabajas, en un solo sitio."
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
            placeholder="Buscar por nombre, email…"
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
            <Users size={24} />
          </span>
          <div className="font-display text-lg font-bold text-text-hi">
            {busqueda ? "No se encontraron clientes" : "Aún no tienes clientes"}
          </div>
          <p className="max-w-xs text-sm text-text-mid">
            {busqueda
              ? "Prueba con otro nombre o email."
              : "Añade tu primer cliente con el botón de arriba."}
          </p>
        </div>
      )}

      {/* Cuadrícula de clientes */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {clientes.map((c) => (
          <Link
            key={c.id}
            href={`/clientes/${c.id}`}
            className="card-glass group flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5"
          >
            {/* Avatar + nombre */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 font-display text-lg font-bold uppercase text-indigo-300">
                {c.nombre.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-bold text-text-hi">
                  {nombreCompleto(c)}
                </div>
                {c.email && (
                  <div className="truncate text-xs text-text-lo">{c.email}</div>
                )}
              </div>
              <ChevronRight
                size={16}
                className="shrink-0 text-indigo-400/30 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-300"
              />
            </div>

            {/* Acciones rápidas */}
            <div className="flex items-center gap-2">
              {c.telefono && (
                <>
                  <Tooltip text="Llamar por teléfono" side="bottom">
                    <a
                      href={`tel:${c.telefono}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                    >
                      <Phone size={13} />
                    </a>
                  </Tooltip>
                  <Tooltip text="Abrir WhatsApp" side="bottom">
                    <a
                      href={`https://wa.me/${c.telefono.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                    >
                      <MessageCircle size={13} />
                    </a>
                  </Tooltip>
                </>
              )}
              {c.email && (
                <Tooltip text="Enviar email" side="bottom">
                  <a
                    href={`mailto:${c.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                  >
                    <Mail size={13} />
                  </a>
                </Tooltip>
              )}
              <div className="flex-1" />
              {/* Etiquetas */}
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

            {/* Última visita */}
            {c.ultima_visita && (
              <div className="text-[0.68rem] text-text-lo">
                Última visita:{" "}
                {new Date(c.ultima_visita).toLocaleDateString("es-ES", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

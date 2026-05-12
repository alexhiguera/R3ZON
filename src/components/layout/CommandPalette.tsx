"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Calendar,
  Kanban,
  Wallet,
  FileText,
  LayoutDashboard,
  Settings,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Resultado = {
  id: string;
  tipo: "cliente" | "cita" | "tarea" | "finanza" | "documento" | "nav";
  titulo: string;
  subtitulo?: string;
  href: string;
  Icon: LucideIcon;
};

const NAV_FIJO: Resultado[] = [
  { id: "nav-dashboard",   tipo: "nav", titulo: "Dashboard",   href: "/dashboard",   Icon: LayoutDashboard },
  { id: "nav-clientes",    tipo: "nav", titulo: "Clientes",    href: "/clientes",    Icon: Building2 },
  { id: "nav-citas",       tipo: "nav", titulo: "Agenda",      href: "/citas",       Icon: Calendar },
  { id: "nav-tareas",      tipo: "nav", titulo: "Tareas",      href: "/tareas",      Icon: Kanban },
  { id: "nav-finanzas",    tipo: "nav", titulo: "Finanzas",    href: "/finanzas",    Icon: Wallet },
  { id: "nav-documentos",  tipo: "nav", titulo: "Documentos",  href: "/documentos",  Icon: FileText },
  { id: "nav-ajustes",     tipo: "nav", titulo: "Ajustes",     href: "/ajustes",     Icon: Settings },
];

const ICON_TIPO: Record<Resultado["tipo"], LucideIcon> = {
  cliente:    Building2,
  cita:       Calendar,
  tarea:      Kanban,
  finanza:    Wallet,
  documento:  FileText,
  nav:        Search,
};

const ETIQUETA_TIPO: Record<Resultado["tipo"], string> = {
  cliente:   "Cliente",
  cita:      "Cita",
  tarea:     "Tarea",
  finanza:   "Finanza",
  documento: "Documento",
  nav:       "Ir a",
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atajo global Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setActivo(0);
    } else {
      setQuery("");
      setResultados([]);
    }
  }, [open]);

  // Búsqueda con debounce.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResultados(NAV_FIJO.filter((n) => n.titulo.toLowerCase().includes(q.toLowerCase())));
      setCargando(false);
      return;
    }
    setCargando(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const like = `%${q}%`;
      const [clientes, citas, tareas, finanzas, documentos] = await Promise.all([
        supabase.from("clientes")
          .select("id, nombre, email")
          .or(`nombre.ilike.${like},email.ilike.${like}`)
          .limit(5),
        supabase.from("agenda_eventos")
          .select("id, titulo, start_time")
          .ilike("titulo", like)
          .order("start_time", { ascending: false })
          .limit(5),
        supabase.from("tareas_kanban")
          .select("id, titulo")
          .ilike("titulo", like)
          .limit(5),
        supabase.from("finanzas")
          .select("id, descripcion, importe, fecha")
          .ilike("descripcion", like)
          .order("fecha", { ascending: false })
          .limit(5),
        supabase.from("documentos")
          .select("id, referencia, tipo")
          .ilike("referencia", like)
          .limit(5),
      ]);

      const out: Resultado[] = [];
      for (const c of (clientes.data ?? []) as { id: string; nombre: string; email: string | null }[]) {
        out.push({ id: `cli-${c.id}`, tipo: "cliente", titulo: c.nombre, subtitulo: c.email ?? undefined, href: `/clientes/${c.id}`, Icon: ICON_TIPO.cliente });
      }
      for (const c of (citas.data ?? []) as { id: string; titulo: string; start_time: string }[]) {
        out.push({ id: `cit-${c.id}`, tipo: "cita", titulo: c.titulo, subtitulo: new Date(c.start_time).toLocaleString("es-ES"), href: `/citas?event=${c.id}`, Icon: ICON_TIPO.cita });
      }
      for (const t of (tareas.data ?? []) as { id: string; titulo: string }[]) {
        out.push({ id: `tar-${t.id}`, tipo: "tarea", titulo: t.titulo, href: `/tareas`, Icon: ICON_TIPO.tarea });
      }
      for (const f of (finanzas.data ?? []) as { id: string; descripcion: string; importe: number; fecha: string }[]) {
        out.push({ id: `fin-${f.id}`, tipo: "finanza", titulo: f.descripcion ?? "Movimiento", subtitulo: `${new Date(f.fecha).toLocaleDateString("es-ES")} · ${f.importe} €`, href: `/finanzas`, Icon: ICON_TIPO.finanza });
      }
      for (const d of (documentos.data ?? []) as { id: string; referencia: string | null; tipo: string }[]) {
        out.push({ id: `doc-${d.id}`, tipo: "documento", titulo: d.referencia ?? d.tipo, subtitulo: d.tipo, href: `/documentos/${d.id}`, Icon: ICON_TIPO.documento });
      }
      // Añadir navs que coincidan también.
      for (const n of NAV_FIJO) {
        if (n.titulo.toLowerCase().includes(q.toLowerCase())) out.push(n);
      }
      setResultados(out);
      setCargando(false);
      setActivo(0);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  const grupos = useMemo(() => {
    const map = new Map<Resultado["tipo"], Resultado[]>();
    for (const r of resultados) {
      const arr = map.get(r.tipo) ?? [];
      arr.push(r);
      map.set(r.tipo, arr);
    }
    return map;
  }, [resultados]);

  const ir = (r: Resultado) => {
    setOpen(false);
    router.push(r.href);
  };

  const onKeyInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = resultados[activo];
      if (r) ir(r);
    }
  };

  if (!open) return null;

  let cursor = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda global"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-indigo-400/30 bg-bg/95 shadow-2xl backdrop-blur-glass"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-indigo-400/15 px-4 py-3">
          <Search size={16} className="text-text-lo" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyInput}
            placeholder="Buscar clientes, citas, tareas, finanzas o documentos…"
            className="flex-1 bg-transparent text-sm text-text-hi outline-none placeholder:text-text-lo"
          />
          {cargando && <Loader2 size={14} className="animate-spin text-text-lo" />}
          <kbd className="hidden rounded border border-indigo-400/25 bg-indigo-900/40 px-1.5 py-0.5 text-[10px] text-text-mid sm:inline">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {resultados.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-lo">
              {query.length < 2 ? "Escribe al menos 2 caracteres para buscar." : "Sin resultados."}
            </div>
          ) : (
            Array.from(grupos.entries()).map(([tipo, items]) => (
              <div key={tipo} className="px-2 pb-2">
                <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-lo">
                  {ETIQUETA_TIPO[tipo]}
                </div>
                {items.map((r) => {
                  const idx = cursor++;
                  const seleccionado = idx === activo;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onMouseEnter={() => setActivo(idx)}
                      onClick={() => ir(r)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                        seleccionado
                          ? "bg-cyan/15 text-cyan"
                          : "text-text-hi hover:bg-indigo-900/40"
                      }`}
                    >
                      <r.Icon size={15} className={seleccionado ? "text-cyan" : "text-text-mid"} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.titulo}</div>
                        {r.subtitulo && (
                          <div className="truncate text-xs text-text-mid">{r.subtitulo}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-indigo-400/15 px-3 py-2 text-[10px] text-text-lo">
          <span>
            <kbd className="rounded border border-indigo-400/25 bg-indigo-900/40 px-1 py-0.5">↑↓</kbd>{" "}
            navegar ·{" "}
            <kbd className="rounded border border-indigo-400/25 bg-indigo-900/40 px-1 py-0.5">↵</kbd>{" "}
            abrir
          </span>
          <span>
            <kbd className="rounded border border-indigo-400/25 bg-indigo-900/40 px-1 py-0.5">⌘</kbd>+
            <kbd className="rounded border border-indigo-400/25 bg-indigo-900/40 px-1 py-0.5">K</kbd>{" "}
            para reabrir
          </span>
        </div>
      </div>
    </div>
  );
}

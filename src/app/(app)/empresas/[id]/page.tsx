"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Globe, Phone, Mail, MapPin,
  Trash2, Users2, Network, Info, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip } from "@/components/ui/Tooltip";
import { InfoTab } from "@/components/empresas/InfoTab";
import { ContactosTab } from "@/components/empresas/ContactosTab";
import { HierarchyChart } from "@/components/empresas/HierarchyChart";
import { Skeleton } from "@/components/empresas/Skeleton";
import type { Empresa, Contacto } from "@/components/empresas/types";

type Tab = "info" | "contactos" | "jerarquia";

const TABS: { id: Tab; label: string; Icon: typeof Info }[] = [
  { id: "info",      label: "Información",          Icon: Info },
  { id: "contactos", label: "Contactos",            Icon: Users2 },
  { id: "jerarquia", label: "Estructura jerárquica", Icon: Network },
];

const ESTADO_STYLES = {
  activa:    "border-ok/40 bg-ok/10 text-ok",
  prospecto: "border-cyan/40 bg-cyan/10 text-cyan",
  inactiva:  "border-warn/40 bg-warn/10 text-warn",
} as const;

export default function EmpresaPerfilPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("info");
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: emp }, { data: cts }] = await Promise.all([
        supabase.from("empresas").select("*").eq("id", id).single(),
        supabase
          .from("contactos_empresa")
          .select("*")
          .eq("empresa_id", id)
          .order("created_at", { ascending: true }),
      ]);
      setEmpresa(emp as Empresa | null);
      setContactos((cts ?? []) as Contacto[]);
      setCargando(false);
    })();
  }, [id, supabase]);

  const eliminar = async () => {
    if (!empresa) return;
    if (!confirm(`¿Eliminar a "${empresa.nombre}"? Se borrarán también todos sus contactos.`)) return;
    await supabase.from("empresas").delete().eq("id", id);
    router.push("/empresas");
  };

  if (cargando) return <PerfilSkeleton />;

  if (!empresa) {
    return (
      <div className="card-glass flex flex-col items-center gap-3 py-14 text-center">
        <Building2 size={28} className="text-indigo-300" />
        <p className="text-text-mid">Empresa no encontrada.</p>
        <Link href="/empresas" className="text-cyan hover:underline">
          Volver a empresas
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/empresas"
        className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
      >
        <ArrowLeft size={14} /> Empresas
      </Link>

      {/* Header */}
      <div className="card-glass overflow-hidden">
        <div className="rainbow-bar" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 font-display text-2xl font-bold uppercase text-indigo-300">
            {empresa.nombre.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-text-hi">{empresa.nombre}</h1>
              <span
                className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold capitalize ${ESTADO_STYLES[empresa.estado]}`}
              >
                {empresa.estado}
              </span>
            </div>
            <div className="accent-bar mt-1.5" style={{ width: 48 }} />
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-lo">
              {empresa.cif && <span>CIF: {empresa.cif}</span>}
              {empresa.sector && <span>· {empresa.sector}</span>}
              {empresa.ciudad && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {empresa.ciudad}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {empresa.sitio_web && (
              <Tooltip text="Abrir sitio web" side="bottom">
                <a
                  href={empresa.sitio_web.startsWith("http") ? empresa.sitio_web : `https://${empresa.sitio_web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                >
                  <Globe size={16} />
                </a>
              </Tooltip>
            )}
            {empresa.telefono && (
              <Tooltip text="Llamar" side="bottom">
                <a
                  href={`tel:${empresa.telefono}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                >
                  <Phone size={16} />
                </a>
              </Tooltip>
            )}
            {empresa.email && (
              <Tooltip text="Enviar email" side="bottom">
                <a
                  href={`mailto:${empresa.email}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                >
                  <Mail size={16} />
                </a>
              </Tooltip>
            )}
            <Tooltip text="Eliminar empresa" side="bottom">
              <button
                onClick={eliminar}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-danger/40 hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-t border-indigo-400/10 px-2">
          {TABS.map(({ id: tid, label, Icon }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                tab === tid
                  ? "border-b-2 border-cyan text-text-hi"
                  : "text-text-lo hover:text-text-mid"
              }`}
            >
              <Icon size={14} />
              {label}
              {tid === "contactos" && contactos.length > 0 && (
                <span className="ml-1 rounded-full border border-indigo-400/30 bg-indigo-900/50 px-1.5 py-0.5 text-[0.6rem] font-bold text-indigo-300">
                  {contactos.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {tab === "info" && <InfoTab empresa={empresa} onUpdate={setEmpresa} />}

      {tab === "contactos" && (
        <ContactosTab
          empresaId={empresa.id}
          negocioId={empresa.negocio_id}
          contactos={contactos}
          onChange={setContactos}
        />
      )}

      {tab === "jerarquia" && (
        <HierarchyChart
          contactos={contactos}
          onAddFirst={() => setTab("contactos")}
        />
      )}
    </div>
  );
}

function PerfilSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-5 w-24" />
      <div className="card-glass overflow-hidden">
        <div className="rainbow-bar" />
        <div className="flex items-center gap-4 p-6">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Loader2 className="animate-spin text-indigo-400/60" />
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

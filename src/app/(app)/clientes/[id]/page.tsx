"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, Calendar, Info, FileText, Wallet,
  Phone, Mail, MessageCircle, Loader2, Trash2, Building2, Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip } from "@/components/ui/Tooltip";
import { InfoTab } from "@/components/clientes/InfoTab";
import { ContactosTab } from "@/components/clientes/ContactosTab";
import { TabHistorial } from "@/components/crm/TabHistorial";
import { TabDocumentos } from "@/components/crm/TabDocumentos";
import { TabMovimientos } from "@/components/crm/TabMovimientos";
import type { Cliente, Contacto } from "@/components/clientes/types";
import { ESTADO_CLIENTE_BADGE } from "@/lib/ui-constants";

type Tab = "info" | "contactos" | "citas" | "documentos" | "movimientos";

const TABS: { id: Tab; label: string; Icon: typeof Info; tooltip: string }[] = [
  { id: "info",        label: "Información", Icon: Info,     tooltip: "Datos fiscales y de contacto." },
  { id: "contactos",   label: "Contactos",   Icon: Users,    tooltip: "Personas dentro de esta empresa." },
  { id: "citas",       label: "Historial",   Icon: Calendar, tooltip: "Citas pasadas y futuras." },
  { id: "documentos",  label: "Documentos",  Icon: FileText, tooltip: "Facturas, presupuestos y albaranes." },
  { id: "movimientos", label: "Movimientos", Icon: Wallet,   tooltip: "Ingresos y gastos asociados." },
];

export default function FichaClientePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("info");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();
      setCliente((data as Cliente | null) ?? null);
      setCargando(false);
    })();
  }, [id, supabase]);

  const eliminar = async () => {
    if (!cliente) return;
    if (!confirm(`¿Eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`)) return;
    await supabase.from("clientes").delete().eq("id", id);
    router.push("/clientes");
  };

  if (cargando) {
    return (
      <div className="flex h-64 items-center justify-center text-text-lo">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }
  if (!cliente) {
    return (
      <div className="text-center text-text-mid">
        <p>Cliente no encontrado.</p>
        <Link href="/clientes" className="text-cyan hover:underline">Volver</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
      >
        <ArrowLeft size={14} /> Clientes
      </Link>

      {/* Header de la ficha */}
      <div className="card-glass overflow-hidden">
        <div className="rainbow-bar" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-900/40 font-display text-2xl font-bold uppercase text-indigo-300">
            {cliente.nombre.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-text-hi">{cliente.nombre}</h1>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ESTADO_CLIENTE_BADGE[cliente.estado]}`}>
                {cliente.estado}
              </span>
            </div>
            <div className="accent-bar mt-1.5" style={{ width: 48 }} />
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-lo">
              {cliente.cif && <span className="inline-flex items-center gap-1"><Building2 size={11} /> {cliente.cif}</span>}
              {cliente.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {cliente.email}</span>}
              {cliente.telefono && <span className="inline-flex items-center gap-1"><Phone size={11} /> {cliente.telefono}</span>}
              {cliente.sitio_web && <span className="inline-flex items-center gap-1"><Globe size={11} /> {cliente.sitio_web}</span>}
            </div>
          </div>
          {/* Acciones rápidas */}
          <div className="flex items-center gap-2">
            {cliente.telefono && (
              <>
                <Tooltip text="Llamar" side="bottom">
                  <a
                    href={`tel:${cliente.telefono}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                  >
                    <Phone size={16} />
                  </a>
                </Tooltip>
                <Tooltip text="WhatsApp" side="bottom">
                  <a
                    href={`https://wa.me/${cliente.telefono.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-ok/40 hover:text-ok"
                  >
                    <MessageCircle size={16} />
                  </a>
                </Tooltip>
              </>
            )}
            {cliente.email && (
              <Tooltip text="Enviar email" side="bottom">
                <a
                  href={`mailto:${cliente.email}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-900/40 text-indigo-300 hover:border-cyan/40 hover:text-cyan"
                >
                  <Mail size={16} />
                </a>
              </Tooltip>
            )}
            <Tooltip text="Eliminar cliente" side="bottom">
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
          {TABS.map(({ id: tid, label, Icon, tooltip }) => (
            <Tooltip key={tid} text={tooltip} side="bottom">
              <button
                onClick={() => setTab(tid)}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  tab === tid
                    ? "border-b-2 border-cyan text-text-hi"
                    : "text-text-lo hover:text-text-mid"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Contenido de la pestaña */}
      {tab === "info"      && <InfoTab cliente={cliente} onUpdate={setCliente} />}
      {tab === "contactos" && <ContactosTabWrapper clienteId={id} negocioId={cliente.negocio_id} />}
      {tab === "citas"     && <TabHistorial clienteId={id} clienteNombre={cliente.nombre} />}
      {tab === "documentos" && <TabDocumentos clienteId={id} clienteNombre={cliente.nombre} />}
      {tab === "movimientos" && <TabMovimientos clienteId={id} clienteNombre={cliente.nombre} />}
    </div>
  );
}

function ContactosTabWrapper({ clienteId, negocioId }: { clienteId: string; negocioId: string }) {
  const supabase = createClient();
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [cargando, setCargando]   = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contactos_cliente")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("nombre", { ascending: true });
      setContactos((data as Contacto[] | null) ?? []);
      setCargando(false);
    })();
  }, [clienteId, supabase]);

  if (cargando) {
    return (
      <div className="card-glass flex items-center gap-2 p-6 text-sm text-text-mid">
        <Loader2 className="animate-spin" size={14} /> Cargando contactos…
      </div>
    );
  }
  return (
    <ContactosTab
      clienteId={clienteId}
      negocioId={negocioId}
      contactos={contactos}
      onChange={setContactos}
    />
  );
}

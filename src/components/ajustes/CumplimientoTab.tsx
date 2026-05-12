"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  Cookie,
  Scale,
  ScrollText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Ban,
  Archive,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Vigente = {
  id: string;
  tipo: string;
  texto_version: string;
  aceptado: boolean;
  fecha: string;
  vigente: boolean;
  revocado_en: string | null;
};

const DOCS: { href: string; label: string; desc: string; Icon: typeof FileText }[] = [
  {
    href: "/legal/privacidad",
    label: "Política de privacidad",
    desc: "Tratamiento de datos personales conforme al RGPD y la LOPDGDD.",
    Icon: ShieldCheck,
  },
  {
    href: "/legal/cookies",
    label: "Política de cookies",
    desc: "Cookies técnicas, de preferencias y analíticas que utiliza el servicio.",
    Icon: Cookie,
  },
  {
    href: "/legal/aviso-legal",
    label: "Aviso legal",
    desc: "Identificación del responsable y condiciones de uso del sitio.",
    Icon: Scale,
  },
  {
    href: "/legal/terminos",
    label: "Términos del servicio",
    desc: "Condiciones contractuales de R3ZON Business OS.",
    Icon: ScrollText,
  },
];

const TIPOS_REVOCABLES = new Set(["cookies", "marketing"]);

export function CumplimientoTab() {
  const supabase = createClient();
  const [rows, setRows] = useState<Vigente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTipo, setBusyTipo] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const flash = (t: typeof toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3500);
  };

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("v_consentimientos_negocio")
      .select("id, tipo, texto_version, aceptado, fecha, vigente, revocado_en")
      .order("tipo");
    if (!error) setRows((data as Vigente[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportarDatos = async () => {
    setExportando(true);
    try {
      const [
        { data: clientes },
        { data: finanzas },
        { data: tareas },
        { data: documentos },
        { data: citas },
        { data: comunicaciones },
        { data: consentimientos },
      ] = await Promise.all([
        supabase.from("clientes").select("*").order("created_at"),
        supabase.from("finanzas").select("*").order("fecha"),
        supabase.from("tareas_kanban").select("*").order("created_at"),
        supabase.from("documentos").select("*").order("created_at"),
        supabase.from("agenda_eventos").select("*").order("start_time"),
        supabase.from("comunicaciones").select("*").order("created_at"),
        supabase.from("v_consentimientos_negocio").select("*"),
      ]);

      const { zipSync, strToU8 } = await import("fflate");
      const fecha = new Date().toISOString().slice(0, 10);
      const encode = (obj: unknown) => strToU8(JSON.stringify(obj, null, 2));
      const zip = zipSync({
        "clientes.json":       encode(clientes ?? []),
        "finanzas.json":       encode(finanzas ?? []),
        "tareas.json":         encode(tareas ?? []),
        "documentos.json":     encode(documentos ?? []),
        "citas.json":          encode(citas ?? []),
        "comunicaciones.json": encode(comunicaciones ?? []),
        "consentimientos.json":encode(consentimientos ?? []),
        "exportado.txt":       strToU8(`Exportación R3ZON Business OS — ${fecha}\nContenido: todos los datos del negocio en formato JSON.\n`),
      });
      const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `r3zon-mis-datos-${fecha}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      flash({ kind: "ok", msg: "Datos exportados correctamente." });
    } catch {
      flash({ kind: "err", msg: "No se pudo generar la exportación." });
    }
    setExportando(false);
  };

  const revocar = async (tipo: string) => {
    if (!confirm(`¿Revocar el consentimiento de "${tipo}"?`)) return;
    setBusyTipo(tipo);
    const { error } = await supabase.rpc("revocar_consentimiento", { p_tipo: tipo });
    setBusyTipo(null);
    if (error) {
      flash({ kind: "err", msg: error.message });
      return;
    }
    flash({ kind: "ok", msg: "Consentimiento revocado." });
    void cargar();
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="card-glass p-5 sm:p-7">
        <div className="section-label mb-4">Documentos legales</div>
        <p className="mb-4 text-xs text-text-mid">
          Enlaces públicos a los documentos que rigen el servicio. Cualquier
          actualización queda registrada con número de versión y fecha de
          publicación.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {DOCS.map(({ href, label, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              target="_blank"
              className="group flex items-start gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-900/30 p-4 transition hover:border-cyan/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
                <Icon size={18} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-semibold text-text-hi">
                  {label}
                  <ExternalLink
                    size={12}
                    className="text-text-lo group-hover:text-cyan"
                  />
                </div>
                <p className="mt-1 text-xs text-text-mid">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card-glass p-5 sm:p-7">
        <div className="section-label mb-4">Consentimientos registrados</div>
        <p className="mb-4 text-xs text-text-mid">
          Registro de los consentimientos aceptados por el titular del negocio
          durante el onboarding. Cada entrada incluye versión del documento,
          fecha y firma de evidencia (IP y user agent).
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-text-mid">
            <Loader2 className="animate-spin" size={14} /> Cargando…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-4 text-sm italic text-text-lo">
            Aún no hay consentimientos registrados para este negocio.
          </div>
        ) : (
          <ul className="divide-y divide-indigo-400/10 overflow-hidden rounded-2xl border border-indigo-400/15">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-indigo-900/20 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize text-text-hi">
                      {r.tipo}
                    </span>
                    {r.vigente ? (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                        Vigente
                      </span>
                    ) : r.revocado_en ? (
                      <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-200">
                        Revocado
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                        Rechazado
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-text-lo">
                    Versión {r.texto_version} · {new Date(r.fecha).toLocaleString("es-ES")}
                  </div>
                </div>
                {r.vigente && TIPOS_REVOCABLES.has(r.tipo) && (
                  <button
                    type="button"
                    onClick={() => revocar(r.tipo)}
                    disabled={busyTipo === r.tipo}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-200 hover:border-rose-400/70 disabled:opacity-50"
                  >
                    {busyTipo === r.tipo ? (
                      <Loader2 className="animate-spin" size={11} />
                    ) : (
                      <Ban size={11} />
                    )}
                    Revocar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="card-glass p-5 sm:p-7">
        <div className="section-label mb-2">Portabilidad de datos</div>
        <p className="mb-4 text-xs text-text-mid">
          Derecho de portabilidad (Art. 20 RGPD). Descarga todos tus datos en
          formato JSON comprimido. El archivo incluye clientes, finanzas, tareas,
          documentos, citas, comunicaciones y consentimientos.
        </p>
        <button
          type="button"
          onClick={exportarDatos}
          disabled={exportando}
          className="flex items-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-900/30 px-4 py-2.5 text-sm font-semibold text-indigo-200 hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
        >
          {exportando
            ? <><Loader2 className="animate-spin" size={15} /> Generando…</>
            : <><Archive size={15} /> Exportar mis datos (.zip)</>}
        </button>
      </div>
    </div>
  );
}

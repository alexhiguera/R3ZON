"use client";

import { useRef, useState } from "react";
import {
  Archive,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileJson,
  FileSpreadsheet,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { descargarCSV, parseCSV } from "@/lib/csv";
import { formatSupabaseError } from "@/lib/supabase-errors";

type Toast = { kind: "ok" | "err"; msg: string } | null;

const RECURSOS_EXPORT = [
  { key: "clientes",       label: "Clientes",       tabla: "clientes" },
  { key: "finanzas",       label: "Finanzas",       tabla: "finanzas" },
  { key: "tareas",         label: "Tareas",         tabla: "tareas_kanban" },
  { key: "documentos",     label: "Documentos",     tabla: "documentos" },
  { key: "citas",          label: "Citas",          tabla: "agenda_eventos" },
  { key: "comunicaciones", label: "Comunicaciones", tabla: "comunicaciones" },
] as const;

export function DatosTab() {
  const supabase = createClient();
  const [exportandoZip, setExportandoZip]   = useState(false);
  const [exportandoCSV, setExportandoCSV]   = useState<string | null>(null);
  const [importandoJSON, setImportandoJSON] = useState(false);
  const [importandoCSV, setImportandoCSV]   = useState(false);
  const [toast, setToast]                   = useState<Toast>(null);
  const refJson = useRef<HTMLInputElement>(null);
  const refCsv  = useRef<HTMLInputElement>(null);

  const flash = (t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 4000);
  };

  const exportarZIP = async () => {
    setExportandoZip(true);
    try {
      const peticiones = RECURSOS_EXPORT.map((r) =>
        supabase.from(r.tabla).select("*"),
      );
      peticiones.push(supabase.from("v_consentimientos_negocio").select("*"));
      const resultados = await Promise.all(peticiones);

      const { zipSync, strToU8 } = await import("fflate");
      const fecha = new Date().toISOString().slice(0, 10);
      const encode = (obj: unknown) => strToU8(JSON.stringify(obj, null, 2));
      const archivos: Record<string, Uint8Array> = {};
      RECURSOS_EXPORT.forEach((r, idx) => {
        archivos[`${r.key}.json`] = encode(resultados[idx].data ?? []);
      });
      archivos["consentimientos.json"] = encode(resultados[RECURSOS_EXPORT.length].data ?? []);
      archivos["exportado.txt"] = strToU8(
        `Exportación R3ZON ANTARES — ${fecha}\nFormato: JSON.\n`,
      );
      const zip = zipSync(archivos);
      descargarBlob(new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" }), `r3zon-mis-datos-${fecha}.zip`);
      flash({ kind: "ok", msg: "Exportación completada." });
    } catch {
      flash({ kind: "err", msg: "No se pudo generar el ZIP." });
    }
    setExportandoZip(false);
  };

  const exportarCSV = async (key: typeof RECURSOS_EXPORT[number]["key"]) => {
    const meta = RECURSOS_EXPORT.find((r) => r.key === key)!;
    setExportandoCSV(key);
    const { data, error } = await supabase.from(meta.tabla).select("*");
    if (error || !data || data.length === 0) {
      flash({ kind: "err", msg: error?.message ?? "Sin datos para exportar." });
      setExportandoCSV(null);
      return;
    }
    descargarCSV(data as Record<string, unknown>[], `${meta.key}-${new Date().toISOString().slice(0, 10)}.csv`);
    setExportandoCSV(null);
  };

  const importarJSON = async (file: File) => {
    setImportandoJSON(true);
    try {
      const texto = await file.text();
      const datos = JSON.parse(texto) as Record<string, unknown[]>;
      // Detecta forma: si es un array directo asumimos que el filename indica el tipo.
      // Si es un objeto con keys conocidas, hace import multi-tabla.
      let totalInsertados = 0;
      const errores: string[] = [];

      const tablasImportables: Record<string, string> = {
        clientes:       "clientes",
        finanzas:       "finanzas",
        tareas:         "tareas_kanban",
        comunicaciones: "comunicaciones",
      };

      const procesar = async (clave: string, filas: unknown[]) => {
        const tabla = tablasImportables[clave];
        if (!tabla || !Array.isArray(filas) || filas.length === 0) return;
        // Limpia campos generados por el sistema.
        const limpias = (filas as Record<string, unknown>[]).map((f) => {
          const copia = { ...f };
          delete copia.id;
          delete copia.created_at;
          delete copia.updated_at;
          return copia;
        });
        const { error } = await supabase.from(tabla).insert(limpias);
        if (error) errores.push(`${clave}: ${formatSupabaseError(error)}`);
        else totalInsertados += limpias.length;
      };

      if (Array.isArray(datos)) {
        const inferido = file.name.replace(/\.json$/i, "").replace(/-\d{4}-\d{2}-\d{2}$/, "");
        await procesar(inferido, datos);
      } else {
        for (const [clave, filas] of Object.entries(datos)) {
          if (Array.isArray(filas)) await procesar(clave, filas);
        }
      }

      if (errores.length > 0) {
        flash({ kind: "err", msg: `Importación parcial (${totalInsertados} filas). ${errores[0]}` });
      } else {
        flash({ kind: "ok", msg: `${totalInsertados} filas importadas correctamente.` });
      }
    } catch (e) {
      flash({ kind: "err", msg: e instanceof Error ? e.message : "JSON inválido." });
    }
    setImportandoJSON(false);
    if (refJson.current) refJson.current.value = "";
  };

  const importarCSV = async (file: File) => {
    setImportandoCSV(true);
    try {
      const texto = await file.text();
      const filas = parseCSV(texto);
      if (filas.length === 0) throw new Error("CSV vacío o sin cabecera.");
      // Heurística: si tiene "nombre" → clientes; si tiene "importe" → finanzas.
      const cabeceras = Object.keys(filas[0]);
      let tabla = "clientes";
      if (cabeceras.includes("importe") || cabeceras.includes("monto")) tabla = "finanzas";
      else if (cabeceras.includes("titulo") && !cabeceras.includes("nombre")) tabla = "tareas_kanban";

      // Sanea columnas no esperables.
      const limpias = filas.map((f) => {
        const copia: Record<string, string | number | null> = { ...f };
        delete copia.id;
        delete copia.created_at;
        delete copia.updated_at;
        // Strings vacíos → null
        for (const k of Object.keys(copia)) {
          if (copia[k] === "") copia[k] = null;
        }
        return copia;
      });
      const { error } = await supabase.from(tabla).insert(limpias);
      if (error) throw error;
      flash({ kind: "ok", msg: `${limpias.length} filas importadas a "${tabla}".` });
    } catch (e) {
      flash({ kind: "err", msg: e instanceof Error ? e.message : "Error en CSV." });
    }
    setImportandoCSV(false);
    if (refCsv.current) refCsv.current.value = "";
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

      {/* Exportación completa */}
      <div className="card-glass p-5 sm:p-7">
        <div className="section-label mb-2">Exportación completa (RGPD)</div>
        <p className="mb-4 text-xs text-text-mid">
          Descarga un archivo ZIP con todos los datos del negocio en formato JSON.
          Incluye clientes, finanzas, tareas, documentos, citas, comunicaciones y
          consentimientos.           Sirve como copia de seguridad.
        </p>
        <button
          type="button"
          onClick={exportarZIP}
          disabled={exportandoZip}
          className="flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-2.5 text-sm font-semibold text-cyan hover:bg-cyan/20 disabled:opacity-50"
        >
          {exportandoZip
            ? <><Loader2 className="animate-spin" size={15} /> Generando ZIP…</>
            : <><Archive size={15} /> Exportar ZIP completo</>}
        </button>
      </div>

      {/* Exportación CSV por recurso */}
      <div className="card-glass p-5 sm:p-7">
        <div className="section-label mb-2">Exportar por recurso (CSV)</div>
        <p className="mb-4 text-xs text-text-mid">
          Descarga cada tabla individualmente en CSV. Útil para importar en Excel,
          Google Sheets o contabilidades externas.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS_EXPORT.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => exportarCSV(r.key)}
              disabled={exportandoCSV === r.key}
              className="flex items-center justify-between gap-2 rounded-xl border border-indigo-400/25 bg-indigo-900/30 px-3 py-2.5 text-sm text-text-hi transition hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
            >
              <span className="flex items-center gap-2"><FileSpreadsheet size={14} /> {r.label}</span>
              {exportandoCSV === r.key ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            </button>
          ))}
        </div>
      </div>

      {/* Importación */}
      <div className="card-glass p-5 sm:p-7">
        <div className="section-label mb-2">Importar datos</div>
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          <div>
            Las importaciones añaden filas, <strong>no sobrescriben</strong>. Si
            importas un export anterior, podrías duplicar registros. Para
            migraciones grandes, revisa primero un fragmento.
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-hi">
              <FileJson size={15} className="text-fuchsia" /> JSON
            </div>
            <p className="mb-3 text-xs text-text-mid">
              Restaura desde un archivo generado por ANTARES. Acepta tanto el JSON
              individual de una tabla como el agrupado (`{`{clientes:[...], ...}`}`).
            </p>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-fuchsia/40 bg-fuchsia/10 px-3 py-2 text-xs font-semibold text-fuchsia hover:bg-fuchsia/20">
              {importandoJSON
                ? <><Loader2 size={13} className="animate-spin" /> Importando…</>
                : <><Upload size={13} /> Seleccionar JSON</>}
              <input
                ref={refJson}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void importarJSON(f); }}
              />
            </label>
          </div>

          <div className="rounded-xl border border-indigo-400/20 bg-indigo-900/30 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-hi">
              <FileSpreadsheet size={15} className="text-cyan" /> CSV / hoja de cálculo
            </div>
            <p className="mb-3 text-xs text-text-mid">
              Acepta CSV con separador <code>,</code> o <code>;</code>. La tabla
              destino se infiere de las cabeceras (clientes, finanzas, tareas).
            </p>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan hover:bg-cyan/20">
              {importandoCSV
                ? <><Loader2 size={13} className="animate-spin" /> Importando…</>
                : <><Upload size={13} /> Seleccionar CSV</>}
              <input
                ref={refCsv}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void importarCSV(f); }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function descargarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

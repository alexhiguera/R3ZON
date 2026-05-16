"use client";

import { Camera, CheckCircle, Loader2, RefreshCw, ScanLine, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ocrImagen } from "@/lib/ocr/engine";
import { parseSpanishReceipt, type ReceiptData } from "@/lib/ocr/parser";
import { createClient } from "@/lib/supabase/client";
import { useNegocioId } from "@/lib/useNegocioId";

type Estado = "idle" | "ocr" | "revisar" | "guardando" | "ok";

export default function OCRPage() {
  const router = useRouter();
  const negocioId = useNegocioId();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const [estado, setEstado] = useState<Estado>("idle");
  const [progress, setProgress] = useState(0);
  const [imagen, setImagen] = useState<string | null>(null);
  const [datos, setDatos] = useState<ReceiptData | null>(null);
  const [concepto, setConcepto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const procesar = async (file: File) => {
    setError(null);
    setEstado("ocr");
    setProgress(0);
    setImagen(URL.createObjectURL(file));
    try {
      const texto = await ocrImagen(file, setProgress);
      const parsed = parseSpanishReceipt(texto);
      const algoUtil =
        parsed.total !== null ||
        parsed.base !== null ||
        parsed.fecha !== null ||
        parsed.cif !== null;
      if (!algoUtil && texto.trim().length < 10) {
        setError(
          "No hemos podido leer texto en la imagen. Asegúrate de que está enfocada, con buena luz y que el ticket cabe entero.",
        );
        setEstado("idle");
        return;
      }
      setDatos(parsed);
      setEstado("revisar");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Error al procesar la imagen");
      setEstado("idle");
    }
  };

  const guardar = async () => {
    if (!datos) return;
    if (!negocioId) {
      setError("Cargando perfil del negocio… inténtalo en un segundo.");
      return;
    }
    setEstado("guardando");
    const supabase = createClient();
    const { error } = await supabase.from("finanzas").insert({
      // negocio_id explícito por si el trigger `tg_fill_negocio_id` no está aplicado.
      negocio_id: negocioId,
      tipo: "gasto",
      concepto: concepto || "Gasto escaneado",
      fecha: datos.fecha ?? new Date().toISOString().slice(0, 10),
      base_imponible: datos.base ?? datos.total ?? 0,
      iva_porcentaje: datos.iva_porcentaje ?? 21,
      irpf_porcentaje: 0,
      metodo_pago: "tarjeta",
      estado_pago: "pagado",
      ocr_extraido: { ...datos, cif: datos.cif },
    });
    if (error) {
      setError(error.message);
      setEstado("revisar");
      return;
    }
    setEstado("ok");
    setTimeout(() => router.push("/finanzas"), 800);
  };

  const reset = () => {
    setEstado("idle");
    setImagen(null);
    setDatos(null);
    setConcepto("");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Captura"
        title="Escanear ticket o factura"
        description="Hazle una foto a tu ticket. Lo leemos en tu teléfono — nada sale del dispositivo hasta que lo guardes."
      />

      {/* Los inputs viven fuera del condicional: en móvil, si se desmontan
          mientras el usuario está en el selector nativo, Safari/Chrome
          cancelan la selección (parpadeo + acción descartada). */}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) procesar(f);
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) procesar(f);
        }}
      />

      {estado === "idle" && error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {estado === "idle" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            Icon={Camera}
            label="Hacer foto"
            sub="Usa tu cámara"
            onClick={() => camRef.current?.click()}
            accent="cyan"
          />
          <ActionCard
            Icon={Upload}
            label="Subir imagen"
            sub="JPG o PNG"
            onClick={() => fileRef.current?.click()}
            accent="fuchsia"
          />
        </div>
      )}

      {estado === "ocr" && (
        <div className="card-glass p-5 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan">
            <ScanLine size={22} className="animate-pulse" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Leyendo tu ticket…</h2>
          <p className="mt-1 text-sm text-text-mid">
            Esto pasa solo en tu navegador. Sin servidores, sin coste.
          </p>
          <div className="mx-auto mt-6 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-indigo-900/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-fuchsia transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-text-lo">{progress}%</p>
        </div>
      )}

      {(estado === "revisar" || estado === "guardando") && datos && (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          {imagen && (
            <div className="card-glass overflow-hidden p-3">
              <img
                src={imagen}
                alt="Foto del ticket escaneado"
                className="max-h-[400px] w-full rounded-xl object-contain"
              />
            </div>
          )}

          <div className="card-glass overflow-hidden">
            <div className="rainbow-bar" />
            <div className="p-5 sm:p-6">
              <div className="section-label mb-2">Revisa los datos</div>
              <h2 className="font-display text-xl font-bold">¿Está todo bien?</h2>
              <p className="mt-1 text-xs text-text-mid">
                Hemos leído lo que pone en el ticket. Cambia lo que necesites antes de guardar.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Concepto"
                  value={concepto}
                  onChange={setConcepto}
                  placeholder="Ej: Comida con cliente"
                  full
                />
                <Field
                  label="Fecha"
                  type="date"
                  value={datos.fecha ?? ""}
                  onChange={(v) => setDatos({ ...datos, fecha: v })}
                />
                <Field
                  label="CIF/NIF emisor"
                  value={datos.cif ?? ""}
                  onChange={(v) => setDatos({ ...datos, cif: v })}
                  placeholder="B12345678"
                />
                <Field
                  label="Base (sin IVA)"
                  type="number"
                  step="0.01"
                  value={datos.base?.toString() ?? ""}
                  onChange={(v) => setDatos({ ...datos, base: parseFloat(v) || 0 })}
                />
                <Field
                  label="IVA %"
                  type="number"
                  value={datos.iva_porcentaje?.toString() ?? "21"}
                  onChange={(v) => setDatos({ ...datos, iva_porcentaje: parseFloat(v) || 0 })}
                />
                <Field
                  label="Total con IVA"
                  type="number"
                  step="0.01"
                  value={datos.total?.toString() ?? ""}
                  onChange={(v) => setDatos({ ...datos, total: parseFloat(v) || 0 })}
                  full
                  highlight
                />
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  onClick={reset}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-900/40 text-sm font-semibold text-text-mid hover:border-indigo-400/40"
                >
                  <RefreshCw size={15} /> Otro ticket
                </button>
                <button
                  onClick={guardar}
                  disabled={estado === "guardando"}
                  className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia text-sm font-bold text-bg disabled:opacity-50"
                >
                  {estado === "guardando" ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  Guardar gasto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {estado === "ok" && (
        <div className="card-glass flex flex-col items-center gap-3 p-6 text-center sm:p-10">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ok/30 bg-ok/10 text-ok">
            <CheckCircle size={24} />
          </span>
          <h2 className="font-display text-xl font-bold">¡Guardado!</h2>
          <p className="text-sm text-text-mid">Te llevamos a tus finanzas…</p>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  Icon,
  label,
  sub,
  onClick,
  accent,
}: {
  Icon: typeof Camera;
  label: string;
  sub: string;
  onClick: () => void;
  accent: "cyan" | "fuchsia";
}) {
  const cls =
    accent === "cyan"
      ? "border-cyan/30 bg-cyan/10 text-cyan"
      : "border-fuchsia/30 bg-fuchsia/10 text-fuchsia";
  return (
    <button
      onClick={onClick}
      className="card-glass flex flex-col items-center gap-3 p-6 transition-all hover:-translate-y-0.5 active:scale-[0.99] sm:p-8"
    >
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${cls}`}>
        <Icon size={22} />
      </span>
      <div className="text-center">
        <div className="font-display text-lg font-bold text-text-hi">{label}</div>
        <div className="text-xs text-text-lo">{sub}</div>
      </div>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
  full,
  highlight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  full?: boolean;
  highlight?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "col-span-2" : ""}`}>
      <span className="text-[0.68rem] font-medium uppercase tracking-wider text-text-lo">
        {label}
      </span>
      <input
        type={type}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 rounded-xl border px-3 text-sm text-text-hi placeholder:text-text-lo focus:outline-none focus:ring-2 ${
          highlight
            ? "border-cyan/40 bg-cyan/5 font-display font-bold focus:border-cyan focus:ring-cyan/20"
            : "border-indigo-400/20 bg-indigo-900/30 focus:border-cyan/50 focus:ring-cyan/20"
        }`}
      />
    </label>
  );
}

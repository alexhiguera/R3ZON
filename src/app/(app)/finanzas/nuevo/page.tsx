"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NuevoMovimiento() {
  const router = useRouter();
  const [tipo, setTipo] = useState<"ingreso" | "gasto">("ingreso");
  const [concepto, setConcepto] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [base, setBase] = useState("");
  const [iva, setIva] = useState("21");
  const [irpf, setIrpf] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("finanzas").insert({
      tipo,
      concepto,
      fecha,
      base_imponible: parseFloat(base) || 0,
      iva_porcentaje: parseFloat(iva) || 0,
      irpf_porcentaje: parseFloat(irpf) || 0,
      metodo_pago: "transferencia",
      estado_pago: "pagado",
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/finanzas");
  };

  const baseN = parseFloat(base) || 0;
  const ivaN = (baseN * (parseFloat(iva) || 0)) / 100;
  const irpfN = (baseN * (parseFloat(irpf) || 0)) / 100;
  const total = baseN + ivaN - irpfN;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Link
        href="/finanzas"
        className="inline-flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi"
      >
        <ArrowLeft size={14} /> Volver
      </Link>

      <PageHeader
        eyebrow="Apuntar movimiento"
        title={tipo === "ingreso" ? "Has cobrado algo" : "Has hecho un gasto"}
        description="Solo lo imprescindible. Haremos las cuentas por ti."
      />

      <div className="card-glass p-5 sm:p-6">
        {/* Toggle tipo */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-indigo-400/15 bg-indigo-900/30 p-1">
          <Toggle
            active={tipo === "ingreso"}
            Icon={TrendingUp}
            label="He cobrado"
            color="ok"
            onClick={() => setTipo("ingreso")}
          />
          <Toggle
            active={tipo === "gasto"}
            Icon={TrendingDown}
            label="He gastado"
            color="fuchsia"
            onClick={() => setTipo("gasto")}
          />
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <Input label="¿En qué?" value={concepto} onChange={setConcepto} placeholder="Ej: Trabajo para Juan" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha" type="date" value={fecha} onChange={setFecha} required />
            <Input label="Cantidad sin IVA (€)" type="number" step="0.01" value={base} onChange={setBase} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="IVA %" type="number" value={iva} onChange={setIva} />
            <Input label="IRPF %" type="number" value={irpf} onChange={setIrpf} />
          </div>

          <div className="rounded-2xl border border-cyan/25 bg-cyan/5 p-4">
            <div className="section-label mb-1">Total {tipo === "ingreso" ? "que cobras" : "que pagas"}</div>
            <div className="font-display text-2xl font-bold text-text-hi">
              {total.toFixed(2).replace(".", ",")} €
            </div>
            <div className="mt-1 text-[0.7rem] text-text-lo">
              Base {baseN.toFixed(2)} € + IVA {ivaN.toFixed(2)} € − IRPF {irpfN.toFixed(2)} €
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-fuchsia text-sm font-bold text-bg disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}

function Toggle({
  active,
  Icon,
  label,
  color,
  onClick,
}: {
  active: boolean;
  Icon: typeof TrendingUp;
  label: string;
  color: "ok" | "fuchsia";
  onClick: () => void;
}) {
  const accent =
    color === "ok" ? "text-ok bg-ok/10 border-ok/30" : "text-fuchsia bg-fuchsia/10 border-fuchsia/30";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all ${
        active ? accent : "border-transparent text-text-mid hover:text-text-hi"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.7rem] font-medium uppercase tracking-wider text-text-lo">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-12 rounded-xl border border-indigo-400/20 bg-indigo-900/30 px-4 text-sm text-text-hi placeholder:text-text-lo focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
      />
    </label>
  );
}

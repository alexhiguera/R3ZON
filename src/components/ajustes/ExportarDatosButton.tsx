"use client";

import { useState } from "react";
import { Loader2, Download, AlertCircle } from "lucide-react";
import { exportarMisDatos } from "@/lib/rgpd/exportar-datos";

export function ExportarDatosButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const { blob, filename } = await exportarMisDatos();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo generar el ZIP. Inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-2.5 text-sm font-bold text-cyan transition hover:border-cyan/70 hover:bg-cyan/15 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={15} />
        ) : (
          <Download size={15} />
        )}
        {loading ? "Generando ZIP…" : "Exportar mis datos"}
      </button>
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
        >
          <AlertCircle size={13} />
          {error}
        </div>
      )}
    </div>
  );
}

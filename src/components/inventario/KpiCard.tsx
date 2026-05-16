import { Boxes } from "lucide-react";

const MAP = {
  ok: "border-ok/30 bg-ok/10 text-ok",
  warn: "border-warn/30 bg-warn/10 text-warn",
  danger: "border-danger/30 bg-danger/10 text-danger",
} as const;

export function KpiCard({
  label,
  valor,
  tono,
}: {
  label: string;
  valor: number;
  tono: keyof typeof MAP;
}) {
  return (
    <div className="card-glass p-4">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${MAP[tono]}`}>
          <Boxes size={14} />
        </span>
      </div>
      <div className="mt-2 font-display text-3xl font-bold text-text-hi">{valor}</div>
    </div>
  );
}

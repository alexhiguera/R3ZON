"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useThemeColors } from "@/lib/theme/useThemeColors";

export function MonthlyBars({
  data,
}: {
  data: { mes: string; ganado: number; gastado: number }[];
}) {
  const c = useThemeColors();
  const axis = { fill: c.axis, fontSize: 11 };
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="mes" tick={axis} axisLine={{ stroke: c.grid }} tickLine={false} />
        <YAxis
          tick={axis}
          axisLine={{ stroke: c.grid }}
          tickLine={false}
          tickFormatter={(v) => `${v}€`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: c.cursorBg }} />
        <Legend wrapperStyle={{ fontSize: 12, color: c.indigo300, paddingTop: 8 }} />
        <Bar dataKey="ganado" name="Lo que has ganado" fill={c.cyan} radius={[6, 6, 0, 0]} />
        <Bar dataKey="gastado" name="Lo que has gastado" fill={c.fuchsia} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TaxLine({ data }: { data: { mes: string; iva: number; irpf: number }[] }) {
  const c = useThemeColors();
  const axis = { fill: c.axis, fontSize: 11 };
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="mes" tick={axis} axisLine={{ stroke: c.grid }} tickLine={false} />
        <YAxis
          tick={axis}
          axisLine={{ stroke: c.grid }}
          tickLine={false}
          tickFormatter={(v) => `${v}€`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: c.indigo300, paddingTop: 8 }} />
        <Line
          type="monotone"
          dataKey="iva"
          name="IVA a pagar"
          stroke={c.cyan}
          strokeWidth={2.5}
          dot={{ r: 4, stroke: c.bg, strokeWidth: 2, fill: c.cyan }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="irpf"
          name="IRPF retenido"
          stroke={c.fuchsia}
          strokeWidth={2.5}
          dot={{ r: 4, stroke: c.bg, strokeWidth: 2, fill: c.fuchsia }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

type TooltipPayload = {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}) {
  const c = useThemeColors();
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgb(var(--indigo-900) / 0.96)",
        border: `1px solid ${c.indigo600}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ color: c.indigo300, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} style={{ color: c.textHi, fontWeight: 500 }}>
          <span style={{ color: p.color, fontWeight: 700 }}>● </span>
          {p.name}: <b>{Number(p.value).toFixed(2)} €</b>
        </div>
      ))}
    </div>
  );
}

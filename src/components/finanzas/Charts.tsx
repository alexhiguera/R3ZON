"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const AXIS = { fill: "#818cf8", fontSize: 11 };
const GRID = "rgba(99,102,241,0.12)";

export function MonthlyBars({
  data,
}: {
  data: { mes: string; ganado: number; gastado: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="mes" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis
          tick={AXIS}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          tickFormatter={(v) => `${v}€`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#a5b4fc", paddingTop: 8 }} />
        <Bar dataKey="ganado"  name="Lo que has ganado"   fill="#22d3ee" radius={[6, 6, 0, 0]} />
        <Bar dataKey="gastado" name="Lo que has gastado" fill="#e879f9" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TaxLine({
  data,
}: {
  data: { mes: string; iva: number; irpf: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="mes" tick={AXIS} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis
          tick={AXIS}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          tickFormatter={(v) => `${v}€`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#a5b4fc", paddingTop: 8 }} />
        <Line
          type="monotone"
          dataKey="iva"
          name="IVA a pagar"
          stroke="#22d3ee"
          strokeWidth={2.5}
          dot={{ r: 4, stroke: "#080714", strokeWidth: 2, fill: "#22d3ee" }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="irpf"
          name="IRPF retenido"
          stroke="#e879f9"
          strokeWidth={2.5}
          dot={{ r: 4, stroke: "#080714", strokeWidth: 2, fill: "#e879f9" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(20,18,60,0.98)",
        border: "1px solid rgba(99,102,241,0.4)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ color: "#a5b4fc", marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: "#e0e7ff", fontWeight: 500 }}>
          <span style={{ color: p.color, fontWeight: 700 }}>● </span>
          {p.name}: <b>{Number(p.value).toFixed(2)} €</b>
        </div>
      ))}
    </div>
  );
}

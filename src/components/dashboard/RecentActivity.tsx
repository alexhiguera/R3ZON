"use client";

import { Activity, FileText, Mail, MessageCircle, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardActivityItem = {
  id: string;
  tipo: string;
  asunto: string | null;
  contenido: string | null;
  created_at: string;
  cliente_nombre: string | null;
};

const TIPO_META: Record<string, { Icon: LucideIcon; label: string; tint: string }> = {
  nota:           { Icon: FileText,      label: "Nota",       tint: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300" },
  email_click:    { Icon: Mail,          label: "Email",      tint: "border-cyan/30 bg-cyan/10 text-cyan" },
  whatsapp_click: { Icon: MessageCircle, label: "WhatsApp",   tint: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  webhook_fire:   { Icon: Zap,           label: "Webhook",    tint: "border-fuchsia/30 bg-fuchsia/10 text-fuchsia" },
};

function relativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return "ahora";
  if (min < 60) return `hace ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `hace ${d}d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function RecentActivity({
  items,
  loading,
}: {
  items: DashboardActivityItem[];
  loading?: boolean;
}) {
  return (
    <section className="card-glass p-5">
      <header className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-fuchsia/30 bg-fuchsia/10 text-fuchsia">
          <Activity size={15} />
        </span>
        <h3 className="font-display text-base font-bold text-text-hi">Actividad reciente</h3>
      </header>

      {loading ? (
        <SkeletonList />
      ) : items.length === 0 ? (
        <Empty text="Sin actividad reciente" />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.slice(0, 8).map((it) => {
            const meta = TIPO_META[it.tipo] ?? {
              Icon: Activity,
              label: it.tipo,
              tint: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
            };
            const Icon = meta.Icon;
            const titulo = it.asunto || it.contenido || meta.label;
            return (
              <li
                key={it.id}
                className="flex items-start gap-3 rounded-xl border border-indigo-400/15 bg-indigo-900/20 p-3"
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${meta.tint}`}>
                  <Icon size={13} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-text-mid">{meta.label}</span>
                    {it.cliente_nombre && (
                      <span className="truncate text-text-lo">· {it.cliente_nombre}</span>
                    )}
                  </div>
                  <div className="truncate text-sm text-text-hi">{titulo}</div>
                </div>
                <span className="shrink-0 text-xs text-text-lo">{relativo(it.created_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="h-12 animate-pulse rounded-xl border border-indigo-400/10 bg-indigo-900/20"
        />
      ))}
    </ul>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-indigo-400/20 p-6 text-center text-sm text-text-mid">
      {text}
    </div>
  );
}

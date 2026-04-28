import { PageHeader } from "./PageHeader";
import type { LucideIcon } from "lucide-react";

export function Placeholder({
  eyebrow,
  title,
  description,
  Icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="card-glass flex flex-col items-center justify-center gap-3 p-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/25 bg-indigo-900/40 text-indigo-300">
          <Icon size={24} />
        </span>
        <div className="font-display text-lg font-bold text-text-hi">Próximamente</div>
        <div className="max-w-md text-sm text-text-mid">
          Este módulo está conectado al esquema de base de datos. La interfaz se
          construirá en las siguientes iteraciones.
        </div>
      </div>
    </div>
  );
}

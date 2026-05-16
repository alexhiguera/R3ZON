import { Package, Plus } from "lucide-react";

export function EmptyState({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="card-glass flex flex-col items-center gap-3 py-12 text-center text-text-mid">
      <Package size={28} className="text-indigo-400/40" />
      <div className="font-display text-lg font-bold">Aún no hay nada en tu listado</div>
      <p className="max-w-xs text-sm">
        Empieza creando un producto o servicio. Aparecerán en TPV y Documentos.
      </p>
      <button
        onClick={onCrear}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-bold text-white"
      >
        <Plus size={15} /> Crear el primero
      </button>
    </div>
  );
}

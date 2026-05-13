import { Loader2 } from "lucide-react";

/**
 * Loading boundary del grupo (app). Se muestra mientras suspende un layout
 * o page del segmento, mostrando un skeleton glass alineado al design system.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
      <div className="card-glass flex items-center gap-3 px-6 py-5">
        <Loader2 className="animate-spin text-cyan" size={20} />
        <span className="text-sm font-medium text-text-mid">Cargando…</span>
      </div>
    </div>
  );
}

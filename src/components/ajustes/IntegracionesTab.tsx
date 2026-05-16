"use client";

import { GoogleCard } from "./GoogleCard";

export function IntegracionesTab() {
  return (
    <div className="space-y-5">
      <div className="card-glass p-5">
        <div className="section-label mb-1">Integraciones</div>
        <p className="text-sm text-text-mid">
          Conecta servicios externos para automatizar tu negocio. Tus credenciales se guardan{" "}
          <strong className="text-text-hi">cifradas con pgcrypto</strong> en Supabase y sólo tu
          negocio puede leerlas.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <GoogleCard />
      </div>
    </div>
  );
}

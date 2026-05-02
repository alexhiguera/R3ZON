"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Carga el `negocio_id` del usuario autenticado y lo cachea en estado.
 *
 * Útil para enviar `negocio_id` explícitamente en INSERTs de tablas tenant
 * cuando el trigger `tg_fill_negocio_id` puede no estar aplicado todavía
 * en la BD del entorno (la RLS rechazaría el insert sin él).
 *
 * Devuelve `null` mientras carga; los formularios deberían deshabilitar el
 * botón Guardar hasta que esté disponible.
 */
export function useNegocioId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("perfiles_negocio")
        .select("id")
        .single();
      if (alive) setId((data?.id as string | undefined) ?? null);
    })();
    return () => { alive = false; };
  }, []);

  return id;
}

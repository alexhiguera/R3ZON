"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { formatSupabaseError } from "@/lib/supabase-errors";

// El builder devuelve cualquier query de Supabase (PostgrestFilterBuilder,
// SingleResponse, etc.). Casteamos `data` a `T | null` al consumir.
type Builder = (sb: SupabaseClient) => PromiseLike<{
  data: unknown;
  error: { message: string; code?: string; details?: string; hint?: string } | null;
}>;

export type UseSupabaseQueryResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-ejecuta la query manualmente. Devuelve la promesa para encadenar. */
  refresh: () => Promise<void>;
  /** Actualización optimista del estado local sin tocar la BD. */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
};

/**
 * Carga datos de Supabase en cliente con manejo unificado de loading,
 * error (toast con contexto) y cleanup en unmount.
 *
 * Uso:
 * ```ts
 * const { data: productos, loading, refresh } = useSupabaseQuery<Producto[]>(
 *   (sb) => sb.from("productos").select("id,nombre").order("nombre"),
 *   { context: "productos" },
 * );
 * ```
 *
 * Notas:
 * - El cliente Supabase se memoiza UNA vez por hook (fix del bug que
 *   re-ejecutaba queries en cada render por `createClient` en deps).
 * - `deps` actúa como en `useEffect`: re-ejecuta la query cuando cambia.
 * - Si el componente se desmonta antes de que llegue la respuesta, se
 *   ignora silenciosamente vía un flag `alive`.
 */
export function useSupabaseQuery<T>(
  builder: Builder,
  opts: {
    deps?: unknown[];
    /** Texto que se inyecta en el toast de error: "Error al cargar {context}". */
    context?: string;
    /** Si false, no carga automáticamente; espera a `refresh()` manual. */
    enabled?: boolean;
  } = {},
): UseSupabaseQueryResult<T> {
  const { deps = [], context, enabled = true } = opts;
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  // Mantengo el builder en una ref para no requerir que el caller lo memoice.
  const builderRef = useRef(builder);
  builderRef.current = builder;

  const aliveRef = useRef(true);

  const ejecutar = useCallback(async () => {
    setLoading(true);
    const { data: payload, error: err } = await builderRef.current(supabase);
    if (!aliveRef.current) return;
    if (err) {
      const human = formatSupabaseError(err);
      const msg = context ? `No se pudo cargar ${context}. ${human}` : human;
      setError(human);
      toast.err(msg);
    } else {
      setError(null);
      setData(payload as T | null);
    }
    setLoading(false);
  }, [supabase, toast, context]);

  useEffect(() => {
    aliveRef.current = true;
    if (enabled) ejecutar();
    return () => { aliveRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error, refresh: ejecutar, setData };
}

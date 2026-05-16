import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { StockMovimiento } from "@/lib/inventario";
import { createClient } from "@/lib/supabase/client";

const PAGE_MOV = 50;

type MovimientoConNombre = StockMovimiento & {
  productos: { nombre: string } | null;
};

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Carga paginada de movimientos de stock recientes con join al nombre del
 * producto. Devuelve los movimientos ya planos (con `nombre` en raíz) +
 * helpers para refrescar y cargar más.
 *
 * Si `enabled = false` no carga nada (caso: modo stock desactivado).
 */
export function useMovimientosStock(enabled: boolean, supabase: SupabaseClient) {
  const toast = useToast();
  const [movimientosRaw, setMovimientosRaw] = useState<MovimientoConNombre[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);

  const cargar = useCallback(
    async (cursor: string | null = null, append = false) => {
      let q = supabase
        .from("stock_movimientos")
        .select(
          "id,producto_id,tipo,cantidad,motivo,ts,user_id,negocio_id,referencia,productos(nombre)",
        )
        .order("ts", { ascending: false });
      if (cursor) q = q.lt("ts", cursor);
      const { data, error } = await q.limit(PAGE_MOV);
      if (error) {
        toast.err(`Error al cargar movimientos: ${error.message}`);
        if (append) setCargandoMas(false);
        return;
      }
      const filas = (data ?? []) as unknown as MovimientoConNombre[];
      setMovimientosRaw((prev) => (append ? [...prev, ...filas] : filas));
      setHayMas(filas.length === PAGE_MOV);
      if (append) setCargandoMas(false);
    },
    [supabase, toast],
  );

  useEffect(() => {
    if (enabled) cargar();
  }, [cargar, enabled]);

  const refresh = useCallback(() => {
    cargar();
  }, [cargar]);

  const cargarMas = useCallback(async () => {
    const ultimo = movimientosRaw[movimientosRaw.length - 1];
    if (!ultimo) return;
    setCargandoMas(true);
    await cargar(ultimo.ts, true);
  }, [cargar, movimientosRaw]);

  const movimientos = movimientosRaw.map((m) => ({
    ...m,
    nombre: m.productos?.nombre ?? "—",
  }));

  return { movimientos, hayMas, cargandoMas, refresh, cargarMas, pageSize: PAGE_MOV };
}

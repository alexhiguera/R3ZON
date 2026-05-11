-- =============================================================================
-- R3ZON Business OS — Fix: rellenar negocio_id automáticamente
-- =============================================================================
-- Problema: las RLS `tenant_isolation` exigen `negocio_id = current_negocio_id()`
-- en cada INSERT. Si el cliente no envía `negocio_id`, el INSERT falla con
-- "new row violates row-level security policy".
--
-- Solución: trigger BEFORE INSERT en cada tabla tenant-scoped que rellena
-- `negocio_id` con `current_negocio_id()` cuando viene NULL. Mantiene la RLS
-- intacta (la WITH CHECK sigue validando) y no requiere tocar la app.
--
-- Idempotente. Se puede ejecutar sobre una BD existente sin perder datos.
-- =============================================================================

create or replace function public.tg_fill_negocio_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.negocio_id is null then
    NEW.negocio_id := public.current_negocio_id();
  end if;
  return NEW;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'clientes',
    'contactos_cliente',
    'citas',
    'tareas_kanban',
    'kanban_columnas',
    'comunicaciones',
    'finanzas',
    'consentimientos_rgpd',
    'agenda_eventos',
    'config_keys',
    'miembros_negocio',
    'pagos_stripe',
    'productos',
    'stock_movimientos',
    'tpv_ventas',
    'tpv_venta_items',
    'documentos',
    'metodos_pago'
  ] loop
    -- Sólo aplicamos si la tabla existe (algunas son extensiones opcionales).
    if exists (
      select 1 from information_schema.tables
       where table_schema = 'public' and table_name = t
    ) then
      execute format(
        'drop trigger if exists fill_negocio_id on public.%I;
         create trigger fill_negocio_id before insert on public.%I
         for each row execute function public.tg_fill_negocio_id();', t, t);
    end if;
  end loop;
end $$;

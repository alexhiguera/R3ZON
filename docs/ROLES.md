# R3ZON Business OS — Sistema de roles y permisos

> Última revisión: 2026-05-12 · Aplicado en `supabase/roles_ext.sql` + `src/lib/usePermissions.ts`

---

## Visión general

R3ZON separa tres dimensiones que **no se mezclan**:

1. **Nivel de plataforma** — quién eres en la aplicación globalmente.
2. **Rol dentro del tenant** — qué puedes hacer dentro de tu negocio.
3. **Plan de suscripción** — cuánto puedes usar (cuotas, no permisos).

Esta separación permite que un mismo `auth.users.id` sea:

- *Admin global* (yo, para soporte) **y** owner de un tenant propio.
- *Empleado lector* en un tenant **y** owner en otro.
- *Owner* con plan free **o** business: los permisos no cambian, sólo los límites.

---

## 1. Niveles de plataforma

| Nivel           | Tabla / fuente                                   | Descripción                                                                 |
| --------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `admin_global`  | `admin_global(user_id)`                          | Super admin del SaaS (soporte/dueño). Puede inspeccionar cualquier tenant. |
| `owner`         | `perfiles_negocio.user_id`                       | Dueño del negocio. Implícito: no aparece en `miembros_negocio`.            |
| `miembro`       | `miembros_negocio(user_id, estado='activo')`     | Empleado invitado al tenant.                                                |
| `anon`          | (sin sesión o sesión sin tenant)                 | Sólo rutas públicas.                                                        |

La función SQL `public.es_admin_global()` resuelve el flag en una sola línea reutilizable desde RLS y RPCs. Para todo lo demás, la vista `public.v_permisos_actuales` devuelve `nivel`, `rol` y `permisos` efectivos del usuario actual en una sola query.

---

## 2. Roles dentro del tenant

Sólo aplican al nivel `miembro`. El owner es siempre admin implícito en su tenant.

Enum `public.rol_miembro` definido en `team_ext.sql`:

| Rol     | Baseline (resumen)                                                            |
| ------- | ----------------------------------------------------------------------------- |
| `admin` | Lectura, escritura y borrado en todos los recursos del tenant; gestiona equipo. |
| `editor`| Lectura y escritura; no puede borrar registros ni gestionar equipo.            |
| `lector`| Sólo lectura en clientes/finanzas/tareas/citas/documentos/inventario.          |

El baseline exacto vive en `permisos_baseline(rol)` (SQL) — única fuente de verdad para evitar drift cliente/servidor.

### Permisos granulares (`miembros_negocio.permisos jsonb`)

El owner puede sobrescribir el baseline campo a campo:

```jsonc
{
  "clientes":  { "write": false },     // editor que NO puede modificar clientes
  "finanzas":  { "read":  false },     // empleado que NO ve datos financieros
  "documentos":{ "delete": true }      // editor con permiso extra para borrar facturas
}
```

Si `permisos` es `null` o vacío, se aplica el baseline completo del rol. Si está presente, **sobrescribe sólo los campos definidos** (merge punto-fino, no reemplazo total). Esta lógica vive en `public.tiene_permiso(recurso, accion)` y en `usePermissions().can()` para que el comportamiento sea idéntico arriba y abajo de la red.

---

## 3. Plan de suscripción

Vive en `perfiles_negocio.plan` (`free | pro | business`) + `subscription_status`. **No otorga permisos**, sólo **limita cuotas**:

| Plan       | Clientes | Tareas | Google Calendar | OCR/mes |
| ---------- | -------- | ------ | --------------- | ------- |
| `free`     | 5        | 10     | ❌              | 0       |
| `pro`      | 1 000    | ∞      | ✅              | 50      |
| `business` | ∞        | ∞      | ✅              | ∞       |

Los límites se definen en `src/lib/usePlan.ts` (`LIMITES`). Las rutas API protegidas comprueban `subscription_status = 'active'` antes de ejecutar acciones de pago, no las gating de permiso.

---

## 4. Resolución de un acceso

Cuando el código necesita responder a *"¿puede este usuario hacer X?"*, sigue este orden:

```
si es_admin_global         → permitir
si es owner del tenant     → permitir
si es miembro activo:
    base ← baseline(rol)
    override ← permisos
    permitir ⇔ (override.recurso.accion ?? base.recurso.accion ?? false)
si no                       → denegar
```

Equivalencias:

- SQL: `select public.tiene_permiso('clientes', 'delete')`
- TypeScript: `const { can } = usePermissions(); can('clientes', 'delete')`

---

## 5. Uso en el código

### Cliente (React)

```tsx
"use client";
import { usePermissions } from "@/lib/usePermissions";

export function BotonBorrarCliente({ id }: { id: string }) {
  const { can, loading } = usePermissions();
  if (loading) return null;
  if (!can("clientes", "delete")) return null;
  return <button onClick={() => borrar(id)}>Eliminar</button>;
}
```

### Servidor (Server Action / Route Handler)

```ts
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data: ok } = await supabase.rpc("tiene_permiso", {
  p_recurso: "documentos",
  p_accion:  "write",
});
if (!ok) return new Response("forbidden", { status: 403 });
```

### Postgres (RLS policies)

Patrón recomendado para tablas con datos de tenant:

```sql
create policy clientes_lectura on public.clientes
  for select using ( public.tiene_permiso('clientes', 'read') );

create policy clientes_escritura on public.clientes
  for insert with check ( public.tiene_permiso('clientes', 'write') );
```

---

## 6. Operaciones administrativas

### Promover a un usuario a admin global

Sólo desde el SQL Editor con el `service_role`:

```sql
insert into public.admin_global (user_id, motivo, granted_by)
values (
  (select id from auth.users where email = 'alex@r3zon.com'),
  'Dueño de la plataforma',
  (select id from auth.users where email = 'alex@r3zon.com')
);
```

### Invitar a un miembro al tenant

UI: *Ajustes → Equipo → Invitar miembro*. Internamente crea fila en `miembros_negocio` con `estado='invitado'`. El email recibe invitación de Supabase; el primer login dispara `aceptar_invitacion()` y registra los consentimientos RGPD.

### Editar permisos granulares

UI: *Ajustes → Equipo → fila del miembro → "Permisos"* (en construcción). Mientras tanto, vía SQL:

```sql
update public.miembros_negocio
   set permisos = jsonb_build_object('finanzas', jsonb_build_object('read', false))
 where email = 'empleado@empresa.com'
   and negocio_id = (select id from public.perfiles_negocio where user_id = auth.uid());
```

---

## 7. Decisiones de diseño

- **Por qué `permisos jsonb` y no tabla `permisos_miembro` normalizada**: el catálogo es pequeño y casi nunca se filtra por permisos; el overhead de join no compensa. JSONB permite añadir recursos nuevos sin migración.
- **Por qué `baseline_rol` como función inmutable y no constante en el cliente**: garantiza que el servidor sea la única fuente de verdad. Un cliente comprometido no puede inventarse permisos que el servidor no respaldaría.
- **Por qué `es_admin_global` separado de `rol_miembro`**: la administración del SaaS y la administración del tenant son responsabilidades distintas; mezclarlas en un solo enum llevaría a privilegios accidentales.
- **Por qué el plan no otorga permisos**: separar permiso (qué puedes hacer) de cuota (cuánto puedes hacerlo) permite que un free user vea sus clientes existentes aunque haya superado el límite, en lugar de quedar bloqueado.

---

## 8. Próximos pasos sugeridos

- [ ] UI en `EquipoTab` para editar `permisos` granulares por miembro.
- [ ] Vista `/admin` global accesible sólo si `es_admin_global()` (listado de tenants, métricas, soporte).
- [ ] Audit log de cambios de rol/permisos (tabla `audit_roles`).
- [ ] Comprobación en cliente del `nivel` antes de pintar el menú lateral (ocultar entradas sin permiso).

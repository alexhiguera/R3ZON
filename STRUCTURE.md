# R3ZON Business OS — Estructura

Stack: **Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind · Supabase · Capacitor-ready**.
Filosofía: **0€ servidor** — todo el procesamiento pesado (OCR, PDFs, parsing) corre en cliente.

## Árbol de proyecto

```
r3zon-crm/
├── package.json
├── next.config.mjs            # 'output: export' opcional para SPA → Capacitor
├── tailwind.config.ts         # Tokens R3ZON (cyan/fuchsia/indigo, glass)
├── postcss.config.js
├── tsconfig.json
├── vitest.config.ts           # Tests con Vitest (jsdom para componentes)
├── .env.local.example
│
├── supabase/                  # Esquema y extensiones SQL — ejecutar en orden
│   ├── setup.sql              # Wipe + schema base + todas las extensiones
│   ├── schema.sql             # Modelo base multi-tenant + RLS + pgcrypto
│   ├── auth_extension.sql     # Auth/RGPD/devices
│   ├── crm_kanban_ext.sql     # Tareas kanban + columnas + comunicaciones
│   ├── agenda_ext.sql         # Agenda + sincronización Google Calendar
│   ├── documentos_ext.sql     # Facturas, tickets, presupuestos (correlativos AEAT)
│   ├── inventario_ext.sql     # Productos / stock / TPV
│   ├── metodos_pago_ext.sql   # Métodos de pago guardados
│   ├── fichajes_ext.sql       # Registro de jornada (RD-ley 8/2019)
│   ├── billing_ext.sql        # Suscripciones Stripe
│   ├── team_ext.sql           # Multi-usuario por negocio
│   ├── retention_ext.sql      # Funciones de archivado (manuales)
│   ├── fix_tenant_defaults.sql# Trigger auto-fill negocio_id en INSERTs
│   └── seed_clientes.sql      # Datos demo (10 clientes B2B)
│
├── tests/                     # Vitest (lógica pura + componentes UI)
│   ├── documentos.test.ts
│   ├── inventario.test.ts
│   ├── fichajes.test.ts
│   ├── finanzas.test.ts
│   ├── …                      # ocr, supabase RPC, oauth callback…
│   └── components/            # Tests con Testing Library
│
└── src/
    ├── app/
    │   ├── layout.tsx         # <html>, fuentes Syne + DM Sans
    │   ├── globals.css        # Tokens, glass, rainbow-bar
    │   ├── page.tsx           # → /dashboard
    │   ├── login/             # Magic-link + OAuth
    │   ├── auth/callback/     # Confirmación email + Google OAuth
    │   ├── onboarding/        # Wizard 1ª vez (perfil de negocio)
    │   └── (app)/             # Grupo con AppShell (sidebar) + ErrorBoundary
    │       ├── layout.tsx
    │       ├── dashboard/     # KPIs + Recharts (lazy)
    │       ├── clientes/      # Lista paginada + ficha (info, contactos, comunicaciones, automatización)
    │       ├── citas/         # FullCalendar (lazy via CalendarViewLazy)
    │       ├── tareas/        # Kanban
    │       ├── finanzas/      # Movimientos + Recharts
    │       ├── documentos/    # Editor de facturas/tickets/presupuestos + plantilla A4
    │       ├── productos/     # Catálogo (alta/edición)
    │       ├── stock/         # Movimientos firmados + KPIs
    │       ├── tpv/           # Punto de venta (restaurante o tienda)
    │       ├── fichajes/      # Entrada/descanso/salida con state machine
    │       ├── ocr/           # Tesseract.js (lazy) → finanzas
    │       ├── rgpd/
    │       └── ajustes/       # Negocio, equipo, facturación, integraciones
    │
    ├── components/
    │   ├── layout/            # AppShell, Sidebar
    │   ├── ui/                # Field, Input, Modal, ActionButton, ErrorBoundary, Toast, Tooltip, …
    │   ├── dashboard/         # KpiCard, FinanceSummary, UpcomingAppointments, …
    │   ├── clientes/          # InfoTab, ContactosTab
    │   ├── crm/               # TabHistorial, TabComunicaciones, TabAutomatizacion
    │   ├── documentos/        # PlantillaDocumento (A4 print)
    │   ├── finanzas/          # Charts (Recharts)
    │   ├── agenda/            # CalendarView + CalendarViewLazy
    │   └── ajustes/           # NegocioTab, FacturacionTab, EquipoTab, …
    │
    └── lib/
        ├── utils.ts           # cn()
        ├── formato.ts         # eur, round2, round3, hoyISO, hoyMas, formatearFecha*
        ├── ui-constants.ts    # ESTADO_CLIENTE_BADGE, ESTADO_STOCK_BADGE, COLOR_MOV_STOCK
        ├── useNegocioId.ts    # current_negocio_id() en hook
        ├── useSupabaseQuery.ts# Cliente memoizado + AbortController + toast en error
        ├── useDashboardData.ts# Bundle de queries para /dashboard
        ├── documentos.ts      # Lógica pura (totales, validación, números correlativos)
        ├── inventario.ts      # Lógica TPV/stock (estadoStock, calcularTotalVenta)
        ├── finanzas.ts        # agregarPorMes, totales
        ├── fichajes.ts        # State machine + duración acumulada
        ├── agenda.ts          # CRUD agenda + sincronización Google
        ├── google.ts          # OAuth Google
        ├── stripe.ts          # Helpers Stripe
        ├── ocr/engine.ts      # Tesseract.js (dynamic)
        └── supabase/
            ├── client.ts      # Browser client (RLS auto)
            └── server.ts      # SSR client (cookies)
```

## Módulos de negocio

| Módulo | Tablas principales | Notas |
|---|---|---|
| CRM | `clientes`, `contactos_cliente`, `comunicaciones` | Buscador con paginación cursor |
| Agenda | `citas`, `agenda_eventos` | Sincronización bidireccional con Google Calendar |
| Tareas | `tareas_kanban`, `kanban_columnas` | Drag & drop, estados configurables |
| Finanzas | `finanzas` | OCR de tickets/facturas + recharts |
| Documentos | `documentos` | Numeración correlativa atómica (`crear_documento_generado` RPC), snapshots fiscales JSONB, plantilla A4 imprimible |
| Productos | `productos` | Catálogo único compartido por TPV / facturación |
| Stock | `stock_movimientos` | Log inmutable firmado, trigger mantiene `productos.stock_actual` |
| TPV | `tpv_ventas`, `tpv_venta_items` | RPC `cerrar_venta_tpv` (atómica, genera movimientos de stock) |
| Métodos de pago | `metodos_pago` | RPC `set_metodo_pago_predeterminado` (atómica) |
| Fichajes | `fichajes` | State machine entrada→descanso→salida, RD-ley 8/2019 |
| Equipo | `miembros_negocio` | Multi-usuario por negocio |
| Facturación | `pagos_stripe`, `consentimientos_rgpd` | Stripe + RGPD |
| Ajustes | `perfiles_negocio`, `config_keys` | Cifrado pgcrypto para tokens (Google, Stripe…) |
| Devices | `devices`, `consentimientos_rgpd` | Notificaciones nuevo dispositivo |

## Integraciones externas

- **Google Calendar**: OAuth + tokens cifrados en `config_keys`. Edge Function `notify-new-device` y cron `refresh-google-channels`.
- **Stripe**: Suscripciones SaaS (`pagos_stripe`).
- **Tesseract.js**: OCR client-side de tickets (carga dinámica para no inflar el bundle).

## Setup

1. `npm install`
2. Crea proyecto en Supabase y ejecuta `supabase/setup.sql` (incluye base + extensiones).
3. Tras `setup.sql`, ejecuta `supabase/fix_tenant_defaults.sql` para los triggers de auto-fill.
4. En **Project Settings → Database → Custom config**, define la GUC:
   ```
   app.config_master_key = '<UNA_CLAVE_LARGA_ALEATORIA>'
   ```
   (la usa pgcrypto para cifrar/descifrar `config_keys`).
5. `cp .env.local.example .env.local` y rellena `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (más Google/Stripe si los usas).
6. `npm run dev`.

## Para móvil con Capacitor

```bash
NEXT_OUTPUT_MODE=export npm run build      # genera /out
npx cap init r3zon com.r3zon.app --web-dir=out
npx cap add ios && npx cap add android
npx cap sync
```

## Multi-tenancy en una frase

Cada `auth.users` recibe automáticamente un `perfiles_negocio` (trigger
`on_auth_user_created`). Todas las tablas filtran por `negocio_id = current_negocio_id()`
vía RLS, y el trigger `fill_negocio_id` (en `fix_tenant_defaults.sql`) lo rellena
automáticamente en cada INSERT, así que **el frontend nunca tiene que filtrar
manualmente** — usa el cliente Supabase y RLS hace el resto.

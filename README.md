<div align="center">
  <h1>R3ZON Business OS</h1>
  <p>
    <strong>Sistema operativo de negocio para autónomos y pequeñas empresas.</strong><br/>
    <em>Coste de servidor 0€ · Procesamiento client-side · Multi-tenant · Glassmorphism</em>
  </p>
</div>

---

## 🌟 Sobre el proyecto

R3ZON es un Business OS pensado para trabajadores **no técnicos**. Toda la lógica
pesada (OCR, parsing, fingerprinting) corre en el navegador del usuario; el
backend es Supabase con Row Level Security multi-tenant. La UI sigue el
**R3ZON Design System** (dark, glass, cyan/fuchsia/indigo).

---

## 🛠 Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| UI | Tailwind CSS + tokens R3ZON · `lucide-react` |
| Datos | Supabase (Postgres + Auth + Edge Functions + Storage) |
| Gráficas | Recharts |
| OCR | Tesseract.js (WebAssembly, client-side) |
| Email | Resend (vía Edge Function) |
| Pagos | Stripe (Checkout + Customer Portal + webhooks) |
| Calendario | FullCalendar v6 + Google Calendar API |
| Drag & Drop | dnd-kit |
| Móvil | Capacitor (`output: export`) |

---

## 📁 Estructura

```
r3zon-crm/
├── supabase/
│   ├── schema.sql                        # Esquema base B2B + RLS multi-tenant
│   ├── auth_extension.sql                # Onboarding, devices, RPCs
│   ├── crm_kanban_ext.sql                # comunicaciones, kanban_columnas, RPCs batch
│   ├── agenda_ext.sql                    # agenda_eventos, google_connections (tokens cifrados, watch channels)
│   ├── billing_ext.sql                   # stripe_customer_id, pagos_stripe
│   ├── team_ext.sql                      # miembros_negocio, v_equipo_negocio, RPCs
│   ├── fix_tenant_defaults.sql           # Trigger genérico fill_negocio_id (red de seguridad RLS)
│   ├── seed_clientes.sql                 # 10 empresas de ejemplo
│   ├── setup.sql                         # Wipe + reload completo para entornos dev
│   └── functions/notify-new-device/      # Edge Function de Resend
├── scripts/
│   └── seed-admin.mjs                    # Crea el usuario admin de dev
├── src/
│   ├── middleware.ts / proxy.ts          # Refresca sesión + gate 2FA + header x-pathname
│   ├── app/
│   │   ├── (auth)/                       # /login /registro /2fa
│   │   ├── (app)/                        # Rutas protegidas con AppShell
│   │   │   ├── dashboard/
│   │   │   ├── clientes/                 # CRM B2B: listado, ficha, contactos, organigrama
│   │   │   ├── citas/                    # Agenda con FullCalendar + sync Google
│   │   │   ├── tareas/                   # Kanban dnd-kit con columnas reordenables
│   │   │   ├── finanzas/                 # Dashboard Recharts + nuevo movimiento
│   │   │   ├── ocr/                      # Tesseract.js
│   │   │   ├── onboarding/               # Aceptación RGPD
│   │   │   ├── rgpd/
│   │   │   ├── 2fa/configurar/           # Enrolment TOTP
│   │   │   └── ajustes/                  # Negocio · Integraciones · Equipo · Suscripción · Seguridad
│   │   ├── actions/
│   │   │   └── google.ts                 # Server Action getGoogleConnectionStatus (sin exponer tokens)
│   │   ├── api/
│   │   │   ├── integrations/google/
│   │   │   │   ├── connect/route.ts      # Inicia OAuth Calendar (state cookie CSRF)
│   │   │   │   ├── callback/route.ts     # Intercambia code, persiste tokens cifrados
│   │   │   │   └── webhook/route.ts      # Push de Google Calendar (anti-spoofing por channel_token)
│   │   │   ├── billing/
│   │   │   │   ├── checkout/route.ts     # Crea Stripe Checkout Session
│   │   │   │   ├── portal/route.ts       # Abre Customer Portal
│   │   │   │   └── webhook/route.ts      # Stripe webhook (firma validada)
│   │   │   ├── team/
│   │   │   │   ├── invite/route.ts       # auth.admin.inviteUserByEmail
│   │   │   │   └── revoke/route.ts       # Revoca miembro (audit trail)
│   │   │   └── cron/
│   │   │       └── refresh-google-channels/route.ts  # Renueva watch channels (<24h a expirar)
│   │   ├── auth/callback/route.ts        # OAuth code exchange (Supabase login)
│   │   ├── not-found.tsx                 # Página 404 glass
│   │   ├── legal/                        # Privacidad, cookies, términos, aviso
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/                         # OAuthButtons · DeviceTracker
│   │   ├── agenda/
│   │   │   ├── CalendarView.tsx          # FullCalendar dark + flujo sync/OAuth
│   │   │   ├── EventModal.tsx            # Diálogo glass creación/edición de cita
│   │   │   └── calendar.css              # Override variables --fc-* design system R3ZON
│   │   ├── ajustes/
│   │   │   ├── SettingsTabs.tsx          # Layout 5 pestañas Ajustes
│   │   │   ├── NegocioTab.tsx            # Perfil + logo Supabase Storage
│   │   │   ├── GoogleCard.tsx            # Estado conexión Calendar (Server Action)
│   │   │   ├── N8nCard.tsx               # Webhook n8n/Make cifrado
│   │   │   ├── HelpDrawer.tsx            # Panel ayuda lateral no técnico
│   │   │   ├── EquipoTab.tsx             # Gestión de miembros
│   │   │   ├── InvitarMiembroModal.tsx   # Invitación con selector rol
│   │   │   ├── SeguridadTab.tsx          # 2FA + dispositivos + cierre global
│   │   │   └── SuscripcionTab.tsx        # Planes Stripe + historial facturas
│   │   ├── clientes/                     # InfoTab · ContactosTab · HierarchyChart
│   │   ├── finanzas/Charts.tsx           # Recharts (barras + líneas)
│   │   ├── kanban/
│   │   │   ├── TaskCard.tsx              # Tarjeta arrastrable (drop indicator cyan)
│   │   │   ├── TaskModal.tsx             # Modal creación/edición tarea
│   │   │   ├── InlineTaskAdder.tsx       # Creación rápida inline por título
│   │   │   └── ColumnManager.tsx         # Modal gestión columnas (sortable dnd-kit)
│   │   ├── layout/                       # AppShell · Sidebar
│   │   ├── legal/LegalDoc.tsx
│   │   └── ui/                           # PageHeader · Placeholder · Tooltip
│   └── lib/
│       ├── supabase/{client,server,middleware,admin}.ts
│       ├── google.ts                     # loadTokens / googleFetch (auto-refresh)
│       ├── google-admin.ts               # googleFetchAdmin (service-role, server-only)
│       ├── google-errors.ts              # formatGoogleError(code) → mensaje legible
│       ├── agenda.ts                     # Server Actions agenda + watch channel user-context
│       ├── agenda-admin.ts               # syncGoogleCalendarFor + refreshExpiringWatchChannels
│       ├── stripe.ts                     # getStripe · PLANS · planFromPriceId
│       ├── ocr/{engine,parser}.ts        # Tesseract + parser regex ES
│       ├── finanzas.ts                   # Agregados mensuales
│       ├── devices.ts                    # SHA-256 fingerprint
│       ├── useNegocioId.ts               # Hook negocio_id con cache
│       └── utils.ts
├── vercel.json                           # Cron diario renovación watch channels (03:00 UTC)
├── tailwind.config.ts
├── next.config.mjs
└── .env.local                            # (ignorado por git) — ver .env.local.example
```

---

## 🚀 Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Base de datos (ejecutar en Supabase SQL Editor en este orden)
#   schema.sql → auth_extension.sql → crm_kanban_ext.sql → agenda_ext.sql
#   billing_ext.sql → team_ext.sql → fix_tenant_defaults.sql
#   (o usar setup.sql para wipe + reload completo en dev)

# 3. Variables de entorno — copiar .env.local.example a .env.local y rellenar:
#   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#   SUPABASE_SERVICE_ROLE_KEY        ← Supabase Dashboard > Settings > API
#   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
#   GOOGLE_WEBHOOK_URL               ← URL HTTPS pública (en dev: túnel cloudflared/ngrok)
#   CRON_SECRET                      ← openssl rand -base64 32
#   STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_PRO / STRIPE_PRICE_BUSINESS

# 4. Crear usuario admin de desarrollo
npm run seed:admin

# 5. Arrancar
npm run dev
```

### Webhook de Google Calendar en desarrollo

Google exige HTTPS para `events.watch`. Usar un túnel:

```bash
cloudflared tunnel --url http://localhost:3000
# Copiar la URL generada a GOOGLE_WEBHOOK_URL en .env.local
# Añadir ${ORIGIN}/api/integrations/google/callback como Authorized redirect URI
# en la consola de Google Cloud (APIs & Services > Credentials)
```

### Build móvil con Capacitor

```bash
NEXT_OUTPUT_MODE=export npm run build
npx cap init r3zon com.r3zon.app --web-dir=out
npx cap add ios && npx cap add android
npx cap sync
```

---

## 📦 Estado actual de los módulos

| Módulo | Estado | Notas |
|---|---|---|
| Diseño base + AppShell | ✅ Completo | Sidebar 56px táctil, drawer mobile, responsive ≤400px |
| Esquema BD multi-tenant | ✅ Completo | RLS + pgcrypto + triggers multi-tenant auto-fill |
| Autenticación email | ✅ Completo | Login, registro, recuperación, dev mode toggle |
| OAuth (Google) | ✅ Completo | Calendar + Drive.file + profile, offline token, CSRF cookie |
| 2FA (TOTP) | ✅ Completo | Enrolment + verificación, middleware SSR |
| Email nuevo dispositivo | ✅ Completo | Edge Function + Resend, fingerprint SHA-256 |
| Onboarding RGPD | ✅ Completo | Logs en `consentimientos_rgpd` + timestamp/IP/UA |
| Páginas legales | ✅ Plantillas | Privacidad, cookies, términos, aviso, metadata SEO |
| Finanzas — dashboard | ✅ Completo | Recharts barras/líneas, KPI delta %, agregados mensuales |
| Finanzas — nuevo movimiento | ✅ Completo | Toggle "He cobrado / He gastado", cálculo IVA/IRPF en vivo |
| OCR de tickets | ✅ Completo | Tesseract.js client-side, parser regex ES, edición antes de guardar |
| Clientes CRM (B2B) | ✅ Completo | B2B 100%, contactos con jerarquía, webhook n8n cifrado |
| Clientes — ficha | ✅ Completo | 4 tabs (Info, Contactos, Historial citas, Automático), edición inline |
| Tareas Kanban | ✅ Completo | dnd-kit, columnas reordenables, drag total, creación inline, batch RPC |
| Tareas — columnas | ✅ Completo | Manager modal con color, rename, delete. Arrastrables horizontalmente |
| Agenda + Google Calendar | ✅ Completo | FullCalendar v6 dark, sync bidireccional, push webhook, watch channel cron |
| Agenda — modal cita | ✅ Completo | Google primero, fallback local, vinculación cliente, 6 colores, timestamp |
| Ajustes — Negocio | ✅ Completo | Perfil empresa, logo en Storage (2MB, PNG/JPG/WebP/SVG) |
| Ajustes — Integraciones | ✅ Completo | Google (status RPC), n8n webhook cifrado, HelpDrawer guías paso a paso |
| Ajustes — Equipo | ✅ Completo | Invitaciones RPC, roles (admin/editor/lector), revocación audit trail |
| Ajustes — Suscripción | ✅ Completo | Stripe Checkout + Portal, webhook firma validada, historial facturas |
| Ajustes — Seguridad | ✅ Completo | 2FA TOTP, dispositivos conocidos, cierre global, auth.admin only |
| Dashboard | ✅ Completo | Widgets agregadores (KPIs, próximas citas, tareas, clientes, actividad) |
| Página 404 | ✅ Completo | Glass con gradient, CTAs contextuales |
| Responsive / A11y | ✅ Completo | Mobile ≤400px, modal scroll, aria-label/role, alt mejorado, 36×36px iconos |
| Testing | ✅ Completo | Vitest + 50 tests (parser, finanzas, stripe, google, RPC, webhook) |
| SEO / PWA / Metadatos | ✅ Completo | metadata por ruta, manifest.json, favicon SVG, robots.ts, sitemap.ts |

---

## 📒 Bitácora de iteraciones

> Resumen de todo lo construido en orden de iteraciones (más reciente → más antiguo).

### Iteración 34 — *2026-05-11* — Refactor integral: utilidades centralizadas, UI reutilizable, hook Supabase, fix de re-renders y limpieza SQL

Pase de refactor *alto impacto, bajo riesgo* tras auditoría de 3 agentes (frontend, base de datos, rendimiento). Sin cambios funcionales aparentes para el usuario, pero la base es más rápida, barata y mantenible.

**Centralización de utilidades** ([src/lib/formato.ts](src/lib/formato.ts)):
- `eur()` — antes definido 3 veces en `finanzas.ts`, `documentos.ts`, `inventario.ts` → ahora único.
- `round2()`, `round3()` — antes 4 definiciones → única.
- `hoyISO()`, `hoyMas(dias)`, `formatearFechaCorta()`, `formatearFechaLarga()` — antes inlineadas en cada página.
- Los 3 lib del dominio re-exportan `eur` desde aquí (API pública estable).

**Componentes UI reutilizables** ([src/components/ui/](src/components/ui/)):
- `Field`, `Input`, `Select`, `Textarea` (con `INPUT_CLS` único), `Modal` (backdrop + ESC + click-outside + bloqueo de scroll), `ActionButton` (5 tonos semánticos).
- Sustituyen `Field`/`inputCls`/`AccionBtn` repetidos en TPV, Productos, Stock, Documentos. `inputCls` ya no es la fuente: en `documentos/nuevo` queda como alias del nuevo `INPUT_CLS`.

**Hook unificado [`useSupabaseQuery`](src/lib/useSupabaseQuery.ts)**:
- Memoiza `createClient` internamente (corrige el bug donde el cliente entraba en `useEffect` deps y reejecutaba la query en cada render).
- AbortController interno via flag `alive`, cleanup automático al desmontar.
- Toast de error con contexto: `"Error al cargar productos: …"`.
- Aplicado en TPV, Productos, Stock, Documentos (lista y detalle). Eliminados los `eslint-disable react-hooks/exhaustive-deps`.

**Optimización de queries** (egress reducido):
- TPV: `select("*")` → 12 columnas explícitas (`descripcion`, `precio_coste`, `imagen_url`, `created_at/updated_at` ya no viajan).
- TPV tras cobrar: **eliminado el refetch completo**. Ahora el stock se actualiza localmente con un `Map` desde el ticket recién cobrado. Antes: 1 query de N filas por venta. Ahora: 0.
- Productos / Stock / Documentos: `select` selectivos en la lista, `select("*")` solo al abrir modal de edición.
- Logos en Storage: `cacheControl: "3600"` → `"86400"` (24h).

**Bundle size**:
- `/citas` ahora carga `CalendarView` con `dynamic({ ssr: false })` con loading skeleton — `@fullcalendar/*` (~450 KB) se difiere y la página muestra el shell inmediatamente.
- Eliminado `src/components/clientes/HierarchyChart.tsx` (huérfano tras borrar `page 2.tsx`) → `@xyflow/react` (~280 KB) deja de empaquetarse en producción.

**Capa SQL**:
- [`supabase/setup.sql`](supabase/setup.sql) **completado**: faltaban `documentos_ext`, `metodos_pago_ext`, `inventario_ext`, `fichajes_ext`. Ahora incluidos en orden de dependencia, con sus `drop table` correspondientes en la sección WIPE.
- Nuevo índice compuesto en [`inventario_ext.sql`](supabase/inventario_ext.sql): `idx_productos_activo_categoria_nombre` cubre la query principal del TPV (`WHERE activo = true ORDER BY categoria, nombre`).
- Comentario explicativo en [`documentos_ext.sql`](supabase/documentos_ext.sql) sobre la relación intencionalmente separada con `finanzas` (una factura emitida es ingreso opcional; un OCR de proveedor no tiene documento).
- Nuevo [`supabase/retention_ext.sql`](supabase/retention_ext.sql) (no incluido en `setup`, ejecución manual): tablas `*_archivo` y funciones `archive_fichajes_antiguos(meses)`, `archive_stock_movimientos_antiguos(meses)`, `archive_tpv_ventas_cerradas(meses)` para mover filas viejas y liberar storage. Sin scheduling — invocar a mano o con `pg_cron` (plan Pro+).

**Cleanup**:
- Eliminados 3 archivos backup `src/app/(app)/clientes/**/page 2.tsx` (commiteados en histórico).
- Tipos `any` corregidos en `ocr/page.tsx`, `Charts.tsx`, `TabAutomatizacion.tsx`, `TabComunicaciones.tsx`.

**Verificación**: 9 archivos · **101/101 tests verdes**, cero errores TypeScript en archivos del proyecto. Fuentes únicas confirmadas (`eur`, `round*`, `INPUT_CLS`, `Field`, `Modal`).

### Iteración 33 — *2026-05-11* — Productos · Stock · TPV (3 módulos conectados)

Nuevo eje vertical de "comercio": catálogo único + inventario + punto de venta. Diseñado genérico para cubrir restaurante (con `mesa`, IVA mixto bebida/comida, color por categoría) y tienda (con `codigo`/SKU, `stock_minimo`, `unidad` flexible).

- **Esquema** [`supabase/inventario_ext.sql`](supabase/inventario_ext.sql):
  - `productos` (catálogo único): SKU opcional, `tipo` (producto/servicio), `unidad` (ud/kg/l/ración/hora), `iva_pct`, `stock_tracking` (servicios y comida sin inventario lo desactivan), `stock_minimo` para alertas, `color` para botones TPV.
  - `stock_movimientos` (log inmutable, fuente de la verdad): `cantidad` firmada (+ entra, − sale), `tipo` (entrada/salida/ajuste/venta_tpv/devolucion). Trigger `tg_aplicar_stock_movimiento` mantiene `productos.stock_actual` actualizado automáticamente.
  - `tpv_ventas` + `tpv_venta_items` (con `importe_linea` como columna generada).
  - **RPC `cerrar_venta_tpv(p_venta_id, p_metodo_pago)`**: pieza clave de integración. Bloquea la venta con `FOR UPDATE`, recalcula totales desde los items (fuente de la verdad), genera un `stock_movimientos` tipo `venta_tpv` por cada item con `stock_tracking=true`, y marca la venta como `cerrada`. Atómico — si falla algo, no se cobra ni se descuenta stock.
  - RLS multi-tenant en las cuatro tablas vía `current_negocio_id()`.

- **Lógica pura** [`src/lib/inventario.ts`](src/lib/inventario.ts): `estadoStock()` (ok/bajo/agotado/sin_stock), `calcularTotalVenta()` con desglose, `añadirItem/cambiarCantidad/eliminarItem` inmutables, `colorCategoria()` (hash determinístico de la categoría a HSL).

- **UIs**:
  - [`/productos`](src/app/\(app\)/productos/page.tsx): listado con búsqueda + filtro por categoría + modal CRUD que incluye color picker para los botones del TPV. Servicios fuerzan `stock_tracking=false`.
  - [`/stock`](src/app/\(app\)/stock/page.tsx): KPIs (con stock / bajo / agotados), filtro por estado y modal "Movimiento" para registrar entradas/salidas/ajustes manuales. Aside con últimos 50 movimientos (incluyendo los generados por TPV).
  - [`/tpv`](src/app/\(app\)/tpv/page.tsx): layout split optimizado táctil — rejilla de productos coloreados con badge de "Bajo"/"Agotado" + ticket en curso a la derecha con totales en vivo, soporte de mesa para restaurante, y modal de cobro con 4 métodos (efectivo/tarjeta/Bizum/otro). Al cobrar invoca el RPC y refresca el stock visible.

- **Tests** [`tests/inventario.test.ts`](tests/inventario.test.ts): 19 casos (estado de stock, cálculo de totales con IVA mixto restaurante, agrupación al añadir item, cantidad cero como eliminación, etc.). Suite global verde **9 archivos · 101 tests**.

- **Sidebar**: 3 entradas nuevas entre Fichajes y Documentos (Productos · Stock · TPV).

**Para activar**: ejecuta `supabase/inventario_ext.sql` en el SQL Editor de Supabase.

### Iteración 32 — *2026-05-11* — Editor de documentos: simplificación UX + métodos de pago guardados

Reorganización del editor `/documentos/nuevo` para reducir fricción y un nuevo tab en Ajustes.

- **Cliente**: por defecto un buscador con autocomplete (busca por nombre, CIF o email contra los clientes existentes); botón secundario "Añadir cliente manualmente" que despliega los campos y un checkbox "Guardar también como cliente en mi CRM" (al generar, si está marcado, hace `INSERT` en `clientes` antes del documento).
- **Cabecera colapsable**: por defecto muestra una línea-resumen ("Serie A · 11 may 26 · vence 26 may 26") y un botón verde "Modificar". Defaults: serie A, hoy, vencimiento +15 días, IRPF 0%.
- **Pago colapsable**: misma mecánica que cabecera. Selector de métodos guardados (con ⭐ en el predeterminado) + opción "Introducir manualmente" + checkbox "Guardar este método para reutilizarlo".
- **Métodos de pago guardados**: nueva tabla [`metodos_pago`](supabase/metodos_pago_ext.sql) con índice único parcial para garantizar un solo predeterminado por negocio. Nuevo tab "Facturación" en Ajustes [`FacturacionTab`](src/components/ajustes/FacturacionTab.tsx) para CRUD de los métodos.
- **Layout**: `lg:grid-cols-2` simétrico, formulario izquierda + previsualización derecha. La preview es `sticky top-4` para que se mantenga visible al scrollear el formulario.
- **Botón "Ver en grande"**: encima de la preview. Abre un modal fullscreen con backdrop blur y el documento centrado en formato A4 (botón "Abrir en pestaña" dentro del modal usa la misma ventana de impresión que el descargar).
- Líneas: sin cambios (tu petición explícita).

Suite verde: **8 archivos · 82 tests**.

### Iteración 31 — *2026-05-11* — Módulo Documentos (facturas, tickets, presupuestos, albaranes, proformas)

Nuevo apartado en la sidebar entre Fichajes y Finanzas para emitir cualquier documento comercial. La página `/documentos/nuevo` muestra primero un selector de tipo y, al elegir uno, se abre un editor con **formulario a la izquierda y previsualización en vivo a la derecha**.

- **Esquema** [`supabase/documentos_ext.sql`](supabase/documentos_ext.sql): tabla `documentos` con `numero` correlativo único por (negocio, tipo, serie, año), `referencia` generada (`tipo-serie-año-NNNNN`), `emisor_snapshot` y `cliente_snapshot` JSONB que congelan los datos al generar (una factura no cambia si el cliente actualiza su CIF), y trigger `tg_documentos_inmutable` que bloquea modificaciones de fondo cuando `estado != 'borrador'`. RLS por `current_negocio_id()`.
- **Numeración atómica**: RPC `siguiente_numero_documento(p_tipo, p_serie, p_anio)` con `pg_advisory_xact_lock` derivado por hash de los identificadores → evita huecos y carreras incluso bajo concurrencia.
- **Lógica pura** [`src/lib/documentos.ts`](src/lib/documentos.ts): tipos, `calcularTotales(lineas, irpf_pct)` con desglose por tipo de IVA, `validarParaGenerar()` que distingue tipos que requieren CIF del cliente (factura, proforma) de los que no (ticket, albarán), `referenciaDocumento()`, `eur()`.
- **Editor** [`src/app/(app)/documentos/nuevo/page.tsx`](src/app/\(app\)/documentos/nuevo/page.tsx): selector de tipo → editor con cabecera (serie/fechas/IRPF), selector de cliente (predefinido + edición manual), líneas con cantidad/precio/descuento/IVA por línea, método y condiciones de pago, notas. Botón verde **Generar** que ejecuta validación + RPC de numeración + INSERT inmutable. Tras generar, panel de acciones: **Descargar PDF** (vía `window.print` en ventana nueva con `@page A4`), **Enviar por email** (`mailto:` prerrellenado con destinatario, asunto y cuerpo), **Guardado en la app** (estado siempre persistido) y **Añadir a Finanzas** opcional que crea un movimiento de ingreso vinculado vía `finanza_id`.
- **Plantilla** [`src/components/documentos/PlantillaDocumento.tsx`](src/components/documentos/PlantillaDocumento.tsx): se usa tanto en preview como en el PDF. Estilos en línea (no Tailwind) para que se preserven al inyectarse en la ventana de impresión. Incluye desglose de IVA por tipo y bloque pago/notas opcional.
- **Listado** [`src/app/(app)/documentos/page.tsx`](src/app/\(app\)/documentos/page.tsx) con chips de filtro por tipo (con conteo) y CTA verde "Nuevo documento". Detalle [`/documentos/[id]`](src/app/\(app\)/documentos/[id]/page.tsx) con previsualización a la izquierda y aside de acciones.
- **Tests** [`tests/documentos.test.ts`](tests/documentos.test.ts): 14 casos para totales (vacío, descuentos, varios IVAs, IRPF sobre la base, valores no numéricos), validación según tipo y formato de referencia. Suite global verde **8 archivos · 82 tests**.

### Iteración 30 — *2026-05-03* — Gestión de errores global + gating RGPD reforzado

Avance del plan v1.0 (puntos §2 y §3 de [`plan.md`](plan.md)).

**Toast global y feedback en formularios** (§2):
- Nuevo provider [`Toast`](src/components/ui/Toast.tsx) con hook `useToast()` y aviso en vivo (`aria-live="polite"`) para reemplazar los toasts locales que cada tab implementaba por su cuenta.
- El provider se monta dentro de [`AppShell`](src/components/layout/AppShell.tsx) → todas las rutas autenticadas pueden disparar `toast.ok / toast.err / toast.info`.
- [`clientes/nuevo`](src/app/(app)/clientes/nuevo/page.tsx) detecta `navigator.onLine === false` antes de enviar el insert y muestra toast de éxito/error tras la respuesta de Supabase.

**Estados vacíos con CTA** (§2):
- [`/clientes`](src/app/(app)/clientes/page.tsx) — el placeholder "Aún no tienes clientes" ahora incluye un botón **Añadir primer cliente** que enlaza a `/clientes/nuevo`.
- [`/tareas`](src/app/(app)/tareas/page.tsx) — el placeholder "Sin columnas" sustituye el mensaje técnico por un CTA **Crear columnas** que abre `ColumnManager` directamente.

**Google Calendar 429 explícito** (§2):
- [`fetchEventsPage`](src/lib/agenda.ts) reconoce status 429 y lanza un `Error` con `code = "rate_limit"` y `retryAfter` derivado del header. Mensaje añadido a [`formatGoogleError`](src/lib/google-errors.ts).
- [`CalendarView.runSync`](src/components/agenda/CalendarView.tsx) detecta el error (por `code` o regex `/\b429\b|rate limit/i` para superar la serialización de Server Actions) y muestra "Espera un minuto y vuelve a sincronizar".

**Pantalla de degradación de Supabase** (§2):
- [`/dashboard`](src/app/(app)/dashboard/page.tsx) — el banner de error pasa de un `div` plano a una tarjeta `card-glass` con icono, mensaje claro y botón **Reintentar** que recarga la página. Los datos se mantienen en pantalla (degradación elegante, no full-blank).

**Onboarding RGPD bloqueante** (§3):
- [`onboarding/page.tsx`](src/app/(app)/onboarding/page.tsx) — añadido aviso de las casillas obligatorias pendientes, defensa adicional en `enviar()` (por accesibilidad de teclado) y `aria-disabled` en el botón.
- **Defensa server-side** en la RPC [`registrar_onboarding`](supabase/auth_extension.sql): valida que `terminos`, `privacidad` y `cookies` estén marcados como `aceptado=true` antes de insertar; si falla, lanza `check_violation` y `onboarding_completado` no se actualiza. Esto blinda la lógica si alguien intentara llamar a la RPC saltándose la UI.

Tipado limpio (`tsc --noEmit` verde). El gating de la layout de `(app)` ya redirigía a `/onboarding` si el usuario no había completado consentimientos; ahora además es imposible completarlos sin las tres aceptaciones obligatorias.

### Iteración 29 — *2026-05-03* — Auditoría responsive + accesibilidad + metadatos

Pasada amplia siguiendo una auditoría dirigida por tres agentes de exploración (responsive móvil, a11y, metadatos).

**Responsive móvil (≤400px de ancho)**:
- [`finanzas/nuevo/page.tsx`](src/app/(app)/finanzas/nuevo/page.tsx), [`ocr/page.tsx`](src/app/(app)/ocr/page.tsx), [`kanban/TaskModal.tsx`](src/components/kanban/TaskModal.tsx) — `grid grid-cols-2` → `grid-cols-1 sm:grid-cols-2` para que los pares de campos no provoquen scroll horizontal.
- OCR — paddings `p-8/p-10` → `p-5/p-6 sm:p-8/sm:p-10` (tarjetas y `ActionCard`).
- **Modales con scroll en mobile**: `TaskModal`, `EventModal` y `ContactoModal` ahora son `flex max-h-[calc(100vh-2rem)] flex-col` con cabecera/pie `shrink-0` y body `flex-1 overflow-y-auto`. Permite scrollear el contenido en pantallas cortas sin que se corte el botón de guardar.

**Accesibilidad**:
- **`aria-label` en links/botones icon-only**: tel/mailto/WhatsApp en [`ContactosTab`](src/components/clientes/ContactosTab.tsx) ahora dicen *"Llamar a Juan García"*, *"Enviar email a Juan García"*, etc. Botones editar/eliminar contacto y de logo en [`NegocioTab`](src/components/ajustes/NegocioTab.tsx) también etiquetados.
- **`role="dialog"` + `aria-modal` + `aria-labelledby`** añadidos a `TaskModal` y `ContactoModal` (EventModal ya los tenía).
- **`<span role="button">` con teclado**: el "quitar cliente" del combobox en [`EventModal`](src/components/agenda/EventModal.tsx) ahora responde a Enter/Space (no se podía cambiar a `<button>` sin anidar botones).
- **`alt` mejorado**: imagen del ticket en OCR pasa de `alt="Ticket"` a `"Foto del ticket escaneado"`.
- **Iconos icon-only crecidos a 36×36** en `ContactosTab` (antes 32×32) para tocabilidad ≥ guideline.
- **`type="tel"`** en input de teléfono en `ContactoModal` (autocompletado y teclado móvil correctos).

**Metadatos / SEO / PWA**:
- **Root layout** ([src/app/layout.tsx](src/app/layout.tsx)) ampliado: `metadataBase` desde `NEXT_PUBLIC_SITE_URL`, `title.template = "%s · R3ZON"`, `applicationName`, `keywords`, `openGraph` con locale `es_ES`, `twitter` summary, `robots` con directivas `googleBot`, `formatDetection: { email/telephone/address: false }`. `viewport` añade `colorScheme: "dark"` y `maximumScale: 5`.
- **Layouts server por ruta** con metadata específica creados para `dashboard`, `clientes`, `citas`, `tareas`, `finanzas`, `ocr`, `ajustes`, `rgpd`, `onboarding`, `login`, `registro`, `2fa`. Cada uno renderiza solo `{children}` y exporta `metadata` (las páginas internas son Client Components y no pueden exportar metadata directamente). Las rutas internas llevan `robots: { index: false }` para no indexar el panel.
- **`public/manifest.json`** creado para PWA: name, short_name, start_url=/dashboard, theme_color #080714, locale `es-ES`, categorías business/productivity/finance, icono `/icon.svg`.
- **Favicon vectorial**: [`src/app/icon.svg`](src/app/icon.svg) (32px) + [`src/app/apple-icon.svg`](src/app/apple-icon.svg) (180px) con la marca R3 sobre gradiente indigo y dot cyan.
- **`src/app/robots.ts`** y **`src/app/sitemap.ts`** generados desde `NEXT_PUBLIC_SITE_URL`. Sitemap incluye home, login/registro y las 4 páginas legales; robots permite home y `/legal/`, prohíbe el panel y `/api/`.

Build verde (35 rutas, +3 nuevas: `/icon.svg`, `/robots.txt`, `/sitemap.xml`). Tipado limpio.

### Iteración 28 — *2026-05-03* — Fix hidratación: `<a>` anidados en lista de clientes

**Síntoma**: Next.js console error `In HTML, <a> cannot be a descendant of <a>` al renderizar `/clientes`.

**Causa raíz**: la tarjeta de cliente era un `<Link href="/clientes/[id]">` que envolvía los enlaces de acción rápida (`tel:`, `mailto:`, `wa.me`, web) — `<a>` dentro de `<a>` es HTML inválido y rompe la hidratación.

**Fix** [`src/app/(app)/clientes/page.tsx`](src/app/(app)/clientes/page.tsx): patrón "stretched link" — la tarjeta ahora es un `<article relative>` con un `<Link absolute inset-0>` como overlay y los enlaces de acción son hermanos con `relative z-10` y `pointer-events-auto`. Decoración (avatar, nombre, badges) marcada con `pointer-events-none` para que el área clickable de la card siga llevando a la ficha. Eliminados los `e.stopPropagation()` que ya no hacen falta.

### Iteración 27 — *2026-05-03* — Limpieza de navbar + dashboard como resumen integral + Testing

**Navbar más limpia** ([`src/components/layout/Sidebar.tsx`](src/components/layout/Sidebar.tsx)):
- Retirados los items "Seguridad 2FA" y "Escanear" — eran rutas duplicadas. El 2FA sigue accesible desde Ajustes → Seguridad (que ya tenía el bloque completo `mfa.listFactors()` + link a `/2fa/configurar`); el OCR sigue accesible desde la `QuickAction` "Escanear ticket" en Finanzas. Ambas rutas (`/2fa/configurar` y `/ocr`) se mantienen sin cambios — solo se quita el ruido de la barra lateral.

**Dashboard rediseñado** ([`src/app/(app)/dashboard/page.tsx`](src/app/(app)/dashboard/page.tsx)):
- Antes: 4 KPIs estáticos hardcodeados a "—".
- Ahora: panel agregador con saludo dinámico (mañana/tarde/noche) y 4 filas de widgets responsivos.
- **Fila 1 — KPIs**: Clientes (con altas del mes), Citas hoy (con próxima cita destacada), Ingresos del mes (delta % vs mes anterior), Tareas pendientes (con vencidas en rojo).
- **Fila 2 — Estado financiero**: 3 sub-KPIs (Te queda año, Apartar Hacienda IVA+IRPF, Beneficio del mes) + `<MonthlyBars>` reutilizado de Charts.
- **Fila 3**: Próximas citas (7 días, vía `listEvents`) + Tareas pendientes (top 5 ordenadas por fecha límite, badges de prioridad y vencimiento).
- **Fila 4**: Últimos clientes (5, con sector y fecha relativa, link a ficha) + Actividad reciente (10, feed de `comunicaciones` con icono por tipo: nota/email/whatsapp/webhook).

**Hook agregador** ([`src/lib/useDashboardData.ts`](src/lib/useDashboardData.ts)):
- 13 queries en paralelo con `Promise.all`: counts head-only para KPIs, ranges para listas, join `comunicaciones → clientes(nombre)` para nombrar al cliente en el feed.
- Reutiliza `useNegocioId()`, `listEvents()` y los tipos `MovimientoFila` existentes — cero duplicación de lógica.
- Skeletons globales mientras `loading`; banner de error inline si alguna query falla pero no bloquea el render.

**Componentes nuevos** ([`src/components/dashboard/`](src/components/dashboard/)):
- `KpiCard` reusable (label, value, hint, delta tonal up/down/neutral, 5 acentos cyan/fuchsia/ok/warn/danger, skeleton).
- `UpcomingAppointments`, `PendingTasks`, `RecentClients`, `RecentActivity`, `FinanceSummary` — cada uno con su empty state y skeleton. Todos siguen el R3ZON Design System (glass, accent-bar, secciones con icono).

Build verde (32 rutas), tipado limpio.

**Testing mínimo viable** (plan §1):
- **Vitest 2.1** instalado con [`vitest.config.ts`](vitest.config.ts) (alias `@/*` y stub de `server-only` para que los módulos admin se carguen fuera de Next).
- **Scripts nuevos** en `package.json`: `npm test`, `npm run test:run`, `npm run test:coverage`.
- **50 tests / 6 ficheros** pasando, sin tocar producción:
  - [`tests/parser.test.ts`](tests/parser.test.ts) — OCR español: fechas (`dd/mm/yyyy`, `dd-mm-yy`, normalización siglo), CIF/NIF/NIE, base + IVA + total con separadores `1.234,56`, cálculo derivado cuando solo hay total + porcentaje.
  - [`tests/finanzas.test.ts`](tests/finanzas.test.ts) — `totales()` (IVA repercutido vs soportado, devolución Hacienda) y `agregarPorMes()` (12 buckets, filtro de año).
  - [`tests/stripe.test.ts`](tests/stripe.test.ts) — webhook con firma real (`stripe.webhooks.generateTestHeaderString`): rechaza firmas inválidas, persiste `invoice.paid` en `pagos_stripe`, ignora customers huérfanos. Cubre además `planFromPriceId`.
  - [`tests/google-admin.test.ts`](tests/google-admin.test.ts) — refresh proactivo de access_token expirado, retry ante 401, error sin filtrar body cuando `invalid_grant`, propagación de `loadTokensFor` y `persistSyncTokenFor`.
  - [`tests/google-oauth-callback.test.ts`](tests/google-oauth-callback.test.ts) — flujo `GET /api/integrations/google/callback`: error de Google, CSRF (`invalid_state`), redirect a `/login` sin sesión, `no_refresh_token`, flujo completo con persistencia vía `set_google_tokens`.
  - [`tests/supabase-rpc.test.ts`](tests/supabase-rpc.test.ts) — wrappers RPC (`get_google_tokens`, `set_google_tokens`, `set_google_sync_token`).
- **Mocks ligeros**: `vi.mock("@/lib/supabase/admin"|"server")` con `rpc` espiado y `vi.spyOn(globalThis, "fetch")` — sin red, sin Supabase real, sin Stripe real.
- `npx tsc --noEmit` y `npm run test:run` verdes. La suite cubre los 5 puntos del plan §1 y deja la base lista para refactorizar con red de seguridad.

### Iteración 26 — *2026-05-02* — Google Calendar: cron de renovación de watch channels
- **Endpoint cron** [`src/app/api/cron/refresh-google-channels/route.ts`](src/app/api/cron/refresh-google-channels/route.ts) — protegido con `CRON_SECRET` (Bearer header) o `x-vercel-cron`. Llama a `refreshExpiringWatchChannels()` y devuelve `{ total, renewed, failed, errors[] }`. Acepta GET y POST (para `pg_cron + net.http_post`).
- **`refreshExpiringWatchChannels()`** en [`src/lib/agenda-admin.ts`](src/lib/agenda-admin.ts) — lista `google_connections` con `channel_expiration` nulo o en <24h; registra nuevo watch para cada una vía `googleFetchAdmin` + UPDATE service-role. Errores individuales no bloquean al resto.
- **Schedule en Vercel** [`vercel.json`](vercel.json) — `crons: [{ path: '/api/cron/refresh-google-channels', schedule: '0 3 * * *' }]`. Vercel inyecta `x-vercel-cron` automáticamente.
- **Setup alternativo**: pg_cron en Supabase con `net.http_post` cabeceando `Authorization: Bearer ${CRON_SECRET}`, o GitHub Actions con `curl`.
- **Env nueva**: `CRON_SECRET` (`openssl rand -base64 32`).
- **Por qué un cron y no solo `ensureWatchChannel()`**: si un usuario no abre la agenda durante 7 días, el canal expira y deja de recibir push. El cron diario garantiza renovación independiente del uso.

### Iteración 25 — *2026-05-02* — Google Calendar: bug del botón Sincronizar + sync ilimitado
- **Bug "botón no hace nada"** (`connect/route.ts`): faltaban env vars → redirect silencioso a `/ajustes?error=...`. Fix:
  - Propaga `?next=…` mediante cookie `g_oauth_next` (httpOnly, sameSite=lax). `safeNext()` previene open-redirect.
  - Si faltan `GOOGLE_CLIENT_ID/SECRET` redirige a la página de origen con `?google_error=missing_google_credentials`.
- **`callback/route.ts`** — lee `next` desde cookie `g_oauth_next` (Google no devuelve query params). Borra ambas cookies al terminar.
- **`getGoogleConnectionStatus()`** añade `{ serverConfigured, missingEnv[] }`. Comprueba `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_WEBHOOK_URL`.
- **`src/lib/google-errors.ts`** — `formatGoogleError(code)` traduce códigos `?google_error=…` a mensajes legibles. Movido fuera de `"use server"` (solo funciones async son exportables desde Server Actions en Next.js 16).
- **`GoogleCard.tsx`** y **`CalendarView.tsx`** — comprueban `serverConfigured` antes de redirigir; detectan `?google_error=` y `?google=connected`; limpian query params con `history.replaceState`.
- **Sync ilimitado** (`agenda.ts`, `agenda-admin.ts`) — full-sync inicial pasa de `−30d/+90d` a **sin límite temporal** (`orderBy=updated`, sin `timeMin/timeMax`). 410-fallback también elimina los bounds.

### Iteración 24 — *2026-05-02* — Google Calendar: callback OAuth + webhook push + Server Action de estado
- **Bug raíz** ("UI Desconectado / Sincronizar inoperante"): faltaba `/api/integrations/google/callback/route.ts`. Creado: valida `state` cookie (CSRF), intercambia `code` por tokens, persiste cifrados vía `set_google_tokens`, redirige a `/agenda?google=connected`. Login Google y permisos Calendar **separados**. Nunca loguea code/tokens.
- **Push notifications**: SQL en `agenda_ext.sql` — columnas `channel_id / channel_token / channel_resource_id / channel_expiration` + unique index parcial. RPCs `set_google_watch_channel`, `clear_google_watch_channel`, `find_connection_by_channel` (service_role only), `get_google_tokens_admin`, `update_google_access_token_admin`, `set_google_sync_token_admin`. `REVOKE ... FROM public, anon, authenticated` + `GRANT ... TO service_role`.
- **Watch channel en `agenda.ts`**: `registerCalendarWatch()` (randomUUID + randomBytes token, POST `/events/watch`), `ensureWatchChannel()` (renueva si <24h, invocado al final de `syncGoogleCalendar()` best-effort), `stopCalendarWatch()` (llamado al desconectar).
- **Webhook** `src/app/api/integrations/google/webhook/route.ts`: `state==='sync'` → ack 200; valida `(channel_id, token)` vía `find_connection_by_channel`; lanza `syncGoogleCalendarFor(userId)` del path admin (sin `"use server"`). Siempre devuelve 200 (no 5xx para evitar loops de reintento).
- **`src/lib/google-admin.ts`**: `googleFetchAdmin` + refresh con `update_google_access_token_admin`. `import "server-only"`.
- **`src/app/actions/google.ts`**: `getGoogleConnectionStatus()` devuelve `{ connected, email, expiresAt, scope, watchActive, watchExpiresAt }`, nunca tokens.
- **`CalendarView.tsx`**: botón Sincronizar → si `!connected` redirige OAuth; si vuelve con `?google=connected` ejecuta sync automático y limpia URL.

### Iteración 23 — *2026-05-02* — Kanban: columnas reordenables, batch persistence, drop indicator
- **Columnas arrastrables horizontalmente** (`SortableColumn` con `horizontalListSortingStrategy`). `GripHorizontal` como `setActivatorNodeRef` — arrastrar tarjetas no mueve la columna. Drag de columnas y tareas en un único `DndContext` discriminados por `data.type`.
- **Persistencia batch**: RPCs `reordenar_tareas_batch(p_updates jsonb)` y `reordenar_columnas_batch(p_updates jsonb)` en `crm_kanban_ext.sql`. Al mover tarjeta entre columnas se recalculan posiciones de **ambas** columnas. Fallback a `Promise.all` si la RPC aún no existe en BD.
- **`ColumnManager` rediseñado** — lista vertical sortable con dnd-kit, drag handle `GripVertical`. "Nueva columna" como fila inline compacta (color-dot + input + botón `+`).
- **Botón `+`** — `h-8 w-8` ghost/outline: borde indigo, hover cyan `bg-cyan/5`.
- **Drop indicator mejorado** — placeholder con borde cyan punteado, `bg-cyan/5` y `animate-pulse`. `DragOverlay` con easing `cubic-bezier`.

### Iteración 22 — *2026-05-02* — Kanban: drag total, creación rápida y persistencia paralela
- **Tarjeta arrastrable desde cualquier parte** — eliminado el handle `GripVertical`; `attributes` + `listeners` al `<div>` raíz. Cursor `grab/grabbing`, `touch-none`/`select-none`.
- **`InlineTaskAdder.tsx`** — creación in-line solo con título: Enter crea, Esc cancela, click fuera vacío cancela. Input permanece abierto para varias seguidas. Estado vacío de columna como botón que abre el adder.
- **Persistencia paralela** — `for…await` secuencial → `Promise.all(...)`. Menos bloqueo HTTP, menor probabilidad de race con HMR.

### Iteración 21 — *2026-05-02* — Fix RLS en kanban, finanzas y OCR + build verde
- **`src/lib/useNegocioId.ts`** — hook que carga `id` de `perfiles_negocio` y lo cachea; formularios deshabilitan botón Guardar hasta que esté disponible.
- **Fix RLS**: `TaskModal`, `finanzas/nuevo`, `ocr/page`, `clientes/nuevo` migrados a `useNegocioId()` con envío explícito de `negocio_id`.
- **`npm run build` verde** (28 rutas): arreglados 3 problemas preexistentes — `tsconfig.json` excluye `supabase/functions` (Deno), `CalendarView` sin `week` de `LocaleInput`, `login/page.tsx` con `useSearchParams()` en `<Suspense>`.

### Iteración 20 — *2026-05-02* — Página 404, formulario cliente simplificado, contactos
- **404** [`src/app/not-found.tsx`](src/app/not-found.tsx) — pantalla glass con número en gradient cyan→fuchsia, CTAs "Ir al panel" + "Ver clientes".
- **Formulario simplificado** `/clientes/nuevo` — solo `nombre` obligatorio visible; resto en acordeón "Datos adicionales" colapsado. Cliente creable en 5 segundos.
- **Tab Contactos confirmada** — `ContactosTab` montado en `/clientes/[id]` con modal alta/edición, jerarquía `reports_to`, decisor, puesto, WhatsApp.

### Iteración 19 — *2026-05-02* — Fix: clientes, agenda, finanzas y kanban
Cuatro bugs reportados. Causa raíz unificada: tablas B2C antiguas referenciadas desde frontend, `negocio_id` ausente en INSERTs.

- **SQL** [`supabase/fix_tenant_defaults.sql`](supabase/fix_tenant_defaults.sql) — trigger `tg_fill_negocio_id` BEFORE INSERT en 12 tablas. Si el INSERT omite `negocio_id`, el trigger lo rellena con `current_negocio_id()`. Resuelve todos los inserts presentes y futuros.
- **Clientes**: páginas listado, nuevo y ficha reescritas con campos B2B reales. Combobox en `EventModal` busca por `nombre`/`cif`/`email`.
- **Agenda**: `createEvent` envuelve Google en `try/catch` (fallo → crea en local, sync posterior). Eliminada validación "no crear citas en el pasado".
- **Kanban / Finanzas / OCR**: `TaskModal`, `finanzas/nuevo`, `ocr/page` corregidos para incluir `negocio_id` explícito.

### Iteración 18 — *2026-05-01* — Ajustes: portal de suscripción (Stripe)
- Nueva dependencia: `stripe`.
- **SQL** (`supabase/billing_ext.sql`): campos stripe en `perfiles_negocio`, tabla `pagos_stripe` con RLS dual (OWNER lee; webhook con service_role escribe).
- **`lib/stripe.ts`**: lazy-singleton + catálogo `PLANS` (Pro 29€/mes, Business 79€/mes) + `planFromPriceId()`.
- **Route handlers**: `POST /api/billing/checkout` (Zod valida plan, garantiza Stripe Customer, crea Checkout Session), `POST /api/billing/portal` (Customer Portal), `POST /api/billing/webhook` (`runtime="nodejs"`, valida firma, maneja `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`).
- **`SuscripcionTab.tsx`**: cabecera "Plan actual" con pill de estado y próxima renovación, tabla de precios (oculta si hay suscripción activa), historial de pagos con enlaces PDF/web.
- Env requeridas: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`.

### Iteración 17 — *2026-05-01* — Ajustes: equipo + seguridad

**SQL** (`supabase/team_ext.sql`): enums `rol_miembro` / `estado_miembro`, tabla `miembros_negocio`, RPC `aceptar_invitacion` (enlaza `user_id`, registra consentimientos RGPD con timestamp+IP+UA), vista `v_equipo_negocio`.

**Route handlers**: `POST /api/team/invite` (Zod + `auth.admin.inviteUserByEmail` + insert en `miembros_negocio`), `POST /api/team/revoke` (marca `revocado`, no borra — audit trail).

**`EquipoTab.tsx`**: tabla con pills coloreadas por rol (admin fuchsia, editor cyan, lector neutro) y estado (activo esmeralda, invitado ámbar, revocado rosa). Owner con icono Crown, no removible.

**`InvitarMiembroModal.tsx`**: 3 tarjetas visuales de rol + checkbox RGPD obligatorio.

**`SeguridadTab.tsx`**: estado 2FA (`mfa.listFactors()`), cierre global (`signOut({ scope: "global" })`), lista de dispositivos con acción "Olvidar".

### Iteración 16 — *2026-05-01* — Fix: loop 307 en `/onboarding`
- **Síntoma**: `GET /onboarding 307` en bucle infinito.
- **Causa raíz**: `layout.tsx` leía `x-invoke-path` (header interno de Next.js antiguo, desaparecido en v16) → `pathname` siempre `""` → la guarda `!startsWith("/onboarding")` se cumplía siempre → re-redirect.
- **Fix**: `middleware.ts` reenvía `x-pathname` con `request.nextUrl.pathname`; `layout.tsx` lo lee y hace early return cuando ya está en `/onboarding`.

### Iteración 15 — *2026-05-01* — Ajustes: panel de integraciones con sistema de ayuda
- **`GoogleCard.tsx`** — lee `google_connections.google_account_email` para mostrar cuenta conectada. Botón Conectar → `/api/integrations/google/connect`. Botón Desconectar → borra fila.
- **`N8nCard.tsx`** — URL webhook + API Key persistidos vía RPC `set_config_key` con `pgp_sym_encrypt`. Botón "Enviar prueba" dispara POST al webhook.
- **`HelpDrawer.tsx`** — botón "?" + panel lateral con guías paso a paso para usuarios no técnicos (`integracionesGuides.ts`).
- **Route handler** `/api/integrations/google/connect` — URL OAuth con scopes Calendar + Drive.file + email/profile, `access_type=offline` + `prompt=consent`, cookie `g_oauth_state` httpOnly+SameSite=Lax (CSRF, 10 min).

### Iteración 14 — *2026-05-01* — Ajustes: layout + perfil de negocio
- Nueva dependencia: `zod`.
- `SettingsTabs.tsx` — 5 pestañas (Negocio · Integraciones · Equipo · Suscripción · Seguridad), navegación lateral desktop / superior mobile.
- `NegocioTab.tsx` — formulario `nombre_negocio`, `cif_nif`, `direccion`, `email_contacto`, `telefono` + logo en bucket `logos` de Supabase Storage (máx. 2 MB, PNG/JPG/WebP/SVG).
- `negocioSchema.ts` — Zod con validación CIF/NIF, email, teléfono E.164.

### Iteración 13 — *2026-04-30* — Reestructura BD + fix Next.js 16 proxy + seed B2B

- `supabase/schema.sql` reescrito: `clientes` nace con todos los campos B2B + `contactos_cliente` integrado. `consentimientos_rgpd.cliente_id` NULLABLE.
- Borrados `empresas_ext.sql` y `refactor_b2b_clientes.sql` (consolidados).
- Nuevo `supabase/seed_clientes.sql` — 10 empresas reales con contactos y jerarquía.
- Nuevo `supabase/setup.sql` — script único de instalación limpia (wipe + `\i` en orden).
- **Fix Next.js 16**: borrado `src/middleware.ts`, conservado `src/proxy.ts` (resuelve `unhandledRejection: Both middleware file ... and proxy file ... detected`).

### Iteración 12 — *2026-04-30* — Refactor a modelo B2B puro (Clientes = Empresas)

- Eliminado módulo CRM B2C. Renombrado `Empresas` → `Clientes` en rutas, componentes, tipos y sidebar.

**SQL** (`supabase/refactor_b2b_clientes.sql`): `drop table clientes cascade`, `alter table empresas rename to clientes`, `alter table contactos_empresa rename to contactos_cliente`. Recreación de FKs desde todas las tablas dependientes.

**Frontend**: `src/components/empresas/` → `src/components/clientes/`. `Empresa` → `Cliente`. Pestaña "Estructura jerárquica" → **"Organigrama"**. Sidebar usa icono `Building2`.

### Iteración 11 — *2026-04-30* — Modal de cita + vinculación con clientes

**Server actions**: `updateEvent` (PATCH Google primero, luego Supabase), `getEvent`, soporte `ubicacion`.

**`EventModal.tsx`**: diálogo glass estilo proyecto. Combobox de clientes con debounce 250ms y AbortController. Campos: título, cliente, inicio/fin, ubicación, notas, selector de 6 colores. Insignia "Esta cita se verá en tu móvil…". Validación: título no vacío, fin > inicio. Botón eliminar con confirmación (borra Google + Supabase).

**Cableado en `CalendarView.tsx`**: `select` y botón "Nueva cita" → modal creación. `eventClick` → `getEvent(id)` → modal edición. `onSaved`/`onDeleted` recarga rango y muestra toast.

### Iteración 10 — *2026-04-30* — UI del Calendario (FullCalendar dark)

**Dependencias**: `@fullcalendar/{core,daygrid,timegrid,interaction,react}` v6.1.15.

**Estilos** (`src/components/agenda/calendar.css`): override de variables `--fc-*`, cuadrícula glass, "today" tinted cyan, indicador "ahora" fucsia con glow. Botones toolbar 44px, eventos gradient indigo con variantes por `data-color`.

**Componente `CalendarView.tsx`**: vistas month/week/day, locale español, `firstDay=1`, `slot 07:00-22:00`, `nowIndicator`. `editable` + `eventResizableFromStart` + `selectable`. Pill "Sincronizando…" / "Al día". Botones ≥56px.

**Server actions**: `listEvents`, `updateEventTime` (drag/resize), `createEvent`, `deleteEvent`.

### Iteración 9 — *2026-04-30* — Infraestructura Agenda + Google Calendar API

**SQL** (`supabase/agenda_ext.sql`):
- Tabla `agenda_eventos` con `google_event_id`, `google_etag`, `last_synced_at`, `estado`. Índice único parcial en `(negocio_id, google_event_id)`.
- Tabla `google_connections` con `access_token` y `refresh_token` cifrados con `pgp_sym_encrypt`. Una fila por usuario.
- Funciones SECURITY DEFINER: `set_google_tokens`, `update_google_access_token`, `get_google_tokens`, `set_google_sync_token`.

**Cliente Google** (`src/lib/google.ts`):
- `loadTokens` / `saveTokens` / `persistSyncToken` — RPC al schema cifrado.
- `googleFetch(path, init)` — wrapper con refresh proactivo (si `expires_at ≤ now`) y reactivo (401 → intercambia token y reintenta). Sin SDK `googleapis`.

**Motor de sync** (`src/lib/agenda.ts`):
- `syncGoogleCalendar()` — Server Action. Sync incremental con `nextSyncToken`; 410 → full sync. Pagina con `nextPageToken`. Upsert por `(negocio_id, google_event_id)`.

### Iteración 8 — *2026-04-30* — Auth Next.js 15 + Módulo B2B Empresas

**Auth fix Next.js 15:**
- `src/lib/supabase/server.ts` ahora es `async` y hace `await cookies()`.
- Login limpio: eliminados botones Apple/Facebook. `OAuthButtons` solo Google con spinner.
- Mensajes de error traducidos al español con icono `AlertCircle`.

**Módulo Empresas (CRM B2B):**
- **SQL** (`supabase/empresas_ext.sql`): tablas `empresas` y `contactos_empresa` con FK autorreferencial `reports_to`. Trigger de validación de jerarquía. RLS multi-tenant.
- **Rutas**: `/empresas` (lista + filtros + skeletons), `/empresas/nuevo`, `/empresas/[id]` (3 pestañas).
- **Tabs**: Información (edición inline), Contactos (CRUD modal con jerarquía `reports_to`), Estructura jerárquica (`HierarchyChart` con `@xyflow/react`, layout de árbol automático, nodos glass-card, drag/zoom).
- Dependencia añadida: `@xyflow/react`.

### Iteración 7 — *2026-04-28* — Botón de acceso rápido en dev
- `DevLoginButton` (`src/components/auth/DevLoginButton.tsx`) — se renderiza **solo cuando `NODE_ENV === 'development'`**; en producción Next.js lo elimina del bundle. Lee `NEXT_PUBLIC_DEV_EMAIL` / `NEXT_PUBLIC_DEV_PASSWORD` y llama a `signInWithPassword`. Badge naranja `DEV MODE` + botón con icono ⚡.

### Iteración 6 — *2026-04-28* — CRM completo + Kanban con Drag & Drop

**SQL:** nueva migración `supabase/crm_kanban_ext.sql` con tablas `comunicaciones`, `kanban_columnas` y columnas `webhook_url/webhook_activo` en `clientes`. RLS aplicado. Trigger `seed_kanban` que inicializa 4 columnas por defecto al crear un negocio.

**CRM — Clientes:**
- `/clientes` — listado en grid con búsqueda en tiempo real (debounce 300ms), botones rápidos de WhatsApp/Email/teléfono y etiquetas de color.
- `/clientes/nuevo` — formulario con etiquetas personalizadas + sugeridas.
- `/clientes/[id]` — ficha con 4 pestañas: Información (edición inline), Historial (citas), Mensajes (log comunicaciones), Automático (webhook n8n/Make con botón Probar).

**Kanban:**
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag & drop táctil y ratón. `PointerSensor` (distancia 8px) + `TouchSensor` (delay 200ms).
- `DragOverlay` con rotación sutil durante el arrastre. Placeholder punteado en posición de origen.
- Reordenación dentro de columna y cambio de columna — persistencia optimista.
- `ColumnManager` — diálogo para crear, renombrar, cambiar color y eliminar columnas.
- `TaskModal` — creación/edición: título, descripción, columna, prioridad, fecha límite, checkbox "completada". Tareas vencidas con borde rojo.

Dependencias añadidas: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

### Iteración 5 — *2026-04-28* — Bitácora en README
- Reescrito `README.md` con el estado real del proyecto, estructura de carpetas y tabla de módulos.
- Añadida la sección **Bitácora de iteraciones** que se actualiza en cada turno.

### Iteración 4 — *2026-04-28* — Finanzas, OCR y admin
- **Credenciales admin** en `.env.local` + script `npm run seed:admin`.
- **OCR client-side**: `lib/ocr/engine.ts` (wrapper Tesseract.js con modelo spa+eng) + `lib/ocr/parser.ts` (regex específicos para tickets españoles: fecha, CIF/NIF, base, IVA % y total).
- **Pantalla `/ocr`** con cámara/upload, barra de progreso y revisión editable antes de guardar.
- **Dashboard `/finanzas`** con Recharts: 4 KPIs ("Lo que has ganado", "Lo que has gastado", "Te queda", "Apartar para Hacienda"), barras mensuales, previsión de impuestos y lista de últimos movimientos.
- **`/finanzas/nuevo`** con toggle "He cobrado / He gastado" y cálculo en vivo del total.
- Dependencias añadidas: `tesseract.js`, `recharts`.

### Iteración 3 — *2026-04-28* — Autenticación, 2FA, RGPD y legales
- **Auth completa**: `/login`, `/registro` con email + 3 botones OAuth (Google, Apple, Facebook).
- **2FA TOTP**: `/2fa/configurar` (QR + clave manual) y `/2fa` (verificación). Middleware fuerza el flujo cuando la sesión es `aal1` con `nextLevel=aal2`.
- **Email de nuevo dispositivo**: `DeviceTracker` calcula fingerprint SHA-256 y, si es nuevo, invoca la Edge Function `notify-new-device` que envía mail con Resend.
- **Onboarding RGPD**: checkboxes obligatorios (términos, privacidad, cookies) + opcional marketing → RPC `registrar_onboarding` graba en `consentimientos_rgpd` con IP, UA y versión.
- **4 páginas legales** (`/legal/*`) con plantillas RGPD/LOPDGDD/LSSI-CE.
- Nuevas tablas: `terminos_versiones`, `dispositivos_conocidos`. Columnas `onboarding_completado*` en `perfiles_negocio`.

### Iteración 2 — *2026-04-28* — Credenciales Supabase
- Guardadas las credenciales reales del proyecto en `.env.local` (gitignored).
- Migración a la nueva nomenclatura `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_DB_PASSWORD` separado sin prefijo `NEXT_PUBLIC_` para no exponerlo al bundle.

### Iteración 1 — *2026-04-28* — Fundación del proyecto
- **Stack inicial**: Next.js 14, TypeScript, Tailwind, Supabase SSR clients.
- **Esquema multi-tenant** (`supabase/schema.sql`) con `perfiles_negocio`, `clientes`, `citas`, `tareas_kanban`, `finanzas` (con IVA/IRPF como columnas generadas), `consentimientos_rgpd`, `config_keys` (cifrada con `pgcrypto`). RLS y trigger de bootstrap incluidos.
- **AppShell** con `Sidebar` (botones grandes 56px) y drawer mobile, siguiendo el R3ZON Design System. Páginas placeholder para todos los módulos.

---

## 📚 Documentos relacionados

- [`AUTH.md`](AUTH.md) — guía completa de despliegue de auth, OAuth, MFA y Edge Function.
- [`STRUCTURE.md`](STRUCTURE.md) — desglose detallado de la estructura inicial.
- `r3zon-design-system.md` — manual de estilo (dark glass, tokens cyan/fuchsia).

---

<div align="center">
  <sub>Construido para negocios reales, no para developers.</sub>
</div>

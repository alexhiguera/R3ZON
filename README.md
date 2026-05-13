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

# 2. Variables de entorno
cp .env.local.example .env.local
# Rellenar todos los valores — ver comentarios en .env.local.example

# 3. Base de datos
# Opción A (dev): abrir Supabase SQL Editor y pegar setup.sql completo.
#   setup.sql hace wipe + reload de todo en el orden correcto.
#
# Opción B (producción o incremental): ejecutar en este orden exacto:
#   1.  schema.sql                    # tablas base, RLS, triggers
#   2.  auth_extension.sql            # onboarding, dispositivos, RPCs TOTP
#   3.  crm_kanban_ext.sql            # comunicaciones, kanban_columnas, RPCs batch
#   4.  agenda_ext.sql                # agenda_eventos, google_connections, watch channels
#   5.  billing_ext.sql               # stripe_customer_id, pagos_stripe
#   6.  team_ext.sql                  # miembros_negocio, RPCs invitación/revocación
#   7.  metodos_pago_ext.sql          # métodos de pago configurables
#   8.  documentos_ext.sql            # documentos (factura/ticket/presupuesto), numeración AEAT
#   9.  documentos_recibo_logos_ext.sql  # campo logo en documentos tipo recibo
#   10. inventario_ext.sql            # productos, stock_movimientos, TPV
#   11. inventario_imagenes_ext.sql   # campo imagen_url en productos
#   12. fichajes_ext.sql              # fichajes (RD-ley 8/2019), state machine
#   13. proveedores_ext.sql           # proveedores, gastos recurrentes
#   14. listado_ext.sql               # configuración de campos del listado
#   15. perfil_usuario_ext.sql        # avatar y preferencias de usuario
#   16. theme_ext.sql                 # temas personalizados por negocio
#   17. rgpd_ext.sql                  # funciones adicionales de auditoría RGPD
#   18. fix_tenant_defaults.sql       # trigger genérico fill_negocio_id (red de seguridad RLS)
#   19. seed_clientes.sql             # (opcional) 10 empresas de ejemplo
#   20. retention_ext.sql             # (opcional) limpieza automática de logs con pg_cron

# 4. Crear usuario admin de desarrollo
npm run seed:admin

# 5. Arrancar
npm run dev
```

### Webhook de Stripe en desarrollo

```bash
# Instalar Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/billing/webhook
# Copiar el signing secret que muestra la CLI a STRIPE_WEBHOOK_SECRET en .env.local
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

### Iteración 52 — *2026-05-13* — Finanzas: eliminado "Exportar CSV" y cabecera a ancho completo

- **`src/app/(app)/finanzas/page.tsx`**: retirado el botón **Exportar CSV** y toda la función `exportarCSV` (junto con los imports `Download`, `useToast`, `descargarCSV`). El `PageHeader` deja de estar envuelto en un `flex justify-between` y pasa a ocupar todo el ancho de la página, manteniendo coherencia con el resto de pantallas. La exportación global sigue disponible desde Ajustes › Datos (ZIP completo) para usuarios que la necesiten.

`tsc` limpio, 132/132 tests verdes.

---

### Iteración 51 — *2026-05-13* — Limpieza de Proveedores y reordenación del sidebar

- **`src/app/(app)/proveedores/page.tsx`**: eliminadas las pestañas **Gastos generales** y **Gastos previstos**; la página queda con dos secciones (**Proveedores** + **Suscripciones**). `TabId` se reduce a `"proveedores" | "suscripcion"`, se quita el icono `CalendarClock` y se simplifica la inicialización del modal (siempre `estado: "pendiente"` y `recurrencia: "mensual"` porque ya solo se crean suscripciones). El header de la página pasa a "Directorio de proveedores y gestión de suscripciones recurrentes." Los registros antiguos con `tipo = "general" | "previsto"` siguen en la BD pero no se exponen en la UI.
- **`src/components/layout/Sidebar.tsx`**: **Proveedores** sube en el orden — ahora aparece justo después de **Clientes**, coherente con la idea de "directorio de contactos" (clientes + proveedores juntos).

`tsc` limpio, 132/132 tests verdes.

---

### Iteración 50 — *2026-05-13* — Sidebar scrolleable, cambio de contraseña y responsive móvil en Ajustes/Proveedores

Ajustes de UX detectados al usar la app en móvil:

- **`src/components/layout/Sidebar.tsx`**: refactor en tres bandas — el logo queda fijo arriba, el bloque de navegación es `flex-1 overflow-y-auto` (las secciones se deslizan independientemente) y el `UserMenu` se ancla abajo con `border-t` y `backdrop-blur` para que el perfil esté siempre accesible aunque la lista crezca. Esto soluciona el problema móvil donde la última sección y el botón de usuario quedaban fuera de pantalla.
- **`src/components/ajustes/SeguridadTab.tsx`**: nueva tarjeta **Cambiar contraseña** con re-autenticación previa (`signInWithPassword` con el email actual + contraseña actual antes de invocar `updateUser({ password })`), validación cliente (mínimo 8 caracteres, distinta de la actual, confirmación que coincida), indicador de fuerza de 1–5 barras (longitud + may/min + dígitos + símbolos) y toggle ojo/ojo-tachado para mostrar las tres contraseñas. Mensajes de error inline por campo y feedback de éxito reutilizando el toast existente.
- **`src/components/ajustes/SettingsTabs.tsx`** y **`src/app/(app)/proveedores/page.tsx`**: la navegación lateral de pestañas pasa de `flex-1` (que en móvil exprimía 11 pestañas en horizontal) a `shrink-0` con `whitespace-nowrap` y scroll horizontal natural. En desktop sigue siendo columna vertical (`lg:flex-col`).
- **`src/app/(app)/proveedores/page.tsx`**: los modales `ProveedorModal` y `GastoModal` cambian `grid grid-cols-2` por `grid grid-cols-1 sm:grid-cols-2`, evitando inputs cortados en pantallas estrechas. Los elementos que ocupaban dos columnas (`col-span-2`) se condicionan a `sm:col-span-2` para que respeten la columna única móvil.

Verificación: `npx tsc --noEmit` exit 0, 132/132 tests pasan.

---

### Iteración 49 — *2026-05-13* — Auditoría integral v1.1: seguridad endurecida, errores legibles y accesibilidad WCAG AA

Diagnóstico completo en tres frentes (seguridad / gestión de errores / accesibilidad) y ejecución en un único sprint:

**Seguridad — cabeceras HTTP, timing-safe crypto y documentación de secretos**

- **`next.config.mjs`**: añadidos headers `Content-Security-Policy` (con allow-list para Supabase, Stripe, Google y Vercel Analytics, `worker-src blob:` para Tesseract, `frame-ancestors 'none'`), `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy` con cámara/micro/geo deshabilitados. No se aplican en modo `output: export` (Capacitor) porque Vercel los strippea en export estático.
- **`supabase/security_timing_hardening.sql` (nuevo)**: reescribe `find_connection_by_channel(text, text)` con comparación de digests SHA-256 de longitud fija → mitiga timing attacks sobre `channel_token` del webhook de Google Calendar. Restringe `EXECUTE` a `service_role`. Integrado en `setup.sql` tras `security_hardening.sql`.
- **`.env.local.example`**: documentado cómo generar y rotar `app.config_master_key` (GUC pgcrypto) con `openssl rand -base64 48`. Aclara que la clave vive en Supabase Custom Postgres Config, no en `.env` del frontend, y que la rotación requiere re-cifrar `google_connections`.
- **`.gitignore`**: verificado — `.env*.local` excluido, ningún archivo de secretos commiteado (`git ls-files | grep env` solo devuelve `.env.local.example`).
- **`src/app/api/billing/webhook/route.ts`**: sanitizada la respuesta — ya no devuelve `err.message` al cliente (potencial filtrado de stack/detalles internos). Los detalles se loguean en servidor.

**Gestión de errores — todos los errores ahora son legibles y dentro del design system**

- **`src/lib/supabase-errors.ts` (nuevo)**: `formatSupabaseError(err)` mapea códigos PostgREST (`23505`, `23503`, `23502`, `42501`, `22P02`, `PGRST116`, `PGRST301`…), errores de auth (`Invalid login credentials`, `Email rate limit`, `JWT expired`…), Storage (`Payload too large`, `mime type`…), red (`Failed to fetch`, `timeout`…) y HTTP status a mensajes en español. Filtro `looksTechnical()` evita filtrar mensajes con `violates`/`constraint`/`stack` al usuario.
- **`src/lib/stripe-errors.ts` (nuevo)**: traductor equivalente para Stripe (decline_codes, card_declined, expired_card, etc.).
- Integrado en **`useSupabaseQuery`** (todas las cargas) y en 5+ tabs de Ajustes: `ListadoTab`, `SeguridadTab` (2), `N8nCard` (3), `FacturacionTab` (4), `DatosTab`, `CumplimientoTab`, `GoogleCard`, `TaskModal`, `ContactosTab`, `proveedores`, `listado`, `perfil`.
- **`src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/(app)/error.tsx`, `src/app/(app)/loading.tsx` (nuevos)**: boundaries glass con CTAs "Reintentar" y "Ir al panel", coherentes con `not-found.tsx`. `global-error.tsx` incluye estilos inline para funcionar incluso si falla el root layout.
- **`src/components/ui/ConfirmDialog.tsx` (nuevo)** + hook `useConfirmDialog()`: sustituye las 16 ocurrencias de `window.confirm()` por un modal glass accesible con `tone` (`danger`/`warning`/`info`) y opción `requireTyping` para acciones críticas. Migradas: `EquipoTab`, `SeguridadTab`, `N8nCard`, `CumplimientoTab`, `GoogleCard`, `EventModal`, `TaskModal`, `ColumnManager`, `ContactosTab`, `clientes/[id]`, `proveedores` (×2), `listado`, `perfil`, `tpv`.
- **`src/components/ui/OfflineBanner.tsx` (nuevo)**: banner sticky en AppShell que aparece cuando `navigator.onLine === false` con `role="status"` y `aria-live="polite"`.

**Accesibilidad — WCAG 2.1 AA y nueva pestaña Accesibilidad en Ajustes**

- **`src/app/globals.css`**: regla global `:focus-visible` con outline cyan (offset 2-3 px), variante específica para inputs con `box-shadow ring`, soporte `prefers-reduced-motion: reduce`, clases `html.reduce-motion`, `html.alto-contraste` (glass → sólido + contraste reforzado), `html.underline-links`, `html.large-cursor` (cursor SVG 32 px) y `.skip-link`.
- **`src/components/ui/Modal.tsx`**: focus trap completo (Tab/Shift+Tab confinados), focus return al cerrar (`document.activeElement` previo restaurado), `aria-labelledby` automático cuando `title` es string, dialog root `tabIndex={-1}` para recibir foco si no hay elementos focusables internos.
- **`src/components/ui/Field.tsx`**: refactor breaking-but-compatible — genera `id` con `useId()` si el hijo no lo tiene, `<label htmlFor>` apunta al control, propaga `aria-invalid` y `aria-describedby` al child cuando hay error/hint, mensajes de error con `role="alert"`.
- **`src/lib/a11y-prefs.ts` (nuevo)**: módulo con `loadA11yPrefs/saveA11yPrefs/applyA11yPrefs` (localStorage + clases en `<html>`) y `A11Y_BOOT_SCRIPT` inline para `layout.tsx` que aplica las clases antes del primer paint (sin FOUC).
- **`src/components/ajustes/AccesibilidadTab.tsx` (nuevo)** + tab "Accesibilidad" en `SettingsTabs` (entre Apariencia y Listado): selector de tamaño de texto (sm/md/lg/xl, reutiliza `--font-scale`), toggles para Reducir movimiento, Alto contraste, Subrayar enlaces, Cursor grande, y cheat-sheet de atajos de teclado (Cmd+K, Esc, Tab, ↑↓ Enter). Toggle row accesible con `role="switch"` y `aria-checked`. `TabId` extendido en `types.ts`.

**Tests y calidad**

- `npx tsc --noEmit` → 0 errores.
- `npm run test:run` → **132/132 verde** (test de `<Field>` actualizado para la nueva semántica `htmlFor`+`id` + 1 test nuevo de propagación de `aria-invalid`/`aria-describedby`).

Pendiente para una v1.2: endpoint `/api/account/delete` (RGPD borrado total), rate limiting en `team/invite` y `billing/checkout`, alternativa de teclado en el drag&drop del Kanban (dnd-kit `KeyboardSensor`), tests de a11y con `jest-axe`.

### Iteración 48 — *2026-05-12* — Endurecimiento de seguridad: RLS en tablas archivo y vistas con `security_invoker`

Auditoría del Database Linter de Supabase. Se resuelven los 8 ERRORES detectados:

- **RLS habilitada** en `fichajes_archivo`, `stock_movimientos_archivo`, `tpv_ventas_archivo` y `tpv_venta_items_archivo` con políticas `SELECT` por tenant vía `current_negocio_id()`.
- **Vistas reescritas con `security_invoker = on`** (`v_fichaje_estado_actual`, `v_consentimientos_negocio`, `v_equipo_negocio`) — ya no se ejecutan con privilegios del creador.
- **`v_equipo_negocio` sin JOIN a `auth.users`**: el email del titular se toma de `perfiles_negocio.email_contacto`. Elimina el lint `auth_users_exposed`.

Nuevo fichero `supabase/security_hardening.sql` (idempotente) integrado en `setup.sql` tras `fix_tenant_defaults.sql`. Los WARNs restantes (search_path mutable en triggers, RPCs `security definer` intencionales por diseño del modelo de roles, buckets públicos para logos/avatares) se aceptan como decisiones de arquitectura.

### Iteración 47 — *2026-05-12* — Búsqueda global Cmd+K, pestaña Datos (import/export), sistema de roles con super admin global y ROLES.md

**Nuevas capacidades transversales**

- **Búsqueda global**: `src/components/layout/CommandPalette.tsx` (nuevo) — atajo `Cmd+K`/`Ctrl+K` desde cualquier ruta autenticada; búsqueda con debounce 200 ms en clientes, citas, tareas, finanzas y documentos con resultados agrupados por tipo, iconos y navegación con teclado (↑↓ Enter Esc); integrado en `AppShell`.
- **Pestaña Datos en Ajustes**: `src/components/ajustes/DatosTab.tsx` (nuevo) — concentra toda la gestión import/export del negocio:
  - Exportación ZIP completa (movida desde Cumplimiento, conserva los 7 recursos + consentimientos).
  - Exportación CSV individual por recurso (clientes, finanzas, tareas, documentos, citas, comunicaciones).
  - Importación JSON (acepta tanto formato de tabla individual como bundle multi-tabla del export R3ZON).
  - Importación CSV con detección heurística de tabla destino y separador (`,` o `;`); parser propio en `src/lib/csv.ts:parseCSV()` sin dependencias.
- **Sistema de roles profesional**: `supabase/roles_ext.sql` (nuevo) introduce tres dimensiones desacopladas:
  - **`admin_global`**: tabla nueva con RLS restrictiva; función `es_admin_global()` consultable desde RLS y RPCs.
  - **`miembros_negocio.permisos jsonb`**: overrides granulares por recurso/acción que sobrescriben el baseline del rol punto-fino.
  - **`permisos_baseline(rol)`**: función inmutable como única fuente de verdad de los permisos por defecto (`admin`/`editor`/`lector`).
  - **`tiene_permiso(recurso, accion)`**: resolución unificada usable desde RLS, RPCs y servidor.
  - **`v_permisos_actuales`**: vista que devuelve `nivel`/`rol`/`permisos` del usuario en una sola query.
  - Hook cliente `src/lib/usePermissions.ts` con API `{ can, esAdmin, nivel, rol }` para gating de UI.
  - Documentación completa en `ROLES.md` (raíz del repo) con arquitectura, baseline por rol, ejemplos en RLS/Server Actions/cliente y decisiones de diseño justificadas.
- **Modo claro**: ya estaba implementado en el theme engine (`mode` segmented en `theme-schema.json` + overrides en `applyTheme()` + boot script en `layout.tsx`); confirmado funcional.
- **Vercel Analytics**: ya integrado en iteración previa (`@vercel/analytics/next` + `<Analytics />` en root layout).

**Revisión de dependencias**

- Eliminada `class-variance-authority` (0 usos en el código). Conservadas el resto: `tailwind-merge` (`lib/utils.ts`), `tailwindcss-animate` (plugin Tailwind), `@xyflow/react` (HierarchyChart), `clsx`, `tesseract.js`, `recharts`, `@fullcalendar/*`, `@dnd-kit/*`, `html2canvas`/`jspdf`/`fflate` (lazy-loaded en runtime), `zod`, `stripe`, `pg` (sólo scripts dev).

**SQL nuevo**: `supabase/roles_ext.sql` (admin_global + permisos jsonb + funciones + vistas). Incluido en `setup.sql` después de `team_ext.sql`.

**Pendiente**: §11 recordatorios email · UI para editar `permisos` granulares en EquipoTab · panel `/admin` global.

---

### Iteración 46 — *2026-05-12* — Sprint v1.0 completo: limpieza técnica, errores, seguridad, comunicaciones, exportación, plan Free, PDF, analytics

**Plan v1.0 ejecutado íntegramente (§1–§10, §12)**

- **§1 Limpieza técnica**: eliminados `page 2.tsx` duplicados en clientes y clientes/nuevo; tipos `Producto` y `Documento` migrados a `Database["public"]["Tables"][...]["Row"]` en `src/lib/inventario.ts` y `src/lib/documentos.ts`
- **§2 Gestión de errores**: `useToast` añadido a `cargar()` en clientes, tareas y finanzas; estados vacíos con CTA existentes confirmados
- **§3 Onboarding**: flujo registro → onboarding → dashboard confirmado funcional con consentimientos RGPD y `seed_kanban` trigger
- **§4 Entorno documentado**: `.env.local.example` reescrito con las 20+ variables comentadas; README actualizado con orden de los 21 SQL y setup de webhooks
- **§5 Seguridad**: auditoría confirmó que tokens Google no se exponen, `channel_token` usa `timingSafeEqual`, `SERVICE_ROLE_KEY` nunca en `NEXT_PUBLIC_*`, webhook Stripe valida `stripe-signature`
- **§6 Comunicaciones**: tab `Comunicaciones` restaurado en `/clientes/[id]` con `TabComunicaciones` (lista cronológica + añadir nota)
- **§7 Exportación RGPD**: `src/lib/csv.ts` (nuevo utilitario BOM+CSV); botón "Exportar CSV" en `/clientes` y `/finanzas`; botón "Exportar mis datos" en Ajustes → Cumplimiento genera ZIP con 7 tablas vía `fflate`
- **§8 Plan Free**: `src/lib/usePlan.ts` (nuevo hook) con `LIMITES` por tier (free/pro/business); banners de upgrade y botón "Nuevo" deshabilitado al alcanzar límite en clientes y tareas
- **§9 Testing**: 131 tests en 13 archivos ya pasando — sin cambios necesarios
- **§10 PDF**: `descargarPDF()` en `/documentos/[id]` reescrita con `jsPDF` + `html2canvas` carga lazy; soporte multi-página A4 y formato ticket 80mm; botón "Imprimir" separado
- **§12 Observabilidad**: `@vercel/analytics` instalado y `<Analytics />` en `src/app/layout.tsx`; logs estructurados con timestamp en el cron `refresh-google-channels`

**Pendiente (post-v1.0)**: §11 recordatorios email · §13 modo claro · §14 búsqueda global Cmd+K

---

### Iteración 45 — *2026-05-12* — Vistas alternativas en Clientes (lista / tarjetas, organigrama jerárquico) y reorganización de la ficha

**Listado de clientes con dos vistas conmutables**
- `src/app/(app)/clientes/page.tsx`: añadido conmutador *Lista* ↔ *Tarjetas* en la barra superior. La vista por defecto es **lista** (más densa, optimizada para escanear). La preferencia se persiste por usuario en `localStorage["clientes:vista"]`.
- Vista lista: filas compactas con avatar, razón social, badge de estado, CIF/sector/email/teléfono y acciones rápidas (llamar, WhatsApp, email, web). El `Link` cubre toda la fila vía *stretched link* y los iconos de acción se superponen con `pointer-events`.
- Vista tarjetas: se conserva intacta la cuadrícula previa.

**Organigrama jerárquico como vista predeterminada de Contactos**
- `src/components/clientes/ContactosTab.tsx`: añadido conmutador *Árbol* ↔ *Tarjetas*. La vista por defecto es **árbol**, que reutiliza `HierarchyChart` (`@xyflow/react`) para dibujar el organigrama a partir de `reports_to`. Se va construyendo automáticamente conforme se añaden contactos con su superior directo. La preferencia se persiste en `localStorage["clientes:contactos:vista"]`.

**Separación de Documentos y Movimientos**
- `src/components/crm/TabDocumentos.tsx`: simplificado — ahora muestra **solo** documentos comerciales (facturas, presupuestos, albaranes) a ancho completo.
- `src/components/crm/TabMovimientos.tsx` (nuevo): contiene la sección de ingresos/gastos que antes vivía dentro de Documentos. Lee `finanzas` filtrando por `cliente_id` y mantiene el formato con badges de estado de pago.

**Limpieza de pestañas en la ficha del cliente**
- `src/app/(app)/clientes/[id]/page.tsx`: eliminadas las pestañas **Mensajes** (`TabComunicaciones`) y **Automático** (`TabAutomatizacion`); añadida la pestaña **Movimientos**. Orden final: *Información · Contactos · Historial · Documentos · Movimientos*.
- Sincronización con agenda ya garantizada desde la iteración 44: los eventos creados en el calendario con cliente asociado se ven en la pestaña *Historial* (consulta directa de `agenda_eventos`).

### Iteración 44 — *2026-05-12* — Módulo **Citas** con lista, vista anual, modal con bloque "Adicionales", historial conectado a `agenda_eventos`, sección de citas en Perfil, y documentos por cliente

**Historial de citas conectado a la fuente real**
- `src/components/crm/TabHistorial.tsx`: corregido — antes consultaba la tabla legacy `citas` (vacía en producción), ahora lee `agenda_eventos` (que es la sincronizada con Google). Campos remapeados (`title`, `description`, `start_time`, `end_time`, `estado`, `ubicacion`). El botón "Nueva cita" enlaza ahora a `/citas?cliente=…`.

**Módulo Citas con calendario + lista**
- `src/app/(app)/citas/page.tsx`: convertido a `"use client"` con segmented control **Calendario / Lista**.
- Nuevo `src/components/agenda/CitasLista.tsx`: listado completo de eventos (`agenda_eventos` con join a `clientes`) con búsqueda por título/cliente/ubicación y filtros **Próximas / Hoy / 7 días / Pasadas / Todas**. Ordena ascendente salvo en "Pasadas". Cada fila enlaza al cliente si está vinculado.

**Vista anual en el calendario**
- `npm install @fullcalendar/multimonth@6.1.20`.
- `src/components/agenda/CalendarView.tsx`: añadido `multiMonthPlugin`, locale traducido (`year: "Año"`), botón **Año** en la `headerToolbar`, vista `multiMonthYear` configurada (4 columnas, ancho mínimo 220px).

**Calendario a página completa**
- `src/components/layout/AppShell.tsx`: lee `usePathname()` y, para las rutas listadas en `FULL_BLEED = ["/citas"]`, retira el `max-w-[1240px]` del `<main>` para que el calendario ocupe todo el ancho disponible.

**Modal de cita reordenado con bloque "Adicionales"**
- `src/components/agenda/EventModal.tsx`:
  - Cuerpo reordenado: título → inicio → fin → color (siempre visibles).
  - Nuevo bloque colapsable **Adicionales** (icono `Sliders`, `ChevronDown/Right`) al final del formulario con: persona asociada (combobox de clientes), ubicación y notas.
  - Se abre automáticamente al editar una cita si ya tiene cliente, ubicación o notas.

**Sección "Mis próximas citas" en Perfil**
- Nuevo `src/components/perfil/MisCitas.tsx`: lista de hasta 8 citas futuras (`start_time >= now`, `estado != 'cancelada'`) con cliente vinculado, ubicación, hora y duración. Enlace directo al cliente y a la agenda.
- Integrado en `src/app/(app)/perfil/page.tsx` entre los datos personales y el bloque de Permisos.

**Documentos asociados al cliente**
- Nuevo `src/components/crm/TabDocumentos.tsx`: dos paneles en paralelo dentro de la ficha del cliente:
  - **Documentos comerciales** (`documentos` con `cliente_id = clienteId`): referencia, tipo, fecha, total, estado (`borrador|generado|enviado|pagado|anulado`), enlace al PDF y al detalle.
  - **Movimientos financieros** (`finanzas` con `cliente_id = clienteId`): concepto, fecha, total con signo según `tipo`, estado de pago.
- `src/app/(app)/clientes/[id]/page.tsx`: nueva tab **Documentos** (icono `FileText`) entre "Historial" y "Mensajes".

---

### Iteración 43 — *2026-05-12* — Cumplimiento RGPD: consentimientos del titular, onboarding obligatorio y sección **Cumplimiento** en Ajustes

**Modelo de datos**
- Nuevo `supabase/rgpd_ext.sql` (idempotente) sobre la tabla existente `consentimientos_rgpd`:
  - RPC `registrar_consentimiento(tipo, version, aceptado, ip, user_agent)` que inserta el consentimiento del titular (`cliente_id = NULL`) en el negocio actual (`current_negocio_id()`), con sello temporal y firma de evidencia.
  - RPC `revocar_consentimiento(tipo)` que marca `revocado_en` en la última aceptación vigente del tipo.
  - Vista `v_consentimientos_negocio`: estado actual (vigente / revocado / rechazado) por tipo para el titular del negocio.
- `scripts/apply-pending-migrations.mjs` actualizado para aplicar `rgpd_ext.sql`.

**Onboarding obligatorio**
- `src/app/(auth)/registro/page.tsx`: añadidos tres checkboxes:
  - **Privacidad + aviso legal** (obligatorio, bloquea el submit si no se marca).
  - **Cookies** (opcional, según LSSI-CE art. 22.2).
  - **Comunicaciones comerciales / marketing** (opcional, RGPD art. 6.1.a).
  - Los consentimientos se persisten en `user_metadata.pending_consents` durante el `signUp`.
- `src/app/auth/callback/route.ts`: tras `exchangeCodeForSession`, lee `pending_consents` del usuario, llama a la RPC `registrar_consentimiento` por cada uno pasando IP (de `x-forwarded-for`) y user-agent, y limpia los pendientes.
- La invitación de miembros (`src/app/api/team/invite/route.ts`) ya almacena `privacidad_version` / `terminos_version` y el RPC `aceptar_invitacion` registra el consentimiento del invitado al primer login.

**Sección Cumplimiento en Ajustes**
- Nueva tab `Cumplimiento` (icono `Scale`) en `src/components/ajustes/SettingsTabs.tsx` y en el union `TabId` de `types.ts`.
- `src/components/ajustes/CumplimientoTab.tsx`:
  - Grid de tarjetas con enlaces públicos a `/legal/privacidad`, `/legal/cookies`, `/legal/aviso-legal`, `/legal/terminos`.
  - Lista de consentimientos registrados leyendo `v_consentimientos_negocio`, con badges `Vigente` / `Revocado` / `Rechazado`, versión y fecha de aceptación.
  - Botón **Revocar** para tipos opcionales (`cookies`, `marketing`) que invoca `revocar_consentimiento`.

**Navegación**
- `src/components/layout/Sidebar.tsx`: entrada `RGPD` eliminada (junto al icono `ShieldCheck` no utilizado). La ruta `src/app/(app)/rgpd/` se ha borrado; el cumplimiento vive ahora dentro de Ajustes.

---

### Iteración 42 — *2026-05-12* — Unificación Productos + Stock en página **Listado** con modo stock configurable

**Página unificada `/listado`**
- Nueva ruta `src/app/(app)/listado/page.tsx` que fusiona el catálogo (antiguo `/productos`) y la vista de inventario (antiguo `/stock`) en una sola pantalla. Se eliminan ambas rutas previas.
- **Filtro Producto / Servicio / Todos** como segmented control (junto a la búsqueda y al filtro de categoría). En modo stock activo, además filtro de estado (Con stock / Bajo / Agotado / Sin inventario).
- **Etiquetas de stock a la izquierda de cada fila, separadas pero alineadas con ella**: columna fija a la izquierda (`w-32`) con la badge (`En stock`, `Stock bajo`, `Agotado`, `Sin inventario`) fuera de la tarjeta del producto. Las filas se alinean verticalmente con su etiqueta. Se oculta en móvil (`hidden sm:flex`) para mantener legibilidad.
- **Los servicios nunca muestran etiqueta de inventario** (no son inventariables); en su lugar llevan un chip "Servicio" inline dentro de la fila.
- KPIs (Con stock / Bajo / Agotados) y panel "Últimos movimientos" sólo se renderizan si el modo stock está activo, y excluyen servicios del cálculo.
- Conservado del antiguo `/productos`: alta/edición con modal, subida de imagen (`producto-imagenes`), escáner de códigos de barras (`BarcodeScanModal`), borrado optimista. Conservado de `/stock`: modal de movimientos (entrada/salida/ajuste) y paginación de movimientos.

**Modo stock configurable (Ajustes → Listado)**
- `supabase/listado_ext.sql` nuevo: `alter table perfiles_negocio add column if not exists stock_mode_enabled boolean not null default true`. Idempotente.
- Nuevo tab **Listado** en `src/components/ajustes/SettingsTabs.tsx` con un toggle (`role="switch"`) que persiste `stock_mode_enabled` en el perfil del negocio. Componente: `src/components/ajustes/ListadoTab.tsx`.
- `PerfilNegocio.stock_mode_enabled` añadido a `src/components/ajustes/types.ts`.
- Con stock desactivado: el listado oculta KPIs, panel de movimientos, filtro de estado, botones de movimiento y badges. Los productos siguen siendo catálogo con precio/IVA/categoría/tipo.

**Navegación**
- `src/components/layout/Sidebar.tsx`: dos entradas (`Productos` + `Stock`) reemplazadas por una sola entrada **Listado** (icono `Boxes`).

**Migraciones**
- `scripts/apply-pending-migrations.mjs` actualizado para aplicar `supabase/listado_ext.sql`.

---

### Iteración 41 — *2026-05-11* — Refactor módulo Documentos: formatos A4 vs ticket térmico, recibo, formulario con desplegables, colores configurables, bucket `logos`

**Plantilla**
- `src/components/documentos/PlantillaDocumento.tsx` reescrito en dos plantillas: `PlantillaA4` (presupuesto, factura, albarán, proforma, **recibo**) y `PlantillaTicket` (sólo `ticket`, 80mm térmico vertical con tipografía monoespaciada).
- `FORMATO_TIPO` en `src/lib/documentos.ts` mapea cada `TipoDocumento` a su formato físico. El selector A4 vs ticket se aplica también al `@page` del HTML generado por `window.print` (tanto en `nuevo` como en `[id]`).
- A4: la columna de fechas (emisión/vencimiento) ahora se alinea verticalmente al centro del bloque cliente (`alignItems: stretch` + `justifyContent: center`).
- Logo del emisor incrustado en el documento (A4 a la izquierda del título, ticket centrado sobre el nombre). `EmisorSnapshot.logo_url` propagado desde el perfil.
- Colores parametrizables vía prop `colores` (primario, texto, acento, acentoSuave) con defaults; consumidos desde el motor de tema.

**Nuevo tipo "Recibo"**
- `TipoDocumento` extendido con `'recibo'`. Añadido a `ETIQUETA_TIPO`, `DESCRIPCION_TIPO`, `TIPOS_DOCUMENTO`, `FORMATO_TIPO` (`a4`) y `ICONO_TIPO` (`BadgeCheck`) tanto en `nuevo/page.tsx` como en el listado.
- `supabase/documentos_recibo_logos_ext.sql` nuevo: amplía el CHECK constraint de `documentos.tipo` y los dos RPCs (`siguiente_numero_documento`, `crear_documento_generado`) para aceptar `'recibo'`. Idempotente.

**Formulario del editor (`/documentos/nuevo`)**
- Cliente: la barra de búsqueda por texto se sustituye por un `<select>` de clientes guardados; conserva el botón "Añadir cliente manualmente" para captura ad-hoc.
- Sección **"Líneas"** renombrada a **"Contenido"**. Cada línea expone un `<select>` con productos/servicios activos del módulo Productos: al elegir uno se rellenan descripción, precio e IVA. Botón "Añadir manualmente" para filas libres.
- El botón verde **Generar** se ha movido del formulario al panel derecho, **debajo de la previsualización**, con el listado de errores de validación contextual.
- Carga inicial extendida para traer `productos` activos y el `logo_url` del perfil.

**Tema configurable de documentos (Ajustes → Apariencia)**
- `src/lib/theme/theme-schema.json`: nuevos controles `doc.primario`, `doc.texto`, `doc.acento`, `doc.acentoSuave` (color pickers, sin alterar variables CSS globales). Persistencia automática vía `ThemeProvider`.
- `nuevo/page.tsx` deriva `coloresDocumento` desde `useThemeEngine().theme` y lo inyecta en `PlantillaDocumento`.

**Bucket `logos` (fix bug)**
- `supabase/documentos_recibo_logos_ext.sql` crea el bucket público `logos` con las cuatro políticas RLS (lectura libre; insert/update/delete restringidos a los miembros del negocio cuya primera carpeta coincida con `current_negocio_id()`). La subida del logo en Ajustes → Negocio dejará de fallar con `bucket not found`.

**AparienciaTab**
- Eliminada la tarjeta "Vista previa" del final.
- Eliminadas las cajas de texto de muestra a la derecha de cada selector de tipografía (el `<select>` se renderiza a ancho completo).

**Migraciones**
- `scripts/apply-pending-migrations.mjs` actualizado para aplicar `supabase/documentos_recibo_logos_ext.sql`.

---

### Iteración 40 — *2026-05-11* — Iconos+charts+light theme · menú usuario · perfil · proveedores · productos con imagen+barcode · suscripción con método de pago

**Tema (fixes pendientes)**
- `tailwind.config.ts`: `backgroundImage` (rainbow, accent, glass, glass-strong) y `boxShadow` (glass, glow) ahora usan `rgb(var(--…) / α)` en vez de hex/rgba hardcoded. Hacía que la sección activa de la sidebar y la caja del plan no respondieran al cambio de tema.
- `src/lib/theme/useThemeColors.ts` nuevo: hook que lee `getComputedStyle` y devuelve `rgb()` resueltos para Recharts (cyan, fuchsia, indigos, bg…). Se re-suscribe al cambio de tema vía `useThemeEngine`.
- `src/components/finanzas/Charts.tsx`: reescrito para consumir `useThemeColors()` — ejes, grid, barras, líneas, tooltip y leyenda ahora cambian con el tema.
- `src/lib/theme/theme.ts`: modo claro estrena un "blanco roto" (`#eef0f6` en vez de blanco puro) + tonos coherentes en `--indigo-*` para cards y bordes claros + override de `--text-lo` / `--text-ghost` (en hex/rgba directo porque no son tripletes). Dark-mode los restablece al revertir.

**Navbar — menú de usuario**
- `src/components/layout/UserMenu.tsx` nuevo: card en la base del sidebar con avatar (de `user_metadata.avatar_url`), nombre y plan. Dropdown con [Mi perfil, Cambiar de cuenta, Cerrar sesión]. Cierra al click fuera y con `Esc`.
- `Sidebar.tsx`: reemplaza la antigua caja "Plan" por `<UserMenu />`. La info del plan se mueve al subtítulo del menú.
- Nuevo item de navegación "Proveedores" (icono `Truck`) entre Finanzas y RGPD.

**Perfil de usuario** — `/perfil`
- `src/app/(app)/perfil/page.tsx`: editar nombre, teléfono, puesto + subir avatar a bucket `avatars`. Email y fecha de alta read-only. Sección "Permisos" muestra rol (owner/admin/miembro) derivado de `perfiles_negocio.user_id` o `miembros_negocio.rol`, con la lista de capacidades correspondientes.
- `supabase/perfil_usuario_ext.sql` nuevo: crea bucket `avatars` (público) + 4 políticas RLS (lectura pública; insert/update/delete sólo si la primera carpeta del path coincide con `auth.uid()`).

**Productos — imagen, scanner y formulario simplificado**
- `src/components/productos/BarcodeScanModal.tsx` nuevo: modal con input autofocus optimizado para pistola HID (emite caracteres + Enter). Busca por `productos.codigo`: si existe → abre la ficha; si no → abre nuevo prellenando el código.
- `src/app/(app)/productos/page.tsx`:
  - Botón "Escanear" (cyan) junto a "Nuevo producto" abre el `BarcodeScanModal`.
  - La lista muestra **miniatura** (`imagen_url`) o el cuadrado coloreado tradicional si no hay imagen.
  - El modal ahora tiene una zona superior con preview de imagen + botones Subir/Cambiar/Quitar (usa bucket `producto-imagenes`).
  - Los campos no obligatorios (unidad, precio coste, color, stocks, descripción, activo) se encapsulan en **"Información adicional"** colapsable, dejando arriba sólo nombre, código, tipo, categoría, precio venta e IVA.
- `supabase/inventario_imagenes_ext.sql` nuevo: bucket `producto-imagenes` (público) + RLS por tenant (escritura sólo cuando la primera carpeta del path coincide con `current_negocio_id()`).

**Módulo Proveedores** — `/proveedores`
- `supabase/proveedores_ext.sql` nuevo: tablas `proveedores` y `gastos_proveedor` (polimórfica, `tipo` ∈ {general, previsto, suscripcion}; campos `recurrencia` y `proximo_cobro` sólo en suscripciones). RLS tenant + trigger `fill_negocio_id`. Estado del gasto ∈ {pendiente, pagado, cancelado}.
- `supabase/fix_tenant_defaults.sql`: añadidas `proveedores` y `gastos_proveedor` al array de tablas con trigger fill.
- `src/lib/proveedores.ts` nuevo: tipos `Proveedor`, `GastoProveedor`, etiquetas, badges, y `gastoMensualizado()` para normalizar recurrencias (anual /12, trimestral /3).
- `src/app/(app)/proveedores/page.tsx`: layout con tabs verticales [Proveedores, Gastos generales, Gastos previstos, Suscripciones]. Cada tab con CRUD: lista + modal. Suscripciones muestra el total mensualizado.

**Ajustes › Suscripción — método de pago + scaffold Stripe**
- `src/app/api/billing/setup-checkout/route.ts` nuevo: crea Stripe Checkout en modo `setup` (alta de tarjeta sin cobrar nada). Si el negocio no tiene `stripe_customer_id`, lo crea al vuelo.
- `src/app/api/billing/payment-methods/route.ts` nuevo: devuelve `{configured, methods[]}`. Si falta `STRIPE_SECRET_KEY` o el negocio no tiene customer, devuelve lista vacía con `configured:false` para que el cliente muestre estado adecuado.
- `SuscripcionTab.tsx`: nueva sección **"Métodos de pago"** entre "Plan actual" y la tabla de planes. Lista las tarjetas guardadas; botón "Añadir método" redirige a Checkout setup. Si Stripe no está configurado, muestra panel ámbar explicando qué env vars hace falta.
- Toast "Método de pago añadido correctamente" cuando la URL contiene `?billing=metodo_anadido`.

**Migraciones SQL aplicadas a BD productiva** (script `scripts/apply-pending-migrations.mjs`, conectado vía pooler `aws-1-eu-central-1`):
- `supabase/theme_ext.sql` → tabla `user_preferences` + RPC `save_user_theme(jsonb)` (iter 38).
- `supabase/perfil_usuario_ext.sql` → bucket `avatars` + 4 políticas RLS.
- `supabase/inventario_imagenes_ext.sql` → bucket `producto-imagenes` + 4 políticas RLS.
- `supabase/proveedores_ext.sql` → tablas `proveedores` y `gastos_proveedor` + RLS tenant + trigger fill.
- `supabase/fix_tenant_defaults.sql` re-aplicado para registrar los triggers `fill_negocio_id` en las dos tablas nuevas.

Pendiente opcional: regenerar `src/lib/database.types.ts` (las nuevas tablas quedan untyped en cliente pero runtime funciona).

**Verificación**
- `npx tsc --noEmit` → cero errores.
- `npm run build` → ✓ compila. Rutas nuevas: `/perfil`, `/proveedores`, `/api/billing/setup-checkout`, `/api/billing/payment-methods`.
- `npm run test:run` → **131/131 verdes** (sin regresiones).

---

### Iteración 39 — *2026-05-11* — Fix: paleta de tema fluye a clases Tailwind con alpha + mensaje guía si falta la tabla

**Problema reportado**
- Al cambiar paleta, los colores no se adaptaban en la UI (Tailwind compila `bg-cyan/20`, `border-indigo-400/40`, etc. a RGB hardcoded desde `tailwind.config.ts`, así que las CSS vars hex no surtían efecto).
- Al guardar salía `Could not find the table 'public.user_preferences' in the schema cache` porque la migración `supabase/theme_ext.sql` todavía no estaba aplicada en la BD.

**Fix — colores con alpha-aware**
- `tailwind.config.ts`: tokens controlados por el tema (`bg`, `indigo-{300,400,600,700,800,900}`, `cyan`, `fuchsia`, `text-hi`, `text-mid`) cambian a `rgb(var(--TOKEN) / <alpha-value>)`. Los semánticos (`ok`, `warn`, `danger`) siguen hardcoded. `fontFamily` ahora prepende `var(--font-sans)` / `var(--font-display)`.
- `src/app/globals.css`: defaults en `:root` migrados a tripletes "r g b" (`--bg: 8 7 20`, `--cyan: 34 211 238`, …). `html/body` usan `rgb(var(--bg))` y `rgb(var(--text-hi))`. `.card-glass`, `.rainbow-bar`, `.accent-bar`, `.section-label`, `.btn-big`, scrollbar y body gradients también pasan a `rgb(var(--x) / α)`. `.card-glass` ahora respeta `--radius-scale` con `calc(18px * var(--radius-scale))`.
- `src/lib/theme/theme.ts`: nuevo set `RGB_VARS` + `hexToTriplet()`. `setVar()` convierte hex → "r g b" solo cuando el target está en `RGB_VARS`; las fuentes y escalas siguen como strings. El modo claro con paleta no-custom también vuelca tonos claros en los `--indigo-*` para que cards y bordes contrasten.
- `src/app/layout.tsx`: el inline-script de boot ahora trae helper `hx()` (hex → "r g b") y aplica los tripletes antes del primer paint. Sigue sin FOUC.

**Fix — error "table not found"**
- `src/lib/theme/ThemeProvider.tsx`: helper `isMissingTableError()` detecta `PGRST205` / `42P01` / mensajes con "schema cache" o "does not exist". Cuando la tabla aún no existe, se muestra en el header del tab Apariencia un mensaje guía ("Falta aplicar supabase/theme_ext.sql en la BD. Cambios guardados solo en este navegador.") en lugar del error técnico de PostgREST. Los cambios siguen viviendo en `localStorage` así que la UI se ve actualizada igualmente.

**Pendiente del usuario**
- Ejecutar `supabase/theme_ext.sql` en Supabase SQL Editor (productivo) y regenerar `src/lib/database.types.ts` para activar persistencia cross-device.

**Verificación**
- `npx tsc --noEmit` → cero errores.
- `npm run build` → ✓ compila.
- `npm run test:run` → **131/131 verdes**.

---

### Iteración 38 — *2026-05-11* — Motor de personalización (Theme Engine) por usuario en Ajustes

**Nuevo módulo `/ajustes → Apariencia` (tab Palette, entre Negocio y Facturación)**
- `src/lib/theme/theme-schema.json`: declarativo (Schema-First) — controles `mode`, `palette` (4 presets + `custom`), 5 colores hexadecimales en modo custom, 2 tipografías (`font.sans` y `font.display` con 6 opciones cada una, incluida `system-ui`), `fontSize` (4 escalas) y `radius` (3 niveles). El renderer del tab y el applier de CSS leen del mismo JSON, así que añadir un control nuevo solo requiere tocar el schema.
- `src/lib/theme/theme.ts`: `applyTheme()` inyecta CSS variables en `:root` (`--bg`, `--indigo-*`, `--cyan`, `--fuchsia`, `--text-*`, `--font-sans`, `--font-display`, `--font-scale`, `--radius-scale`). Carga Google Fonts on-demand creando `<link rel="stylesheet">` deduplicado por familia. En modo claro con paleta no-custom, override tonal automático (fondo `#f6f7fb`, texto `#0b0a1f`).
- `src/lib/theme/ThemeProvider.tsx`: provider client-side. Estado inicial = `localStorage` (evita FOUC) → hydrate desde `user_preferences.theme` (DB es autoritativa). Persistencia con debounce 600 ms vía `upsert` (onConflict `user_id`). Expone `setField`, `setMany`, `reset`, y los estados `loading`/`saving`/`saveError`.
- `src/components/ajustes/AparienciaTab.tsx`: paleta como grid de swatches, segmented buttons para modo/tamaño/radio, color pickers nativos + input hex para la paleta `custom`, font picker con vista previa renderizada con la familia seleccionada. Cabecera con estado de sincronización (loading / saving / sincronizado / error) y botón "Restablecer".

**Persistencia per-user**
- `supabase/theme_ext.sql` nuevo: tabla `public.user_preferences (user_id PK → auth.users, theme jsonb, updated_at)` + trigger `tg_user_prefs_touch` + RLS `user_prefs_owner` (`user_id = auth.uid()`) + RPC `save_user_theme(jsonb)` (opcional, security definer) con `grant execute … to authenticated`. **No** depende de `negocio_id` — la preferencia es individual del usuario, no del tenant.
- Pendiente de aplicar en BD productiva: ejecutar `supabase/theme_ext.sql` en Supabase SQL Editor y regenerar `database.types.ts` (la tabla queda untyped en cliente hasta entonces; los `.from("user_preferences")` funcionan en runtime pero sin tipado fuerte).

**Boot sin FOUC**
- `src/app/layout.tsx`: añadido `<script>` inline en `<head>` que lee `localStorage["r3zon:theme:v1"]` y aplica paleta + fuentes + escalas antes del primer paint. Contiene las 4 paletas hard-coded (espejo del schema) para evitar el flash entre el tema base y el del usuario.
- `src/app/globals.css`: `--font-sans`, `--font-display`, `--font-scale` y `--radius-scale` añadidos a `:root`; `html, body` usa `var(--font-sans)` y `calc(16px * var(--font-scale))`.
- `src/app/(app)/layout.tsx`: `<ThemeProvider>` envuelve `AppShell` tanto en la rama de onboarding como en la principal.

**Verificación**
- `npx tsc --noEmit` → cero errores.
- `npm run build` → ✓ compila.
- `npm run test:run` → **131/131 verdes** (sin regresiones).

---

### Iteración 37 — *2026-05-11* — Aplicar trigger en BD productiva, tipos generados, error handling en API y más tests UI

**Aplicado al servidor (vía Supabase MCP)**
- Migración `add_fill_negocio_id_trigger`: aplicada en BD productiva. El trigger `fill_negocio_id` ahora cubre **20 tablas** con columna `negocio_id` (verificado con `select … from information_schema.triggers`). La auditoría descubrió que `google_connections` también necesitaba el trigger (no estaba en el script local) — se añadió tanto en la BD como en `supabase/fix_tenant_defaults.sql`. Las 4 tablas `*_archivo` quedan sin trigger por diseño (las inserta solo el RPC de retención que ya pasa `negocio_id`).
- `src/lib/database.types.ts` (1965 líneas): generado vía `mcp__supabase__generate_typescript_types`. Cubre 28 tablas/vistas, 11 RPCs, todos los enums.

**Migración inicial de tipos**
- `src/lib/finanzas.ts`: `MovimientoFila` ahora deriva de `Pick<Database["…"]["finanzas"]["Row"], "fecha"|"base_imponible">` + extensiones explícitas (`tipo` narrowed al union real porque la BD lo guarda como `text` con CHECK; importes `number | null` siguiendo la BD — `Number(null)` ya da 0).
- `src/lib/inventario.ts`, `src/lib/documentos.ts`: TODO actualizado a `post-iter37` con razón concreta (consumidores asumen no-nullables / extensiones derivadas).

**Error handling consistente en API routes**
- `src/lib/api-handler.ts` nuevo: `withApiHandler(name, handler)` envuelve, captura excepciones no manejadas, registra con prefijo `[api:<name>]` y devuelve JSON `{ error: "Error interno" }` + 500. Las rutas siguen devolviendo `NextResponse` para errores esperados (401/400/403/409).
- `team/revoke`, `team/invite`, `billing/portal`, `billing/checkout`: envueltas con `withApiHandler`. Los `error.message` de Supabase/Stripe se loguean en servidor pero el cliente recibe mensajes genéricos ("No se pudo revocar el miembro", "No se pudo enviar la invitación", "Email enviado, pero el registro local falló") — sin filtrado de stacks o detalles internos.
- `team/invite`: eliminado el try/catch innecesario alrededor de `createAdminClient()` — ahora lo captura el wrapper.
- `billing/webhook`, `cron/refresh-google-channels`, `integrations/google/{webhook,callback,connect}`: ya tenían patrones correctos (try/catch + redirect codes), no se tocan.

**Más tests UI**
- `tests/components/ErrorBoundary.test.tsx` (4 casos): renderiza hijos sin error, fallback con mensaje, fallback custom, botón Reintentar llama a `location.reload`.
- `tests/components/Input.test.tsx` (8 casos): clases base, props HTML, onChange controlado, override className; `<Select>` value/onChange; `<Textarea>` rows default y override; `INPUT_CLS` exportado.

**Verificación**
- `npm run test:run` → **131/131 verdes** (119 previos + 12 nuevos).
- `npx tsc --noEmit` → cero errores en código del proyecto.
- `npm run build` → ✓ Compiled in 9.1s.

**Lo que NO se tocó por decisión**: paginación cursor en más vistas (productos/documentos/finanzas/fichajes — las queries actuales no devuelven volúmenes que justifiquen el cambio en este pase; queda como post-iter37 si crece el dataset). Migración completa de `Producto`/`Documento`/`StockMovimiento` a Row types (alto riesgo de cascada en consumidores que asumen no-nullables; queda en TODO).

---

### Iteración 36 — *2026-05-11* — Auditoría integral: triggers, error boundary, paginación, lazy load y tests UI

**Fase 1 — críticos**
- `supabase/fix_tenant_defaults.sql`: el array de tablas con trigger `fill_negocio_id` se amplió con las 6 tablas nuevas (`productos`, `stock_movimientos`, `tpv_ventas`, `tpv_venta_items`, `documentos`, `metodos_pago`). Hasta ahora la app funcionaba porque enviaba `negocio_id` explícitamente, pero ahora hay red de seguridad RLS también para inserts que lo omitan. Pendiente: aplicar el script en la BD productiva (Supabase SQL Editor).
- `src/lib/database.types.ts` queda como TODO: `npx supabase gen types` requiere `supabase login` interactivo del usuario; añadidos comentarios `TODO(post-iter36)` en `finanzas.ts`, `inventario.ts` y `documentos.ts` con la receta exacta para cuando se ejecute.

**Fase 2 — importantes**
- `src/components/ui/ErrorBoundary.tsx` nuevo: componente cliente con UI consistente (card-glass + botón "Reintentar") y log en dev. Montado en `(app)/layout.tsx` envolviendo `{children}` (también dentro de la rama de onboarding) — un error en cualquier ruta interna ya no rompe toda la app.
- Paginación cursor en `clientes/page.tsx` y `stock/page.tsx`: estado `oldestSeen`, query `.lt("created_at" | "ts", cursor).limit(50)`, botón "Cargar 50 más" debajo del listado. En stock se reemplazó el `useSupabaseQuery` de movimientos por estado local (el hook genérico no soporta cursor).

**Fase 3 — recomendables**
- `src/lib/ui-constants.ts` nuevo: `ESTADO_CLIENTE_BADGE`, `ESTADO_STOCK_BADGE`, `COLOR_MOV_STOCK`. Eliminadas las 4 definiciones duplicadas (`clientes/page.tsx`, `clientes/[id]/page.tsx`, `productos/page.tsx`, `stock/page.tsx`).
- `dashboard/page.tsx`: `FinanceSummary` se convierte a `dynamic(..., { ssr: false, loading: <skeleton> })` para que recharts (~95 KB gz) no entre en el initial JS de la home. `/finanzas` sigue cargándolo síncrono porque ahí sí es bundle de entrada.
- `STRUCTURE.md` reescrito: árbol completo (16 SQL, 14 módulos UI), tabla de módulos de negocio con tabla principal y notas, sección de integraciones externas, setup actualizado a Next.js 16.
- Tests UI con Testing Library: `tests/components/Field.test.tsx` (4 casos: label, asociación, hint, error con clase danger) y `tests/components/Modal.test.tsx` (6 casos: render condicional, ESC, click backdrop/contenido, dismissable=false). `vitest.config.ts` extiende `include` a `*.test.tsx` y los archivos usan pragma `// @vitest-environment jsdom` (vitest 4 deprecó `environmentMatchGlobs`).

**Verificación**
- `npm run test:run` → **119/119 verdes** (109 previos + 10 nuevos).
- `npx tsc --noEmit` → cero errores en código del proyecto (eliminados `@ts-expect-error` obsoletos en `tests/inventario.test.ts:42-44`).
- `npm run build` → ✓ Compiled in 10.2s.

**Lo que NO se tocó por decisión**: tipos manuales `Producto`/`Documento`/`StockMovimiento`/`VentaTPV` (alto riesgo de cascada hasta tener `database.types.ts` generado), `lib/agenda.ts`/`lib/google.ts` (estables), `useInfiniteQuery` genérico (solo 2 callsites), recharts en `/finanzas` (legítimamente parte del bundle de entrada).

---

### Iteración 35 — *2026-05-11* — Auditoría de lógica de negocio: integridad atómica y validaciones reforzadas

Tras auditar exhaustivamente la lógica de negocio (TS puro + RPCs SQL), corrijo los **bugs reales** y refuerzo la integridad. Los hallazgos triviales/falsos del agente quedan descartados (documentados en `/Users/alex/.claude/plans/encapsulated-spinning-alpaca.md`).

**Lógica pura TS** ([src/lib/](src/lib/)):
- `formatearDuracion(NaN)` ya no devuelve `"NaNh NaNm"` — ahora `"0h 00m"` para NaN, ±Infinity y valores no finitos.
- `estadoStock` defensivo: trata `stock_actual`/`stock_minimo` `null` como 0 en lugar de comparar contra `null` (`null > 0` es `false`, falso negativo).
- `añadirItem` defensivo: `(it.descuento_pct ?? 0) === 0` para no duplicar líneas si llega un descuento `null` desde la BD.
- `validarParaGenerar` rechaza ahora **precio_unit < 0**, **IVA fuera de [0,100]** y **descuento fuera de [0,100]**. Antes solo se validaba cantidad y descripción.

**RPCs atómicas nuevas en SQL** (eliminan dos race conditions reales):

1. [`crear_documento_generado(p_doc, p_serie, p_anio)`](supabase/documentos_ext.sql) en `documentos_ext.sql`. Sustituye al patrón antiguo `siguiente_numero_documento + INSERT cliente` que dejaba **gaps de numeración** si el INSERT fallaba (problema **normativo**: la AEAT exige facturas correlativas sin huecos). La nueva RPC reserva el número con `pg_advisory_xact_lock` y hace el INSERT en la **misma transacción** — si algo falla, ROLLBACK total y el número queda libre. También elimina la ventana de carrera donde dos usuarios podían reservar el mismo número y chocar contra el índice único.
2. [`set_metodo_pago_predeterminado(p_id)`](supabase/metodos_pago_ext.sql). Antes el cliente hacía 2 UPDATEs separados (`predeterminado=false WHERE id<>X` + `predeterminado=true WHERE id=X`) → ventana sin predeterminado. Ahora atómico.

**Integridad de datos en SQL** ([inventario_ext.sql](supabase/inventario_ext.sql)):
- `stock_movimientos.cantidad`: añadido `CHECK (cantidad <> 0)` — un movimiento con cantidad 0 es ruido sin sentido.
- `stock_movimientos.producto_id`: cambio de `ON DELETE CASCADE` → `ON DELETE RESTRICT` — preserva la auditoría histórica. Para retirar un producto márcalo como `activo = false` en lugar de borrarlo.

**Cliente migrado**:
- [`/documentos/nuevo`](src/app/\(app\)/documentos/nuevo/page.tsx): una sola llamada `rpc("crear_documento_generado", { p_doc, p_serie, p_anio })` en lugar de dos llamadas separadas.
- [`FacturacionTab`](src/components/ajustes/FacturacionTab.tsx): `rpc("set_metodo_pago_predeterminado", { p_id })` en lugar de 2 UPDATEs.

**Tests añadidos (8)**: jornada nocturna que cruza medianoche (con y sin descanso), `formatearDuracion` con `NaN`/`±Infinity`, `estadoStock` con `null`, `añadirItem` con `descuento_pct null`, validación de precio negativo, IVA fuera de rango, descuento fuera de rango.

**Falsos positivos descartados** (verificados en código, no son bugs):
- `cerrar_venta_tpv` con items pre-insertados: el `RAISE EXCEPTION` revierte la transacción completa (incluyendo INSERTs previos) — el agente leyó mal.
- `fichajesDelDia` y zonas horarias: la lógica filtra correctamente por día local. El test ya lo cubre.
- `siguiente_numero_documento` con año incorrecto: el cliente ya pasaba `p_anio` explícito derivado de `fecha_emision`.
- División por cero en parser OCR (regex no captura negativos).

**Verificación**: 9 archivos · **109/109 tests verdes** (8 nuevos), `npm run build` ✓ Compiled successfully en 9.7s, cero errores TypeScript.

**Para activar en BD**: re-ejecutar `documentos_ext.sql`, `metodos_pago_ext.sql` e `inventario_ext.sql` en el SQL Editor de Supabase. La FK con `RESTRICT` requiere que no haya productos sin movimientos (en práctica solo afecta a borrados manuales).

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

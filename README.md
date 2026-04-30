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
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| UI | Tailwind CSS + tokens R3ZON · `lucide-react` |
| Datos | Supabase (Postgres + Auth + Edge Functions + Storage) |
| Gráficas | Recharts |
| OCR | Tesseract.js (WebAssembly, client-side) |
| Email | Resend (vía Edge Function) |
| Móvil | Capacitor (`output: export`) |

---

## 📁 Estructura

```
r3zon-crm/
├── supabase/
│   ├── schema.sql                       # Esquema base + RLS multi-tenant
│   ├── auth_extension.sql               # Onboarding, devices, RPCs
│   └── functions/notify-new-device/     # Edge Function de Resend
├── scripts/
│   └── seed-admin.mjs                   # Crea el usuario admin de dev
├── src/
│   ├── middleware.ts                    # Refresca sesión + gate 2FA
│   ├── app/
│   │   ├── (auth)/                      # /login /registro /2fa
│   │   ├── (app)/                       # Rutas protegidas con AppShell
│   │   │   ├── dashboard/
│   │   │   ├── clientes/
│   │   │   ├── citas/
│   │   │   ├── tareas/
│   │   │   ├── finanzas/                # Dashboard + nuevo movimiento
│   │   │   ├── ocr/                     # Tesseract.js
│   │   │   ├── onboarding/              # Aceptación RGPD
│   │   │   ├── rgpd/
│   │   │   ├── 2fa/configurar/          # Enrolment TOTP
│   │   │   └── ajustes/
│   │   ├── auth/callback/route.ts       # OAuth code exchange
│   │   ├── legal/                       # Privacidad, cookies, términos, aviso
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/                        # OAuthButtons · DeviceTracker
│   │   ├── finanzas/Charts.tsx          # Recharts (barras + líneas)
│   │   ├── layout/                      # AppShell · Sidebar
│   │   ├── legal/LegalDoc.tsx
│   │   └── ui/                          # PageHeader · Placeholder
│   └── lib/
│       ├── supabase/{client,server,middleware}.ts
│       ├── ocr/{engine,parser}.ts       # Tesseract + parser regex ES
│       ├── finanzas.ts                  # Agregados mensuales
│       ├── devices.ts                   # SHA-256 fingerprint
│       └── utils.ts
├── tailwind.config.ts
├── next.config.mjs
└── .env.local                           # (ignorado por git)
```

---

## 🚀 Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Configura Supabase
#   2a. Ejecuta supabase/schema.sql
#   2b. Ejecuta supabase/auth_extension.sql
#   2c. En Authentication → Providers, activa Google, Apple, Facebook
#   2d. En Authentication → MFA, activa TOTP
#   2e. (Opcional) supabase functions deploy notify-new-device
#       y configura RESEND_API_KEY + RESEND_FROM como secrets.

# 3. Variables de entorno (.env.local) — ya creado con tus credenciales:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#   SUPABASE_SERVICE_ROLE_KEY  (rellénalo desde Supabase Dashboard)
#   ADMIN_EMAIL / ADMIN_PASSWORD

# 4. Crea el usuario admin de desarrollo
npm run seed:admin

# 5. Arranca
npm run dev
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
| Diseño base + AppShell | ✅ Completo | Sidebar 56px táctil, drawer mobile |
| Esquema BD multi-tenant | ✅ Completo | RLS + pgcrypto + triggers |
| Autenticación email | ✅ Completo | Login, registro, recuperación |
| OAuth (Google/Apple/FB) | ✅ Completo | Configurar providers en Supabase |
| 2FA (TOTP) | ✅ Completo | Enrolment + verificación |
| Email nuevo dispositivo | ✅ Completo | Edge Function + Resend |
| Onboarding RGPD | ✅ Completo | Logs en `consentimientos_rgpd` |
| Páginas legales | ✅ Plantillas | Privacidad, cookies, términos, aviso |
| Finanzas — dashboard | ✅ Completo | Recharts + KPIs simples |
| OCR de tickets | ✅ Completo | Tesseract.js client-side |
| Clientes (CRM) | ✅ Completo | Listado, ficha, tabs, webhook n8n |
| Citas / Agenda | 🟡 Placeholder | Tabla creada, falta calendario |
| Tareas Kanban | ✅ Completo | dnd-kit, columnas personalizadas, modales |
| Ajustes / API keys | 🟡 Placeholder | RPCs cifradas listas, falta UI |

---

## 📒 Bitácora de iteraciones

> Cada bloque resume lo construido en una iteración. Se añaden por orden cronológico.

### Iteración 1 — *2026-04-28* — Fundación del proyecto
- **Stack inicial**: Next.js 14, TypeScript, Tailwind, Supabase SSR clients.
- **Esquema multi-tenant** (`supabase/schema.sql`) con `perfiles_negocio`, `clientes`, `citas`, `tareas_kanban`, `finanzas` (con IVA/IRPF como columnas generadas), `consentimientos_rgpd`, `config_keys` (cifrada con `pgcrypto`). RLS y trigger de bootstrap incluidos.
- **AppShell** con `Sidebar` (botones grandes 56px) y drawer mobile, siguiendo el R3ZON Design System. Páginas placeholder para todos los módulos.

### Iteración 2 — *2026-04-28* — Credenciales Supabase
- Guardadas las credenciales reales del proyecto en `.env.local` (gitignored).
- Migración a la nueva nomenclatura `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_DB_PASSWORD` separado sin prefijo `NEXT_PUBLIC_` para no exponerlo al bundle.

### Iteración 3 — *2026-04-28* — Autenticación, 2FA, RGPD y legales
- **Auth completa**: `/login`, `/registro` con email + 3 botones OAuth (Google, Apple, Facebook).
- **2FA TOTP**: `/2fa/configurar` (QR + clave manual) y `/2fa` (verificación). Middleware fuerza el flujo cuando la sesión es `aal1` con `nextLevel=aal2`.
- **Email de nuevo dispositivo**: `DeviceTracker` calcula fingerprint SHA-256 y, si es nuevo, invoca la Edge Function `notify-new-device` que envía mail con Resend.
- **Onboarding RGPD**: checkboxes obligatorios (términos, privacidad, cookies) + opcional marketing → RPC `registrar_onboarding` graba en `consentimientos_rgpd` con IP, UA y versión.
- **4 páginas legales** (`/legal/*`) con plantillas RGPD/LOPDGDD/LSSI-CE.
- Nuevas tablas: `terminos_versiones`, `dispositivos_conocidos`. Columnas `onboarding_completado*` en `perfiles_negocio`.

### Iteración 4 — *2026-04-28* — Finanzas, OCR y admin
- **Credenciales admin** en `.env.local` + script `npm run seed:admin` (usa service_role key para crear el usuario con email pre-confirmado).
- **OCR client-side**: `lib/ocr/engine.ts` (wrapper Tesseract.js con modelo spa+eng) + `lib/ocr/parser.ts` (regex específicos para tickets españoles que extraen fecha, CIF/NIF, base, IVA % y total).
- **Pantalla `/ocr`** con cámara/upload, barra de progreso y revisión editable antes de guardar.
- **Dashboard `/finanzas`** con Recharts: 4 KPIs grandes en lenguaje claro ("Lo que has ganado", "Lo que has gastado", "Te queda", "Apartar para Hacienda"), barras mensuales, previsión de impuestos (IVA repercutido − soportado, IRPF retenido) y lista de últimos movimientos.
- **`/finanzas/nuevo`** con toggle "He cobrado / He gastado" y cálculo en vivo del total.
- Dependencias añadidas: `tesseract.js`, `recharts`.

### Iteración 7 — *2026-04-28* — Botón de acceso rápido en dev
- `DevLoginButton` (`src/components/auth/DevLoginButton.tsx`) — se renderiza **solo cuando `NODE_ENV === 'development'`**; en producción Next.js lo elimina del bundle. Lee `NEXT_PUBLIC_DEV_EMAIL` / `NEXT_PUBLIC_DEV_PASSWORD` desde `.env.local` y llama a `signInWithPassword` directamente, por lo que RLS sigue funcionando con normalidad. Si el usuario no existe todavía muestra el mensaje `"Ejecuta: npm run seed:admin"`. Visual: badge naranja `DEV MODE` + botón con icono ⚡.
- Añadidas las variables `NEXT_PUBLIC_DEV_EMAIL` y `NEXT_PUBLIC_DEV_PASSWORD` a `.env.local` (gitignored).

### Iteración 6 — *2026-04-28* — CRM completo + Kanban con Drag & Drop

**SQL:** nueva migración `supabase/crm_kanban_ext.sql` con tablas `comunicaciones`, `kanban_columnas` y columnas `webhook_url/webhook_activo` en `clientes`. RLS aplicado. Trigger `seed_kanban` que inicializa 4 columnas por defecto al crear un negocio.

**CRM — Clientes:**
- `/clientes` — listado en grid con búsqueda en tiempo real (debounce 300ms), botones rápidos de WhatsApp/Email/teléfono y etiquetas de color.
- `/clientes/nuevo` — formulario con etiquetas personalizadas + sugeridas, `Help` tooltips en cada campo.
- `/clientes/[id]` — ficha con 4 pestañas:
  - **Información** — edición inline con toggle editar/guardar.
  - **Historial** — citas vinculadas al cliente ordenadas por fecha.
  - **Mensajes** — log de comunicaciones (WhatsApp click, email click, notas manuales). Los clicks se registran automáticamente en `comunicaciones`.
  - **Automático** — panel de webhook n8n/Make: URL, toggle activo/inactivo, botón "Probar webhook" (dispara POST con payload del cliente y registra resultado en `comunicaciones`), guía de 5 pasos.

**Kanban:**
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag & drop táctil y de ratón. `PointerSensor` (distancia 8px) + `TouchSensor` (delay 200ms) para evitar activaciones accidentales en móvil.
- `DragOverlay` con rotación sutil durante el arrastre. Placeholder punteado en la posición de origen.
- Reordenación dentro de columna (arrayMove) y cambio de columna — persistencia optimista, sincroniza con Supabase en `onDragEnd`.
- `ColumnManager` — diálogo modal para crear, renombrar (doble clic), cambiar color y eliminar columnas. El slug se genera automáticamente desde el nombre (slugify con normalización NFD).
- `TaskModal` — creación y edición de tareas: título, descripción, columna, prioridad (baja/normal/alta/urgente), fecha límite, checkbox "completada". Las tareas vencidas muestran borde rojo.
- `Tooltip` component genérico + `Help` (icono ?) para todos los campos — lenguaje no técnico en todos los textos.

**Dependencias añadidas:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

### Iteración 8 — *2026-04-30* — Auth Next.js 15 + Módulo B2B Empresas

**Auth fix Next.js 15:**
- `src/lib/supabase/server.ts` ahora es `async` y hace `await cookies()` para corregir el `TypeError: store.getAll is not a function` introducido por Next.js 15.
- `src/app/auth/callback/route.ts` y `src/app/(app)/layout.tsx` actualizados con `await createClient()`.
- Login limpio: eliminados los botones de Apple/Facebook y la sección DEV MODE. `OAuthButtons` solo Google con spinner que persiste durante el redirect.
- Mensajes de error traducidos al español con icono `AlertCircle` (`Invalid login credentials` → "Email o contraseña incorrectos…").

**Módulo Empresas (CRM B2B):**
- **SQL** (`supabase/empresas_ext.sql`): tablas `empresas` (CIF, sector, sitio_web, estado, facturación, etc.) y `contactos_empresa` con FK autorreferencial `reports_to`. Trigger que valida que `reports_to` apunte siempre a un contacto de la misma empresa. RLS multi-tenant.
- **Rutas**: `/empresas` (lista con búsqueda + filtros por estado + skeletons), `/empresas/nuevo` (alta), `/empresas/[id]` (perfil con 3 pestañas).
- **Tabs**:
  - *Información* — edición inline, todos los campos fiscales/comerciales.
  - *Contactos* — CRUD modal con campos de puesto, departamento, decisor (`Crown`) y selector "¿A quién reporta?" que excluye descendientes para evitar ciclos.
  - *Estructura jerárquica* — `HierarchyChart` con `@xyflow/react`: layout de árbol automático calculado por anchura de subárbol, nodos custom estilo glass-card, conexiones `smoothstep`, drag/zoom y `Background` con la rejilla del design system.
- **UX para no técnicos**: empty state con CTA "Añadir CEO/Director" en la pestaña jerarquía, contador de contactos en el tab, helpers explicativos en el selector de superior directo.
- **Sidebar**: nueva entrada "Empresas" con icono `Building2` entre Clientes y Agenda.
- **Dependencia añadida**: `@xyflow/react`.

### Iteración 9 — *2026-04-30* — Infraestructura Agenda + Google Calendar API (PROMPT 1)

**SQL** (`supabase/agenda_ext.sql`):
- Tabla `agenda_eventos` con `negocio_id`, `cliente_id`, `title`, `description`, `start_time`, `end_time`, `google_event_id`, `google_etag`, `last_synced_at`, `color`, `ubicacion`, `estado`. Índice único parcial en `(negocio_id, google_event_id)` para upsert idempotente.
- Tabla `google_connections` con `access_token` y `refresh_token` cifrados con `pgp_sym_encrypt` usando la master key `app.config_master_key` (mismo patrón que `config_keys`). Una fila por usuario (`unique(user_id)`).
- Funciones `SECURITY DEFINER`: `set_google_tokens`, `update_google_access_token` (refresh-only), `get_google_tokens`, `set_google_sync_token`. Evitan exponer la master key al cliente.
- RLS: `agenda_eventos` filtra por `current_negocio_id()`; `google_connections` por `auth.uid()`.

**Cliente Google** (`src/lib/google.ts`):
- `loadTokens` / `saveTokens` / `persistSyncToken` — RPC al schema cifrado.
- `googleFetch(path, init)` — wrapper con dos capas de refresh: proactivo (si `expires_at` ≤ now) y reactivo (si Google responde 401, intercambia el `refresh_token` y reintenta una vez). Sin `googleapis` (fetch nativo).

**Motor de sync** (`src/lib/agenda.ts`, `"use server"`):
- `syncGoogleCalendar()` — Server Action. Usa `nextSyncToken` para sync incremental; si Google devuelve 410 (token caducado), cae a full sync de la ventana −30/+90 días. Pagina con `nextPageToken`. Mapea `status` → `estado` (`cancelled`→`cancelada`). Upsert por `(negocio_id, google_event_id)`. Devuelve `{ inserted, updated, cancelled, syncToken }`.
- `disconnectGoogle()` — borra los tokens del usuario actual.

**ENV requeridas**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (consumidas sólo en el server al refrescar tokens).

### Iteración 10 — *2026-04-30* — UI del Calendario (FullCalendar dark) (PROMPT 2)

**Dependencias** (`package.json`): `@fullcalendar/{core,daygrid,timegrid,interaction,react}` (v6.1.15). Hace falta `npm install`.

**Server actions añadidas** (`src/lib/agenda.ts`):
- `listEvents(rangeStart, rangeEnd)` — query del rango visible (excluye estado `cancelada`).
- `updateEventTime({ id, start, end })` — usado por `eventDrop` y `eventResize`. Actualiza Supabase y, si hay `google_event_id`, hace PATCH silencioso a Google Calendar (`/calendars/{cal}/events/{id}`) con start/end.
- `createEvent({...})` — crea local + Google (POST) si hay tokens.
- `deleteEvent(id)` — borra Google (DELETE) y local.

**Estilos personalizados** (`src/components/agenda/calendar.css`):
- Override de las CSS variables nativas de FullCalendar (`--fc-*`): cuadrícula glass `rgba(30,27,75,.32)` con blur 14px, separadores `rgba(129,140,248,.14)`, "today" tinted cyan, indicador de "ahora" fucsia con glow.
- Botones de la toolbar 44px de alto, `border-radius: 14px`, hover `indigo-600/55`, activo con gradient cyan→fucsia.
- Eventos como gradient indigo con sombra glow, hover `translateY(-1px)`. Variantes por `data-color` (cyan, fuchsia, green, orange, red).
- Cabeceras de días en `Syne` uppercase tracking-wide.

**Componente `CalendarView.tsx`** (client):
- Vistas: `dayGridMonth`, `timeGridWeek` (default), `timeGridDay`. Locale español, `firstDay=1`, `slot 07:00-22:00`, `nowIndicator`.
- `editable` + `eventResizableFromStart` + `selectable` activados. `eventDrop`/`eventResize` llaman a `updateEventTime` y revierten visualmente con `info.revert()` si la API falla.
- Estado `isSyncing` mostrado como pill "Sincronizando con Google…" con `Loader2` animado; cuando todo está al día, pill verde "Al día" con `CheckCircle2`. Toasts inline (ok/error/info) con auto-hide a 4s y `aria-live="polite"`.
- Botones grandes (clase `.btn-big`, ≥56px): "Sincronizar" (refresca via `syncGoogleCalendar()`) y "Nueva cita" (gradient cyan→fucsia, glow). Tooltips explicativos.
- `datesSet` recarga el rango cada vez que el usuario cambia de mes/semana — sin overfetch.

**Página** (`/citas`): reemplaza el placeholder por `<PageHeader />` + `<CalendarView />` con copy didáctico ("Arrastra una cita para moverla…").

### Iteración 11 — *2026-04-30* — Modal de cita + vinculación con clientes (PROMPT 3)

**Server actions añadidas** (`src/lib/agenda.ts`):
- `updateEvent({...})` — edición completa: PRIMERO hace PATCH a Google Calendar (si el evento está vinculado) y, si tiene éxito, persiste en Supabase. Si Google falla, no se toca la DB → ambos lados quedan coherentes.
- `getEvent(id)` — lectura puntual para abrir el modal en modo edición.
- `createEvent` y `updateEvent` ahora aceptan `ubicacion` y la propagan a Google (`location` field).

**Componente `EventModal.tsx`** (client):
- **Diálogo glass** (overlay `bg-black/60` + `backdrop-blur`, panel `card-glass` con `rainbow-bar`). Sigue el patrón del proyecto (Kanban TaskModal); no introduce Shadcn/UI porque el repo mantiene su propio sistema visual.
- **Combobox de clientes** con búsqueda en tiempo real: debounce 250ms, query a Supabase con `.or("nombre.ilike,apellidos.ilike,email.ilike")`, `AbortController` para cancelar peticiones obsoletas. Al elegir, muestra `nombre + apellidos` con botón "quitar".
- **Campos**: título (`autoFocus`), cliente, inicio/fin (`datetime-local`), ubicación, notas (`textarea` 3 filas) y selector de color con 6 chips (indigo/cyan/fuchsia/verde/naranja/rojo) — el chip activo se distingue con `border-text-hi` + `bg-white/10`.
- **Insignia explicativa** (cyan, icono `Smartphone`): *"Esta cita se verá también en tu móvil gracias a la sincronización con Google."* Cumple el requisito de UX para no técnicos.
- **`Help` tooltips** en cada label (título, cliente, ubicación, notas, color) reusando el componente `@/components/ui/Tooltip`.
- **Validación cliente** (computada con `useMemo`): título no vacío, fechas válidas, fin > inicio, y "no crear citas en el pasado" en modo creación (margen de 60s para evitar falsos positivos al pulsar el botón). El botón "Crear cita" se deshabilita cuando hay error y muestra el mensaje en tooltip nativo.
- **Footer**: "Cancelar" + "Crear cita / Guardar cambios" (gradient cyan→fucsia con `shadow-glow`). En modo edición, botón rojo "Eliminar" que confirma y borra en Google + Supabase.

**Cableado en `CalendarView.tsx`**:
- Quitadas las props `onCreateRequest` / `onEventClick` — el calendario ahora gestiona su propio estado `modal: EventModalInitial | null`.
- `select` (rango arrastrado) y botón "Nueva cita" → abren modal en creación. Botón "Nueva cita" precarga la próxima hora en punto + 1h.
- `eventClick` → llama a `getEvent(id)` y abre modal en edición.
- Tras `onSaved`/`onDeleted` se recarga el rango visible y se muestra toast.

**CSS**: variantes de color de eventos pasaron de `[data-color]` a `.r3zon-color-*` para alinear con las `classNames` que ya asigna `toFcEvent`.

### Iteración 12 — *2026-04-30* — Refactor a modelo B2B puro (Clientes = Empresas)

**Plan ejecutado:**
- Eliminado el antiguo módulo CRM B2C (`/clientes` + `src/components/crm/Tab*`).
- Renombrado el módulo `Empresas` → `Clientes` en rutas, componentes, tipos y sidebar.
- Conservada íntegra la funcionalidad de organigrama (`HierarchyChart`).

**SQL** (`supabase/refactor_b2b_clientes.sql`, transaccional):
1. `drop table public.clientes cascade` — elimina la antigua tabla B2C; las FKs salientes caen, las columnas `cliente_id` en tablas dependientes sobreviven.
2. `alter table empresas rename to clientes` (los índices se renombran también).
3. `alter table contactos_empresa rename to contactos_cliente` y `rename column empresa_id to cliente_id`.
4. Trigger `tg_check_reports_to_same_cliente` recreado con la nueva nomenclatura.
5. **Recrear FKs** desde `citas`, `tareas_kanban`, `finanzas`, `consentimientos_rgpd`, `comunicaciones`, `agenda_eventos` hacia `clientes(id)` (con `on delete cascade`/`set null` preservando la semántica original).
6. Re-aplicado `enable row level security` + policy `tenant_isolation` para no depender del orden de ejecución de los scripts previos.

**Frontend:**
- Carpeta `src/components/empresas/` → `src/components/clientes/` (`git mv`, conserva historial).
- `types.ts`: `Empresa` → `Cliente`; `Contacto.empresa_id` → `cliente_id`.
- `InfoTab`: prop `empresa` → `cliente`; `from("empresas")` → `from("clientes")`.
- `ContactosTab`: prop `empresaId` → `clienteId`; `contactos_empresa` → `contactos_cliente`. Copy "Trabajadores de la empresa…" → "Personas dentro de la organización del cliente…".
- `HierarchyChart` y `Skeleton`: sin cambios (sólo dependían del tipo `Contacto`, ya migrado).
- Rutas: borradas `/empresas/**`. Nuevas `/clientes`, `/clientes/nuevo`, `/clientes/[id]`. La pestaña antes llamada *"Estructura jerárquica"* ahora se llama **"Organigrama"** (más comprensible para no técnicos).
- `nuevo`: añadido un aviso destacado *"Estás dando de alta una empresa (entidad jurídica)"* + label "Razón social *". Estados re-etiquetados como Activo/Prospecto/Inactivo.
- Sidebar: eliminada la entrada "Empresas". La entrada "Clientes" usa ahora el icono `Building2` (antes `Users`).
- `EventModal` (Agenda): el combobox de clientes ahora busca por `nombre`/`cif`/`email` en vez de `nombre`/`apellidos`/`email`. Muestra `nombre` como título y `CIF · email` como subtítulo.

**Notas:**
- El script SQL es destructivo (drop CASCADE de la antigua `clientes`). Hay que ejecutarlo en orden tras `schema.sql` + `crm_kanban_ext.sql` + `empresas_ext.sql` + `agenda_ext.sql`. Para entornos con datos en producción, exportar antes los registros B2C que se quieran convertir manualmente a contactos.
- `src/app/layout.tsx` y `src/app/legal/terminos/page.tsx` mantienen la palabra "empresas" en copy de marketing/legal — semánticamente correcto.

### Iteración 13 — *2026-04-30* — Reestructura BD + fix Next.js 16 proxy + seed B2B

**Base de datos consolidada en B2B desde el origen:**
- `supabase/schema.sql` reescrito: `clientes` ya nace con campos B2B (cif, sector, sitio_web, num_empleados, facturacion_anual, estado, etiquetas, webhook_url, webhook_activo) + `contactos_cliente` con jerarquía y trigger `tg_check_reports_to_same_cliente` integrados. `consentimientos_rgpd.cliente_id` ahora es **NULLABLE** (los consentimientos del titular del negocio no se atan a un cliente fake).
- `auth_extension.sql`: el RPC `registrar_onboarding` ya no inserta un cliente "Titular del negocio" — guarda los consentimientos con `cliente_id = NULL`.
- `crm_kanban_ext.sql`: eliminadas las dos columnas `webhook_*` (movidas a `schema.sql`); ahora sólo gestiona `comunicaciones` + `kanban_columnas`.
- **Borrados**: `supabase/empresas_ext.sql` y `supabase/refactor_b2b_clientes.sql` (ya consolidados en `schema.sql`).
- **Nuevo**: `supabase/seed_clientes.sql` — inserta 10 empresas reales (Acme Soluciones, Cafés Aurora, Construcciones Mediterráneo, Logística Norte, Estudio Lumen, Cosmética Verde, DataMind, Bodegas Solera, Clínica Dental Smile, EcoTrans) en el primer `perfiles_negocio` que encuentre. Idempotente por CIF. Algunos clientes traen contactos con jerarquía (CEO + reports_to por índice).
- **Nuevo**: `supabase/setup.sql` — script único de instalación limpia: WIPE en orden inverso de dependencia + `\i` de los 4 SQL en orden + seed. Para entornos dev.

**Orden de ejecución para una BD desde cero:**
1. `schema.sql`
2. `auth_extension.sql`
3. `crm_kanban_ext.sql`
4. `agenda_ext.sql`
5. *(registrar al menos 1 usuario en la app — el trigger `on_auth_user_created` crea su `perfiles_negocio`)*
6. `seed_clientes.sql`

**Fix Next.js 16 — middleware → proxy:**
- Borrado `src/middleware.ts`. Next.js 16 sólo admite `src/proxy.ts` (la convención `middleware.ts` quedó deprecada). El `proxy.ts` ya estaba en el repo con el mismo `updateSession()` de Supabase SSR, así que no hay pérdida de funcionalidad. Esto resuelve el `unhandledRejection: Both middleware file ... and proxy file ... detected`.

**Verificación de rutas:**
- Las 10 entradas del Sidebar (`/dashboard`, `/clientes`, `/citas`, `/tareas`, `/finanzas`, `/ocr`, `/rgpd`, `/2fa/configurar`, `/ajustes`) resuelven a `page.tsx` existentes.
- No quedan referencias `href="/empresas"` ni a `@/components/empresas` ni a `@/components/crm`.

### Iteración 5 — *2026-04-28* — Bitácora en README
- Reescrito `README.md` con el estado real del proyecto, estructura de carpetas y tabla de módulos.
- Añadida la sección **Bitácora de iteraciones** que se actualizará en cada turno futuro.

---

## 📚 Documentos relacionados

- [`AUTH.md`](AUTH.md) — guía completa de despliegue de auth, OAuth, MFA y Edge Function.
- [`STRUCTURE.md`](STRUCTURE.md) — desglose detallado de la estructura inicial.
- `r3zon-design-system.md` — manual de estilo (dark glass, tokens cyan/fuchsia).

---

<div align="center">
  <sub>Construido para negocios reales, no para developers.</sub>
</div>

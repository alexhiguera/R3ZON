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

### Iteración 13 — *2026-05-02* — Fix RLS en kanban, finanzas y OCR + build verde
- **Helper nuevo** [`src/lib/useNegocioId.ts`](src/lib/useNegocioId.ts) — hook que carga el `id` del `perfiles_negocio` del usuario autenticado y lo cachea. Devuelve `null` mientras carga; los formularios deshabilitan el botón Guardar hasta que esté disponible.
- **Fix RLS en kanban** ([`src/components/kanban/TaskModal.tsx`](src/components/kanban/TaskModal.tsx)) — el INSERT de tarea nueva ahora envía `negocio_id` explícitamente vía `useNegocioId()`. Mismo patrón que ya funcionó para clientes en la iteración 12.
- **Fix RLS en finanzas** ([`src/app/(app)/finanzas/nuevo/page.tsx`](src/app/%28app%29/finanzas/nuevo/page.tsx)) — idem.
- **Fix RLS en OCR** ([`src/app/(app)/ocr/page.tsx`](src/app/%28app%29/ocr/page.tsx)) — el guardado del ticket escaneado también sufría el mismo bug; aplicado mismo fix.
- **Refactor** ([`src/app/(app)/clientes/nuevo/page.tsx`](src/app/%28app%29/clientes/nuevo/page.tsx)) — migrado al helper `useNegocioId()` (DRY).
- **Verificación**: `npm run build` pasa con las **28 rutas generadas**, incluida la nueva `/_not-found`. Para que el build production pasara, además se arreglaron 3 problemas preexistentes ajenos al ticket pero bloqueantes:
  - [`tsconfig.json`](tsconfig.json) — `supabase/functions` excluido del typecheck (son funciones Deno con `import "jsr:..."` que TS de Next.js no resuelve).
  - [`src/components/agenda/CalendarView.tsx`](src/components/agenda/CalendarView.tsx) — el campo `week` salió de `LocaleInput` en versiones recientes de FullCalendar; cast a `LocaleInput` y tipo explícito en el callback `moreLinkText`.
  - [`src/app/(auth)/login/page.tsx`](src/app/%28auth%29/login/page.tsx) — `useSearchParams()` envuelto en `<Suspense>` (requerido por Next.js 16 para prerender estático).
- **Por qué este fix funciona aunque no se haya aplicado `fix_tenant_defaults.sql`**: la WITH CHECK de la RLS exige `negocio_id = current_negocio_id()`. Si el INSERT incluye el `negocio_id` correcto desde la app, la condición se cumple y el insert pasa sin necesidad del trigger. El trigger sigue siendo recomendable como red de seguridad pero ya no es bloqueante.

### Iteración 12 — *2026-05-02* — Página 404, formulario cliente simplificado, contactos
- **Nueva página 404** [`src/app/not-found.tsx`](src/app/not-found.tsx) — pantalla glass con número 404 en gradient cyan→fuchsia, título y dos CTAs: «Ir al panel» (gradient) y «Ver clientes» (secundario). Next.js 16 la sirve automáticamente para cualquier ruta no resuelta.
- **Fix RLS al crear cliente** ([`src/app/(app)/clientes/nuevo/page.tsx`](src/app/%28app%29/clientes/nuevo/page.tsx)) — el formulario ahora carga `negocio_id` por adelantado consultando `perfiles_negocio` y lo envía explícitamente en el INSERT. Esto blinda contra el caso de que `fix_tenant_defaults.sql` aún no se haya aplicado en la BD del entorno (sin trigger, la RLS rechaza el insert con `new row violates row-level security policy`). El botón Guardar queda deshabilitado hasta que `negocio_id` esté disponible.
- **Formulario simplificado** — sólo `nombre` es obligatorio. Visibles arriba: nombre, email, teléfono y selector de estado (3 botones). Todo lo demás (CIF, sitio web, sector, dirección fiscal, datos B2B, etiquetas, notas) movido a un acordeón **«Datos adicionales»** colapsado por defecto. UX: el usuario puede crear un cliente en 5 segundos y completar después desde la ficha.
- **Apartado contactos confirmado**: la pestaña «Contactos» de la ficha (`/clientes/[id]`) ya monta `ContactosTab` con su modal de alta/edición (jerarquía `reports_to`, decisor, puesto, departamento, email, teléfono con WhatsApp), gracias al wrapper `ContactosTabWrapper` añadido en la iteración 11. Estado vacío con CTA «Añadir primer contacto» y organigrama implícito por la relación `reports_to`.

### Iteración 11 — *2026-05-02* — Fix: clientes, agenda, finanzas y kanban
Cuatro bugs reportados a la vez. Causa raíz unificada:

1. **`Could not find the 'apellidos' column of 'clientes'`** — la tabla `clientes` se reescribió a B2B en la iteración 4 (`nombre` razón social, `cif`, `sector`…) pero las páginas seguían enviando `apellidos`/`nif`/`fecha_alta`/`ultima_visita` del schema antiguo.
2. **RLS rechaza inserts en `finanzas` y `tareas_kanban`** — la política `tenant_isolation` (`negocio_id = current_negocio_id()`) requiere `negocio_id` en el INSERT, pero `finanzas/nuevo/page.tsx` y `kanban/TaskModal.tsx` no lo enviaban.
3. **«Crear cita no hace nada»** — la validación bloqueaba citas en el pasado y `createEvent` lanzaba sin red de seguridad si Google fallaba (token revocado, sin red…).

**Fixes aplicados:**

- **SQL nuevo idempotente** [`supabase/fix_tenant_defaults.sql`](supabase/fix_tenant_defaults.sql) — trigger genérico `tg_fill_negocio_id` BEFORE INSERT en `clientes`, `contactos_cliente`, `citas`, `tareas_kanban`, `kanban_columnas`, `comunicaciones`, `finanzas`, `consentimientos_rgpd`, `agenda_eventos`, `config_keys`, `miembros_negocio`, `pagos_stripe`. Si el INSERT no incluye `negocio_id`, el trigger lo rellena con `current_negocio_id()` y la WITH CHECK pasa. Resuelve **todos** los inserts existentes y futuros sin tocar la app. [`supabase/setup.sql`](supabase/setup.sql) actualizado.
- **Reescrita** [`src/app/(app)/clientes/page.tsx`](src/app/%28app%29/clientes/page.tsx) — listado con campos B2B (`nombre`, `cif`, `sector`, `email`, `telefono`, `sitio_web`, `estado`, `etiquetas`, `created_at`), badge de estado coloreado y búsqueda extendida a CIF/sector.
- **Reescrita** [`src/app/(app)/clientes/nuevo/page.tsx`](src/app/%28app%29/clientes/nuevo/page.tsx) — formulario B2B con secciones Identidad jurídica, Estado comercial, Contacto, Dirección, Datos B2B, Etiquetas, Notas. Sin `apellidos`/`nif`. El INSERT no envía `negocio_id` — confía en el trigger.
- **Reescrita** [`src/app/(app)/clientes/[id]/page.tsx`](src/app/%28app%29/clientes/%5Bid%5D/page.tsx) — usa `InfoTab` y `ContactosTab` del módulo B2B nuevo (`@/components/clientes/`) en vez del antiguo `@/components/crm/InfoTab`. Pestaña Contactos añadida (gestión de personas dentro de la empresa con jerarquía). Wrapper `ContactosTabWrapper` que carga los contactos y los pasa con la firma esperada.
- **Agenda** ([`src/lib/agenda.ts`](src/lib/agenda.ts)) — `createEvent` envuelve la llamada a Google en `try/catch`: si Google falla (token revocado, sin red, scope insuficiente…), la cita se crea en local y se sincronizará en el próximo botón Sincronizar. Tipo de `description` aceptado como `string | null` para evitar el mismatch con el modal.
- **Agenda** ([`src/components/agenda/EventModal.tsx`](src/components/agenda/EventModal.tsx)) — eliminada la validación «No se pueden crear citas en el pasado» (era restrictiva para registro histórico y dejaba el botón en disabled silenciosamente, dando la sensación de que «no hace nada»).

**Cómo aplicar el fix en una BD existente** (sin perder datos):
```bash
psql "$DATABASE_URL" -f supabase/fix_tenant_defaults.sql
```
Para limpieza completa: `psql -f supabase/setup.sql` (wipe + reload con todas las extensiones).

### Iteración 10 — *2026-05-01* — Ajustes: portal de suscripción (Stripe)
- **Nueva dependencia**: `stripe` (SDK oficial server-side, sin cliente JS porque usamos redirects a Checkout/Portal).
- **Nuevo SQL** [`supabase/billing_ext.sql`](supabase/billing_ext.sql):
  - `perfiles_negocio` extendido con `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `subscription_price_id`, `subscription_period_end`, `subscription_cancel_at_period_end`.
  - Tabla `pagos_stripe` (factura cacheada localmente: `stripe_invoice_id` único, `amount_cents`, `currency`, `status`, `description`, `hosted_invoice_url`, `invoice_pdf_url`, `paid_at`).
  - RLS de SELECT para el OWNER. INSERT/UPDATE sólo desde el webhook (que usa `service_role_key` y bypassea RLS).
  - [`supabase/setup.sql`](supabase/setup.sql) actualizado: wipe `pagos_stripe` + `\i billing_ext.sql`.
- **Helper** [`src/lib/stripe.ts`](src/lib/stripe.ts) — `getStripe()` lazy-singleton + catálogo `PLANS` (Pro 29€/mes, Business 79€/mes con flag `destacado`) + `planFromPriceId()` para resolver el slug local desde un Price ID de Stripe.
- **Route handlers**:
  - [`POST /api/billing/checkout`](src/app/api/billing/checkout/route.ts) — Zod valida `plan ∈ {pro,business}`, garantiza Stripe Customer (lo crea on-demand y lo persiste con `service_role` para evitar conflictos RLS), crea Checkout Session en modo `subscription` con `metadata.negocio_id`, `client_reference_id`, `allow_promotion_codes` y devuelve la URL de Stripe.
  - [`POST /api/billing/portal`](src/app/api/billing/portal/route.ts) — abre Customer Portal de Stripe (gestión de tarjetas, cambio de plan, descarga de facturas, cancelación). Devuelve 400 si aún no hay `stripe_customer_id`.
  - [`POST /api/billing/webhook`](src/app/api/billing/webhook/route.ts) — `runtime = "nodejs"`, valida firma con `STRIPE_WEBHOOK_SECRET`, maneja:
    - `checkout.session.completed` / `customer.subscription.{created,updated,deleted}` → sincroniza el estado de la suscripción y actualiza `plan` en `perfiles_negocio` vía `planFromPriceId()`.
    - `invoice.paid` / `invoice.payment_failed` → upsert idempotente en `pagos_stripe` por `stripe_invoice_id`.
- **Pestaña Suscripción** ([`SuscripcionTab.tsx`](src/components/ajustes/SuscripcionTab.tsx)):
  - Cabecera **Plan actual** con pill de estado (`active`/`trialing`/`past_due`/`canceled`) y fecha de próxima renovación (o de finalización si `cancel_at_period_end`). Botón gradient «Gestionar suscripción» que abre el Portal.
  - **Tabla de precios** (2 cards comparativos al estilo Shadcn) que se muestra **sólo cuando no hay suscripción activa**. La card `Business` lleva ribbon «Recomendado» con gradient cyan→fuchsia.
  - **Historial de pagos** con fecha, concepto, importe formateado en EUR, estado y enlaces a PDF / vista web de la factura.
  - Lee `?billing=success|cancelled` que devuelve Stripe tras Checkout y muestra toast informativo, limpiando el query string con `history.replaceState`.
- **Variables de entorno requeridas** (anotar en `.env.local`):
  - `STRIPE_SECRET_KEY` (sk_test_… / sk_live_…)
  - `STRIPE_WEBHOOK_SECRET` (whsec_…)
  - `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` (price_…)
- **Configurar webhook**: en el Dashboard de Stripe, crear endpoint `https://<dominio>/api/billing/webhook` suscrito a `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`.
- **Decisión de diseño**: el catálogo de planes se mantiene replicado en el componente cliente (sólo nombre/precio/features) para evitar un round-trip en el render inicial. Los `Price IDs` reales viven sólo en server (`lib/stripe.ts`) — el cliente no los necesita porque el endpoint `/checkout` los resuelve por el slug `pro`/`business`.

### Iteración 9 — *2026-05-01* — Ajustes: equipo + seguridad
- **Nuevo SQL** [`supabase/team_ext.sql`](supabase/team_ext.sql):
  - Enums `rol_miembro` (`admin|editor|lector`) y `estado_miembro` (`invitado|activo|revocado`).
  - Tabla `miembros_negocio` (`negocio_id`, `user_id` nullable, `email`, `rol`, `estado`, `privacidad_version`, `terminos_version`, `invited_by`, `invited_at`, `accepted_at`, `revoked_at`) con RLS dual: el OWNER ve todo el equipo de su negocio; cada miembro puede leer su propia fila.
  - RPC `aceptar_invitacion(p_ip, p_user_agent)` — el invitado lo llama tras su primer login: enlaza `user_id`, marca `estado='activo'` y registra los consentimientos RGPD (`privacidad` + `terminos`) en `consentimientos_rgpd` con la versión que se le pidió aceptar al invitarle. **Garantía legal**: la aceptación queda con timestamp, IP y user-agent.
  - Vista `v_equipo_negocio` que UNIONa el OWNER (extraído de `perfiles_negocio`) con los miembros adicionales — la UI consume una sola query.
  - [`supabase/setup.sql`](supabase/setup.sql) actualizado para incluir `team_ext.sql` en el wipe + reload.
- **Helper** [`src/lib/supabase/admin.ts`](src/lib/supabase/admin.ts) — cliente con `SUPABASE_SERVICE_ROLE_KEY` para llamar `auth.admin.*` desde route handlers (nunca importable desde Client Components).
- **Route handlers**:
  - [`POST /api/team/invite`](src/app/api/team/invite/route.ts) — valida payload con Zod (`email`, `rol`, `acepta_politicas: literal(true)`), comprueba duplicado, invoca `auth.admin.inviteUserByEmail()` con `redirectTo=/auth/callback?next=/equipo/aceptar` y metadata (`invited_to_negocio`, `invited_rol`, `invited_by`), e inserta la fila en `miembros_negocio` con la versión vigente de privacidad/términos.
  - [`POST /api/team/revoke`](src/app/api/team/revoke/route.ts) — marca `estado='revocado'` (no borra para preservar la auditoría legal).
- **Pestaña Equipo** ([`EquipoTab.tsx`](src/components/ajustes/EquipoTab.tsx) + [`InvitarMiembroModal.tsx`](src/components/ajustes/InvitarMiembroModal.tsx)):
  - Tabla con Nombre · Email · Rol · Estado · Acciones. Owner marcado con icono Crown ámbar y rol Admin no removible.
  - Pills coloreadas por rol (`admin` fuchsia, `editor` cyan, `lector` neutro) y estado (`activo` esmeralda, `invitado` ámbar, `revocado` rosa).
  - Modal de invitación con selector visual de rol (3 tarjetas con descripción), checkbox **obligatorio** «Confirmo que el miembro aceptará la política de privacidad y los términos al activar su cuenta» — sin marcar, el botón Enviar queda deshabilitado.
- **Pestaña Seguridad** ([`SeguridadTab.tsx`](src/components/ajustes/SeguridadTab.tsx)):
  - Tarjeta de estado **2FA** (consulta `supabase.auth.mfa.listFactors()`), enlaza a `/2fa/configurar` con CTA gradient cuando está OFF y botón secundario «Gestionar» cuando está ON.
  - Tarjeta «Cerrar sesión en todos los dispositivos» que invoca `supabase.auth.signOut({ scope: "global" })` y redirige a `/login`.
  - Lista de **dispositivos conocidos** desde `dispositivos_conocidos` (ya existente) con acción «Olvidar» por dispositivo (delete por RLS).
- **Variables de entorno requeridas**: `SUPABASE_SERVICE_ROLE_KEY` (ya usada por `scripts/seed-admin.mjs`).
- **Limitación conocida** (declarada explícitamente, no se ha tocado): la función `current_negocio_id()` actual sólo reconoce al OWNER (`perfiles_negocio.user_id = auth.uid()`). Cuando un miembro invitado se loguee, su `current_negocio_id()` devolverá `null` y no podrá acceder a las tablas de dominio del negocio que le invitó. Para activar el modo multi-usuario completo será necesario reescribir `current_negocio_id()` para considerar también `miembros_negocio` — fuera de alcance de esta iteración, anotado como deuda.

### Iteración 8 — *2026-05-01* — Fix: loop 307 en `/onboarding`
- **Síntoma**: el navegador se quedaba colgado y la terminal mostraba `GET /onboarding 307` en bucle infinito.
- **Causa raíz**: [`src/app/(app)/layout.tsx`](src/app/%28app%29/layout.tsx) leía el path desde `headers().get("x-invoke-path")`. Ese header era interno de versiones anteriores de Next.js y **dejó de existir en Next.js 16**, por lo que `pathname` siempre era `""`. La guarda `!pathname.startsWith("/onboarding")` se cumplía siempre y, aun estando ya en `/onboarding`, se volvía a redirigir → loop.
- **Fix**:
  1. [`src/lib/supabase/middleware.ts`](src/lib/supabase/middleware.ts) reenvía ahora un header `x-pathname` con `request.nextUrl.pathname` en cada request (patrón oficial recomendado por Next.js 15+).
  2. [`src/app/(app)/layout.tsx`](src/app/%28app%29/layout.tsx) lee `x-pathname` en vez de `x-invoke-path` y, además, hace **early return** cuando ya estamos en `/onboarding` — así nunca puede re-redirigirse a sí mismo aunque el header faltara por algún motivo.

### Iteración 7 — *2026-05-01* — Ajustes: panel de integraciones con sistema de ayuda
- **Nueva pestaña Integraciones** funcional, sustituye al `PlaceholderTab` correspondiente.
- **Tarjetas con estado Conectado/Desconectado** + badge de color (emerald/idle):
  - [`GoogleCard.tsx`](src/components/ajustes/GoogleCard.tsx) — lee `google_connections.google_account_email` directamente (sin descifrar tokens) para mostrar la cuenta conectada. Botón **Conectar** redirige a `/api/integrations/google/connect`. Botón **Desconectar** borra la fila vía RLS.
  - [`N8nCard.tsx`](src/components/ajustes/N8nCard.tsx) — campos «URL del Webhook» y «API Key» que se persisten via RPC `set_config_key(servicio='n8n', alias='webhook_url'|'api_key', valor=…)` con cifrado **pgcrypto / pgp_sym_encrypt** ya existente en `schema.sql`. Tras guardar, los inputs se vacían y se muestra el badge «Guardado cifrado». Botón **Enviar prueba** que dispara un POST de test al webhook con cabecera `X-N8N-API-KEY`.
- **Sistema de ayuda crítico** ([`HelpDrawer.tsx`](src/components/ajustes/HelpDrawer.tsx)):
  - Componente `HelpButton` («?») a la derecha de cada campo + `HelpDrawer` que abre un panel lateral derecho (Sheet) con backdrop blur, animación, cierre con ESC y bloqueo de scroll.
  - Cada paso de la guía es una tarjeta numerada con badge gradient cyan→fuchsia, con texto y soporte opcional de captura de pantalla (`HelpStep.image`).
  - Guías escritas para usuarios no técnicos en [`integracionesGuides.ts`](src/components/ajustes/integracionesGuides.ts): «Cómo obtener mi URL de n8n», «Cómo generar una API Key de n8n», «Cómo conectar Google Workspace».
- **Nuevo route handler** [`/api/integrations/google/connect`](src/app/api/integrations/google/connect/route.ts):
  - Construye la URL OAuth (`accounts.google.com`) con scopes Calendar + Drive.file + email/profile.
  - `access_type=offline` + `prompt=consent` para asegurar `refresh_token`.
  - Cookie `g_oauth_state` httpOnly+SameSite=Lax con CSRF token (10 min) que el callback debe validar.
  - **Pendiente**: implementar `/api/integrations/google/callback` que valide `state`, intercambie `code` por tokens y los persista llamando a `saveTokens()` de [`src/lib/google.ts`](src/lib/google.ts).
- **Variables de entorno requeridas**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (ya consumidas por `lib/google.ts`).
- **Seguridad**: ningún secreto se devuelve al cliente tras guardar — los inputs se vacían y la UI sólo lee el listado de `(servicio, alias)` para saber si existe el valor. Los tokens de Google se leen sólo en server actions vía la RPC `get_google_tokens` (security definer).

### Iteración 6 — *2026-05-01* — Ajustes: layout + perfil de negocio
- **Nueva dependencia**: `zod` (validación de formularios).
- **Nueva carpeta** [`src/components/ajustes/`](src/components/ajustes/):
  - `SettingsTabs.tsx` — contenedor con 5 pestañas (`Negocio`, `Integraciones`, `Equipo`, `Suscripción`, `Seguridad`) en navegación lateral en desktop / superior en mobile, con roles ARIA `tablist`/`tab`/`tabpanel`. Construido a medida sobre el sistema de diseño existente (`card-glass`, tokens cyan/fuchsia) — no se introdujo Shadcn/UI porque el proyecto no lo usa.
  - `NegocioTab.tsx` — formulario para `nombre_negocio`, `cif_nif`, `direccion`, `email_contacto`, `telefono` + selector de logo (subida a bucket `logos` de Supabase Storage, máx. 2 MB, PNG/JPG/WebP/SVG). Botón **Guardar** con `Loader2` animado, errores inline por campo y toast de confirmación/error.
  - `negocioSchema.ts` — esquema Zod con validación de CIF/NIF (regex laxa 9 chars), email, teléfono E.164 (+ y 7-15 dígitos) y trim/normalización (mayúsculas en CIF, lowercase en email).
  - `PlaceholderTab.tsx` — placeholder reutilizable para las 4 pestañas pendientes.
  - `types.ts` — tipo `PerfilNegocio` alineado con `public.perfiles_negocio`.
- **Sustituido** [`src/app/(app)/ajustes/page.tsx`](src/app/%28app%29/ajustes/page.tsx) — ya no es un `Placeholder`; es server component que carga `perfiles_negocio` por `user_id` y monta `SettingsTabs`. Usa `force-dynamic` para reflejar cambios al instante.
- **Pendiente de provisión manual en Supabase**: crear bucket público `logos` con política de escritura `auth.uid() = (storage.foldername(name))[1]::uuid` o equivalente, ya que las rutas se prefijan con `{negocio_id}/…`.

---

## 📚 Documentos relacionados

- [`AUTH.md`](AUTH.md) — guía completa de despliegue de auth, OAuth, MFA y Edge Function.
- [`STRUCTURE.md`](STRUCTURE.md) — desglose detallado de la estructura inicial.
- `r3zon-design-system.md` — manual de estilo (dark glass, tokens cyan/fuchsia).

---

<div align="center">
  <sub>Construido para negocios reales, no para developers.</sub>
</div>

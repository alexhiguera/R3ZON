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

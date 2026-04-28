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
| Clientes (CRM) | 🟡 Placeholder | Tabla creada, falta UI |
| Citas / Agenda | 🟡 Placeholder | Tabla creada, falta calendario |
| Tareas Kanban | 🟡 Placeholder | Tabla creada, falta tablero |
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

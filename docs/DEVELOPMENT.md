# 💻 Guía de desarrollo

Cómo levantar **R3ZON ANTARES** en local desde cero, integrar webhooks externos y compilar para móvil.

---

## ⚡ Quick start (recomendado)

El script `scripts/dev-setup.sh` automatiza todo: comprueba dependencias, arranca Supabase en Docker, aplica migraciones, crea el admin y sincroniza claves.

```bash
git clone git@github.com:alexhiguera/R3ZON.git
cd r3zon-crm

# 1. Copia variables de entorno (rellena lo crítico — ver más abajo)
cp .env.local.example .env.local

# 2. Bootstrap completo (idempotente — puedes ejecutarlo cuantas veces quieras)
npm run dev:setup

# 3. Arranca Next.js
npm run dev
```

**Credenciales del admin de dev:** `admin@r3zon.dev` / `R3z0n!Admin-Dev-2026`

---

## 🛡 Garantías del script `dev-setup.sh`

- ❌ **Nunca toca producción**. Si detecta que `.env.local` apunta a un host remoto, lo respalda en `.env.production.local.backup` y aborta.
- ✅ **Idempotente**. Ejecútalo de nuevo tras tirar la BD; arregla lo que falte.
- 🔄 **Modo reset** con `./scripts/dev-setup.sh --reset` — wipe + reaplica migraciones desde cero.
- 🔑 **Sincroniza claves** del CLI (`sb_publishable_*` / `sb_secret_*`) sobre `.env.local` automáticamente.

> ⚠️ Si tienes un `next dev` corriendo, **reinícialo** tras el setup: Next.js cachea las `NEXT_PUBLIC_*` al arrancar.

---

## 📦 Pre-requisitos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| **Node.js** | 20 LTS | Probado con 22 |
| **npm** | 10 | Viene con Node 20 |
| **Docker** | 24 | O `colima` en macOS (`brew install colima`) |
| **Supabase CLI** | ≥ 2.50 | Se invoca vía `npx supabase@latest`, no requiere instalación global |
| **Stripe CLI** | última | Solo si trabajas con suscripciones, `brew install stripe/stripe-cli/stripe` |
| **Cloudflared** | última | Solo si trabajas con webhooks de Google, `brew install cloudflared` |

---

## 🗄 Base de datos

### Opción A — Stack local en Docker (recomendado para desarrollo)

`npm run dev:setup` ya lo gestiona. Para operaciones puntuales:

```bash
npm run db:start    # Levanta Postgres + Auth + Storage + Realtime
npm run db:stop     # Para los contenedores
npm run db:reset    # Wipe + reaplica migraciones de supabase/migrations/
npm run db:status   # Muestra URL/keys del stack local
npm run db:studio   # Abre Supabase Studio en http://127.0.0.1:54323
```

URLs por defecto del stack local:

- **API**: `http://127.0.0.1:54321`
- **DB**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Inbucket** (emails de prueba): `http://127.0.0.1:54324`

### Opción B — Supabase Cloud (producción / staging)

Abre el SQL Editor del proyecto y pega [`supabase/setup.sql`](../supabase/setup.sql) — hace wipe + reload completo en el orden correcto. Para entornos productivos consulta [`DEPLOYMENT.md`](DEPLOYMENT.md).

### Opción C — Aplicar SQL incremental

Si quieres añadir solo una extensión nueva sin tocar el resto:

```bash
node scripts/apply-pending-migrations.mjs
```

Este script revisa qué archivos `.sql` están en `supabase/` y aplica solo los que faltan.

---

## 🔑 Variables de entorno críticas

Mínimas para que la app arranque (consulta [`.env.local.example`](../.env.local.example) para la lista completa):

```bash
# Supabase (las inyecta dev-setup.sh)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Login rápido en dev (visible solo si NODE_ENV=development)
NEXT_PUBLIC_DEV_EMAIL=admin@r3zon.dev
NEXT_PUBLIC_DEV_PASSWORD=R3z0n!Admin-Dev-2026
```

Variables opcionales según el módulo en el que trabajes:

| Variable | Necesaria para |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Integración con Google Calendar |
| `GOOGLE_WEBHOOK_URL` | Push notifications de Google (requiere HTTPS) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Suscripciones y métodos de pago |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_BUSINESS` | IDs de precios en el dashboard de Stripe |
| `RESEND_API_KEY` (Supabase secrets) | Email "nuevo dispositivo" |
| `CRON_SECRET` | Autoriza el cron de renovación de watch channels |

> 🔐 **`app.config_master_key`** (pgcrypto) **no va en `.env`** — vive como GUC de Postgres en *Project Settings → Database → Custom Postgres Config*. Genera con `openssl rand -base64 48`.

---

## 🪝 Webhooks externos en desarrollo

### Stripe

Stripe envía webhooks por POST. En local, el CLI hace el reenvío:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
# Copia el signing secret que muestra → STRIPE_WEBHOOK_SECRET en .env.local
```

Para forzar eventos:

```bash
stripe trigger checkout.session.completed
stripe trigger invoice.paid
```

### Google Calendar (push notifications)

Google exige **HTTPS público** para `events.watch`. Solución: túnel a localhost.

```bash
cloudflared tunnel --url http://localhost:3000
# Copia la URL https://*.trycloudflare.com generada
```

Luego:

1. En `.env.local` pon `GOOGLE_WEBHOOK_URL=https://tu-tunel.trycloudflare.com/api/integrations/google/webhook`.
2. En [Google Cloud Console](https://console.cloud.google.com) → *APIs & Services → Credentials* añade `${ORIGIN}/api/integrations/google/callback` como Authorized redirect URI.
3. Reinicia `next dev` para que recoja la nueva env var.

> 🕒 El túnel de Cloudflare cambia de URL cada vez. Actualiza `GOOGLE_WEBHOOK_URL` cuando lo reinicies.

---

## 🧪 Tests

```bash
npm test            # Watch mode
npm run test:run    # Una sola ejecución (CI)
npm run test:coverage
```

132+ tests cubren lógica pura (TS + RPCs SQL) y componentes UI con Testing Library. **Nunca golpean Supabase ni Stripe reales** — todos los mocks viven en `tests/`.

```bash
npx tsc --noEmit    # Type check sin emitir
npm run lint        # ESLint (`next lint`)
```

---

## 📱 Build para móvil (Capacitor)

```bash
NEXT_OUTPUT_MODE=export npm run build       # Genera /out estático
npx cap init r3zon com.r3zon.app --web-dir=out
npx cap add ios && npx cap add android
npx cap sync
```

`next.config.mjs` detecta `NEXT_OUTPUT_MODE=export` y configura el bundle para Capacitor. Los headers de seguridad (CSP, HSTS) no se aplican en export estático — Vercel los strippea.

Atajo: `npm run cap:sync` ejecuta `next build && npx cap sync` con la configuración correcta.

---

## 🧹 Comandos útiles

```bash
npm run seed:admin       # Crea/refresca el admin de dev (idempotente)
npm run db:reset         # Wipe + reload BD local
./scripts/dev-setup.sh --reset   # Wipe + setup completo

# Generar tipos TypeScript desde el esquema actual
npx supabase gen types typescript --local > src/lib/database.types.ts
```

---

## 🐛 Problemas conocidos

| Síntoma | Causa / fix |
|---|---|
| `Both middleware file and proxy file detected` | Next.js 16 deprecó `middleware.ts` — usar `proxy.ts`. Solo debe existir uno. |
| `Failed to fetch` al login | El stack local no está arriba — `npm run db:start`. |
| Botón "Conectar Google" no hace nada | Faltan `GOOGLE_CLIENT_ID/SECRET` o `GOOGLE_WEBHOOK_URL`. Mira `?google_error=` en la URL tras click. |
| `bucket not found` al subir logo | Falta aplicar `supabase/documentos_recibo_logos_ext.sql` (crea bucket `logos`). |
| Sidebar/menú no responde al cambio de tema | Reinicia `next dev` — `tailwind.config.ts` se compila al arrancar. |
| Pre-commit cuelga | Ningún hook configurado por defecto; revisa `.husky/` si existe. |

---

## 📚 Más

- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — despliegue a producción.
- [`docs/AUTH.md`](AUTH.md) — flujo de auth, OAuth y 2FA.
- [`docs/STRUCTURE.md`](STRUCTURE.md) — qué hay en cada carpeta.

# 🚀 Despliegue a producción

Guía paso a paso para desplegar **R3ZON ANTARES** a un entorno público (Vercel + Supabase Cloud + Stripe + Google).

---

## 🗺 Vista de 30 segundos

```
                 ┌──────────────────┐
   Usuarios ───▶ │ Vercel (Next.js) │ ───▶ Supabase Cloud (Postgres + Auth + Storage)
                 │  Fluid Compute   │ ───▶ Stripe (Checkout + Webhooks)
                 │  + Crons         │ ───▶ Google Calendar API
                 │  + Analytics     │
                 └──────────────────┘
```

- **Frontend + API + crons** → Vercel
- **BD + Auth + Storage + Edge Functions** → Supabase
- **Pagos** → Stripe
- **Calendario** → Google Cloud
- **Email transaccional** → Resend (vía Supabase Edge Function `notify-new-device`)

---

## 1️⃣ Supabase Cloud

### Crear proyecto

1. https://supabase.com/dashboard → **New project** (región más cercana a tus usuarios).
2. Apunta la **anon key** (`sb_publishable_*`), **service-role key** (`sb_secret_*`) y la **URL** del proyecto.

### Aplicar el esquema

Abre **SQL Editor** y pega [`supabase/setup.sql`](../supabase/setup.sql) — hace wipe + reload completo en el orden correcto. Para entornos nuevos esta es la vía recomendada.

> Si vas a aplicar solo extensiones nuevas sin tocar el resto (upgrade incremental), ejecuta `node scripts/apply-pending-migrations.mjs` con `NEXT_PUBLIC_SUPABASE_URL` apuntando al proyecto destino.

### Configurar la clave maestra de cifrado

Los tokens de Google se cifran con `pgp_sym_encrypt` usando una clave que vive **como GUC de Postgres**, no en `.env`:

```bash
# Genera una clave fuerte
openssl rand -base64 48
```

En **Project Settings → Database → Custom Postgres Config** añade:

```
app.config_master_key = 'la-clave-generada'
```

Reinicia el proyecto para que la GUC se cargue.

> ⚠️ **Guarda esta clave fuera de Supabase también** (1Password, Bitwarden o Vercel Secrets). Si la pierdes, los tokens de Google son irrecuperables. Si la rotas, hay que re-cifrar las filas de `google_connections`.

### Activar proveedores OAuth

**Authentication → Providers**:

- **Google**: Client ID + Secret de Google Cloud Console. Redirect URI a registrar en Google: `https://<TU-PROYECTO>.supabase.co/auth/v1/callback`.

### Activar MFA (TOTP)

**Authentication → Policies → Multi-Factor Authentication** → Activa `TOTP`.

### Email templates

**Authentication → Email Templates** → personaliza confirmación de registro, recuperación y magic link.

### Edge Function `notify-new-device`

```bash
cd r3zon-crm
supabase login
supabase link --project-ref <PROJECT_REF>

# Configura secrets (no en .env del frontend)
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set RESEND_FROM="R3ZON <noreply@tu-dominio.com>"

# Deploy
supabase functions deploy notify-new-device
```

Necesitas cuenta en [resend.com](https://resend.com) y verificar tu dominio.

---

## 2️⃣ Google Cloud (Calendar OAuth)

1. https://console.cloud.google.com → crea proyecto.
2. **APIs & Services → Library** → habilita **Google Calendar API**.
3. **OAuth consent screen** → tipo "Externo" + scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `.../auth/calendar`
   - `.../auth/drive.file`
4. **Credentials → Create credentials → OAuth client ID** → tipo "Aplicación web":
   - Authorized redirect URI: `https://tu-dominio.com/api/integrations/google/callback`
5. Apunta `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

---

## 3️⃣ Stripe

1. **Products → Add product** → "R3ZON Pro" (29 €/mes) y "R3ZON Business" (79 €/mes). Apunta los `price_*` IDs.
2. **Developers → API keys** → copia la **secret key** (`sk_live_*`).
3. **Developers → Webhooks → Add endpoint** → URL: `https://tu-dominio.com/api/billing/webhook`. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Apunta el **signing secret** (`whsec_*`).

---

## 4️⃣ Vercel

### Linkar el repo

```bash
npm i -g vercel
vercel link
```

> 💡 Si no tienes el CLI: la plataforma también detecta el repo automáticamente desde el dashboard.

### Variables de entorno

Usa `vercel env` o el dashboard. Mínimas para producción:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_WEBHOOK_URL=https://tu-dominio.com/api/integrations/google/webhook

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...

# App
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com

# Cron (autoriza /api/cron/refresh-google-channels)
CRON_SECRET=<openssl rand -base64 32>
```

**Aplica scope:** `Production` para todas + `Preview` solo si quieres previewes con Supabase staging.

> ⚠️ **No uses claves de test en producción**. Vercel encripta el valor pero el scope es por entorno; un Preview que apunte a Stripe live cobra clientes reales.

### Deploy

```bash
vercel --prod
```

O simplemente pushea a `main` — Vercel lo despliega automáticamente.

### Cron de Google Calendar

[`vercel.json`](../vercel.json) ya declara el cron diario:

```json
{
  "crons": [
    { "path": "/api/cron/refresh-google-channels", "schedule": "0 3 * * *" }
  ]
}
```

Vercel inyecta `x-vercel-cron` automáticamente. El endpoint también acepta `Authorization: Bearer ${CRON_SECRET}` para invocación manual o desde `pg_cron`.

### Headers de seguridad

[`next.config.mjs`](../next.config.mjs) define **CSP, HSTS, X-Frame-Options, Referrer-Policy y Permissions-Policy** automáticamente en todas las rutas — Vercel los sirve sin configuración adicional.

> 🛑 No se aplican en modo `output: export` (Capacitor). Si despliegas el build estático fuera de Vercel, configura los headers en tu CDN.

---

## 5️⃣ Dominio y SSL

1. **Vercel → Project Settings → Domains** → añade `tu-dominio.com`.
2. Configura los registros DNS que indique Vercel (CNAME + A) en tu proveedor.
3. El certificado SSL se aprovisiona automático (Let's Encrypt).
4. Marca `tu-dominio.com` como **Production Domain**.

---

## ✅ Verificación post-deploy

| Test | Cómo |
|---|---|
| App carga | Abre `https://tu-dominio.com` → debe mostrar la landing |
| Login funciona | Registro → email de confirmación → login OK |
| OAuth Google | Botón "Continuar con Google" → flujo completo → `/dashboard` |
| Stripe Checkout | Ajustes → Suscripción → "Suscribirme" → checkout en sandbox `4242 4242 4242 4242` |
| Webhook Stripe | Dashboard Stripe → Webhooks → último evento entregado con `200 OK` |
| Calendar OAuth | Ajustes → Integraciones → Google → conectar → ver canal `watchActive: true` |
| Cron Google | Logs de `/api/cron/refresh-google-channels` con `{ total, renewed, failed }` |
| Headers | `curl -I https://tu-dominio.com` → debe contener `content-security-policy`, `strict-transport-security` |

---

## 🔄 CI / CD

Vercel hace deploy automático en cada push a `main`. Los PRs reciben un **Preview deployment** en `https://<branch>-<hash>.vercel.app` (con sus propias env vars de preview si las configuras).

Recomendación: usar la skill `/ultrareview` o `vercel:vercel-agent` para code review automático antes del merge.

---

## 🆘 Rollback

```bash
# Listar deployments
vercel ls

# Promover uno anterior a producción
vercel promote <deployment-url>
```

O desde el dashboard de Vercel → **Deployments → tres puntos → Promote to Production**.

---

## 📚 Más

- [`docs/DEVELOPMENT.md`](DEVELOPMENT.md) — entorno local.
- [`docs/AUTH.md`](AUTH.md) — auth, OAuth providers, 2FA.
- [`docs/STACK.md`](STACK.md) — capas tecnológicas.

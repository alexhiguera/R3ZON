<div align="center">

# 🌌 R3ZON ANTARES

**Sistema de gestión empresarial para autónomos y pymes.**

*Procesamiento client-side · Multi-tenant + RLS*

[📚 Documentación](docs/README.md) · [🚀 Despliegue](docs/DEPLOYMENT.md) · [💻 Desarrollo](docs/DEVELOPMENT.md) · [📒 Bitácora](docs/CHANGELOG.md)

</div>

---

## ✨ Qué es

**R3ZON ANTARES** es un *Business OS* pensado para trabajadores **no técnicos**. CRM B2B y B2C+ agenda + tareas + finanzas + OCR + facturación + TPV + fichajes + RGPD en una sola app, con experiencia móvil: todo lo pesado (OCR, PDFs, ZIPs, cifrado) corre en el navegador del usuario.

- 🏢 **Multi-tenant**: cada negocio aislado con Row Level Security de Postgres.
- 🌙 **Dark glass** por defecto, modo claro opcional, theme engine per-user.
- ♿ **WCAG AA**: focus visible, reduce-motion, alto contraste, atajos de teclado.
- 📱 **Capacitor-ready**: el mismo bundle compila a iOS y Android.
- 🔐 **Seguridad seria**: 2FA TOTP, fingerprint de dispositivos, headers CSP/HSTS, tokens cifrados con pgcrypto.

## 🛠 Stack

[Next.js 16](https://nextjs.org) · [TypeScript](https://www.typescriptlang.org) · [Tailwind CSS](https://tailwindcss.com) · [Supabase](https://supabase.com) (Postgres + Auth + Storage + Edge Functions) · [Stripe](https://stripe.com) · [Google Calendar API](https://developers.google.com/calendar) · [Tesseract.js](https://tesseract.projectnaptha.com) · [FullCalendar](https://fullcalendar.io) · [Recharts](https://recharts.org) · [Vitest](https://vitest.dev) · [Vercel](https://vercel.com)

Detalle completo en [`docs/STACK.md`](docs/STACK.md).

---

## 🚀 Quick start (desarrollo)

Necesitas **Node 20+**, **npm** y **Docker** (o `colima`). El script `dev-setup.sh` se encarga del resto:

```bash
git clone git@github.com:alexhiguera/R3ZON.git
cd r3zon-crm

cp .env.local.example .env.local      # rellena las variables críticas

npm run dev:setup                     # 🪄 bootstrap: Supabase + migraciones + admin
npm run dev                           # http://localhost:3000
```

**Credenciales del admin de dev:** `admin@r3zon.dev` / `R3z0n!Admin-Dev-2026`

### 🛡 Garantías del script

- ❌ **No toca producción.** Si `.env.local` apunta a un host remoto lo respalda en `.env.production.local.backup` y aborta.
- ✅ **Idempotente.** Puedes ejecutarlo cuantas veces quieras.
- 🔄 **Reset completo:** `./scripts/dev-setup.sh --reset` → wipe + reaplica migraciones.

### ⚠️ Lo que debes saber

- Si tienes un `next dev` corriendo, **reinícialo** tras el setup: Next.js cachea las `NEXT_PUBLIC_*` al arrancar.
- La clave maestra de cifrado (`app.config_master_key`) **no va en `.env`** — vive como GUC de Postgres. El stack local genera una automáticamente; en producción la creas tú con `openssl rand -base64 48`.
- Para integraciones externas (Google Calendar, Stripe, Resend) necesitas variables adicionales. Ver [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) para webhooks y túneles en local.

📖 **Guía detallada:** [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) (Capacitor, troubleshooting, scripts).

---

## 🌐 Producción

El despliegue es **Vercel + Supabase Cloud + Stripe + Google Cloud**:

1. Crear proyecto Supabase y aplicar [`supabase/setup.sql`](supabase/setup.sql) en el SQL Editor.
2. Configurar `app.config_master_key` como GUC en Supabase (clave maestra pgcrypto).
3. Activar OAuth Google + MFA TOTP en Authentication.
4. Desplegar la Edge Function `notify-new-device` con tu API key de Resend.
5. Crear productos + webhook en Stripe; apuntar `STRIPE_PRICE_PRO` y `STRIPE_PRICE_BUSINESS`.
6. Configurar OAuth Calendar en Google Cloud Console.
7. Linkar el repo a Vercel, definir variables de entorno (`vercel env`) y `vercel --prod`.

El cron diario de renovación de Google watch channels está declarado en [`vercel.json`](vercel.json) y los headers de seguridad (CSP, HSTS, Permissions-Policy) en [`next.config.mjs`](next.config.mjs).

📖 **Guía paso a paso:** [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 📦 Estado actual

Producto en **v1.1**. Núcleo completo (CRM · agenda · tareas · finanzas · documentos · TPV · fichajes · RGPD · 2FA · roles · accesibilidad · sitio público).

Tabla completa de módulos: [`docs/MODULES.md`](docs/MODULES.md).

---

## 📚 Documentación

| Doc | Para qué |
|---|---|
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Levantar el proyecto en local, webhooks, Capacitor |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Desplegar a producción (Vercel + Supabase + Stripe + Google) |
| [`docs/STACK.md`](docs/STACK.md) | Capas tecnológicas y dependencias |
| [`docs/STRUCTURE.md`](docs/STRUCTURE.md) | Árbol del repo y patrones arquitectónicos |
| [`docs/MODULES.md`](docs/MODULES.md) | Estado de cada módulo del producto |
| [`docs/AUTH.md`](docs/AUTH.md) | Auth, OAuth, 2FA, dispositivos |
| [`docs/ROLES.md`](docs/ROLES.md) | Sistema de roles y permisos granulares |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Bitácora completa de iteraciones |

La documentación se publica también en la **[Wiki de GitHub](https://github.com/alexhiguera/R3ZON/wiki)** — sincronízala con `./scripts/sync-wiki.sh` después de mergear a `main`.

---

<div align="center">
  <sub>Construido para negocios reales, no para developers.</sub><br/>
  <sub>© R3ZON · Producto: R3ZON ANTARES</sub>
</div>

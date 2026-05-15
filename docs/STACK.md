# 🛠️ Stack tecnológico

R3ZON ANTARES está diseñado con una premisa clara: **coste de servidor 0 €**. Toda la lógica pesada (OCR, PDF, cifrado, parsing) corre en el navegador del usuario; el backend es Supabase con Row Level Security multi-tenant y la app se despliega como aplicación serverless en Vercel.

---

## 🎯 Capas principales

| Capa | Tecnología | Por qué |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) | RSC + Turbopack + edge runtime + `output: export` para Capacitor |
| **Lenguaje** | TypeScript 5.6 | Tipos estrictos + tipos generados de Supabase |
| **UI / Estilos** | [Tailwind CSS](https://tailwindcss.com) 3.4 + tokens R3ZON | Tema dark glass con `cyan/fuchsia/indigo`, modo claro opcional |
| **Iconos** | [`lucide-react`](https://lucide.dev) | Set coherente, tree-shakeable |
| **Datos / Auth** | [Supabase](https://supabase.com) (Postgres + Auth + Storage + Edge Functions) | Postgres con RLS, JWT, OAuth providers, buckets, funciones Deno |
| **Gráficas** | [Recharts](https://recharts.org) | Lazy load en `/dashboard` y `/finanzas`, tokens del tema vía `useThemeColors()` |
| **OCR** | [Tesseract.js](https://github.com/naptha/tesseract.js) (WebAssembly) | Procesa tickets en cliente, sin coste de servidor |
| **Email transaccional** | [Resend](https://resend.com) (vía Edge Function) | Notificación de nuevo dispositivo |
| **Pagos** | [Stripe](https://stripe.com) (Checkout + Customer Portal + webhooks) | Suscripciones Pro / Business |
| **Calendario** | [FullCalendar v6](https://fullcalendar.io) + Google Calendar API | Sincronización bidireccional con push notifications |
| **Drag & Drop** | [`@dnd-kit`](https://dndkit.com) | Kanban + reordenación accesible |
| **Organigrama** | [`@xyflow/react`](https://reactflow.dev) | Jerarquía de contactos `reports_to` |
| **PDF / ZIP** | `jspdf` + `html2canvas` + `fflate` | Generación cliente-side, lazy-loaded |
| **Validación** | [Zod](https://zod.dev) | Schemas API + formularios |
| **Tests** | [Vitest 4](https://vitest.dev) + Testing Library | 132+ tests · jsdom para componentes |
| **Móvil** | [Capacitor](https://capacitorjs.com) (`output: export`) | iOS + Android desde el mismo bundle |
| **Hosting** | [Vercel](https://vercel.com) | Fluid Compute, crons, analytics, edge logs |

---

## 📦 Dependencias notables

Las dependencias clave (versión mínima): consulta [`package.json`](../package.json) para la lista exacta.

```jsonc
{
  "next": "^16.2.4",
  "react": "^18.3.1",
  "@supabase/ssr": "^0.5.2",
  "@supabase/supabase-js": "^2.45.4",
  "tailwindcss": "^3.4.13",
  "tesseract.js": "^5.1.1",
  "recharts": "^2.13.0",
  "stripe": "^22.1.0",
  "@fullcalendar/core": "^6.1.20",
  "@dnd-kit/core": "^6.3.1",
  "@xyflow/react": "^12.10.2",
  "jspdf": "^4.2.1",
  "html2canvas": "^1.4.1",
  "fflate": "^0.8.2",
  "zod": "^4.4.1",
  "lucide-react": "^0.453.0",
  "@vercel/analytics": "^2.0.1"
}
```

### Lazy-loaded en runtime

Para no inflar el bundle inicial, estas librerías se cargan dinámicamente solo cuando se usan:

| Librería | Punto de carga |
|---|---|
| `tesseract.js` | `src/lib/ocr/engine.ts` — al abrir `/ocr` |
| `@fullcalendar/*` | `src/components/agenda/CalendarViewLazy.tsx` — al abrir `/citas` |
| `recharts` (en `/dashboard`) | `dynamic(...,{ ssr:false })` — fuera del initial JS |
| `jspdf` + `html2canvas` | `src/app/(app)/documentos/[id]/page.tsx` — al descargar PDF |
| `fflate` | `src/lib/rgpd/exportar-datos.ts` — al exportar ZIP RGPD |

---

## 🌐 Integraciones externas

| Servicio | Uso | Configuración |
|---|---|---|
| **Supabase** | Postgres + Auth + Storage + Edge Functions | `NEXT_PUBLIC_SUPABASE_URL`, claves anon y service-role |
| **Google Cloud** | OAuth 2.0 + Calendar API + Drive.file | `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_WEBHOOK_URL` |
| **Stripe** | Suscripciones + Customer Portal | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` |
| **Resend** | Email transaccional (nuevo dispositivo) | `RESEND_API_KEY` (en Supabase secrets, no en frontend) |
| **Vercel** | Hosting + Analytics + Cron | Variables vía `vercel env` |
| **Cloudflare Tunnel** | HTTPS local para Google webhooks en dev | `cloudflared tunnel --url http://localhost:3000` |

---

## 🎨 Design system

**R3ZON Design System** vive en:

- [`tailwind.config.ts`](../tailwind.config.ts) — tokens (`bg`, `indigo-*`, `cyan`, `fuchsia`, `text-hi/mid/lo`) como tripletes RGB con alpha-aware (`rgb(var(--TOKEN) / α)`).
- [`src/app/globals.css`](../src/app/globals.css) — `:root` con tripletes default, glass utilities (`card-glass`, `rainbow-bar`, `accent-bar`), focus visible cyan, soporte `prefers-reduced-motion`.
- [`src/lib/theme/`](../src/lib/theme/) — motor de personalización por usuario (paletas, fuentes, escalas, radios) persistido en `user_preferences.theme`.

Filosofía visual: dark por defecto, glass (`backdrop-blur`), gradientes cyan→fuchsia para CTAs, tipografía Syne + DM Sans (overridable por usuario).

---

## 🔐 Seguridad — capas activas

| Capa | Mecanismo |
|---|---|
| **Tenancy** | RLS en 27 tablas + trigger `fill_negocio_id` como red de seguridad |
| **Tokens externos** | Cifrado pgcrypto con clave maestra GUC `app.config_master_key` |
| **Webhooks** | Verificación de firma (Stripe), `timingSafeEqual` (Google channel_token) |
| **Headers HTTP** | CSP, HSTS, X-Frame-Options, Permissions-Policy en `next.config.mjs` |
| **Roles** | `admin_global` + `rol_miembro` (admin/editor/lector) + permisos jsonb granulares |
| **Auth** | Email + OAuth Google + 2FA TOTP + AAL2 gating + fingerprint dispositivos |

Detalles en [`docs/AUTH.md`](AUTH.md) y [`docs/ROLES.md`](ROLES.md).

---

## 📚 Más

- [`docs/STRUCTURE.md`](STRUCTURE.md) — árbol completo del proyecto y módulos.
- [`docs/MODULES.md`](MODULES.md) — estado actual de cada módulo de negocio.
- [`docs/CHANGELOG.md`](CHANGELOG.md) — historial completo de iteraciones.

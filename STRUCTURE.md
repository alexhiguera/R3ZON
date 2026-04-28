# R3ZON Business OS — Estructura

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Capacitor-ready**.
Filosofía: **0€ servidor** — todo el procesamiento pesado (OCR, parsing) corre en cliente.

```
r3zon-crm/
├── package.json
├── next.config.mjs            # 'output: export' opcional para SPA → Capacitor
├── tailwind.config.ts         # Tokens R3ZON (cyan/fuchsia/indigo, glass)
├── postcss.config.js
├── tsconfig.json
├── .env.local.example
│
├── supabase/
│   └── schema.sql             # Multi-tenant + RLS + pgcrypto
│
└── src/
    ├── app/
    │   ├── layout.tsx         # <html>, fuentes Syne + DM Sans
    │   ├── globals.css        # Tokens, glass, rainbow-bar
    │   ├── page.tsx           # → /dashboard
    │   └── (app)/             # Grupo con AppShell (sidebar)
    │       ├── layout.tsx
    │       ├── dashboard/
    │       ├── clientes/
    │       ├── citas/
    │       ├── tareas/
    │       ├── finanzas/
    │       ├── ocr/           # OCR client-side (Tesseract.js)
    │       ├── rgpd/
    │       └── ajustes/
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx   # Grid desktop + drawer mobile
    │   │   └── Sidebar.tsx    # Botones grandes (56px) táctiles
    │   └── ui/
    │       ├── PageHeader.tsx # Glass card con rainbow-bar
    │       └── Placeholder.tsx
    │
    └── lib/
        ├── utils.ts           # cn()
        └── supabase/
            ├── client.ts      # Browser client (RLS auto)
            └── server.ts      # SSR client (cookies)
```

## Setup

1. `npm install`
2. Crea proyecto en Supabase y ejecuta `supabase/schema.sql` en el SQL editor.
3. En **Project Settings → Database → Custom config**, define la GUC:
   ```
   app.config_master_key = '<UNA_CLAVE_LARGA_ALEATORIA>'
   ```
   (la usa pgcrypto para cifrar/descifrar `config_keys`).
4. `cp .env.local.example .env.local` y rellena URL + ANON_KEY.
5. `npm run dev`.

## Para móvil con Capacitor

```bash
NEXT_OUTPUT_MODE=export npm run build      # genera /out
npx cap init r3zon com.r3zon.app --web-dir=out
npx cap add ios && npx cap add android
npx cap sync
```

## Multi-tenancy en una frase

Cada `auth.users` recibe automáticamente un `perfiles_negocio` (trigger
`on_auth_user_created`). Todas las tablas filtran por `negocio_id = current_negocio_id()`
vía RLS, así que **el frontend nunca tiene que filtrar manualmente** — usa el
cliente Supabase y RLS hace el resto.

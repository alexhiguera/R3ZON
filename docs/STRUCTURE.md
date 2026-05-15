# 📁 Estructura del proyecto

Mapa del repositorio **R3ZON ANTARES** — qué vive dónde y por qué.

```
r3zon-crm/
├── docs/                                   # 📚 Documentación (este directorio)
├── scripts/                                # 🛠 Utilidades de desarrollo
│   ├── dev-setup.sh                        # Bootstrap entorno local (Docker + Supabase + admin)
│   ├── seed-admin.mjs                      # Crea admin@r3zon.dev (idempotente)
│   ├── sync-wiki.sh                        # Sincroniza docs/ con la wiki de GitHub
│   ├── apply-migrations.mjs                # Aplica esquema base a una BD nueva
│   ├── apply-pending-migrations.mjs        # Aplica solo las migraciones pendientes
│   └── check-and-seed.mjs                  # Verifica conexión + carga seeds
│
├── supabase/                               # 🗄 Esquema y extensiones SQL
│   ├── config.toml                         # Stack local (puertos 54321/54322/54324)
│   ├── migrations/                         # Migraciones aplicables con `supabase migration up`
│   ├── functions/                          # Edge Functions Deno
│   │   └── notify-new-device/              # Email Resend al detectar fingerprint nuevo
│   ├── schema.sql                          # Tablas base + RLS multi-tenant + pgcrypto
│   ├── auth_extension.sql                  # Onboarding RGPD, devices, RPCs 2FA
│   ├── crm_kanban_ext.sql                  # Comunicaciones, kanban_columnas, RPCs batch
│   ├── agenda_ext.sql                      # agenda_eventos, google_connections, watch channels
│   ├── billing_ext.sql                     # stripe_customer_id, pagos_stripe
│   ├── team_ext.sql                        # miembros_negocio, v_equipo_negocio, RPCs invite/revoke
│   ├── roles_ext.sql                       # admin_global, permisos_baseline, tiene_permiso
│   ├── documentos_ext.sql                  # documentos comerciales + numeración correlativa AEAT
│   ├── documentos_recibo_logos_ext.sql     # Bucket logos + tipo "recibo"
│   ├── inventario_ext.sql                  # productos, stock_movimientos, TPV
│   ├── inventario_imagenes_ext.sql         # Bucket producto-imagenes
│   ├── metodos_pago_ext.sql                # Métodos de pago guardados
│   ├── fichajes_ext.sql                    # Registro jornada (RD-ley 8/2019) con GPS obligatorio
│   ├── proveedores_ext.sql                 # proveedores + gastos_proveedor
│   ├── listado_ext.sql                     # stock_mode_enabled (toggle catálogo/stock)
│   ├── perfil_usuario_ext.sql              # Bucket avatars + preferencias usuario
│   ├── theme_ext.sql                       # user_preferences.theme (personalización)
│   ├── rgpd_ext.sql                        # Consentimientos titular + v_consentimientos_negocio
│   ├── fix_tenant_defaults.sql             # Trigger fill_negocio_id (red de seguridad RLS)
│   ├── security_hardening.sql              # RLS tablas archivo + security_invoker views
│   ├── security_storage_hardening.sql      # RLS por tenant en buckets logos/producto/avatars
│   ├── security_timing_hardening.sql       # Comparación timing-safe en find_connection_by_channel
│   ├── retention_ext.sql                   # Archivado de tablas históricas (opcional, manual)
│   ├── seed_clientes.sql                   # 10 empresas reales de ejemplo
│   ├── seed.sql                            # Seed combinado para entorno local
│   └── setup.sql                           # Wipe + reload completo (entornos dev/producción inicial)
│
├── tests/                                  # 🧪 Vitest (132+ tests)
│   ├── documentos.test.ts                  # Totales, validación, referencia AEAT
│   ├── inventario.test.ts                  # estadoStock, calcularTotalVenta, IVA mixto
│   ├── fichajes.test.ts                    # State machine + duración jornada nocturna
│   ├── finanzas.test.ts                    # Totales, agregados mensuales
│   ├── parser.test.ts                      # OCR español (fechas, CIF, IVA)
│   ├── stripe.test.ts                      # Webhook con firma real
│   ├── google-admin.test.ts                # Refresh proactivo + retry 401
│   ├── google-oauth-callback.test.ts       # CSRF, no_refresh_token, persistencia
│   ├── supabase-rpc.test.ts                # Wrappers RPC google_tokens
│   └── components/                         # Testing Library
│       ├── Field.test.tsx
│       ├── Modal.test.tsx
│       ├── Input.test.tsx
│       └── ErrorBoundary.test.tsx
│
├── public/                                 # 🌐 Assets estáticos (favicon, manifest, logos)
│
└── src/
    ├── middleware.ts / proxy.ts            # Refresca sesión + gate 2FA + header x-pathname
    ├── app/
    │   ├── layout.tsx                      # <html>, fuentes Syne+DM Sans, A11Y boot script
    │   ├── globals.css                     # Tokens RGB, glass utilities, focus visible
    │   ├── icon.svg / apple-icon.svg       # Favicons vectoriales
    │   ├── robots.ts / sitemap.ts          # SEO dinámicos desde NEXT_PUBLIC_SITE_URL
    │   ├── error.tsx / global-error.tsx    # Boundaries glass
    │   ├── not-found.tsx                   # 404 glass con eyebrow "Error 404"
    │   │
    │   ├── (marketing)/                    # 🌍 Sitio público (sin AppShell)
    │   │   ├── layout.tsx                  # MarketingNavbar + Footer
    │   │   ├── page.tsx                    # Landing (hero + 7 módulos + CTA)
    │   │   ├── servicios/page.tsx
    │   │   ├── precios/page.tsx
    │   │   └── descargas/page.tsx
    │   │
    │   ├── (auth)/                         # 🔐 Rutas no autenticadas
    │   │   ├── login/
    │   │   ├── registro/
    │   │   └── 2fa/                        # Verificación TOTP (segundo factor)
    │   │
    │   ├── (app)/                          # 🛡 Rutas protegidas con AppShell
    │   │   ├── layout.tsx                  # Guard onboarding + ThemeProvider + ErrorBoundary
    │   │   ├── dashboard/                  # KPIs + Recharts (lazy)
    │   │   ├── clientes/                   # CRM B2B: lista/tarjetas, ficha (5 tabs)
    │   │   ├── citas/                      # FullCalendar (mes/semana/día/año) + lista
    │   │   ├── tareas/                     # Kanban dnd-kit con columnas reordenables
    │   │   ├── finanzas/                   # Dashboard Recharts + nuevo movimiento
    │   │   ├── documentos/                 # Facturas/tickets/presupuestos + plantilla A4
    │   │   ├── listado/                    # Productos + stock unificado (toggle por negocio)
    │   │   ├── tpv/                        # Punto de venta (restaurante / tienda)
    │   │   ├── fichajes/                   # Entrada/descanso/salida con GPS obligatorio
    │   │   ├── proveedores/                # Directorio + suscripciones recurrentes
    │   │   ├── ocr/                        # Tesseract.js (lazy) → finanzas
    │   │   ├── perfil/                     # Avatar + datos + permisos + próximas citas
    │   │   ├── onboarding/                 # Aceptación RGPD inicial
    │   │   ├── 2fa/configurar/             # Enrolment TOTP
    │   │   └── ajustes/                    # 11 pestañas (Negocio, Apariencia, A11y, …)
    │   │
    │   ├── actions/
    │   │   └── google.ts                   # getGoogleConnectionStatus (sin exponer tokens)
    │   │
    │   ├── api/
    │   │   ├── integrations/google/
    │   │   │   ├── connect/route.ts        # Inicia OAuth Calendar (cookie state CSRF)
    │   │   │   ├── callback/route.ts       # Intercambia code, persiste tokens cifrados
    │   │   │   └── webhook/route.ts        # Push Google Calendar (timing-safe channel_token)
    │   │   ├── billing/
    │   │   │   ├── checkout/route.ts       # Stripe Checkout Session
    │   │   │   ├── portal/route.ts         # Customer Portal
    │   │   │   ├── setup-checkout/route.ts # Alta de tarjeta sin cobrar
    │   │   │   ├── payment-methods/route.ts# Listar métodos guardados
    │   │   │   └── webhook/route.ts        # Stripe webhook (firma validada)
    │   │   ├── team/
    │   │   │   ├── invite/route.ts         # auth.admin.inviteUserByEmail
    │   │   │   └── revoke/route.ts         # Revoca miembro (audit trail)
    │   │   └── cron/
    │   │       └── refresh-google-channels/route.ts  # Renueva watch channels (<24h)
    │   │
    │   ├── auth/callback/route.ts          # OAuth code exchange (Supabase login)
    │   └── legal/                          # Privacidad, cookies, términos, aviso (4 páginas SEO)
    │
    ├── components/
    │   ├── auth/                           # OAuthButtons · DeviceTracker · DevLoginButton
    │   ├── layout/                         # AppShell · Sidebar · UserMenu · CommandPalette (⌘K)
    │   ├── marketing/                      # MarketingNavbar · MarketingFooter
    │   ├── agenda/                         # CalendarView · CalendarViewLazy · CitasLista · EventModal
    │   ├── ajustes/                        # 11 tabs + InvitarMiembroModal + HelpDrawer + ConfirmDialog
    │   ├── clientes/                       # InfoTab · ContactosTab · HierarchyChart
    │   ├── crm/                            # TabHistorial · TabDocumentos · TabMovimientos · TabComunicaciones
    │   ├── dashboard/                      # KpiCard · FinanceSummary · UpcomingAppointments · …
    │   ├── documentos/                     # PlantillaA4 + PlantillaTicket (impresión)
    │   ├── fichajes/                       # PanelAdmin (horas objetivo por miembro)
    │   ├── finanzas/Charts.tsx             # Recharts con tokens del tema (useThemeColors)
    │   ├── kanban/                         # TaskCard · TaskModal · InlineTaskAdder · ColumnManager
    │   ├── perfil/MisCitas.tsx             # Próximas citas del usuario
    │   ├── productos/BarcodeScanModal.tsx  # Escáner códigos de barras (HID)
    │   ├── legal/LegalDoc.tsx
    │   └── ui/                             # Field · Input · Modal · Toast · ConfirmDialog · ErrorBoundary
    │
    └── lib/
        ├── supabase/{client,server,middleware,admin}.ts  # Clientes SSR/CSR/admin
        ├── google.ts / google-admin.ts     # OAuth + refresh proactivo (con/sin service-role)
        ├── google-errors.ts                # formatGoogleError(code) → mensaje legible
        ├── agenda.ts / agenda-admin.ts     # Server Actions + sync + watch channels
        ├── stripe.ts                       # getStripe · PLANS · planFromPriceId
        ├── stripe-errors.ts                # Traductor declines/expired/incomplete
        ├── supabase-errors.ts              # Mapea PostgREST/auth/storage/red a español
        ├── plans.ts                        # PLANS_PUBLIC (compartido app + marketing)
        ├── usePlan.ts                      # Hook free/pro/business + LIMITES
        ├── usePermissions.ts               # { can, esAdmin, nivel, rol } gating UI
        ├── ocr/{engine,parser}.ts          # Tesseract.js + regex ES
        ├── documentos.ts                   # Totales, validación, referencia AEAT
        ├── inventario.ts                   # estadoStock, calcularTotalVenta
        ├── finanzas.ts                     # totales(), agregarPorMes()
        ├── fichajes.ts                     # State machine entrada→descanso→salida
        ├── proveedores.ts                  # gastoMensualizado()
        ├── csv.ts                          # parseCSV + descargarCSV (BOM)
        ├── api-handler.ts                  # withApiHandler (try/catch + JSON error)
        ├── a11y-prefs.ts                   # Preferencias accesibilidad + boot script
        ├── theme/                          # Theme engine (schema + provider + apply)
        ├── rgpd/exportar-datos.ts          # ZIP RGPD con README
        ├── devices.ts                      # SHA-256 fingerprint
        ├── useNegocioId.ts                 # Hook negocio_id con cache
        ├── useSupabaseQuery.ts             # Cliente memoizado + AbortController + toast
        ├── useDashboardData.ts             # Bundle queries dashboard
        ├── ui-constants.ts                 # ESTADO_CLIENTE_BADGE, ESTADO_STOCK_BADGE
        ├── formato.ts                      # eur, round2, hoyISO, formatearFecha*
        ├── database.types.ts               # Generado por `supabase gen types`
        └── utils.ts                        # cn() (clsx + tailwind-merge)
```

---

## 🧩 Módulos de negocio

| Módulo | Tablas principales | Notas |
|---|---|---|
| **CRM** | `clientes`, `contactos_cliente`, `comunicaciones` | B2B 100% · paginación cursor · jerarquía con `@xyflow/react` |
| **Agenda** | `agenda_eventos`, `google_connections` | Sync bidireccional con Google Calendar · push webhook |
| **Tareas** | `tareas_kanban`, `kanban_columnas` | Drag & drop dnd-kit · columnas reordenables · batch RPC |
| **Finanzas** | `finanzas` | OCR client-side (Tesseract) · Recharts · IVA/IRPF generados |
| **Documentos** | `documentos` | Numeración correlativa atómica AEAT · snapshots JSONB · A4 + ticket |
| **Productos** | `productos` | Catálogo único · escáner barcode · imagen Storage |
| **Stock** | `stock_movimientos` | Log inmutable firmado · trigger mantiene `stock_actual` |
| **TPV** | `tpv_ventas`, `tpv_venta_items` | RPC `cerrar_venta_tpv` atómica · genera movimientos de stock |
| **Métodos de pago** | `metodos_pago` | RPC `set_metodo_pago_predeterminado` atómica |
| **Fichajes** | `fichajes`, `*_archivo` | RD-ley 8/2019 · GPS obligatorio · panel admin con horas objetivo |
| **Proveedores** | `proveedores`, `gastos_proveedor` | Directorio + suscripciones recurrentes (mensualizadas) |
| **Equipo** | `miembros_negocio` | Roles admin/editor/lector + permisos jsonb granulares |
| **Facturación SaaS** | `pagos_stripe`, `perfiles_negocio.stripe_*` | Suscripciones Stripe + Customer Portal |
| **RGPD** | `consentimientos_rgpd`, `terminos_versiones` | Onboarding obligatorio · exportación ZIP · revocación |
| **Ajustes** | `perfiles_negocio`, `config_keys` | Cifrado pgcrypto · 11 tabs · ayuda contextual |
| **Devices** | `dispositivos_conocidos` | Fingerprint SHA-256 · email Resend nuevo dispositivo |
| **Theme** | `user_preferences.theme` | Per-user, persistencia debounced, boot sin FOUC |

---

## 🏗 Patrones arquitectónicos

### Multi-tenancy en una frase

Cada `auth.users` recibe automáticamente un `perfiles_negocio` (trigger `on_auth_user_created`). Todas las tablas filtran por `negocio_id = current_negocio_id()` vía RLS, y el trigger `fill_negocio_id` (en `fix_tenant_defaults.sql`) lo rellena automáticamente en cada INSERT, así que **el frontend nunca tiene que filtrar manualmente** — usa el cliente Supabase y RLS hace el resto.

### Sistema de roles (3 dimensiones desacopladas)

1. **Nivel de plataforma** — `admin_global` (super admin) / `owner` (perfiles_negocio) / `miembro` / `anon`.
2. **Rol dentro del tenant** — `admin` / `editor` / `lector` (solo aplica a miembros).
3. **Plan de suscripción** — `free` / `pro` / `business` (afecta cuotas, no permisos).

Detalles en [`docs/ROLES.md`](ROLES.md).

### Cero servidor para procesamiento pesado

- **OCR**: Tesseract.js + WebAssembly en el navegador.
- **PDFs**: `jsPDF` + `html2canvas` en cliente.
- **ZIPs RGPD**: `fflate` en cliente.
- **Cifrado de tokens**: `pgp_sym_encrypt` con clave maestra GUC en Postgres (no en Node).

### Lazy loading agresivo

Cualquier librería >100 KB se carga con `dynamic(..., { ssr: false })` — el `initial JS` se mantiene por debajo del threshold de Lighthouse.

---

## 📚 Más

- [`docs/STACK.md`](STACK.md) — capas tecnológicas y dependencias.
- [`docs/MODULES.md`](MODULES.md) — estado actual de cada módulo.
- [`docs/AUTH.md`](AUTH.md) — autenticación y 2FA.
- [`docs/ROLES.md`](ROLES.md) — sistema de roles y permisos.

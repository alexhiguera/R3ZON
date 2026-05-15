# 📦 Estado de los módulos

Foto de los módulos de **R3ZON ANTARES** y su grado de completitud. La verdad operativa siempre vive en el código — esta tabla se mantiene al día tras cada iteración relevante. Para el detalle histórico consulta [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 🟢 Núcleo del producto

| Módulo | Estado | Notas |
|---|---|---|
| Diseño base + AppShell | ✅ | Sidebar colapsable, drawer móvil, ≤400px responsive |
| Esquema BD multi-tenant | ✅ | RLS + pgcrypto + triggers auto-fill `negocio_id` |
| Autenticación email | ✅ | Login, registro, recuperación, modo dev rápido |
| OAuth (Google) | ✅ | Calendar + Drive.file + profile, refresh offline, CSRF cookie |
| 2FA (TOTP) | ✅ | Enrolment + verificación, middleware SSR gating |
| Email nuevo dispositivo | ✅ | Edge Function + Resend, fingerprint SHA-256 |
| Onboarding RGPD | ✅ | `consentimientos_rgpd` con IP/UA/versión |
| Páginas legales | ✅ | Privacidad, cookies, términos, aviso, metadata SEO |
| Sistema de roles | ✅ | `admin_global` + admin/editor/lector + permisos jsonb granulares |
| Personalización (theme) | ✅ | Per-user, paletas, fuentes, escalas, sin FOUC |
| Accesibilidad | ✅ | WCAG AA · focus visible · reduce-motion · alto contraste |
| Búsqueda global | ✅ | `Cmd+K` palette: clientes, citas, tareas, finanzas, documentos |

## 🧾 CRM y operativa diaria

| Módulo | Estado | Notas |
|---|---|---|
| Clientes (B2B) | ✅ | Lista/tarjetas conmutables, ficha con 5 tabs, contactos con jerarquía `reports_to` |
| Comunicaciones | ✅ | Notas/email/whatsapp en cronología del cliente |
| Agenda + Google Calendar | ✅ | Sync bidireccional, push webhook, watch channel cron |
| Citas — vistas | ✅ | Calendario (mes/semana/día/año) + lista filtrable |
| Tareas Kanban | ✅ | dnd-kit, columnas reordenables, creación inline, batch RPC |
| Dashboard | ✅ | KPIs · próximas citas · tareas · clientes recientes · feed actividad |
| OCR de tickets | ✅ | Tesseract.js client-side, parser regex ES |
| Finanzas | ✅ | Movimientos, IVA/IRPF generados, Recharts, exportación |

## 💰 Comercio (productos / stock / TPV)

| Módulo | Estado | Notas |
|---|---|---|
| Productos | ✅ | Catálogo único, imagen, código de barras (HID scanner) |
| Stock | ✅ | Log inmutable firmado, trigger actualiza `stock_actual`, modo opcional por negocio |
| TPV | ✅ | Layout táctil, RPC `cerrar_venta_tpv` atómica con stock movements |
| Listado unificado | ✅ | Combina Productos + Stock con toggle "modo stock" en Ajustes |
| Métodos de pago | ✅ | Default atómico, integración con documentos |

## 📄 Documentos fiscales

| Módulo | Estado | Notas |
|---|---|---|
| Editor documentos | ✅ | Factura, ticket, presupuesto, albarán, proforma, recibo |
| Plantillas | ✅ | A4 imprimible + ticket térmico 80mm, colores configurables |
| Numeración AEAT | ✅ | RPC `crear_documento_generado` atómica, sin gaps |
| PDF | ✅ | jsPDF + html2canvas lazy, multi-página A4 |
| Inmutabilidad | ✅ | Trigger bloquea modificaciones de fondo cuando `estado != 'borrador'` |

## 🏢 Backoffice del negocio

| Módulo | Estado | Notas |
|---|---|---|
| Ajustes — Negocio | ✅ | Perfil, CIF, logo en Supabase Storage |
| Ajustes — Apariencia | ✅ | Theme engine con paletas, fuentes, modo claro |
| Ajustes — Accesibilidad | ✅ | Tamaño texto, reduce-motion, alto contraste, cursor grande |
| Ajustes — Listado | ✅ | Toggle stock mode (catálogo simple vs con inventario) |
| Ajustes — Equipo | ✅ | Invitaciones, roles, revocación con audit trail |
| Ajustes — Datos | ✅ | Import/export CSV + JSON + ZIP RGPD |
| Ajustes — Suscripción | ✅ | Stripe Checkout + Customer Portal + métodos de pago |
| Ajustes — Seguridad | ✅ | 2FA, cambio contraseña, dispositivos, cierre global |
| Ajustes — Cumplimiento | ✅ | Consentimientos vigentes, revocación, links legales |
| Ajustes — Integraciones | ✅ | Google con status RPC + HelpDrawer guías |
| Perfil de usuario | ✅ | Avatar, datos personales, permisos, próximas citas |
| Proveedores | ✅ | Directorio + suscripciones recurrentes mensualizadas |
| Fichajes | ✅ | RD-ley 8/2019, GPS obligatorio, panel admin con horas objetivo |

## 🌍 Sitio público

| Módulo | Estado | Notas |
|---|---|---|
| Landing `/` | ✅ | Hero gradiente cyan→fuchsia, 7 módulos, CTA |
| Servicios | ✅ | 9 cards por módulo con bullets |
| Precios | ✅ | Pro 29€ / Business 79€ desde `PLANS_PUBLIC` único |
| Descargas | ✅ | Android (APK) / macOS (DMG) / Windows (EXE) — vinculado a GitHub Releases |

## 🛡 Plataforma

| Módulo | Estado | Notas |
|---|---|---|
| Responsive / móvil | ✅ | Mobile ≤400px, modal scroll, sidebar drawer |
| SEO / PWA | ✅ | metadata por ruta, manifest.json, favicon SVG, robots, sitemap |
| Testing | ✅ | Vitest 132+ tests (parser, finanzas, stripe, google, RPC, webhook, componentes) |
| Headers de seguridad | ✅ | CSP, HSTS, X-Frame-Options, Permissions-Policy |
| Crons | ✅ | Renovación diaria watch channels Google (`vercel.json`) |
| Analytics | ✅ | Vercel Analytics en root layout |
| Boundaries de error | ✅ | `error.tsx`, `global-error.tsx`, `not-found.tsx` glass |
| Offline | ✅ | Banner sticky + degradación elegante si Supabase cae |
| Errores legibles | ✅ | `formatSupabaseError` y `formatStripeError` mapean a mensajes en español |

---

## 🚧 Pendientes y mejoras post-v1.0

- [ ] Endpoint `/api/account/delete` (RGPD borrado total).
- [ ] Rate limiting en `team/invite` y `billing/checkout`.
- [ ] Alternativa de teclado en el drag&drop del Kanban (`KeyboardSensor`).
- [ ] Tests de a11y con `jest-axe`.
- [ ] UI en `EquipoTab` para editar `permisos` jsonb granulares por miembro.
- [ ] Panel `/admin` global accesible solo si `es_admin_global()`.
- [ ] Audit log de cambios de rol/permisos.
- [ ] Recordatorios email para citas/tareas (cron diario).
- [ ] Builds de Capacitor publicadas en GitHub Releases (APK/DMG/EXE actualmente "Próximamente").

---

## 📚 Más

- [`docs/CHANGELOG.md`](CHANGELOG.md) — historial detallado por iteración.
- [`docs/STRUCTURE.md`](STRUCTURE.md) — qué archivo cubre cada módulo.
- [`docs/ROLES.md`](ROLES.md) — quién puede hacer qué en cada módulo.

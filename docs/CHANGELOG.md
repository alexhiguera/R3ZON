# 📒 Bitácora de iteraciones

Historial cronológico de **R3ZON ANTARES** ordenado de más reciente a más antiguo. Cada entrada documenta los cambios entregados en una sesión de trabajo: módulos tocados, archivos clave y decisiones notables.

> 📝 **Convención** — añade una nueva sección `### Iteración N — *YYYY-MM-DD* — Título` arriba del todo en cada entrega. Mantén un párrafo breve + bullets, no un changelog detallado.

---


### Iteración 68 — *2026-05-16* — Lint con Biome, CI completo, backup con tablas reales

Tras la auditoría, varias tareas de plataforma agrupadas en una sesión.

- **Migración a Biome 2.4** ([biome.json](biome.json)) — sustituye al combo ESLint 9 + `eslint-config-next` que estaba roto por la transición de Next 16. Una sola dep, una config, sin peer-dep hell. Config calibrada para el código existente: 0 errores, 4 warnings (unused vars/imports en scripts y `documentos/nuevo`). 181 archivos auto-formateados; espacios y comillas dobles unificados. Scripts nuevos en [package.json](package.json): `lint`, `lint:fix`, `format`.
- **Lint reactivado en CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) — step `Lint (Biome)` añadido tras `npm ci`, y nuevo step `Tests (Vitest)` antes del build. CI ahora corre: install → lint → typecheck → tests → build → notify Discord. Cualquier regresión rompe el pipeline.
- **Backup con tablas reales** ([.github/workflows/supabase-backup.yml](.github/workflows/supabase-backup.yml)) — lista anterior (`clientes configuracion negocios`) era inventada. Reemplazada por las 18 tablas críticas del schema: `perfiles_negocio`, `miembros_negocio`, `clientes`, `contactos_cliente`, `finanzas`, `documentos`, `productos`, `citas`, `agenda_eventos`, `tareas_kanban`, `kanban_columnas`, `fichajes`, `pagos_stripe`, `proveedores`, `gastos_proveedor`, `tpv_ventas`, `tpv_venta_items`, `stock_movimientos`. Quedan fuera las tablas archivo (`*_archivo`), auxiliares (rgpd, terminos, dispositivos) y de configuración (config_keys, user_preferences) que cambian poco o son reconstruibles.
- **Fixes colaterales del format**: [src/lib/ocr/parser.ts](src/lib/ocr/parser.ts) `parseInt` ahora con radix, [src/lib/csv.ts](src/lib/csv.ts) `escape` renombrada a `escapeCell` para no sombrear `globalThis.escape`, [tests/inventario.test.ts](tests/inventario.test.ts) `@ts-expect-error` movido a la línea correcta tras la reorganización.
- **Verificación local**: `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run test:run` → 13 archivos, 132 tests pasan · `npm audit` 0 vulns.
- **Decisión sobre los gigantes**: [documentos/nuevo/page.tsx](src/app/(app)/documentos/nuevo/page.tsx) (1143 líneas) y [listado/page.tsx](src/app/(app)/listado/page.tsx) (964 líneas) **se mantienen sin tocar** en esta iteración. Refactor sin scaffolding de tests específicos es jugarse regresiones invisibles. Iteración dedicada cuando se aborden.


### Iteración 67 — *2026-05-16* — Auditoría: hardening tras advisors de Supabase + CodeQL

Auditoría completa (código, Supabase, Vercel). Vercel quedó fuera por falta de link CLI. Hallazgos críticos accionados:

- **Logs sin stack en producción** ([src/lib/api-handler.ts:19](src/lib/api-handler.ts#L19)) — el stack solo se imprime en `NODE_ENV !== "production"`. Cierra la alerta de CodeQL "Clear-text logging of sensitive information": los errores de OAuth/Stripe podían arrastrar tokens parciales al log.
- **Finanzas en céntimos enteros** ([src/lib/finanzas.ts](src/lib/finanzas.ts)) — `agregarPorMes` y `totales` ahora acumulan en `int` (céntimos) y solo dividen por 100 al devolver. Elimina el drift de IEEE-754 sobre N líneas de factura (>1 cént a partir de ~1000 movimientos). Quitada la dependencia de `round2`.
- **Race condition de Stripe customer** ([src/app/api/billing/setup-checkout/route.ts](src/app/api/billing/setup-checkout/route.ts) y [checkout/route.ts](src/app/api/billing/checkout/route.ts)) — `idempotencyKey: negocio-{id}-customer` para deduplicar en Stripe + `createAdminClient()` + `.is("stripe_customer_id", null)` para no pisar un valor escrito por una request paralela.
- **SECURITY DEFINER → INVOKER en 5 RPCs** ([supabase/migrations/20260516000000_security_definer_to_invoker.sql](supabase/migrations/20260516000000_security_definer_to_invoker.sql)) — `save_user_theme`, `reordenar_tarea`, `reordenar_tareas_batch`, `reordenar_columnas_batch` y `registrar_fichaje`. Las 4 primeras solo hacen UPDATE/UPSERT sobre tablas con RLS clara. La de fichajes lee `perfiles_negocio` + `miembros_negocio` y escribe en `fichajes`; depende de que las RLS de esas tablas permitan SELECT al propio user (estándar multi-tenant del proyecto). Tras aplicar, el advisor pasará de 22 warnings DEFINER a 17.
- **Cookies OAuth borradas con flags consistentes** ([src/app/api/integrations/google/callback/route.ts:106-113](src/app/api/integrations/google/callback/route.ts#L106-L113)) — añadido `httpOnly`, `sameSite: lax`, `secure` (en prod) al expirar, para garantizar que el browser case la cookie original y la borre.
- **Pendiente de aplicar la migración SQL**: no se ejecutó contra el remote. El usuario la aplica con `npm run db:reset` (local) o `npx supabase db push` (remote). Tras aplicar, el advisor de Supabase pasará de 22 warnings de DEFINER a 18.
- **Decisiones de no actuar**: componentes gigantes (`documentos/nuevo`, `listado`) requieren refactor con tests, fuera de scope. ID token de Google se sigue decodificando sin verificar firma (uso solo como label, aceptable por diseño). Índices no usados se conservan (BD aún vacía, esperarán a tener datos reales).


### Iteración 66 — *2026-05-16* — Seguridad: filtración de PAT en wiki + mailto injection + fix sync-wiki.sh

GitHub Secret Scanning detectó un Personal Access Token expuesto, además de dos alertas de CodeQL. Auditoría y reparación en tres frentes.

- **🚨 PAT filtrado en el repo Wiki** — el footer que [scripts/sync-wiki.sh](scripts/sync-wiki.sh) añadía a cada página construía la URL del "blob original" a partir de `$REMOTE`, que en GitHub Actions venía autenticado como `https://x-access-token:${GH_PAT}@github.com/…`. Resultado: el PAT acabó embebido en 9 páginas del wiki, incluido el commit `480a3a1`. Fix en dos pasos:
  - Script corregido: nuevo `REPO_SLUG` derivado de `GITHUB_REPOSITORY` (o sanitización del remote) que se usa para componer `REPO_BLOB="https://github.com/${REPO_SLUG}/blob/main"`, garantizando que ninguna URL con credenciales entre en los `.md` ni en los logs.
  - Wiki saneado en remoto: rama `master` reescrita como orphan vía force-push tras limpiar los 9 archivos. El historial git que contenía el PAT ya no es accesible desde HEAD.
  - **Acción pendiente del usuario**: rotar el PAT en GitHub Settings → Developer settings y actualizar el secret `GH_PAT` del repo. Asumir el token como comprometido aunque ya no aparezca en el wiki.
- **mailto injection en documentos/nuevo** ([src/app/(app)/documentos/nuevo/page.tsx:402](src/app/(app)/documentos/nuevo/page.tsx#L402)) — el destinatario del correo (`cliente.email`) iba sin escapar en la URL `mailto:`, permitiendo header injection (`\r\n`, `&cc=…`, `&bcc=…`). Ahora se valida con regex y se aplica `encodeURIComponent` igual que a `subject` y `body`. Si el email no es válido, se deja vacío en lugar de propagar input no confiable.
- **Clear-text logging** — pendiente del path exacto que indique CodeQL para arreglar puntualmente. Candidatos identificados (sin tocar todavía): callback OAuth de Google, webhook de Stripe y `api-handler` que loguea stacks completos.


### Iteración 65 — *2026-05-15* — GitHub Actions: CI, wiki sync, backup Supabase, seguridad + fix primer run

Se automatizan los flujos críticos del repo mediante GitHub Actions. Cuatro workflows en [.github/workflows/](.github/workflows/), todos sobre `ubuntu-latest` y con notificaciones a Discord en los puntos relevantes. Tras pushear, las primeras runs fallaron — se diagnosticaron vía API pública de GitHub y se repararon en una segunda pasada.

- **[.github/workflows/ci.yml](.github/workflows/ci.yml)** — en cada PR y push a `main`: `npm ci`, `npm run typecheck` (nuevo script `tsc --noEmit`), `npm run build`. Job `notify` con `if: always()` que reporta éxito/fallo a Discord (embed coloreado + autor + commit + link al run). Concurrency group para cancelar runs obsoletos. **Lint deshabilitado**: Next 16 eliminó `next lint` y `eslint-config-next` arrastra peer deps incompatibles con ESLint 9. Reactivar cuando el ecosistema estabilice.
- **[.github/workflows/wiki-sync.yml](.github/workflows/wiki-sync.yml)** — disparado por cambios en `docs/**` en `main`. Ejecuta [scripts/sync-wiki.sh](scripts/sync-wiki.sh) inyectando `WIKI_REMOTE` con `GH_PAT` para autenticar el push al repo `<repo>.wiki.git`. **Requiere primera página manual en la pestaña Wiki** para que el repo `.wiki.git` exista.
- **[.github/workflows/supabase-backup.yml](.github/workflows/supabase-backup.yml)** — cron diario `0 3 * * *`. Exporta tablas críticas (`clientes`, `configuracion`, `negocios`) vía REST API de Supabase con `SUPABASE_SERVICE_ROLE_KEY`, sube artifact (30d retención) y commitea snapshots en rama orphan `backups` con `GH_PAT`. Notifica a Discord en caso de fallo.
- **[.github/workflows/security.yml](.github/workflows/security.yml)** — `npm audit --audit-level=high` (con `--ignore-scripts` para evitar postinstall malicioso) + CodeQL JS/TS. Disparo en PR/push + cron semanal lunes 06:00 UTC.
- **Fixes aplicados tras detectar fallos de la primera run:**
  - `package-lock.json` regenerado (estaba desincronizado de `package.json`, 127 paquetes divergentes).
  - 13 CVEs en Next.js 16.0.0–16.2.5 resueltos vía `npm audit fix` (DoS, cache poisoning, middleware bypass, SSRF, XSS en CSP nonces…).
  - `@vercel/analytics` reinstalado (los `.d.ts` del subpath `/next` venían vacíos en la instalación inicial).
  - `@xyflow/system` añadido como peer faltante de `@xyflow/react` (rompía Turbopack).
  - `origin` actualizado a `git@github.com:alexhiguera/R3ZON-ANTARES.git` (el repo se había renombrado de `R3ZON` y el remote local seguía apuntando al alias).
- **Verificación local previa al push**: `npm run typecheck` ✅ · `npm run build` ✅ · `npm audit` → 0 vulnerabilidades.


### Iteración 64 — *2026-05-15* — Refactor de documentación: `docs/` + bitácora separada + sync con la wiki

El README había crecido a 1.299 líneas (66 iteraciones de bitácora dentro), inservible como punto de entrada. Refactor en dos ejes: (1) sacar la documentación a `docs/` con archivos temáticos y (2) automatizar la publicación en la wiki de GitHub.

- **Nueva carpeta [docs/](docs/)** con 9 archivos:
  - [docs/README.md](docs/README.md) — índice de navegación.
  - [docs/CHANGELOG.md](docs/CHANGELOG.md) — bitácora completa (las 63 iteraciones previas + esta). Incluye convención para entradas nuevas.
  - [docs/STACK.md](docs/STACK.md) — capas tecnológicas, deps clave, integraciones externas, design system.
  - [docs/STRUCTURE.md](docs/STRUCTURE.md) — árbol del repo (con `docs/`, marketing routes, fichajes admin, security_hardening), tabla de módulos de negocio y patrones (multi-tenancy, roles, cero servidor, lazy loading). Reemplaza al antiguo `STRUCTURE.md` desfasado (Next.js 14, faltaban 10+ módulos).
  - [docs/MODULES.md](docs/MODULES.md) — estado actual por módulo (✅/🚧) en bloques temáticos: núcleo, CRM, comercio, documentos, backoffice, sitio público, plataforma + pendientes post-v1.0.
  - [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — quick start con `dev-setup.sh`, pre-requisitos, BD (Docker / cloud / incremental), env vars críticas, webhooks (Stripe CLI + Cloudflare tunnel), tests, Capacitor, troubleshooting.
  - [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — guía paso a paso de producción (Supabase Cloud, Google OAuth, Stripe webhooks, Vercel env + dominio, verificación, rollback).
  - [docs/AUTH.md](docs/AUTH.md) y [docs/ROLES.md](docs/ROLES.md) — movidos sin cambios desde la raíz.
- **[README.md](README.md) simplificado** (1.299 → 105 líneas): hero centrado, descripción breve, stack compactado, quick start con `dev:setup`, sección de producción de alto nivel y tabla de links a `docs/`. Mantiene los emojis para legibilidad.
- **[scripts/sync-wiki.sh](scripts/sync-wiki.sh) (nuevo)**: clona `<repo>.wiki.git`, transforma los `.md` de `docs/` con un script Python embebido (renombra `README.md`→`Home.md`, `CHANGELOG.md`→`Changelog.md`, etc.; reescribe links relativos `docs/X.md`→`[Page]` para la wiki y `../foo`→URL absoluta de GitHub blob), añade footer con `commit sha + timestamp UTC` y hace push. Idempotente; soporta `--dry-run` y override `WIKI_REMOTE=…`. Ejecutable + `chmod +x` + nuevo script npm `npm run docs:sync`.
- **Limpieza**: eliminados `AUTH.md`, `ROLES.md`, `STRUCTURE.md` de la raíz (los antiguos quedaban referenciados desde el README; ahora se accede vía `docs/`).
- **Memoria actualizada** ([feedback_readme_log.md](file:///Users/alex/.claude/projects/-Users-alex-Documents-r3zon-crm/memory/feedback_readme_log.md)): la bitácora vive en `docs/CHANGELOG.md`, no en README. Cada iteración añade una entrada nueva al inicio del changelog y, si corresponde, actualiza `docs/MODULES.md`/`STRUCTURE.md`/`DEPLOYMENT.md`. El README ya no se toca con cada iteración.

### Iteración 63 — *2026-05-15* — Sitio público (landing + servicios + precios + descargas)

Hasta ahora `/` redirigía directamente a `/dashboard` y la app vivía completamente tras el login. Añadido un **sitio de marketing público** dentro del mismo repo (no proyecto aparte) usando route groups de App Router para mantener una sola pipeline, dominio y design system.

- **Nuevo grupo** [src/app/(marketing)/](src/app/(marketing)/) con su propio `layout.tsx` (Server Component que detecta sesión via `createClient()` server). Sin AppShell ni sidebar.
  - [src/app/(marketing)/page.tsx](src/app/(marketing)/page.tsx) — landing: hero con gradiente cyan→fuchsia, grid de 7 módulos, bloque «por qué», CTA final con `rainbow-bar`.
  - [src/app/(marketing)/servicios/page.tsx](src/app/(marketing)/servicios/page.tsx) — 9 cards con bullets por módulo.
  - [src/app/(marketing)/precios/page.tsx](src/app/(marketing)/precios/page.tsx) — Pro 29€ / Business 79€, plan destacado con ring cyan, CTA `/registro?plan=…`.
  - [src/app/(marketing)/descargas/page.tsx](src/app/(marketing)/descargas/page.tsx) — Android (APK) / macOS (DMG) / Windows (EXE). URLs hardcodeadas a `null` → badge «Próximamente» hasta que se publiquen las builds en **GitHub Releases**.
- **Componentes de marketing** ([src/components/marketing/](src/components/marketing/)):
  - `MarketingNavbar` (Client) — sticky `backdrop-blur-glass`, links con estado activo via `usePathname()`, botón pill cyan que muta entre **Acceso** (`/login`) e **Ir al panel** (`/dashboard`) según `hasSession`. Drawer móvil con hamburguesa.
  - `MarketingFooter` — 3 columnas (Producto / Cuenta / Legal) + copyright dinámico.
- **Catálogo de planes refactorizado**: extraído `PLANS_PUBLIC` a [src/lib/plans.ts](src/lib/plans.ts) para que la pestaña Suscripción de la app y la página pública `/precios` lean del mismo origen y no se desincronicen del checkout Stripe real.
- **Middleware** [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts) — añadidos `/servicios`, `/precios`, `/descargas` a la lista de rutas públicas.
- **Eliminado** `src/app/page.tsx` (el `redirect("/dashboard")`); ahora `/` la sirve `(marketing)/page.tsx`. Si el usuario está logueado **se queda en la landing** y el botón del navbar le ofrece ir al panel.
- **Verificación**: `npm run build` verde (44 rutas, antes 40); `tsc --noEmit` limpio; `curl` a `/`, `/servicios`, `/precios`, `/descargas` → 200, contenido y precios correctos.

### Iteración 62 — *2026-05-14* — Corrección: la empresa es R3ZON (no «R3ZON Intelligence»)

«R3ZON Intelligence» no es una entidad real — la empresa se llama simplemente **R3ZON** y el producto es **R3ZON ANTARES** / **ANTARES**. Sustituidas todas las menciones a `R3ZON Intelligence` por `R3ZON`.

- [src/app/legal/layout.tsx](src/app/legal/layout.tsx) — footer: `© AAAA R3ZON · Versión vigente: …`.
- [src/app/legal/privacidad/page.tsx](src/app/legal/privacidad/page.tsx) — apertura: `En R3ZON protegemos tus datos…` (se elimina el alias `("R3ZON")` que quedaba redundante).
- [src/app/legal/terminos/page.tsx](src/app/legal/terminos/page.tsx) — preámbulo: `…entre el usuario y R3ZON.` (mismo motivo).

### Iteración 61 — *2026-05-14* — Renombrado del producto a R3ZON ANTARES

El producto pasa a llamarse **R3ZON ANTARES** (o **ANTARES** en formas cortas). Se han actualizado todas las referencias visibles al usuario, manteniendo intactos los identificadores técnicos para no romper datos guardados (`localStorage` `r3zon:*`, clases CSS `r3zon-calendar` / `r3zon-color-*`, el identificador de paleta `r3zon`, dominios `@r3zon.app` y el id de Capacitor `com.r3zon.app`). La entidad legal sigue siendo **R3ZON**.

- [package.json](package.json) — `name`: `r3zon-business-os` → `r3zon-antares`.
- [public/manifest.json](public/manifest.json) — `name`: `R3ZON ANTARES`, `short_name`: `ANTARES`.
- [src/app/layout.tsx](src/app/layout.tsx) — metadata `title.default`, `title.template`, `applicationName`, `authors`, `openGraph.siteName/title`, `twitter.title` actualizados a `R3ZON ANTARES` / `ANTARES`.
- [src/app/not-found.tsx](src/app/not-found.tsx) — `metadata.title` → `Página no encontrada · ANTARES`.
- [src/app/global-error.tsx](src/app/global-error.tsx) — copy de error: `inicializar ANTARES`.
- [src/app/(auth)/layout.tsx](src/app/(auth)/layout.tsx) — logo de auth: `R3ZON ANTARES`.
- [src/app/(auth)/login/layout.tsx](src/app/(auth)/login/layout.tsx), [src/app/(auth)/registro/layout.tsx](src/app/(auth)/registro/layout.tsx) — descripciones SEO actualizadas.
- [src/app/(app)/onboarding/layout.tsx](src/app/(app)/onboarding/layout.tsx), [src/app/(app)/onboarding/page.tsx](src/app/(app)/onboarding/page.tsx) — copy de onboarding usa `ANTARES`.
- [src/app/(app)/perfil/page.tsx](src/app/(app)/perfil/page.tsx) — etiqueta «Alta en R3ZON» → «Alta en ANTARES».
- [src/app/(app)/2fa/configurar/page.tsx](src/app/(app)/2fa/configurar/page.tsx) — `friendlyName` del enrolment TOTP: `ANTARES · YYYY-MM-DD`.
- [src/app/legal/layout.tsx](src/app/legal/layout.tsx) — header del wrapper legal: `R3ZON ANTARES` (footer mantiene `R3ZON`).
- [src/app/legal/aviso-legal/page.tsx](src/app/legal/aviso-legal/page.tsx), [src/app/legal/terminos/page.tsx](src/app/legal/terminos/page.tsx), [src/app/legal/privacidad/page.tsx](src/app/legal/privacidad/page.tsx), [src/app/legal/cookies/page.tsx](src/app/legal/cookies/page.tsx) — titles SEO y referencias al producto migradas a `ANTARES` / `R3ZON ANTARES`. Las menciones a la entidad legal `R3ZON` y al alias contractual `R3ZON` definido en los términos se conservan.
- [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx), [src/components/layout/AppShell.tsx](src/components/layout/AppShell.tsx) — texto del logo (desktop sidebar y header móvil) → `R3ZON ANTARES`.
- [src/components/documentos/PlantillaDocumento.tsx](src/components/documentos/PlantillaDocumento.tsx) — pie de los PDFs generados: `Documento generado con R3ZON ANTARES`.
- [src/components/ajustes/SuscripcionTab.tsx](src/components/ajustes/SuscripcionTab.tsx), [src/components/ajustes/DatosTab.tsx](src/components/ajustes/DatosTab.tsx), [src/components/ajustes/CumplimientoTab.tsx](src/components/ajustes/CumplimientoTab.tsx), [src/components/ajustes/integracionesGuides.ts](src/components/ajustes/integracionesGuides.ts) — copy de pagos, exportación, cumplimiento y guías de integración usan `ANTARES` / `R3ZON ANTARES`.
- [src/lib/rgpd/exportar-datos.ts](src/lib/rgpd/exportar-datos.ts) — cabecera del README del ZIP RGPD: `R3ZON ANTARES — Exportación RGPD`.
- [src/lib/theme/theme-schema.json](src/lib/theme/theme-schema.json) — `title` del schema y `label` de la paleta por defecto pasan a `ANTARES`; el `value` (`"r3zon"`) se mantiene para no invalidar temas guardados.
- [supabase/functions/notify-new-device/index.ts](supabase/functions/notify-new-device/index.ts) — asunto y cuerpo del email de nuevo dispositivo usan `R3ZON ANTARES`.

> Identificadores técnicos preservados intencionalmente: `localStorage` (`r3zon:theme:v1`, `r3zon:a11y:v1`, `r3zon:sidebar-collapsed`), clases CSS (`r3zon-calendar`, `r3zon-color-*`), nombre del fichero de exportación RGPD (`r3zon-datos-*.zip`), dominios `@r3zon.app` y el id Capacitor `com.r3zon.app`. Tocar cualquiera de estos rompería preferencias guardadas, fingerprints OAuth o el matching de selectores CSS.

### Iteración 60 — *2026-05-14* — 404 con eyebrow «Error 404» + sidebar colapsable en desktop

- [src/app/not-found.tsx](src/app/not-found.tsx) — añadido eyebrow `Error 404` en cian uppercase entre el icono Compass y el dígito grande 404.
- [src/components/layout/AppShell.tsx](src/components/layout/AppShell.tsx) — nuevo estado `collapsed` (default expandida) persistido en `localStorage` (`r3zon:sidebar-collapsed`). El grid alterna `lg:grid-cols-[280px_1fr]` ↔ `lg:grid-cols-[76px_1fr]`.
- [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx) — acepta `collapsed` y `onToggleCollapsed`. Botón discreto (`PanelLeftClose`/`PanelLeftOpen`, 8×8, `border-indigo-400/15`) arriba a la derecha del logo en desktop; en colapsado se centra debajo. Cuando está colapsada, los items muestran solo el icono cuadrado con `title`/`aria-label` para tooltip y accesibilidad. El drawer móvil siempre va expandido.
- [src/components/layout/UserMenu.tsx](src/components/layout/UserMenu.tsx) — nueva prop `compact` que oculta nombre, plan y chevron cuando la sidebar está colapsada, mostrando solo el avatar; el dropdown sigue funcionando igual.

### Iteración 59 — *2026-05-14* — Ajustes movido del sidebar al menú de usuario

- [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx) — retirado el ítem `/ajustes` del array `NAV` y el icono `Settings` del import.
- [src/components/layout/UserMenu.tsx](src/components/layout/UserMenu.tsx) — añadido enlace «Ajustes» en el dropdown, justo bajo «Mi perfil», con el mismo patrón (cierra el menú y dispara `onNavigate?.()` para el drawer móvil).

### Iteración 58 — *2026-05-14* — Retirada de la integración n8n

- **Archivos eliminados**:
  - `src/components/ajustes/N8nCard.tsx` — tarjeta de Integraciones › n8n (URL + API Key con `set_config_key`/`get_config_key`).
  - `src/components/crm/TabAutomatizacion.tsx` — pestaña «Automatización» en la ficha de cliente (huérfana: el detalle de cliente ya solo monta 6 tabs).
- **Componentes actualizados**:
  - [src/components/ajustes/IntegracionesTab.tsx](src/components/ajustes/IntegracionesTab.tsx) — solo monta `<GoogleCard />`.
  - [src/components/ajustes/integracionesGuides.ts](src/components/ajustes/integracionesGuides.ts) — `N8N_WEBHOOK_GUIDE` y `N8N_API_KEY_GUIDE` eliminadas; se mantiene `GOOGLE_OAUTH_GUIDE`.
  - [src/components/crm/TabComunicaciones.tsx](src/components/crm/TabComunicaciones.tsx) y [src/components/dashboard/RecentActivity.tsx](src/components/dashboard/RecentActivity.tsx) — quitado el mapping de `webhook_fire` (icono y label). Import de `Zap` retirado en RecentActivity.
  - [src/lib/stripe.ts](src/lib/stripe.ts) y [src/components/ajustes/SuscripcionTab.tsx](src/components/ajustes/SuscripcionTab.tsx) — feature «Integración n8n + webhooks» retirada del plan Business.
- **Base de datos** ([supabase/migrations/20260514140000_drop_n8n_webhooks.sql](supabase/migrations/20260514140000_drop_n8n_webhooks.sql), idempotente):
  - `alter table public.clientes drop column if exists webhook_url, webhook_activo`.
  - `delete from public.config_keys where servicio = 'n8n'`.
  - Los registros históricos en `comunicaciones` con `tipo = 'webhook_fire'` se conservan; la UI ya no genera nuevos eventos de ese tipo.
- **Sincronización del schema base**: eliminadas las columnas y comentarios sobre n8n en [supabase/schema.sql](supabase/schema.sql), [supabase/migrations/20260514000000_initial_schema.sql](supabase/migrations/20260514000000_initial_schema.sql) y [supabase/crm_kanban_ext.sql](supabase/crm_kanban_ext.sql). [src/lib/database.types.ts](src/lib/database.types.ts) actualizado a mano (Row/Insert/Update sin `webhook_url`/`webhook_activo`).
- **Verificación**: `npx tsc --noEmit` limpio. Búsqueda `grep -ri "n8n"` solo devuelve referencias en la migración de retirada y en esta entrada del README.

### Iteración 57 — *2026-05-14* — Fichajes: GPS obligatorio + panel admin para el owner

- **Migración [supabase/migrations/20260514130000_fichajes_admin.sql](supabase/migrations/20260514130000_fichajes_admin.sql)** (idempotente, `begin/commit`):
  - `perfiles_negocio.horas_objetivo_dia_default` `numeric(4,2) not null default 8.00` (check 0–24).
  - `miembros_negocio.horas_objetivo_dia` `numeric(4,2)` nullable (override por trabajador).
  - `registrar_fichaje()` ahora **rechaza** `p_gps_lat`/`p_gps_lng` nulos con `GPS_REQUERIDO` (RD-ley 8/2019: acreditación de presencia). El resto de la máquina de estados queda igual.
  - Nuevos RPC `set_horas_objetivo_default(numeric)` y `set_horas_objetivo_miembro(uuid, numeric)`, ambos `security definer`, autorizan vía `perfiles_negocio.user_id = auth.uid()` (solo owner). El de miembro acepta null para limpiar el override.
- **Cliente [src/app/(app)/fichajes/page.tsx](src/app/(app)/fichajes/page.tsx)**:
  - `obtenerGPS()` distingue 4 errores (`no_soportado`, `denegado`, `no_disponible`, `timeout`) y devuelve `GpsResult` discriminado. Si el usuario deniega permiso, se bloquea el fichaje y se muestra un toast explicando que es obligatorio.
  - Aviso permanente en cabecera advirtiendo de la obligatoriedad del GPS.
  - Detección de owner consultando `perfiles_negocio` por `user_id`; si existe, se renderiza `<PanelAdmin>` al final de la página.
- **Nuevo [src/components/fichajes/PanelAdmin.tsx](src/components/fichajes/PanelAdmin.tsx)**:
  - Input para las horas/día por defecto (RPC `set_horas_objetivo_default`).
  - Selector de periodo (hoy / 7 días / 30 días) y listado de miembros desde `v_equipo_negocio`. Para cada uno: total trabajado en el periodo y % vs objetivo (color verde/ámbar/rojo). Reutiliza `calcularJornada` y `fichajesDelDia` de [src/lib/fichajes.ts](src/lib/fichajes.ts).
  - Filas expandibles con override de horas por trabajador (RPC `set_horas_objetivo_miembro`, blanco = usar default) y detalle día a día.

### Iteración 56 — *2026-05-14* — Ajustes móvil colapsables + menú de usuario opaco + verificación de citas

- **[src/components/ajustes/SettingsTabs.tsx](src/components/ajustes/SettingsTabs.tsx)** — en móvil (<lg) se renderiza un acordeón con las 11 secciones colapsadas; al pulsar se despliega solo la activa. En desktop se mantienen las pestañas laterales (220px + panel). Se extrajo `renderPanel()` para reutilizar el switch entre ambos layouts y se eliminó el scroll horizontal del nav, que era el origen del responsive roto.
- **[src/components/layout/UserMenu.tsx](src/components/layout/UserMenu.tsx)** — el dropdown del usuario (móvil y desktop) deja de usar `card-glass` (semitransparente con `backdrop-blur`) y pasa a `bg-[#13123a]` opaco con borde `indigo-400/25` y `shadow-2xl`. Se mantienen color, animación de chevron y comportamiento (click-fuera, Escape, Mi perfil / Cambiar cuenta / Cerrar sesión).
- **Verificación de citas** — comprobado que [src/components/agenda/CitasLista.tsx](src/components/agenda/CitasLista.tsx) (vista de lista), [src/components/perfil/MisCitas.tsx](src/components/perfil/MisCitas.tsx) (perfil de usuario) y [src/components/crm/TabHistorial.tsx](src/components/crm/TabHistorial.tsx) (histórico por cliente) leen la misma tabla `agenda_eventos`. Una cita con `cliente_id` aparece en las tres vistas; sin cliente vinculado aparece en lista y perfil pero no en el histórico (por diseño — el histórico es por cliente individual).

### Iteración 55 — *2026-05-14* — Migraciones de seguridad y rendimiento del linter de Supabase

- **`supabase/migrations/20260514120000_security_fixes.sql`** (nuevo, 88 líneas, idempotente y en `begin/commit`): re-crea las 3 vistas que el linter marcaba.
  - `v_fichaje_estado_actual` y `v_consentimientos_negocio` con `with (security_invoker = on)` para que respeten la RLS del rol que las consulta (cierra el lint `security_definer_view`).
  - `v_equipo_negocio` sin JOIN a `auth.users` — el email del titular viene de `perfiles_negocio.email_contacto` y el de los miembros de `miembros_negocio.email` (cierra `auth_users_exposed`).
  - `grant select … to authenticated` en las tres.
- **`supabase/migrations/20260514120100_performance_fixes.sql`** (nuevo, 257 líneas, idempotente):
  - **RLS init plan**: 7 policies recreadas sustituyendo `auth.uid()` por `(select auth.uid())` para que Postgres lo evalúe UNA vez por consulta en lugar de por fila (`perfiles_owner`, `devices_owner`, `google_owner`, `pagos_owner`, `user_prefs_owner`, `fichajes_self_insert`, y las consolidadas).
  - **Consolidación de policies permisivas duplicadas**: `fichajes` (`miembros_owner_read` + `miembros_self_read` → `fichajes_read` con OR), `miembros_negocio` (`miembros_owner` + `miembros_self_read` → `miembros_read` + `miembros_write` separadas por acción), `terminos_versiones` (RLS habilitada + `terminos_read_all` lectura authenticated + INSERT/UPDATE/DELETE restringidas a `es_admin_global()`).
  - **13 índices nuevos en FKs**: `documentos(cliente_id, finanza_id)`, `finanzas(cliente_id)`, `tareas_kanban(cliente_id, columna_id)`, `tpv_ventas(cliente_id, user_id)`, `tpv_venta_items(negocio_id, producto_id)`, `stock_movimientos(user_id)`, `gastos_proveedor(proveedor_id)`, `miembros_negocio(invited_by)`, `fichajes(corrige_a)`.
  - **Drop de 12 índices base + 8 de tablas `_archivo` no usados** (cobertura defensiva con dos convenciones de nombre por si Postgres los autogeneró con sufijo `_idx`).
- **Validación**: `npx supabase db reset` aplicó todas las migraciones sin errores (solo NOTICE de `if exists`). `npx tsc --noEmit` limpio tras sustituir el `@ts-expect-error` de `src/lib/rgpd/exportar-datos.ts` por un cast `as never` (más estable a futuro porque no rompe si Supabase ajusta los tipos generados).

---

### Iteración 54 — *2026-05-14* — Exportación RGPD ZIP, fallback de degradación si Supabase cae y arreglo de columnas reales en Cmd+K

- **`src/lib/rgpd/exportar-datos.ts`** (nuevo): helper que descarga las tablas del usuario (`clientes`, `agenda_eventos`, `tareas_kanban`, `finanzas`, `documentos`, `comunicaciones`, `perfiles_negocio`, `consentimientos_rgpd`) y las empaqueta con `fflate` (`zipSync`) en un ZIP con un `README.txt` que incluye fecha ISO, email del usuario, lista de archivos generados, incidencias por tabla fallida y un resumen de derechos RGPD (Arts. 15-22). Si una tabla falla en el `select`, se omite su JSON y la incidencia queda anotada en el README en lugar de abortar la exportación. Nombre del fichero: `r3zon-datos-YYYY-MM-DD.zip`.
- **`src/components/ajustes/ExportarDatosButton.tsx`** (nuevo): botón glass cyan con spinner de `Loader2`, deshabilitado durante la generación; al terminar dispara la descarga con un `<a download>` + `URL.createObjectURL` y libera la URL al cabo de 1 s. Errores mostrados inline en banda rosa.
- **`src/components/ajustes/CumplimientoTab.tsx`**: la card *Portabilidad de datos* deja de remitir a la pestaña Datos y embebe directamente el nuevo botón con una descripción del contenido del ZIP.
- **`src/components/ui/DatabaseUnavailable.tsx`** (nuevo): pantalla glass centrada con icono `DatabaseZap` fuchsia, copy "No se puede conectar con la base de datos" + "Comprueba tu conexión a internet…" y botón "Reintentar" que ejecuta `window.location.reload()`.
- **`src/components/layout/AppShell.tsx`**: al montar dispara `supabase.auth.getSession()` con `Promise.race` contra un timeout de 5 s. Estado local `"checking" | "ok" | "down"`; si la promesa falla, devuelve error o supera el timeout, renderiza `<DatabaseUnavailable />` (dentro del `ToastProvider`) en lugar de los `children`. El `CommandPalette` se sigue montando como singleton al nivel del shell.
- **`src/components/layout/CommandPalette.tsx`**: corregidos los nombres de columna que estaban inventados. Ahora `agenda_eventos` busca por `title` y `description`, `tareas_kanban` añade `descripcion` al `or()` y la muestra como subtítulo, y `finanzas` usa `concepto` + `numero_factura` (en lugar de los inexistentes `descripcion`, `referencia` e `importe`) y muestra fecha · nº factura · total como subtítulo. El atajo Cmd/Ctrl+K, la navegación con flechas, Enter y Esc ya estaban implementados correctamente.

Decisiones: timeout de 5 s elegido por consistencia con `OfflineBanner`; el ZIP se genera 100% client-side (cero coste de servidor, política R3ZON); para evitar el tipado literal estricto de Supabase en el bucle de tablas dinámicas se usa un único `@ts-expect-error` localizado, ya que la RLS garantiza el filtrado por tenant sin necesidad de `where` extra.

---

### Iteración 53 — *2026-05-13* — Módulo de Ajustes responsive en móvil

- **`src/components/ajustes/EquipoTab.tsx`**: tabla de miembros envuelta en `overflow-x-auto` con `min-w-[640px]`, botón "Invitar miembro" `w-full sm:w-auto`, descripción de cabecera con `sm:max-w-lg`.
- **`src/components/ajustes/SuscripcionTab.tsx`**: historial de pagos con scroll horizontal, padding de `PlanActual` reducido a `p-4 sm:p-6`, botón "Gestionar suscripción" full-width en móvil.
- **`src/components/ajustes/SeguridadTab.tsx`**: cards MFA y "Cerrar sesión en todos los dispositivos" pasan de `flex items-start justify-between` a `flex flex-col gap-3 sm:flex-row` (botones full-width en móvil). Lista de dispositivos conocidos apilada en móvil; `max-w-md` del párrafo de logout convertido a `sm:max-w-md`. Botón "Actualizar contraseña" full-width en móvil.
- **`src/components/ajustes/InvitarMiembroModal.tsx`**: contenedor con `max-h-[90vh] flex flex-col`, body interior `flex-1 overflow-y-auto` para que el scroll quede dentro del modal y no desborde la pantalla. Footer en `flex-col-reverse` en móvil (Cancelar abajo, Enviar invitación arriba), botón principal full-width.
- **`src/components/ajustes/HelpDrawer.tsx`**: padding del cuerpo reducido (`p-4 sm:p-5`) para aprovechar mejor el ancho en pantallas estrechas.
- **`src/components/ajustes/PlaceholderTab.tsx`**: padding de `p-6 sm:p-8` → `p-4 sm:p-8`.
- **`src/components/ajustes/NegocioTab.tsx`**: botón "Guardar cambios" full-width en móvil.
- **`src/components/ajustes/GoogleCard.tsx`** y **`src/components/ajustes/N8nCard.tsx`**: header de cada integración (logo + título + badge) se apila en móvil; en N8nCard los pares input + botón Guardar pasan a `flex-col` (botón full-width abajo) y la "Desconectar Google" / "Conectar Google" también full-width en móvil.

Patrón único reutilizado en toda la auditoría: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` + `w-full sm:w-auto` en botones de acción + `overflow-x-auto` envolviendo `<table>` con `min-w-[640px]`. Esto mantiene el diseño glass intacto en escritorio mientras evita scroll horizontal indeseado a 320–640 px.

`tsc` limpio, 132/132 tests verdes. No se tocaron AparienciaTab, AccesibilidadTab, ListadoTab, DatosTab, CumplimientoTab ni IntegracionesTab porque ya eran responsive.

---

### Iteración 52 — *2026-05-13* — Finanzas: eliminado "Exportar CSV" y cabecera a ancho completo

- **`src/app/(app)/finanzas/page.tsx`**: retirado el botón **Exportar CSV** y toda la función `exportarCSV` (junto con los imports `Download`, `useToast`, `descargarCSV`). El `PageHeader` deja de estar envuelto en un `flex justify-between` y pasa a ocupar todo el ancho de la página, manteniendo coherencia con el resto de pantallas. La exportación global sigue disponible desde Ajustes › Datos (ZIP completo) para usuarios que la necesiten.

`tsc` limpio, 132/132 tests verdes.

---

### Iteración 51 — *2026-05-13* — Limpieza de Proveedores y reordenación del sidebar

- **`src/app/(app)/proveedores/page.tsx`**: eliminadas las pestañas **Gastos generales** y **Gastos previstos**; la página queda con dos secciones (**Proveedores** + **Suscripciones**). `TabId` se reduce a `"proveedores" | "suscripcion"`, se quita el icono `CalendarClock` y se simplifica la inicialización del modal (siempre `estado: "pendiente"` y `recurrencia: "mensual"` porque ya solo se crean suscripciones). El header de la página pasa a "Directorio de proveedores y gestión de suscripciones recurrentes." Los registros antiguos con `tipo = "general" | "previsto"` siguen en la BD pero no se exponen en la UI.
- **`src/components/layout/Sidebar.tsx`**: **Proveedores** sube en el orden — ahora aparece justo después de **Clientes**, coherente con la idea de "directorio de contactos" (clientes + proveedores juntos).

`tsc` limpio, 132/132 tests verdes.

---

### Iteración 50 — *2026-05-13* — Sidebar scrolleable, cambio de contraseña y responsive móvil en Ajustes/Proveedores

Ajustes de UX detectados al usar la app en móvil:

- **`src/components/layout/Sidebar.tsx`**: refactor en tres bandas — el logo queda fijo arriba, el bloque de navegación es `flex-1 overflow-y-auto` (las secciones se deslizan independientemente) y el `UserMenu` se ancla abajo con `border-t` y `backdrop-blur` para que el perfil esté siempre accesible aunque la lista crezca. Esto soluciona el problema móvil donde la última sección y el botón de usuario quedaban fuera de pantalla.
- **`src/components/ajustes/SeguridadTab.tsx`**: nueva tarjeta **Cambiar contraseña** con re-autenticación previa (`signInWithPassword` con el email actual + contraseña actual antes de invocar `updateUser({ password })`), validación cliente (mínimo 8 caracteres, distinta de la actual, confirmación que coincida), indicador de fuerza de 1–5 barras (longitud + may/min + dígitos + símbolos) y toggle ojo/ojo-tachado para mostrar las tres contraseñas. Mensajes de error inline por campo y feedback de éxito reutilizando el toast existente.
- **`src/components/ajustes/SettingsTabs.tsx`** y **`src/app/(app)/proveedores/page.tsx`**: la navegación lateral de pestañas pasa de `flex-1` (que en móvil exprimía 11 pestañas en horizontal) a `shrink-0` con `whitespace-nowrap` y scroll horizontal natural. En desktop sigue siendo columna vertical (`lg:flex-col`).
- **`src/app/(app)/proveedores/page.tsx`**: los modales `ProveedorModal` y `GastoModal` cambian `grid grid-cols-2` por `grid grid-cols-1 sm:grid-cols-2`, evitando inputs cortados en pantallas estrechas. Los elementos que ocupaban dos columnas (`col-span-2`) se condicionan a `sm:col-span-2` para que respeten la columna única móvil.

Verificación: `npx tsc --noEmit` exit 0, 132/132 tests pasan.

---

### Iteración 49 — *2026-05-13* — Auditoría integral v1.1: seguridad endurecida, errores legibles y accesibilidad WCAG AA

Diagnóstico completo en tres frentes (seguridad / gestión de errores / accesibilidad) y ejecución en un único sprint:

**Seguridad — cabeceras HTTP, timing-safe crypto y documentación de secretos**

- **`next.config.mjs`**: añadidos headers `Content-Security-Policy` (con allow-list para Supabase, Stripe, Google y Vercel Analytics, `worker-src blob:` para Tesseract, `frame-ancestors 'none'`), `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy` con cámara/micro/geo deshabilitados. No se aplican en modo `output: export` (Capacitor) porque Vercel los strippea en export estático.
- **`supabase/security_timing_hardening.sql` (nuevo)**: reescribe `find_connection_by_channel(text, text)` con comparación de digests SHA-256 de longitud fija → mitiga timing attacks sobre `channel_token` del webhook de Google Calendar. Restringe `EXECUTE` a `service_role`. Integrado en `setup.sql` tras `security_hardening.sql`.
- **`.env.local.example`**: documentado cómo generar y rotar `app.config_master_key` (GUC pgcrypto) con `openssl rand -base64 48`. Aclara que la clave vive en Supabase Custom Postgres Config, no en `.env` del frontend, y que la rotación requiere re-cifrar `google_connections`.
- **`.gitignore`**: verificado — `.env*.local` excluido, ningún archivo de secretos commiteado (`git ls-files | grep env` solo devuelve `.env.local.example`).
- **`src/app/api/billing/webhook/route.ts`**: sanitizada la respuesta — ya no devuelve `err.message` al cliente (potencial filtrado de stack/detalles internos). Los detalles se loguean en servidor.

**Gestión de errores — todos los errores ahora son legibles y dentro del design system**

- **`src/lib/supabase-errors.ts` (nuevo)**: `formatSupabaseError(err)` mapea códigos PostgREST (`23505`, `23503`, `23502`, `42501`, `22P02`, `PGRST116`, `PGRST301`…), errores de auth (`Invalid login credentials`, `Email rate limit`, `JWT expired`…), Storage (`Payload too large`, `mime type`…), red (`Failed to fetch`, `timeout`…) y HTTP status a mensajes en español. Filtro `looksTechnical()` evita filtrar mensajes con `violates`/`constraint`/`stack` al usuario.
- **`src/lib/stripe-errors.ts` (nuevo)**: traductor equivalente para Stripe (decline_codes, card_declined, expired_card, etc.).
- Integrado en **`useSupabaseQuery`** (todas las cargas) y en 5+ tabs de Ajustes: `ListadoTab`, `SeguridadTab` (2), `N8nCard` (3), `FacturacionTab` (4), `DatosTab`, `CumplimientoTab`, `GoogleCard`, `TaskModal`, `ContactosTab`, `proveedores`, `listado`, `perfil`.
- **`src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/(app)/error.tsx`, `src/app/(app)/loading.tsx` (nuevos)**: boundaries glass con CTAs "Reintentar" y "Ir al panel", coherentes con `not-found.tsx`. `global-error.tsx` incluye estilos inline para funcionar incluso si falla el root layout.
- **`src/components/ui/ConfirmDialog.tsx` (nuevo)** + hook `useConfirmDialog()`: sustituye las 16 ocurrencias de `window.confirm()` por un modal glass accesible con `tone` (`danger`/`warning`/`info`) y opción `requireTyping` para acciones críticas. Migradas: `EquipoTab`, `SeguridadTab`, `N8nCard`, `CumplimientoTab`, `GoogleCard`, `EventModal`, `TaskModal`, `ColumnManager`, `ContactosTab`, `clientes/[id]`, `proveedores` (×2), `listado`, `perfil`, `tpv`.
- **`src/components/ui/OfflineBanner.tsx` (nuevo)**: banner sticky en AppShell que aparece cuando `navigator.onLine === false` con `role="status"` y `aria-live="polite"`.

**Accesibilidad — WCAG 2.1 AA y nueva pestaña Accesibilidad en Ajustes**

- **`src/app/globals.css`**: regla global `:focus-visible` con outline cyan (offset 2-3 px), variante específica para inputs con `box-shadow ring`, soporte `prefers-reduced-motion: reduce`, clases `html.reduce-motion`, `html.alto-contraste` (glass → sólido + contraste reforzado), `html.underline-links`, `html.large-cursor` (cursor SVG 32 px) y `.skip-link`.
- **`src/components/ui/Modal.tsx`**: focus trap completo (Tab/Shift+Tab confinados), focus return al cerrar (`document.activeElement` previo restaurado), `aria-labelledby` automático cuando `title` es string, dialog root `tabIndex={-1}` para recibir foco si no hay elementos focusables internos.
- **`src/components/ui/Field.tsx`**: refactor breaking-but-compatible — genera `id` con `useId()` si el hijo no lo tiene, `<label htmlFor>` apunta al control, propaga `aria-invalid` y `aria-describedby` al child cuando hay error/hint, mensajes de error con `role="alert"`.
- **`src/lib/a11y-prefs.ts` (nuevo)**: módulo con `loadA11yPrefs/saveA11yPrefs/applyA11yPrefs` (localStorage + clases en `<html>`) y `A11Y_BOOT_SCRIPT` inline para `layout.tsx` que aplica las clases antes del primer paint (sin FOUC).
- **`src/components/ajustes/AccesibilidadTab.tsx` (nuevo)** + tab "Accesibilidad" en `SettingsTabs` (entre Apariencia y Listado): selector de tamaño de texto (sm/md/lg/xl, reutiliza `--font-scale`), toggles para Reducir movimiento, Alto contraste, Subrayar enlaces, Cursor grande, y cheat-sheet de atajos de teclado (Cmd+K, Esc, Tab, ↑↓ Enter). Toggle row accesible con `role="switch"` y `aria-checked`. `TabId` extendido en `types.ts`.

**Tests y calidad**

- `npx tsc --noEmit` → 0 errores.
- `npm run test:run` → **132/132 verde** (test de `<Field>` actualizado para la nueva semántica `htmlFor`+`id` + 1 test nuevo de propagación de `aria-invalid`/`aria-describedby`).

Pendiente para una v1.2: endpoint `/api/account/delete` (RGPD borrado total), rate limiting en `team/invite` y `billing/checkout`, alternativa de teclado en el drag&drop del Kanban (dnd-kit `KeyboardSensor`), tests de a11y con `jest-axe`.

### Iteración 48 — *2026-05-12* — Endurecimiento de seguridad: RLS en tablas archivo y vistas con `security_invoker`

Auditoría del Database Linter de Supabase. Se resuelven los 8 ERRORES detectados:

- **RLS habilitada** en `fichajes_archivo`, `stock_movimientos_archivo`, `tpv_ventas_archivo` y `tpv_venta_items_archivo` con políticas `SELECT` por tenant vía `current_negocio_id()`.
- **Vistas reescritas con `security_invoker = on`** (`v_fichaje_estado_actual`, `v_consentimientos_negocio`, `v_equipo_negocio`) — ya no se ejecutan con privilegios del creador.
- **`v_equipo_negocio` sin JOIN a `auth.users`**: el email del titular se toma de `perfiles_negocio.email_contacto`. Elimina el lint `auth_users_exposed`.

Nuevo fichero `supabase/security_hardening.sql` (idempotente) integrado en `setup.sql` tras `fix_tenant_defaults.sql`. Los WARNs restantes (search_path mutable en triggers, RPCs `security definer` intencionales por diseño del modelo de roles, buckets públicos para logos/avatares) se aceptan como decisiones de arquitectura.

### Iteración 47 — *2026-05-12* — Búsqueda global Cmd+K, pestaña Datos (import/export), sistema de roles con super admin global y ROLES.md

**Nuevas capacidades transversales**

- **Búsqueda global**: `src/components/layout/CommandPalette.tsx` (nuevo) — atajo `Cmd+K`/`Ctrl+K` desde cualquier ruta autenticada; búsqueda con debounce 200 ms en clientes, citas, tareas, finanzas y documentos con resultados agrupados por tipo, iconos y navegación con teclado (↑↓ Enter Esc); integrado en `AppShell`.
- **Pestaña Datos en Ajustes**: `src/components/ajustes/DatosTab.tsx` (nuevo) — concentra toda la gestión import/export del negocio:
  - Exportación ZIP completa (movida desde Cumplimiento, conserva los 7 recursos + consentimientos).
  - Exportación CSV individual por recurso (clientes, finanzas, tareas, documentos, citas, comunicaciones).
  - Importación JSON (acepta tanto formato de tabla individual como bundle multi-tabla del export R3ZON).
  - Importación CSV con detección heurística de tabla destino y separador (`,` o `;`); parser propio en `src/lib/csv.ts:parseCSV()` sin dependencias.
- **Sistema de roles profesional**: `supabase/roles_ext.sql` (nuevo) introduce tres dimensiones desacopladas:
  - **`admin_global`**: tabla nueva con RLS restrictiva; función `es_admin_global()` consultable desde RLS y RPCs.
  - **`miembros_negocio.permisos jsonb`**: overrides granulares por recurso/acción que sobrescriben el baseline del rol punto-fino.
  - **`permisos_baseline(rol)`**: función inmutable como única fuente de verdad de los permisos por defecto (`admin`/`editor`/`lector`).
  - **`tiene_permiso(recurso, accion)`**: resolución unificada usable desde RLS, RPCs y servidor.
  - **`v_permisos_actuales`**: vista que devuelve `nivel`/`rol`/`permisos` del usuario en una sola query.
  - Hook cliente `src/lib/usePermissions.ts` con API `{ can, esAdmin, nivel, rol }` para gating de UI.
  - Documentación completa en `ROLES.md` (raíz del repo) con arquitectura, baseline por rol, ejemplos en RLS/Server Actions/cliente y decisiones de diseño justificadas.
- **Modo claro**: ya estaba implementado en el theme engine (`mode` segmented en `theme-schema.json` + overrides en `applyTheme()` + boot script en `layout.tsx`); confirmado funcional.
- **Vercel Analytics**: ya integrado en iteración previa (`@vercel/analytics/next` + `<Analytics />` en root layout).

**Revisión de dependencias**

- Eliminada `class-variance-authority` (0 usos en el código). Conservadas el resto: `tailwind-merge` (`lib/utils.ts`), `tailwindcss-animate` (plugin Tailwind), `@xyflow/react` (HierarchyChart), `clsx`, `tesseract.js`, `recharts`, `@fullcalendar/*`, `@dnd-kit/*`, `html2canvas`/`jspdf`/`fflate` (lazy-loaded en runtime), `zod`, `stripe`, `pg` (sólo scripts dev).

**SQL nuevo**: `supabase/roles_ext.sql` (admin_global + permisos jsonb + funciones + vistas). Incluido en `setup.sql` después de `team_ext.sql`.

**Pendiente**: §11 recordatorios email · UI para editar `permisos` granulares en EquipoTab · panel `/admin` global.

---

### Iteración 46 — *2026-05-12* — Sprint v1.0 completo: limpieza técnica, errores, seguridad, comunicaciones, exportación, plan Free, PDF, analytics

**Plan v1.0 ejecutado íntegramente (§1–§10, §12)**

- **§1 Limpieza técnica**: eliminados `page 2.tsx` duplicados en clientes y clientes/nuevo; tipos `Producto` y `Documento` migrados a `Database["public"]["Tables"][...]["Row"]` en `src/lib/inventario.ts` y `src/lib/documentos.ts`
- **§2 Gestión de errores**: `useToast` añadido a `cargar()` en clientes, tareas y finanzas; estados vacíos con CTA existentes confirmados
- **§3 Onboarding**: flujo registro → onboarding → dashboard confirmado funcional con consentimientos RGPD y `seed_kanban` trigger
- **§4 Entorno documentado**: `.env.local.example` reescrito con las 20+ variables comentadas; README actualizado con orden de los 21 SQL y setup de webhooks
- **§5 Seguridad**: auditoría confirmó que tokens Google no se exponen, `channel_token` usa `timingSafeEqual`, `SERVICE_ROLE_KEY` nunca en `NEXT_PUBLIC_*`, webhook Stripe valida `stripe-signature`
- **§6 Comunicaciones**: tab `Comunicaciones` restaurado en `/clientes/[id]` con `TabComunicaciones` (lista cronológica + añadir nota)
- **§7 Exportación RGPD**: `src/lib/csv.ts` (nuevo utilitario BOM+CSV); botón "Exportar CSV" en `/clientes` y `/finanzas`; botón "Exportar mis datos" en Ajustes → Cumplimiento genera ZIP con 7 tablas vía `fflate`
- **§8 Plan Free**: `src/lib/usePlan.ts` (nuevo hook) con `LIMITES` por tier (free/pro/business); banners de upgrade y botón "Nuevo" deshabilitado al alcanzar límite en clientes y tareas
- **§9 Testing**: 131 tests en 13 archivos ya pasando — sin cambios necesarios
- **§10 PDF**: `descargarPDF()` en `/documentos/[id]` reescrita con `jsPDF` + `html2canvas` carga lazy; soporte multi-página A4 y formato ticket 80mm; botón "Imprimir" separado
- **§12 Observabilidad**: `@vercel/analytics` instalado y `<Analytics />` en `src/app/layout.tsx`; logs estructurados con timestamp en el cron `refresh-google-channels`

**Pendiente (post-v1.0)**: §11 recordatorios email · §13 modo claro · §14 búsqueda global Cmd+K

---

### Iteración 45 — *2026-05-12* — Vistas alternativas en Clientes (lista / tarjetas, organigrama jerárquico) y reorganización de la ficha

**Listado de clientes con dos vistas conmutables**
- `src/app/(app)/clientes/page.tsx`: añadido conmutador *Lista* ↔ *Tarjetas* en la barra superior. La vista por defecto es **lista** (más densa, optimizada para escanear). La preferencia se persiste por usuario en `localStorage["clientes:vista"]`.
- Vista lista: filas compactas con avatar, razón social, badge de estado, CIF/sector/email/teléfono y acciones rápidas (llamar, WhatsApp, email, web). El `Link` cubre toda la fila vía *stretched link* y los iconos de acción se superponen con `pointer-events`.
- Vista tarjetas: se conserva intacta la cuadrícula previa.

**Organigrama jerárquico como vista predeterminada de Contactos**
- `src/components/clientes/ContactosTab.tsx`: añadido conmutador *Árbol* ↔ *Tarjetas*. La vista por defecto es **árbol**, que reutiliza `HierarchyChart` (`@xyflow/react`) para dibujar el organigrama a partir de `reports_to`. Se va construyendo automáticamente conforme se añaden contactos con su superior directo. La preferencia se persiste en `localStorage["clientes:contactos:vista"]`.

**Separación de Documentos y Movimientos**
- `src/components/crm/TabDocumentos.tsx`: simplificado — ahora muestra **solo** documentos comerciales (facturas, presupuestos, albaranes) a ancho completo.
- `src/components/crm/TabMovimientos.tsx` (nuevo): contiene la sección de ingresos/gastos que antes vivía dentro de Documentos. Lee `finanzas` filtrando por `cliente_id` y mantiene el formato con badges de estado de pago.

**Limpieza de pestañas en la ficha del cliente**
- `src/app/(app)/clientes/[id]/page.tsx`: eliminadas las pestañas **Mensajes** (`TabComunicaciones`) y **Automático** (`TabAutomatizacion`); añadida la pestaña **Movimientos**. Orden final: *Información · Contactos · Historial · Documentos · Movimientos*.
- Sincronización con agenda ya garantizada desde la iteración 44: los eventos creados en el calendario con cliente asociado se ven en la pestaña *Historial* (consulta directa de `agenda_eventos`).

### Iteración 44 — *2026-05-12* — Módulo **Citas** con lista, vista anual, modal con bloque "Adicionales", historial conectado a `agenda_eventos`, sección de citas en Perfil, y documentos por cliente

**Historial de citas conectado a la fuente real**
- `src/components/crm/TabHistorial.tsx`: corregido — antes consultaba la tabla legacy `citas` (vacía en producción), ahora lee `agenda_eventos` (que es la sincronizada con Google). Campos remapeados (`title`, `description`, `start_time`, `end_time`, `estado`, `ubicacion`). El botón "Nueva cita" enlaza ahora a `/citas?cliente=…`.

**Módulo Citas con calendario + lista**
- `src/app/(app)/citas/page.tsx`: convertido a `"use client"` con segmented control **Calendario / Lista**.
- Nuevo `src/components/agenda/CitasLista.tsx`: listado completo de eventos (`agenda_eventos` con join a `clientes`) con búsqueda por título/cliente/ubicación y filtros **Próximas / Hoy / 7 días / Pasadas / Todas**. Ordena ascendente salvo en "Pasadas". Cada fila enlaza al cliente si está vinculado.

**Vista anual en el calendario**
- `npm install @fullcalendar/multimonth@6.1.20`.
- `src/components/agenda/CalendarView.tsx`: añadido `multiMonthPlugin`, locale traducido (`year: "Año"`), botón **Año** en la `headerToolbar`, vista `multiMonthYear` configurada (4 columnas, ancho mínimo 220px).

**Calendario a página completa**
- `src/components/layout/AppShell.tsx`: lee `usePathname()` y, para las rutas listadas en `FULL_BLEED = ["/citas"]`, retira el `max-w-[1240px]` del `<main>` para que el calendario ocupe todo el ancho disponible.

**Modal de cita reordenado con bloque "Adicionales"**
- `src/components/agenda/EventModal.tsx`:
  - Cuerpo reordenado: título → inicio → fin → color (siempre visibles).
  - Nuevo bloque colapsable **Adicionales** (icono `Sliders`, `ChevronDown/Right`) al final del formulario con: persona asociada (combobox de clientes), ubicación y notas.
  - Se abre automáticamente al editar una cita si ya tiene cliente, ubicación o notas.

**Sección "Mis próximas citas" en Perfil**
- Nuevo `src/components/perfil/MisCitas.tsx`: lista de hasta 8 citas futuras (`start_time >= now`, `estado != 'cancelada'`) con cliente vinculado, ubicación, hora y duración. Enlace directo al cliente y a la agenda.
- Integrado en `src/app/(app)/perfil/page.tsx` entre los datos personales y el bloque de Permisos.

**Documentos asociados al cliente**
- Nuevo `src/components/crm/TabDocumentos.tsx`: dos paneles en paralelo dentro de la ficha del cliente:
  - **Documentos comerciales** (`documentos` con `cliente_id = clienteId`): referencia, tipo, fecha, total, estado (`borrador|generado|enviado|pagado|anulado`), enlace al PDF y al detalle.
  - **Movimientos financieros** (`finanzas` con `cliente_id = clienteId`): concepto, fecha, total con signo según `tipo`, estado de pago.
- `src/app/(app)/clientes/[id]/page.tsx`: nueva tab **Documentos** (icono `FileText`) entre "Historial" y "Mensajes".

---

### Iteración 43 — *2026-05-12* — Cumplimiento RGPD: consentimientos del titular, onboarding obligatorio y sección **Cumplimiento** en Ajustes

**Modelo de datos**
- Nuevo `supabase/rgpd_ext.sql` (idempotente) sobre la tabla existente `consentimientos_rgpd`:
  - RPC `registrar_consentimiento(tipo, version, aceptado, ip, user_agent)` que inserta el consentimiento del titular (`cliente_id = NULL`) en el negocio actual (`current_negocio_id()`), con sello temporal y firma de evidencia.
  - RPC `revocar_consentimiento(tipo)` que marca `revocado_en` en la última aceptación vigente del tipo.
  - Vista `v_consentimientos_negocio`: estado actual (vigente / revocado / rechazado) por tipo para el titular del negocio.
- `scripts/apply-pending-migrations.mjs` actualizado para aplicar `rgpd_ext.sql`.

**Onboarding obligatorio**
- `src/app/(auth)/registro/page.tsx`: añadidos tres checkboxes:
  - **Privacidad + aviso legal** (obligatorio, bloquea el submit si no se marca).
  - **Cookies** (opcional, según LSSI-CE art. 22.2).
  - **Comunicaciones comerciales / marketing** (opcional, RGPD art. 6.1.a).
  - Los consentimientos se persisten en `user_metadata.pending_consents` durante el `signUp`.
- `src/app/auth/callback/route.ts`: tras `exchangeCodeForSession`, lee `pending_consents` del usuario, llama a la RPC `registrar_consentimiento` por cada uno pasando IP (de `x-forwarded-for`) y user-agent, y limpia los pendientes.
- La invitación de miembros (`src/app/api/team/invite/route.ts`) ya almacena `privacidad_version` / `terminos_version` y el RPC `aceptar_invitacion` registra el consentimiento del invitado al primer login.

**Sección Cumplimiento en Ajustes**
- Nueva tab `Cumplimiento` (icono `Scale`) en `src/components/ajustes/SettingsTabs.tsx` y en el union `TabId` de `types.ts`.
- `src/components/ajustes/CumplimientoTab.tsx`:
  - Grid de tarjetas con enlaces públicos a `/legal/privacidad`, `/legal/cookies`, `/legal/aviso-legal`, `/legal/terminos`.
  - Lista de consentimientos registrados leyendo `v_consentimientos_negocio`, con badges `Vigente` / `Revocado` / `Rechazado`, versión y fecha de aceptación.
  - Botón **Revocar** para tipos opcionales (`cookies`, `marketing`) que invoca `revocar_consentimiento`.

**Navegación**
- `src/components/layout/Sidebar.tsx`: entrada `RGPD` eliminada (junto al icono `ShieldCheck` no utilizado). La ruta `src/app/(app)/rgpd/` se ha borrado; el cumplimiento vive ahora dentro de Ajustes.

---

### Iteración 42 — *2026-05-12* — Unificación Productos + Stock en página **Listado** con modo stock configurable

**Página unificada `/listado`**
- Nueva ruta `src/app/(app)/listado/page.tsx` que fusiona el catálogo (antiguo `/productos`) y la vista de inventario (antiguo `/stock`) en una sola pantalla. Se eliminan ambas rutas previas.
- **Filtro Producto / Servicio / Todos** como segmented control (junto a la búsqueda y al filtro de categoría). En modo stock activo, además filtro de estado (Con stock / Bajo / Agotado / Sin inventario).
- **Etiquetas de stock a la izquierda de cada fila, separadas pero alineadas con ella**: columna fija a la izquierda (`w-32`) con la badge (`En stock`, `Stock bajo`, `Agotado`, `Sin inventario`) fuera de la tarjeta del producto. Las filas se alinean verticalmente con su etiqueta. Se oculta en móvil (`hidden sm:flex`) para mantener legibilidad.
- **Los servicios nunca muestran etiqueta de inventario** (no son inventariables); en su lugar llevan un chip "Servicio" inline dentro de la fila.
- KPIs (Con stock / Bajo / Agotados) y panel "Últimos movimientos" sólo se renderizan si el modo stock está activo, y excluyen servicios del cálculo.
- Conservado del antiguo `/productos`: alta/edición con modal, subida de imagen (`producto-imagenes`), escáner de códigos de barras (`BarcodeScanModal`), borrado optimista. Conservado de `/stock`: modal de movimientos (entrada/salida/ajuste) y paginación de movimientos.

**Modo stock configurable (Ajustes → Listado)**
- `supabase/listado_ext.sql` nuevo: `alter table perfiles_negocio add column if not exists stock_mode_enabled boolean not null default true`. Idempotente.
- Nuevo tab **Listado** en `src/components/ajustes/SettingsTabs.tsx` con un toggle (`role="switch"`) que persiste `stock_mode_enabled` en el perfil del negocio. Componente: `src/components/ajustes/ListadoTab.tsx`.
- `PerfilNegocio.stock_mode_enabled` añadido a `src/components/ajustes/types.ts`.
- Con stock desactivado: el listado oculta KPIs, panel de movimientos, filtro de estado, botones de movimiento y badges. Los productos siguen siendo catálogo con precio/IVA/categoría/tipo.

**Navegación**
- `src/components/layout/Sidebar.tsx`: dos entradas (`Productos` + `Stock`) reemplazadas por una sola entrada **Listado** (icono `Boxes`).

**Migraciones**
- `scripts/apply-pending-migrations.mjs` actualizado para aplicar `supabase/listado_ext.sql`.

---

### Iteración 41 — *2026-05-11* — Refactor módulo Documentos: formatos A4 vs ticket térmico, recibo, formulario con desplegables, colores configurables, bucket `logos`

**Plantilla**
- `src/components/documentos/PlantillaDocumento.tsx` reescrito en dos plantillas: `PlantillaA4` (presupuesto, factura, albarán, proforma, **recibo**) y `PlantillaTicket` (sólo `ticket`, 80mm térmico vertical con tipografía monoespaciada).
- `FORMATO_TIPO` en `src/lib/documentos.ts` mapea cada `TipoDocumento` a su formato físico. El selector A4 vs ticket se aplica también al `@page` del HTML generado por `window.print` (tanto en `nuevo` como en `[id]`).
- A4: la columna de fechas (emisión/vencimiento) ahora se alinea verticalmente al centro del bloque cliente (`alignItems: stretch` + `justifyContent: center`).
- Logo del emisor incrustado en el documento (A4 a la izquierda del título, ticket centrado sobre el nombre). `EmisorSnapshot.logo_url` propagado desde el perfil.
- Colores parametrizables vía prop `colores` (primario, texto, acento, acentoSuave) con defaults; consumidos desde el motor de tema.

**Nuevo tipo "Recibo"**
- `TipoDocumento` extendido con `'recibo'`. Añadido a `ETIQUETA_TIPO`, `DESCRIPCION_TIPO`, `TIPOS_DOCUMENTO`, `FORMATO_TIPO` (`a4`) y `ICONO_TIPO` (`BadgeCheck`) tanto en `nuevo/page.tsx` como en el listado.
- `supabase/documentos_recibo_logos_ext.sql` nuevo: amplía el CHECK constraint de `documentos.tipo` y los dos RPCs (`siguiente_numero_documento`, `crear_documento_generado`) para aceptar `'recibo'`. Idempotente.

**Formulario del editor (`/documentos/nuevo`)**
- Cliente: la barra de búsqueda por texto se sustituye por un `<select>` de clientes guardados; conserva el botón "Añadir cliente manualmente" para captura ad-hoc.
- Sección **"Líneas"** renombrada a **"Contenido"**. Cada línea expone un `<select>` con productos/servicios activos del módulo Productos: al elegir uno se rellenan descripción, precio e IVA. Botón "Añadir manualmente" para filas libres.
- El botón verde **Generar** se ha movido del formulario al panel derecho, **debajo de la previsualización**, con el listado de errores de validación contextual.
- Carga inicial extendida para traer `productos` activos y el `logo_url` del perfil.

**Tema configurable de documentos (Ajustes → Apariencia)**
- `src/lib/theme/theme-schema.json`: nuevos controles `doc.primario`, `doc.texto`, `doc.acento`, `doc.acentoSuave` (color pickers, sin alterar variables CSS globales). Persistencia automática vía `ThemeProvider`.
- `nuevo/page.tsx` deriva `coloresDocumento` desde `useThemeEngine().theme` y lo inyecta en `PlantillaDocumento`.

**Bucket `logos` (fix bug)**
- `supabase/documentos_recibo_logos_ext.sql` crea el bucket público `logos` con las cuatro políticas RLS (lectura libre; insert/update/delete restringidos a los miembros del negocio cuya primera carpeta coincida con `current_negocio_id()`). La subida del logo en Ajustes → Negocio dejará de fallar con `bucket not found`.

**AparienciaTab**
- Eliminada la tarjeta "Vista previa" del final.
- Eliminadas las cajas de texto de muestra a la derecha de cada selector de tipografía (el `<select>` se renderiza a ancho completo).

**Migraciones**
- `scripts/apply-pending-migrations.mjs` actualizado para aplicar `supabase/documentos_recibo_logos_ext.sql`.

---

### Iteración 40 — *2026-05-11* — Iconos+charts+light theme · menú usuario · perfil · proveedores · productos con imagen+barcode · suscripción con método de pago

**Tema (fixes pendientes)**
- `tailwind.config.ts`: `backgroundImage` (rainbow, accent, glass, glass-strong) y `boxShadow` (glass, glow) ahora usan `rgb(var(--…) / α)` en vez de hex/rgba hardcoded. Hacía que la sección activa de la sidebar y la caja del plan no respondieran al cambio de tema.
- `src/lib/theme/useThemeColors.ts` nuevo: hook que lee `getComputedStyle` y devuelve `rgb()` resueltos para Recharts (cyan, fuchsia, indigos, bg…). Se re-suscribe al cambio de tema vía `useThemeEngine`.
- `src/components/finanzas/Charts.tsx`: reescrito para consumir `useThemeColors()` — ejes, grid, barras, líneas, tooltip y leyenda ahora cambian con el tema.
- `src/lib/theme/theme.ts`: modo claro estrena un "blanco roto" (`#eef0f6` en vez de blanco puro) + tonos coherentes en `--indigo-*` para cards y bordes claros + override de `--text-lo` / `--text-ghost` (en hex/rgba directo porque no son tripletes). Dark-mode los restablece al revertir.

**Navbar — menú de usuario**
- `src/components/layout/UserMenu.tsx` nuevo: card en la base del sidebar con avatar (de `user_metadata.avatar_url`), nombre y plan. Dropdown con [Mi perfil, Cambiar de cuenta, Cerrar sesión]. Cierra al click fuera y con `Esc`.
- `Sidebar.tsx`: reemplaza la antigua caja "Plan" por `<UserMenu />`. La info del plan se mueve al subtítulo del menú.
- Nuevo item de navegación "Proveedores" (icono `Truck`) entre Finanzas y RGPD.

**Perfil de usuario** — `/perfil`
- `src/app/(app)/perfil/page.tsx`: editar nombre, teléfono, puesto + subir avatar a bucket `avatars`. Email y fecha de alta read-only. Sección "Permisos" muestra rol (owner/admin/miembro) derivado de `perfiles_negocio.user_id` o `miembros_negocio.rol`, con la lista de capacidades correspondientes.
- `supabase/perfil_usuario_ext.sql` nuevo: crea bucket `avatars` (público) + 4 políticas RLS (lectura pública; insert/update/delete sólo si la primera carpeta del path coincide con `auth.uid()`).

**Productos — imagen, scanner y formulario simplificado**
- `src/components/productos/BarcodeScanModal.tsx` nuevo: modal con input autofocus optimizado para pistola HID (emite caracteres + Enter). Busca por `productos.codigo`: si existe → abre la ficha; si no → abre nuevo prellenando el código.
- `src/app/(app)/productos/page.tsx`:
  - Botón "Escanear" (cyan) junto a "Nuevo producto" abre el `BarcodeScanModal`.
  - La lista muestra **miniatura** (`imagen_url`) o el cuadrado coloreado tradicional si no hay imagen.
  - El modal ahora tiene una zona superior con preview de imagen + botones Subir/Cambiar/Quitar (usa bucket `producto-imagenes`).
  - Los campos no obligatorios (unidad, precio coste, color, stocks, descripción, activo) se encapsulan en **"Información adicional"** colapsable, dejando arriba sólo nombre, código, tipo, categoría, precio venta e IVA.
- `supabase/inventario_imagenes_ext.sql` nuevo: bucket `producto-imagenes` (público) + RLS por tenant (escritura sólo cuando la primera carpeta del path coincide con `current_negocio_id()`).

**Módulo Proveedores** — `/proveedores`
- `supabase/proveedores_ext.sql` nuevo: tablas `proveedores` y `gastos_proveedor` (polimórfica, `tipo` ∈ {general, previsto, suscripcion}; campos `recurrencia` y `proximo_cobro` sólo en suscripciones). RLS tenant + trigger `fill_negocio_id`. Estado del gasto ∈ {pendiente, pagado, cancelado}.
- `supabase/fix_tenant_defaults.sql`: añadidas `proveedores` y `gastos_proveedor` al array de tablas con trigger fill.
- `src/lib/proveedores.ts` nuevo: tipos `Proveedor`, `GastoProveedor`, etiquetas, badges, y `gastoMensualizado()` para normalizar recurrencias (anual /12, trimestral /3).
- `src/app/(app)/proveedores/page.tsx`: layout con tabs verticales [Proveedores, Gastos generales, Gastos previstos, Suscripciones]. Cada tab con CRUD: lista + modal. Suscripciones muestra el total mensualizado.

**Ajustes › Suscripción — método de pago + scaffold Stripe**
- `src/app/api/billing/setup-checkout/route.ts` nuevo: crea Stripe Checkout en modo `setup` (alta de tarjeta sin cobrar nada). Si el negocio no tiene `stripe_customer_id`, lo crea al vuelo.
- `src/app/api/billing/payment-methods/route.ts` nuevo: devuelve `{configured, methods[]}`. Si falta `STRIPE_SECRET_KEY` o el negocio no tiene customer, devuelve lista vacía con `configured:false` para que el cliente muestre estado adecuado.
- `SuscripcionTab.tsx`: nueva sección **"Métodos de pago"** entre "Plan actual" y la tabla de planes. Lista las tarjetas guardadas; botón "Añadir método" redirige a Checkout setup. Si Stripe no está configurado, muestra panel ámbar explicando qué env vars hace falta.
- Toast "Método de pago añadido correctamente" cuando la URL contiene `?billing=metodo_anadido`.

**Migraciones SQL aplicadas a BD productiva** (script `scripts/apply-pending-migrations.mjs`, conectado vía pooler `aws-1-eu-central-1`):
- `supabase/theme_ext.sql` → tabla `user_preferences` + RPC `save_user_theme(jsonb)` (iter 38).
- `supabase/perfil_usuario_ext.sql` → bucket `avatars` + 4 políticas RLS.
- `supabase/inventario_imagenes_ext.sql` → bucket `producto-imagenes` + 4 políticas RLS.
- `supabase/proveedores_ext.sql` → tablas `proveedores` y `gastos_proveedor` + RLS tenant + trigger fill.
- `supabase/fix_tenant_defaults.sql` re-aplicado para registrar los triggers `fill_negocio_id` en las dos tablas nuevas.

Pendiente opcional: regenerar `src/lib/database.types.ts` (las nuevas tablas quedan untyped en cliente pero runtime funciona).

**Verificación**
- `npx tsc --noEmit` → cero errores.
- `npm run build` → ✓ compila. Rutas nuevas: `/perfil`, `/proveedores`, `/api/billing/setup-checkout`, `/api/billing/payment-methods`.
- `npm run test:run` → **131/131 verdes** (sin regresiones).

---

### Iteración 39 — *2026-05-11* — Fix: paleta de tema fluye a clases Tailwind con alpha + mensaje guía si falta la tabla

**Problema reportado**
- Al cambiar paleta, los colores no se adaptaban en la UI (Tailwind compila `bg-cyan/20`, `border-indigo-400/40`, etc. a RGB hardcoded desde `tailwind.config.ts`, así que las CSS vars hex no surtían efecto).
- Al guardar salía `Could not find the table 'public.user_preferences' in the schema cache` porque la migración `supabase/theme_ext.sql` todavía no estaba aplicada en la BD.

**Fix — colores con alpha-aware**
- `tailwind.config.ts`: tokens controlados por el tema (`bg`, `indigo-{300,400,600,700,800,900}`, `cyan`, `fuchsia`, `text-hi`, `text-mid`) cambian a `rgb(var(--TOKEN) / <alpha-value>)`. Los semánticos (`ok`, `warn`, `danger`) siguen hardcoded. `fontFamily` ahora prepende `var(--font-sans)` / `var(--font-display)`.
- `src/app/globals.css`: defaults en `:root` migrados a tripletes "r g b" (`--bg: 8 7 20`, `--cyan: 34 211 238`, …). `html/body` usan `rgb(var(--bg))` y `rgb(var(--text-hi))`. `.card-glass`, `.rainbow-bar`, `.accent-bar`, `.section-label`, `.btn-big`, scrollbar y body gradients también pasan a `rgb(var(--x) / α)`. `.card-glass` ahora respeta `--radius-scale` con `calc(18px * var(--radius-scale))`.
- `src/lib/theme/theme.ts`: nuevo set `RGB_VARS` + `hexToTriplet()`. `setVar()` convierte hex → "r g b" solo cuando el target está en `RGB_VARS`; las fuentes y escalas siguen como strings. El modo claro con paleta no-custom también vuelca tonos claros en los `--indigo-*` para que cards y bordes contrasten.
- `src/app/layout.tsx`: el inline-script de boot ahora trae helper `hx()` (hex → "r g b") y aplica los tripletes antes del primer paint. Sigue sin FOUC.

**Fix — error "table not found"**
- `src/lib/theme/ThemeProvider.tsx`: helper `isMissingTableError()` detecta `PGRST205` / `42P01` / mensajes con "schema cache" o "does not exist". Cuando la tabla aún no existe, se muestra en el header del tab Apariencia un mensaje guía ("Falta aplicar supabase/theme_ext.sql en la BD. Cambios guardados solo en este navegador.") en lugar del error técnico de PostgREST. Los cambios siguen viviendo en `localStorage` así que la UI se ve actualizada igualmente.

**Pendiente del usuario**
- Ejecutar `supabase/theme_ext.sql` en Supabase SQL Editor (productivo) y regenerar `src/lib/database.types.ts` para activar persistencia cross-device.

**Verificación**
- `npx tsc --noEmit` → cero errores.
- `npm run build` → ✓ compila.
- `npm run test:run` → **131/131 verdes**.

---

### Iteración 38 — *2026-05-11* — Motor de personalización (Theme Engine) por usuario en Ajustes

**Nuevo módulo `/ajustes → Apariencia` (tab Palette, entre Negocio y Facturación)**
- `src/lib/theme/theme-schema.json`: declarativo (Schema-First) — controles `mode`, `palette` (4 presets + `custom`), 5 colores hexadecimales en modo custom, 2 tipografías (`font.sans` y `font.display` con 6 opciones cada una, incluida `system-ui`), `fontSize` (4 escalas) y `radius` (3 niveles). El renderer del tab y el applier de CSS leen del mismo JSON, así que añadir un control nuevo solo requiere tocar el schema.
- `src/lib/theme/theme.ts`: `applyTheme()` inyecta CSS variables en `:root` (`--bg`, `--indigo-*`, `--cyan`, `--fuchsia`, `--text-*`, `--font-sans`, `--font-display`, `--font-scale`, `--radius-scale`). Carga Google Fonts on-demand creando `<link rel="stylesheet">` deduplicado por familia. En modo claro con paleta no-custom, override tonal automático (fondo `#f6f7fb`, texto `#0b0a1f`).
- `src/lib/theme/ThemeProvider.tsx`: provider client-side. Estado inicial = `localStorage` (evita FOUC) → hydrate desde `user_preferences.theme` (DB es autoritativa). Persistencia con debounce 600 ms vía `upsert` (onConflict `user_id`). Expone `setField`, `setMany`, `reset`, y los estados `loading`/`saving`/`saveError`.
- `src/components/ajustes/AparienciaTab.tsx`: paleta como grid de swatches, segmented buttons para modo/tamaño/radio, color pickers nativos + input hex para la paleta `custom`, font picker con vista previa renderizada con la familia seleccionada. Cabecera con estado de sincronización (loading / saving / sincronizado / error) y botón "Restablecer".

**Persistencia per-user**
- `supabase/theme_ext.sql` nuevo: tabla `public.user_preferences (user_id PK → auth.users, theme jsonb, updated_at)` + trigger `tg_user_prefs_touch` + RLS `user_prefs_owner` (`user_id = auth.uid()`) + RPC `save_user_theme(jsonb)` (opcional, security definer) con `grant execute … to authenticated`. **No** depende de `negocio_id` — la preferencia es individual del usuario, no del tenant.
- Pendiente de aplicar en BD productiva: ejecutar `supabase/theme_ext.sql` en Supabase SQL Editor y regenerar `database.types.ts` (la tabla queda untyped en cliente hasta entonces; los `.from("user_preferences")` funcionan en runtime pero sin tipado fuerte).

**Boot sin FOUC**
- `src/app/layout.tsx`: añadido `<script>` inline en `<head>` que lee `localStorage["r3zon:theme:v1"]` y aplica paleta + fuentes + escalas antes del primer paint. Contiene las 4 paletas hard-coded (espejo del schema) para evitar el flash entre el tema base y el del usuario.
- `src/app/globals.css`: `--font-sans`, `--font-display`, `--font-scale` y `--radius-scale` añadidos a `:root`; `html, body` usa `var(--font-sans)` y `calc(16px * var(--font-scale))`.
- `src/app/(app)/layout.tsx`: `<ThemeProvider>` envuelve `AppShell` tanto en la rama de onboarding como en la principal.

**Verificación**
- `npx tsc --noEmit` → cero errores.
- `npm run build` → ✓ compila.
- `npm run test:run` → **131/131 verdes** (sin regresiones).

---

### Iteración 37 — *2026-05-11* — Aplicar trigger en BD productiva, tipos generados, error handling en API y más tests UI

**Aplicado al servidor (vía Supabase MCP)**
- Migración `add_fill_negocio_id_trigger`: aplicada en BD productiva. El trigger `fill_negocio_id` ahora cubre **20 tablas** con columna `negocio_id` (verificado con `select … from information_schema.triggers`). La auditoría descubrió que `google_connections` también necesitaba el trigger (no estaba en el script local) — se añadió tanto en la BD como en `supabase/fix_tenant_defaults.sql`. Las 4 tablas `*_archivo` quedan sin trigger por diseño (las inserta solo el RPC de retención que ya pasa `negocio_id`).
- `src/lib/database.types.ts` (1965 líneas): generado vía `mcp__supabase__generate_typescript_types`. Cubre 28 tablas/vistas, 11 RPCs, todos los enums.

**Migración inicial de tipos**
- `src/lib/finanzas.ts`: `MovimientoFila` ahora deriva de `Pick<Database["…"]["finanzas"]["Row"], "fecha"|"base_imponible">` + extensiones explícitas (`tipo` narrowed al union real porque la BD lo guarda como `text` con CHECK; importes `number | null` siguiendo la BD — `Number(null)` ya da 0).
- `src/lib/inventario.ts`, `src/lib/documentos.ts`: TODO actualizado a `post-iter37` con razón concreta (consumidores asumen no-nullables / extensiones derivadas).

**Error handling consistente en API routes**
- `src/lib/api-handler.ts` nuevo: `withApiHandler(name, handler)` envuelve, captura excepciones no manejadas, registra con prefijo `[api:<name>]` y devuelve JSON `{ error: "Error interno" }` + 500. Las rutas siguen devolviendo `NextResponse` para errores esperados (401/400/403/409).
- `team/revoke`, `team/invite`, `billing/portal`, `billing/checkout`: envueltas con `withApiHandler`. Los `error.message` de Supabase/Stripe se loguean en servidor pero el cliente recibe mensajes genéricos ("No se pudo revocar el miembro", "No se pudo enviar la invitación", "Email enviado, pero el registro local falló") — sin filtrado de stacks o detalles internos.
- `team/invite`: eliminado el try/catch innecesario alrededor de `createAdminClient()` — ahora lo captura el wrapper.
- `billing/webhook`, `cron/refresh-google-channels`, `integrations/google/{webhook,callback,connect}`: ya tenían patrones correctos (try/catch + redirect codes), no se tocan.

**Más tests UI**
- `tests/components/ErrorBoundary.test.tsx` (4 casos): renderiza hijos sin error, fallback con mensaje, fallback custom, botón Reintentar llama a `location.reload`.
- `tests/components/Input.test.tsx` (8 casos): clases base, props HTML, onChange controlado, override className; `<Select>` value/onChange; `<Textarea>` rows default y override; `INPUT_CLS` exportado.

**Verificación**
- `npm run test:run` → **131/131 verdes** (119 previos + 12 nuevos).
- `npx tsc --noEmit` → cero errores en código del proyecto.
- `npm run build` → ✓ Compiled in 9.1s.

**Lo que NO se tocó por decisión**: paginación cursor en más vistas (productos/documentos/finanzas/fichajes — las queries actuales no devuelven volúmenes que justifiquen el cambio en este pase; queda como post-iter37 si crece el dataset). Migración completa de `Producto`/`Documento`/`StockMovimiento` a Row types (alto riesgo de cascada en consumidores que asumen no-nullables; queda en TODO).

---

### Iteración 36 — *2026-05-11* — Auditoría integral: triggers, error boundary, paginación, lazy load y tests UI

**Fase 1 — críticos**
- `supabase/fix_tenant_defaults.sql`: el array de tablas con trigger `fill_negocio_id` se amplió con las 6 tablas nuevas (`productos`, `stock_movimientos`, `tpv_ventas`, `tpv_venta_items`, `documentos`, `metodos_pago`). Hasta ahora la app funcionaba porque enviaba `negocio_id` explícitamente, pero ahora hay red de seguridad RLS también para inserts que lo omitan. Pendiente: aplicar el script en la BD productiva (Supabase SQL Editor).
- `src/lib/database.types.ts` queda como TODO: `npx supabase gen types` requiere `supabase login` interactivo del usuario; añadidos comentarios `TODO(post-iter36)` en `finanzas.ts`, `inventario.ts` y `documentos.ts` con la receta exacta para cuando se ejecute.

**Fase 2 — importantes**
- `src/components/ui/ErrorBoundary.tsx` nuevo: componente cliente con UI consistente (card-glass + botón "Reintentar") y log en dev. Montado en `(app)/layout.tsx` envolviendo `{children}` (también dentro de la rama de onboarding) — un error en cualquier ruta interna ya no rompe toda la app.
- Paginación cursor en `clientes/page.tsx` y `stock/page.tsx`: estado `oldestSeen`, query `.lt("created_at" | "ts", cursor).limit(50)`, botón "Cargar 50 más" debajo del listado. En stock se reemplazó el `useSupabaseQuery` de movimientos por estado local (el hook genérico no soporta cursor).

**Fase 3 — recomendables**
- `src/lib/ui-constants.ts` nuevo: `ESTADO_CLIENTE_BADGE`, `ESTADO_STOCK_BADGE`, `COLOR_MOV_STOCK`. Eliminadas las 4 definiciones duplicadas (`clientes/page.tsx`, `clientes/[id]/page.tsx`, `productos/page.tsx`, `stock/page.tsx`).
- `dashboard/page.tsx`: `FinanceSummary` se convierte a `dynamic(..., { ssr: false, loading: <skeleton> })` para que recharts (~95 KB gz) no entre en el initial JS de la home. `/finanzas` sigue cargándolo síncrono porque ahí sí es bundle de entrada.
- `STRUCTURE.md` reescrito: árbol completo (16 SQL, 14 módulos UI), tabla de módulos de negocio con tabla principal y notas, sección de integraciones externas, setup actualizado a Next.js 16.
- Tests UI con Testing Library: `tests/components/Field.test.tsx` (4 casos: label, asociación, hint, error con clase danger) y `tests/components/Modal.test.tsx` (6 casos: render condicional, ESC, click backdrop/contenido, dismissable=false). `vitest.config.ts` extiende `include` a `*.test.tsx` y los archivos usan pragma `// @vitest-environment jsdom` (vitest 4 deprecó `environmentMatchGlobs`).

**Verificación**
- `npm run test:run` → **119/119 verdes** (109 previos + 10 nuevos).
- `npx tsc --noEmit` → cero errores en código del proyecto (eliminados `@ts-expect-error` obsoletos en `tests/inventario.test.ts:42-44`).
- `npm run build` → ✓ Compiled in 10.2s.

**Lo que NO se tocó por decisión**: tipos manuales `Producto`/`Documento`/`StockMovimiento`/`VentaTPV` (alto riesgo de cascada hasta tener `database.types.ts` generado), `lib/agenda.ts`/`lib/google.ts` (estables), `useInfiniteQuery` genérico (solo 2 callsites), recharts en `/finanzas` (legítimamente parte del bundle de entrada).

---

### Iteración 35 — *2026-05-11* — Auditoría de lógica de negocio: integridad atómica y validaciones reforzadas

Tras auditar exhaustivamente la lógica de negocio (TS puro + RPCs SQL), corrijo los **bugs reales** y refuerzo la integridad. Los hallazgos triviales/falsos del agente quedan descartados (documentados en `/Users/alex/.claude/plans/encapsulated-spinning-alpaca.md`).

**Lógica pura TS** ([src/lib/](src/lib/)):
- `formatearDuracion(NaN)` ya no devuelve `"NaNh NaNm"` — ahora `"0h 00m"` para NaN, ±Infinity y valores no finitos.
- `estadoStock` defensivo: trata `stock_actual`/`stock_minimo` `null` como 0 en lugar de comparar contra `null` (`null > 0` es `false`, falso negativo).
- `añadirItem` defensivo: `(it.descuento_pct ?? 0) === 0` para no duplicar líneas si llega un descuento `null` desde la BD.
- `validarParaGenerar` rechaza ahora **precio_unit < 0**, **IVA fuera de [0,100]** y **descuento fuera de [0,100]**. Antes solo se validaba cantidad y descripción.

**RPCs atómicas nuevas en SQL** (eliminan dos race conditions reales):

1. [`crear_documento_generado(p_doc, p_serie, p_anio)`](supabase/documentos_ext.sql) en `documentos_ext.sql`. Sustituye al patrón antiguo `siguiente_numero_documento + INSERT cliente` que dejaba **gaps de numeración** si el INSERT fallaba (problema **normativo**: la AEAT exige facturas correlativas sin huecos). La nueva RPC reserva el número con `pg_advisory_xact_lock` y hace el INSERT en la **misma transacción** — si algo falla, ROLLBACK total y el número queda libre. También elimina la ventana de carrera donde dos usuarios podían reservar el mismo número y chocar contra el índice único.
2. [`set_metodo_pago_predeterminado(p_id)`](supabase/metodos_pago_ext.sql). Antes el cliente hacía 2 UPDATEs separados (`predeterminado=false WHERE id<>X` + `predeterminado=true WHERE id=X`) → ventana sin predeterminado. Ahora atómico.

**Integridad de datos en SQL** ([inventario_ext.sql](supabase/inventario_ext.sql)):
- `stock_movimientos.cantidad`: añadido `CHECK (cantidad <> 0)` — un movimiento con cantidad 0 es ruido sin sentido.
- `stock_movimientos.producto_id`: cambio de `ON DELETE CASCADE` → `ON DELETE RESTRICT` — preserva la auditoría histórica. Para retirar un producto márcalo como `activo = false` en lugar de borrarlo.

**Cliente migrado**:
- [`/documentos/nuevo`](src/app/\(app\)/documentos/nuevo/page.tsx): una sola llamada `rpc("crear_documento_generado", { p_doc, p_serie, p_anio })` en lugar de dos llamadas separadas.
- [`FacturacionTab`](src/components/ajustes/FacturacionTab.tsx): `rpc("set_metodo_pago_predeterminado", { p_id })` en lugar de 2 UPDATEs.

**Tests añadidos (8)**: jornada nocturna que cruza medianoche (con y sin descanso), `formatearDuracion` con `NaN`/`±Infinity`, `estadoStock` con `null`, `añadirItem` con `descuento_pct null`, validación de precio negativo, IVA fuera de rango, descuento fuera de rango.

**Falsos positivos descartados** (verificados en código, no son bugs):
- `cerrar_venta_tpv` con items pre-insertados: el `RAISE EXCEPTION` revierte la transacción completa (incluyendo INSERTs previos) — el agente leyó mal.
- `fichajesDelDia` y zonas horarias: la lógica filtra correctamente por día local. El test ya lo cubre.
- `siguiente_numero_documento` con año incorrecto: el cliente ya pasaba `p_anio` explícito derivado de `fecha_emision`.
- División por cero en parser OCR (regex no captura negativos).

**Verificación**: 9 archivos · **109/109 tests verdes** (8 nuevos), `npm run build` ✓ Compiled successfully en 9.7s, cero errores TypeScript.

**Para activar en BD**: re-ejecutar `documentos_ext.sql`, `metodos_pago_ext.sql` e `inventario_ext.sql` en el SQL Editor de Supabase. La FK con `RESTRICT` requiere que no haya productos sin movimientos (en práctica solo afecta a borrados manuales).

### Iteración 34 — *2026-05-11* — Refactor integral: utilidades centralizadas, UI reutilizable, hook Supabase, fix de re-renders y limpieza SQL

Pase de refactor *alto impacto, bajo riesgo* tras auditoría de 3 agentes (frontend, base de datos, rendimiento). Sin cambios funcionales aparentes para el usuario, pero la base es más rápida, barata y mantenible.

**Centralización de utilidades** ([src/lib/formato.ts](src/lib/formato.ts)):
- `eur()` — antes definido 3 veces en `finanzas.ts`, `documentos.ts`, `inventario.ts` → ahora único.
- `round2()`, `round3()` — antes 4 definiciones → única.
- `hoyISO()`, `hoyMas(dias)`, `formatearFechaCorta()`, `formatearFechaLarga()` — antes inlineadas en cada página.
- Los 3 lib del dominio re-exportan `eur` desde aquí (API pública estable).

**Componentes UI reutilizables** ([src/components/ui/](src/components/ui/)):
- `Field`, `Input`, `Select`, `Textarea` (con `INPUT_CLS` único), `Modal` (backdrop + ESC + click-outside + bloqueo de scroll), `ActionButton` (5 tonos semánticos).
- Sustituyen `Field`/`inputCls`/`AccionBtn` repetidos en TPV, Productos, Stock, Documentos. `inputCls` ya no es la fuente: en `documentos/nuevo` queda como alias del nuevo `INPUT_CLS`.

**Hook unificado [`useSupabaseQuery`](src/lib/useSupabaseQuery.ts)**:
- Memoiza `createClient` internamente (corrige el bug donde el cliente entraba en `useEffect` deps y reejecutaba la query en cada render).
- AbortController interno via flag `alive`, cleanup automático al desmontar.
- Toast de error con contexto: `"Error al cargar productos: …"`.
- Aplicado en TPV, Productos, Stock, Documentos (lista y detalle). Eliminados los `eslint-disable react-hooks/exhaustive-deps`.

**Optimización de queries** (egress reducido):
- TPV: `select("*")` → 12 columnas explícitas (`descripcion`, `precio_coste`, `imagen_url`, `created_at/updated_at` ya no viajan).
- TPV tras cobrar: **eliminado el refetch completo**. Ahora el stock se actualiza localmente con un `Map` desde el ticket recién cobrado. Antes: 1 query de N filas por venta. Ahora: 0.
- Productos / Stock / Documentos: `select` selectivos en la lista, `select("*")` solo al abrir modal de edición.
- Logos en Storage: `cacheControl: "3600"` → `"86400"` (24h).

**Bundle size**:
- `/citas` ahora carga `CalendarView` con `dynamic({ ssr: false })` con loading skeleton — `@fullcalendar/*` (~450 KB) se difiere y la página muestra el shell inmediatamente.
- Eliminado `src/components/clientes/HierarchyChart.tsx` (huérfano tras borrar `page 2.tsx`) → `@xyflow/react` (~280 KB) deja de empaquetarse en producción.

**Capa SQL**:
- [`supabase/setup.sql`](supabase/setup.sql) **completado**: faltaban `documentos_ext`, `metodos_pago_ext`, `inventario_ext`, `fichajes_ext`. Ahora incluidos en orden de dependencia, con sus `drop table` correspondientes en la sección WIPE.
- Nuevo índice compuesto en [`inventario_ext.sql`](supabase/inventario_ext.sql): `idx_productos_activo_categoria_nombre` cubre la query principal del TPV (`WHERE activo = true ORDER BY categoria, nombre`).
- Comentario explicativo en [`documentos_ext.sql`](supabase/documentos_ext.sql) sobre la relación intencionalmente separada con `finanzas` (una factura emitida es ingreso opcional; un OCR de proveedor no tiene documento).
- Nuevo [`supabase/retention_ext.sql`](supabase/retention_ext.sql) (no incluido en `setup`, ejecución manual): tablas `*_archivo` y funciones `archive_fichajes_antiguos(meses)`, `archive_stock_movimientos_antiguos(meses)`, `archive_tpv_ventas_cerradas(meses)` para mover filas viejas y liberar storage. Sin scheduling — invocar a mano o con `pg_cron` (plan Pro+).

**Cleanup**:
- Eliminados 3 archivos backup `src/app/(app)/clientes/**/page 2.tsx` (commiteados en histórico).
- Tipos `any` corregidos en `ocr/page.tsx`, `Charts.tsx`, `TabAutomatizacion.tsx`, `TabComunicaciones.tsx`.

**Verificación**: 9 archivos · **101/101 tests verdes**, cero errores TypeScript en archivos del proyecto. Fuentes únicas confirmadas (`eur`, `round*`, `INPUT_CLS`, `Field`, `Modal`).

### Iteración 33 — *2026-05-11* — Productos · Stock · TPV (3 módulos conectados)

Nuevo eje vertical de "comercio": catálogo único + inventario + punto de venta. Diseñado genérico para cubrir restaurante (con `mesa`, IVA mixto bebida/comida, color por categoría) y tienda (con `codigo`/SKU, `stock_minimo`, `unidad` flexible).

- **Esquema** [`supabase/inventario_ext.sql`](supabase/inventario_ext.sql):
  - `productos` (catálogo único): SKU opcional, `tipo` (producto/servicio), `unidad` (ud/kg/l/ración/hora), `iva_pct`, `stock_tracking` (servicios y comida sin inventario lo desactivan), `stock_minimo` para alertas, `color` para botones TPV.
  - `stock_movimientos` (log inmutable, fuente de la verdad): `cantidad` firmada (+ entra, − sale), `tipo` (entrada/salida/ajuste/venta_tpv/devolucion). Trigger `tg_aplicar_stock_movimiento` mantiene `productos.stock_actual` actualizado automáticamente.
  - `tpv_ventas` + `tpv_venta_items` (con `importe_linea` como columna generada).
  - **RPC `cerrar_venta_tpv(p_venta_id, p_metodo_pago)`**: pieza clave de integración. Bloquea la venta con `FOR UPDATE`, recalcula totales desde los items (fuente de la verdad), genera un `stock_movimientos` tipo `venta_tpv` por cada item con `stock_tracking=true`, y marca la venta como `cerrada`. Atómico — si falla algo, no se cobra ni se descuenta stock.
  - RLS multi-tenant en las cuatro tablas vía `current_negocio_id()`.

- **Lógica pura** [`src/lib/inventario.ts`](src/lib/inventario.ts): `estadoStock()` (ok/bajo/agotado/sin_stock), `calcularTotalVenta()` con desglose, `añadirItem/cambiarCantidad/eliminarItem` inmutables, `colorCategoria()` (hash determinístico de la categoría a HSL).

- **UIs**:
  - [`/productos`](src/app/\(app\)/productos/page.tsx): listado con búsqueda + filtro por categoría + modal CRUD que incluye color picker para los botones del TPV. Servicios fuerzan `stock_tracking=false`.
  - [`/stock`](src/app/\(app\)/stock/page.tsx): KPIs (con stock / bajo / agotados), filtro por estado y modal "Movimiento" para registrar entradas/salidas/ajustes manuales. Aside con últimos 50 movimientos (incluyendo los generados por TPV).
  - [`/tpv`](src/app/\(app\)/tpv/page.tsx): layout split optimizado táctil — rejilla de productos coloreados con badge de "Bajo"/"Agotado" + ticket en curso a la derecha con totales en vivo, soporte de mesa para restaurante, y modal de cobro con 4 métodos (efectivo/tarjeta/Bizum/otro). Al cobrar invoca el RPC y refresca el stock visible.

- **Tests** [`tests/inventario.test.ts`](tests/inventario.test.ts): 19 casos (estado de stock, cálculo de totales con IVA mixto restaurante, agrupación al añadir item, cantidad cero como eliminación, etc.). Suite global verde **9 archivos · 101 tests**.

- **Sidebar**: 3 entradas nuevas entre Fichajes y Documentos (Productos · Stock · TPV).

**Para activar**: ejecuta `supabase/inventario_ext.sql` en el SQL Editor de Supabase.

### Iteración 32 — *2026-05-11* — Editor de documentos: simplificación UX + métodos de pago guardados

Reorganización del editor `/documentos/nuevo` para reducir fricción y un nuevo tab en Ajustes.

- **Cliente**: por defecto un buscador con autocomplete (busca por nombre, CIF o email contra los clientes existentes); botón secundario "Añadir cliente manualmente" que despliega los campos y un checkbox "Guardar también como cliente en mi CRM" (al generar, si está marcado, hace `INSERT` en `clientes` antes del documento).
- **Cabecera colapsable**: por defecto muestra una línea-resumen ("Serie A · 11 may 26 · vence 26 may 26") y un botón verde "Modificar". Defaults: serie A, hoy, vencimiento +15 días, IRPF 0%.
- **Pago colapsable**: misma mecánica que cabecera. Selector de métodos guardados (con ⭐ en el predeterminado) + opción "Introducir manualmente" + checkbox "Guardar este método para reutilizarlo".
- **Métodos de pago guardados**: nueva tabla [`metodos_pago`](supabase/metodos_pago_ext.sql) con índice único parcial para garantizar un solo predeterminado por negocio. Nuevo tab "Facturación" en Ajustes [`FacturacionTab`](src/components/ajustes/FacturacionTab.tsx) para CRUD de los métodos.
- **Layout**: `lg:grid-cols-2` simétrico, formulario izquierda + previsualización derecha. La preview es `sticky top-4` para que se mantenga visible al scrollear el formulario.
- **Botón "Ver en grande"**: encima de la preview. Abre un modal fullscreen con backdrop blur y el documento centrado en formato A4 (botón "Abrir en pestaña" dentro del modal usa la misma ventana de impresión que el descargar).
- Líneas: sin cambios (tu petición explícita).

Suite verde: **8 archivos · 82 tests**.

### Iteración 31 — *2026-05-11* — Módulo Documentos (facturas, tickets, presupuestos, albaranes, proformas)

Nuevo apartado en la sidebar entre Fichajes y Finanzas para emitir cualquier documento comercial. La página `/documentos/nuevo` muestra primero un selector de tipo y, al elegir uno, se abre un editor con **formulario a la izquierda y previsualización en vivo a la derecha**.

- **Esquema** [`supabase/documentos_ext.sql`](supabase/documentos_ext.sql): tabla `documentos` con `numero` correlativo único por (negocio, tipo, serie, año), `referencia` generada (`tipo-serie-año-NNNNN`), `emisor_snapshot` y `cliente_snapshot` JSONB que congelan los datos al generar (una factura no cambia si el cliente actualiza su CIF), y trigger `tg_documentos_inmutable` que bloquea modificaciones de fondo cuando `estado != 'borrador'`. RLS por `current_negocio_id()`.
- **Numeración atómica**: RPC `siguiente_numero_documento(p_tipo, p_serie, p_anio)` con `pg_advisory_xact_lock` derivado por hash de los identificadores → evita huecos y carreras incluso bajo concurrencia.
- **Lógica pura** [`src/lib/documentos.ts`](src/lib/documentos.ts): tipos, `calcularTotales(lineas, irpf_pct)` con desglose por tipo de IVA, `validarParaGenerar()` que distingue tipos que requieren CIF del cliente (factura, proforma) de los que no (ticket, albarán), `referenciaDocumento()`, `eur()`.
- **Editor** [`src/app/(app)/documentos/nuevo/page.tsx`](src/app/\(app\)/documentos/nuevo/page.tsx): selector de tipo → editor con cabecera (serie/fechas/IRPF), selector de cliente (predefinido + edición manual), líneas con cantidad/precio/descuento/IVA por línea, método y condiciones de pago, notas. Botón verde **Generar** que ejecuta validación + RPC de numeración + INSERT inmutable. Tras generar, panel de acciones: **Descargar PDF** (vía `window.print` en ventana nueva con `@page A4`), **Enviar por email** (`mailto:` prerrellenado con destinatario, asunto y cuerpo), **Guardado en la app** (estado siempre persistido) y **Añadir a Finanzas** opcional que crea un movimiento de ingreso vinculado vía `finanza_id`.
- **Plantilla** [`src/components/documentos/PlantillaDocumento.tsx`](src/components/documentos/PlantillaDocumento.tsx): se usa tanto en preview como en el PDF. Estilos en línea (no Tailwind) para que se preserven al inyectarse en la ventana de impresión. Incluye desglose de IVA por tipo y bloque pago/notas opcional.
- **Listado** [`src/app/(app)/documentos/page.tsx`](src/app/\(app\)/documentos/page.tsx) con chips de filtro por tipo (con conteo) y CTA verde "Nuevo documento". Detalle [`/documentos/[id]`](src/app/\(app\)/documentos/[id]/page.tsx) con previsualización a la izquierda y aside de acciones.
- **Tests** [`tests/documentos.test.ts`](tests/documentos.test.ts): 14 casos para totales (vacío, descuentos, varios IVAs, IRPF sobre la base, valores no numéricos), validación según tipo y formato de referencia. Suite global verde **8 archivos · 82 tests**.

### Iteración 30 — *2026-05-03* — Gestión de errores global + gating RGPD reforzado

Avance del plan v1.0 (puntos §2 y §3 de [`plan.md`](plan.md)).

**Toast global y feedback en formularios** (§2):
- Nuevo provider [`Toast`](src/components/ui/Toast.tsx) con hook `useToast()` y aviso en vivo (`aria-live="polite"`) para reemplazar los toasts locales que cada tab implementaba por su cuenta.
- El provider se monta dentro de [`AppShell`](src/components/layout/AppShell.tsx) → todas las rutas autenticadas pueden disparar `toast.ok / toast.err / toast.info`.
- [`clientes/nuevo`](src/app/(app)/clientes/nuevo/page.tsx) detecta `navigator.onLine === false` antes de enviar el insert y muestra toast de éxito/error tras la respuesta de Supabase.

**Estados vacíos con CTA** (§2):
- [`/clientes`](src/app/(app)/clientes/page.tsx) — el placeholder "Aún no tienes clientes" ahora incluye un botón **Añadir primer cliente** que enlaza a `/clientes/nuevo`.
- [`/tareas`](src/app/(app)/tareas/page.tsx) — el placeholder "Sin columnas" sustituye el mensaje técnico por un CTA **Crear columnas** que abre `ColumnManager` directamente.

**Google Calendar 429 explícito** (§2):
- [`fetchEventsPage`](src/lib/agenda.ts) reconoce status 429 y lanza un `Error` con `code = "rate_limit"` y `retryAfter` derivado del header. Mensaje añadido a [`formatGoogleError`](src/lib/google-errors.ts).
- [`CalendarView.runSync`](src/components/agenda/CalendarView.tsx) detecta el error (por `code` o regex `/\b429\b|rate limit/i` para superar la serialización de Server Actions) y muestra "Espera un minuto y vuelve a sincronizar".

**Pantalla de degradación de Supabase** (§2):
- [`/dashboard`](src/app/(app)/dashboard/page.tsx) — el banner de error pasa de un `div` plano a una tarjeta `card-glass` con icono, mensaje claro y botón **Reintentar** que recarga la página. Los datos se mantienen en pantalla (degradación elegante, no full-blank).

**Onboarding RGPD bloqueante** (§3):
- [`onboarding/page.tsx`](src/app/(app)/onboarding/page.tsx) — añadido aviso de las casillas obligatorias pendientes, defensa adicional en `enviar()` (por accesibilidad de teclado) y `aria-disabled` en el botón.
- **Defensa server-side** en la RPC [`registrar_onboarding`](supabase/auth_extension.sql): valida que `terminos`, `privacidad` y `cookies` estén marcados como `aceptado=true` antes de insertar; si falla, lanza `check_violation` y `onboarding_completado` no se actualiza. Esto blinda la lógica si alguien intentara llamar a la RPC saltándose la UI.

Tipado limpio (`tsc --noEmit` verde). El gating de la layout de `(app)` ya redirigía a `/onboarding` si el usuario no había completado consentimientos; ahora además es imposible completarlos sin las tres aceptaciones obligatorias.

### Iteración 29 — *2026-05-03* — Auditoría responsive + accesibilidad + metadatos

Pasada amplia siguiendo una auditoría dirigida por tres agentes de exploración (responsive móvil, a11y, metadatos).

**Responsive móvil (≤400px de ancho)**:
- [`finanzas/nuevo/page.tsx`](src/app/(app)/finanzas/nuevo/page.tsx), [`ocr/page.tsx`](src/app/(app)/ocr/page.tsx), [`kanban/TaskModal.tsx`](src/components/kanban/TaskModal.tsx) — `grid grid-cols-2` → `grid-cols-1 sm:grid-cols-2` para que los pares de campos no provoquen scroll horizontal.
- OCR — paddings `p-8/p-10` → `p-5/p-6 sm:p-8/sm:p-10` (tarjetas y `ActionCard`).
- **Modales con scroll en mobile**: `TaskModal`, `EventModal` y `ContactoModal` ahora son `flex max-h-[calc(100vh-2rem)] flex-col` con cabecera/pie `shrink-0` y body `flex-1 overflow-y-auto`. Permite scrollear el contenido en pantallas cortas sin que se corte el botón de guardar.

**Accesibilidad**:
- **`aria-label` en links/botones icon-only**: tel/mailto/WhatsApp en [`ContactosTab`](src/components/clientes/ContactosTab.tsx) ahora dicen *"Llamar a Juan García"*, *"Enviar email a Juan García"*, etc. Botones editar/eliminar contacto y de logo en [`NegocioTab`](src/components/ajustes/NegocioTab.tsx) también etiquetados.
- **`role="dialog"` + `aria-modal` + `aria-labelledby`** añadidos a `TaskModal` y `ContactoModal` (EventModal ya los tenía).
- **`<span role="button">` con teclado**: el "quitar cliente" del combobox en [`EventModal`](src/components/agenda/EventModal.tsx) ahora responde a Enter/Space (no se podía cambiar a `<button>` sin anidar botones).
- **`alt` mejorado**: imagen del ticket en OCR pasa de `alt="Ticket"` a `"Foto del ticket escaneado"`.
- **Iconos icon-only crecidos a 36×36** en `ContactosTab` (antes 32×32) para tocabilidad ≥ guideline.
- **`type="tel"`** en input de teléfono en `ContactoModal` (autocompletado y teclado móvil correctos).

**Metadatos / SEO / PWA**:
- **Root layout** ([src/app/layout.tsx](src/app/layout.tsx)) ampliado: `metadataBase` desde `NEXT_PUBLIC_SITE_URL`, `title.template = "%s · R3ZON"`, `applicationName`, `keywords`, `openGraph` con locale `es_ES`, `twitter` summary, `robots` con directivas `googleBot`, `formatDetection: { email/telephone/address: false }`. `viewport` añade `colorScheme: "dark"` y `maximumScale: 5`.
- **Layouts server por ruta** con metadata específica creados para `dashboard`, `clientes`, `citas`, `tareas`, `finanzas`, `ocr`, `ajustes`, `rgpd`, `onboarding`, `login`, `registro`, `2fa`. Cada uno renderiza solo `{children}` y exporta `metadata` (las páginas internas son Client Components y no pueden exportar metadata directamente). Las rutas internas llevan `robots: { index: false }` para no indexar el panel.
- **`public/manifest.json`** creado para PWA: name, short_name, start_url=/dashboard, theme_color #080714, locale `es-ES`, categorías business/productivity/finance, icono `/icon.svg`.
- **Favicon vectorial**: [`src/app/icon.svg`](src/app/icon.svg) (32px) + [`src/app/apple-icon.svg`](src/app/apple-icon.svg) (180px) con la marca R3 sobre gradiente indigo y dot cyan.
- **`src/app/robots.ts`** y **`src/app/sitemap.ts`** generados desde `NEXT_PUBLIC_SITE_URL`. Sitemap incluye home, login/registro y las 4 páginas legales; robots permite home y `/legal/`, prohíbe el panel y `/api/`.

Build verde (35 rutas, +3 nuevas: `/icon.svg`, `/robots.txt`, `/sitemap.xml`). Tipado limpio.

### Iteración 28 — *2026-05-03* — Fix hidratación: `<a>` anidados en lista de clientes

**Síntoma**: Next.js console error `In HTML, <a> cannot be a descendant of <a>` al renderizar `/clientes`.

**Causa raíz**: la tarjeta de cliente era un `<Link href="/clientes/[id]">` que envolvía los enlaces de acción rápida (`tel:`, `mailto:`, `wa.me`, web) — `<a>` dentro de `<a>` es HTML inválido y rompe la hidratación.

**Fix** [`src/app/(app)/clientes/page.tsx`](src/app/(app)/clientes/page.tsx): patrón "stretched link" — la tarjeta ahora es un `<article relative>` con un `<Link absolute inset-0>` como overlay y los enlaces de acción son hermanos con `relative z-10` y `pointer-events-auto`. Decoración (avatar, nombre, badges) marcada con `pointer-events-none` para que el área clickable de la card siga llevando a la ficha. Eliminados los `e.stopPropagation()` que ya no hacen falta.

### Iteración 27 — *2026-05-03* — Limpieza de navbar + dashboard como resumen integral + Testing

**Navbar más limpia** ([`src/components/layout/Sidebar.tsx`](src/components/layout/Sidebar.tsx)):
- Retirados los items "Seguridad 2FA" y "Escanear" — eran rutas duplicadas. El 2FA sigue accesible desde Ajustes → Seguridad (que ya tenía el bloque completo `mfa.listFactors()` + link a `/2fa/configurar`); el OCR sigue accesible desde la `QuickAction` "Escanear ticket" en Finanzas. Ambas rutas (`/2fa/configurar` y `/ocr`) se mantienen sin cambios — solo se quita el ruido de la barra lateral.

**Dashboard rediseñado** ([`src/app/(app)/dashboard/page.tsx`](src/app/(app)/dashboard/page.tsx)):
- Antes: 4 KPIs estáticos hardcodeados a "—".
- Ahora: panel agregador con saludo dinámico (mañana/tarde/noche) y 4 filas de widgets responsivos.
- **Fila 1 — KPIs**: Clientes (con altas del mes), Citas hoy (con próxima cita destacada), Ingresos del mes (delta % vs mes anterior), Tareas pendientes (con vencidas en rojo).
- **Fila 2 — Estado financiero**: 3 sub-KPIs (Te queda año, Apartar Hacienda IVA+IRPF, Beneficio del mes) + `<MonthlyBars>` reutilizado de Charts.
- **Fila 3**: Próximas citas (7 días, vía `listEvents`) + Tareas pendientes (top 5 ordenadas por fecha límite, badges de prioridad y vencimiento).
- **Fila 4**: Últimos clientes (5, con sector y fecha relativa, link a ficha) + Actividad reciente (10, feed de `comunicaciones` con icono por tipo: nota/email/whatsapp/webhook).

**Hook agregador** ([`src/lib/useDashboardData.ts`](src/lib/useDashboardData.ts)):
- 13 queries en paralelo con `Promise.all`: counts head-only para KPIs, ranges para listas, join `comunicaciones → clientes(nombre)` para nombrar al cliente en el feed.
- Reutiliza `useNegocioId()`, `listEvents()` y los tipos `MovimientoFila` existentes — cero duplicación de lógica.
- Skeletons globales mientras `loading`; banner de error inline si alguna query falla pero no bloquea el render.

**Componentes nuevos** ([`src/components/dashboard/`](src/components/dashboard/)):
- `KpiCard` reusable (label, value, hint, delta tonal up/down/neutral, 5 acentos cyan/fuchsia/ok/warn/danger, skeleton).
- `UpcomingAppointments`, `PendingTasks`, `RecentClients`, `RecentActivity`, `FinanceSummary` — cada uno con su empty state y skeleton. Todos siguen el R3ZON Design System (glass, accent-bar, secciones con icono).

Build verde (32 rutas), tipado limpio.

**Testing mínimo viable** (plan §1):
- **Vitest 2.1** instalado con [`vitest.config.ts`](vitest.config.ts) (alias `@/*` y stub de `server-only` para que los módulos admin se carguen fuera de Next).
- **Scripts nuevos** en `package.json`: `npm test`, `npm run test:run`, `npm run test:coverage`.
- **50 tests / 6 ficheros** pasando, sin tocar producción:
  - [`tests/parser.test.ts`](tests/parser.test.ts) — OCR español: fechas (`dd/mm/yyyy`, `dd-mm-yy`, normalización siglo), CIF/NIF/NIE, base + IVA + total con separadores `1.234,56`, cálculo derivado cuando solo hay total + porcentaje.
  - [`tests/finanzas.test.ts`](tests/finanzas.test.ts) — `totales()` (IVA repercutido vs soportado, devolución Hacienda) y `agregarPorMes()` (12 buckets, filtro de año).
  - [`tests/stripe.test.ts`](tests/stripe.test.ts) — webhook con firma real (`stripe.webhooks.generateTestHeaderString`): rechaza firmas inválidas, persiste `invoice.paid` en `pagos_stripe`, ignora customers huérfanos. Cubre además `planFromPriceId`.
  - [`tests/google-admin.test.ts`](tests/google-admin.test.ts) — refresh proactivo de access_token expirado, retry ante 401, error sin filtrar body cuando `invalid_grant`, propagación de `loadTokensFor` y `persistSyncTokenFor`.
  - [`tests/google-oauth-callback.test.ts`](tests/google-oauth-callback.test.ts) — flujo `GET /api/integrations/google/callback`: error de Google, CSRF (`invalid_state`), redirect a `/login` sin sesión, `no_refresh_token`, flujo completo con persistencia vía `set_google_tokens`.
  - [`tests/supabase-rpc.test.ts`](tests/supabase-rpc.test.ts) — wrappers RPC (`get_google_tokens`, `set_google_tokens`, `set_google_sync_token`).
- **Mocks ligeros**: `vi.mock("@/lib/supabase/admin"|"server")` con `rpc` espiado y `vi.spyOn(globalThis, "fetch")` — sin red, sin Supabase real, sin Stripe real.
- `npx tsc --noEmit` y `npm run test:run` verdes. La suite cubre los 5 puntos del plan §1 y deja la base lista para refactorizar con red de seguridad.

### Iteración 26 — *2026-05-02* — Google Calendar: cron de renovación de watch channels
- **Endpoint cron** [`src/app/api/cron/refresh-google-channels/route.ts`](src/app/api/cron/refresh-google-channels/route.ts) — protegido con `CRON_SECRET` (Bearer header) o `x-vercel-cron`. Llama a `refreshExpiringWatchChannels()` y devuelve `{ total, renewed, failed, errors[] }`. Acepta GET y POST (para `pg_cron + net.http_post`).
- **`refreshExpiringWatchChannels()`** en [`src/lib/agenda-admin.ts`](src/lib/agenda-admin.ts) — lista `google_connections` con `channel_expiration` nulo o en <24h; registra nuevo watch para cada una vía `googleFetchAdmin` + UPDATE service-role. Errores individuales no bloquean al resto.
- **Schedule en Vercel** [`vercel.json`](vercel.json) — `crons: [{ path: '/api/cron/refresh-google-channels', schedule: '0 3 * * *' }]`. Vercel inyecta `x-vercel-cron` automáticamente.
- **Setup alternativo**: pg_cron en Supabase con `net.http_post` cabeceando `Authorization: Bearer ${CRON_SECRET}`, o GitHub Actions con `curl`.
- **Env nueva**: `CRON_SECRET` (`openssl rand -base64 32`).
- **Por qué un cron y no solo `ensureWatchChannel()`**: si un usuario no abre la agenda durante 7 días, el canal expira y deja de recibir push. El cron diario garantiza renovación independiente del uso.

### Iteración 25 — *2026-05-02* — Google Calendar: bug del botón Sincronizar + sync ilimitado
- **Bug "botón no hace nada"** (`connect/route.ts`): faltaban env vars → redirect silencioso a `/ajustes?error=...`. Fix:
  - Propaga `?next=…` mediante cookie `g_oauth_next` (httpOnly, sameSite=lax). `safeNext()` previene open-redirect.
  - Si faltan `GOOGLE_CLIENT_ID/SECRET` redirige a la página de origen con `?google_error=missing_google_credentials`.
- **`callback/route.ts`** — lee `next` desde cookie `g_oauth_next` (Google no devuelve query params). Borra ambas cookies al terminar.
- **`getGoogleConnectionStatus()`** añade `{ serverConfigured, missingEnv[] }`. Comprueba `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_WEBHOOK_URL`.
- **`src/lib/google-errors.ts`** — `formatGoogleError(code)` traduce códigos `?google_error=…` a mensajes legibles. Movido fuera de `"use server"` (solo funciones async son exportables desde Server Actions en Next.js 16).
- **`GoogleCard.tsx`** y **`CalendarView.tsx`** — comprueban `serverConfigured` antes de redirigir; detectan `?google_error=` y `?google=connected`; limpian query params con `history.replaceState`.
- **Sync ilimitado** (`agenda.ts`, `agenda-admin.ts`) — full-sync inicial pasa de `−30d/+90d` a **sin límite temporal** (`orderBy=updated`, sin `timeMin/timeMax`). 410-fallback también elimina los bounds.

### Iteración 24 — *2026-05-02* — Google Calendar: callback OAuth + webhook push + Server Action de estado
- **Bug raíz** ("UI Desconectado / Sincronizar inoperante"): faltaba `/api/integrations/google/callback/route.ts`. Creado: valida `state` cookie (CSRF), intercambia `code` por tokens, persiste cifrados vía `set_google_tokens`, redirige a `/agenda?google=connected`. Login Google y permisos Calendar **separados**. Nunca loguea code/tokens.
- **Push notifications**: SQL en `agenda_ext.sql` — columnas `channel_id / channel_token / channel_resource_id / channel_expiration` + unique index parcial. RPCs `set_google_watch_channel`, `clear_google_watch_channel`, `find_connection_by_channel` (service_role only), `get_google_tokens_admin`, `update_google_access_token_admin`, `set_google_sync_token_admin`. `REVOKE ... FROM public, anon, authenticated` + `GRANT ... TO service_role`.
- **Watch channel en `agenda.ts`**: `registerCalendarWatch()` (randomUUID + randomBytes token, POST `/events/watch`), `ensureWatchChannel()` (renueva si <24h, invocado al final de `syncGoogleCalendar()` best-effort), `stopCalendarWatch()` (llamado al desconectar).
- **Webhook** `src/app/api/integrations/google/webhook/route.ts`: `state==='sync'` → ack 200; valida `(channel_id, token)` vía `find_connection_by_channel`; lanza `syncGoogleCalendarFor(userId)` del path admin (sin `"use server"`). Siempre devuelve 200 (no 5xx para evitar loops de reintento).
- **`src/lib/google-admin.ts`**: `googleFetchAdmin` + refresh con `update_google_access_token_admin`. `import "server-only"`.
- **`src/app/actions/google.ts`**: `getGoogleConnectionStatus()` devuelve `{ connected, email, expiresAt, scope, watchActive, watchExpiresAt }`, nunca tokens.
- **`CalendarView.tsx`**: botón Sincronizar → si `!connected` redirige OAuth; si vuelve con `?google=connected` ejecuta sync automático y limpia URL.

### Iteración 23 — *2026-05-02* — Kanban: columnas reordenables, batch persistence, drop indicator
- **Columnas arrastrables horizontalmente** (`SortableColumn` con `horizontalListSortingStrategy`). `GripHorizontal` como `setActivatorNodeRef` — arrastrar tarjetas no mueve la columna. Drag de columnas y tareas en un único `DndContext` discriminados por `data.type`.
- **Persistencia batch**: RPCs `reordenar_tareas_batch(p_updates jsonb)` y `reordenar_columnas_batch(p_updates jsonb)` en `crm_kanban_ext.sql`. Al mover tarjeta entre columnas se recalculan posiciones de **ambas** columnas. Fallback a `Promise.all` si la RPC aún no existe en BD.
- **`ColumnManager` rediseñado** — lista vertical sortable con dnd-kit, drag handle `GripVertical`. "Nueva columna" como fila inline compacta (color-dot + input + botón `+`).
- **Botón `+`** — `h-8 w-8` ghost/outline: borde indigo, hover cyan `bg-cyan/5`.
- **Drop indicator mejorado** — placeholder con borde cyan punteado, `bg-cyan/5` y `animate-pulse`. `DragOverlay` con easing `cubic-bezier`.

### Iteración 22 — *2026-05-02* — Kanban: drag total, creación rápida y persistencia paralela
- **Tarjeta arrastrable desde cualquier parte** — eliminado el handle `GripVertical`; `attributes` + `listeners` al `<div>` raíz. Cursor `grab/grabbing`, `touch-none`/`select-none`.
- **`InlineTaskAdder.tsx`** — creación in-line solo con título: Enter crea, Esc cancela, click fuera vacío cancela. Input permanece abierto para varias seguidas. Estado vacío de columna como botón que abre el adder.
- **Persistencia paralela** — `for…await` secuencial → `Promise.all(...)`. Menos bloqueo HTTP, menor probabilidad de race con HMR.

### Iteración 21 — *2026-05-02* — Fix RLS en kanban, finanzas y OCR + build verde
- **`src/lib/useNegocioId.ts`** — hook que carga `id` de `perfiles_negocio` y lo cachea; formularios deshabilitan botón Guardar hasta que esté disponible.
- **Fix RLS**: `TaskModal`, `finanzas/nuevo`, `ocr/page`, `clientes/nuevo` migrados a `useNegocioId()` con envío explícito de `negocio_id`.
- **`npm run build` verde** (28 rutas): arreglados 3 problemas preexistentes — `tsconfig.json` excluye `supabase/functions` (Deno), `CalendarView` sin `week` de `LocaleInput`, `login/page.tsx` con `useSearchParams()` en `<Suspense>`.

### Iteración 20 — *2026-05-02* — Página 404, formulario cliente simplificado, contactos
- **404** [`src/app/not-found.tsx`](src/app/not-found.tsx) — pantalla glass con número en gradient cyan→fuchsia, CTAs "Ir al panel" + "Ver clientes".
- **Formulario simplificado** `/clientes/nuevo` — solo `nombre` obligatorio visible; resto en acordeón "Datos adicionales" colapsado. Cliente creable en 5 segundos.
- **Tab Contactos confirmada** — `ContactosTab` montado en `/clientes/[id]` con modal alta/edición, jerarquía `reports_to`, decisor, puesto, WhatsApp.

### Iteración 19 — *2026-05-02* — Fix: clientes, agenda, finanzas y kanban
Cuatro bugs reportados. Causa raíz unificada: tablas B2C antiguas referenciadas desde frontend, `negocio_id` ausente en INSERTs.

- **SQL** [`supabase/fix_tenant_defaults.sql`](supabase/fix_tenant_defaults.sql) — trigger `tg_fill_negocio_id` BEFORE INSERT en 12 tablas. Si el INSERT omite `negocio_id`, el trigger lo rellena con `current_negocio_id()`. Resuelve todos los inserts presentes y futuros.
- **Clientes**: páginas listado, nuevo y ficha reescritas con campos B2B reales. Combobox en `EventModal` busca por `nombre`/`cif`/`email`.
- **Agenda**: `createEvent` envuelve Google en `try/catch` (fallo → crea en local, sync posterior). Eliminada validación "no crear citas en el pasado".
- **Kanban / Finanzas / OCR**: `TaskModal`, `finanzas/nuevo`, `ocr/page` corregidos para incluir `negocio_id` explícito.

### Iteración 18 — *2026-05-01* — Ajustes: portal de suscripción (Stripe)
- Nueva dependencia: `stripe`.
- **SQL** (`supabase/billing_ext.sql`): campos stripe en `perfiles_negocio`, tabla `pagos_stripe` con RLS dual (OWNER lee; webhook con service_role escribe).
- **`lib/stripe.ts`**: lazy-singleton + catálogo `PLANS` (Pro 29€/mes, Business 79€/mes) + `planFromPriceId()`.
- **Route handlers**: `POST /api/billing/checkout` (Zod valida plan, garantiza Stripe Customer, crea Checkout Session), `POST /api/billing/portal` (Customer Portal), `POST /api/billing/webhook` (`runtime="nodejs"`, valida firma, maneja `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`).
- **`SuscripcionTab.tsx`**: cabecera "Plan actual" con pill de estado y próxima renovación, tabla de precios (oculta si hay suscripción activa), historial de pagos con enlaces PDF/web.
- Env requeridas: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`.

### Iteración 17 — *2026-05-01* — Ajustes: equipo + seguridad

**SQL** (`supabase/team_ext.sql`): enums `rol_miembro` / `estado_miembro`, tabla `miembros_negocio`, RPC `aceptar_invitacion` (enlaza `user_id`, registra consentimientos RGPD con timestamp+IP+UA), vista `v_equipo_negocio`.

**Route handlers**: `POST /api/team/invite` (Zod + `auth.admin.inviteUserByEmail` + insert en `miembros_negocio`), `POST /api/team/revoke` (marca `revocado`, no borra — audit trail).

**`EquipoTab.tsx`**: tabla con pills coloreadas por rol (admin fuchsia, editor cyan, lector neutro) y estado (activo esmeralda, invitado ámbar, revocado rosa). Owner con icono Crown, no removible.

**`InvitarMiembroModal.tsx`**: 3 tarjetas visuales de rol + checkbox RGPD obligatorio.

**`SeguridadTab.tsx`**: estado 2FA (`mfa.listFactors()`), cierre global (`signOut({ scope: "global" })`), lista de dispositivos con acción "Olvidar".

### Iteración 16 — *2026-05-01* — Fix: loop 307 en `/onboarding`
- **Síntoma**: `GET /onboarding 307` en bucle infinito.
- **Causa raíz**: `layout.tsx` leía `x-invoke-path` (header interno de Next.js antiguo, desaparecido en v16) → `pathname` siempre `""` → la guarda `!startsWith("/onboarding")` se cumplía siempre → re-redirect.
- **Fix**: `middleware.ts` reenvía `x-pathname` con `request.nextUrl.pathname`; `layout.tsx` lo lee y hace early return cuando ya está en `/onboarding`.

### Iteración 15 — *2026-05-01* — Ajustes: panel de integraciones con sistema de ayuda
- **`GoogleCard.tsx`** — lee `google_connections.google_account_email` para mostrar cuenta conectada. Botón Conectar → `/api/integrations/google/connect`. Botón Desconectar → borra fila.
- **`N8nCard.tsx`** — URL webhook + API Key persistidos vía RPC `set_config_key` con `pgp_sym_encrypt`. Botón "Enviar prueba" dispara POST al webhook.
- **`HelpDrawer.tsx`** — botón "?" + panel lateral con guías paso a paso para usuarios no técnicos (`integracionesGuides.ts`).
- **Route handler** `/api/integrations/google/connect` — URL OAuth con scopes Calendar + Drive.file + email/profile, `access_type=offline` + `prompt=consent`, cookie `g_oauth_state` httpOnly+SameSite=Lax (CSRF, 10 min).

### Iteración 14 — *2026-05-01* — Ajustes: layout + perfil de negocio
- Nueva dependencia: `zod`.
- `SettingsTabs.tsx` — 5 pestañas (Negocio · Integraciones · Equipo · Suscripción · Seguridad), navegación lateral desktop / superior mobile.
- `NegocioTab.tsx` — formulario `nombre_negocio`, `cif_nif`, `direccion`, `email_contacto`, `telefono` + logo en bucket `logos` de Supabase Storage (máx. 2 MB, PNG/JPG/WebP/SVG).
- `negocioSchema.ts` — Zod con validación CIF/NIF, email, teléfono E.164.

### Iteración 13 — *2026-04-30* — Reestructura BD + fix Next.js 16 proxy + seed B2B

- `supabase/schema.sql` reescrito: `clientes` nace con todos los campos B2B + `contactos_cliente` integrado. `consentimientos_rgpd.cliente_id` NULLABLE.
- Borrados `empresas_ext.sql` y `refactor_b2b_clientes.sql` (consolidados).
- Nuevo `supabase/seed_clientes.sql` — 10 empresas reales con contactos y jerarquía.
- Nuevo `supabase/setup.sql` — script único de instalación limpia (wipe + `\i` en orden).
- **Fix Next.js 16**: borrado `src/middleware.ts`, conservado `src/proxy.ts` (resuelve `unhandledRejection: Both middleware file ... and proxy file ... detected`).

### Iteración 12 — *2026-04-30* — Refactor a modelo B2B puro (Clientes = Empresas)

- Eliminado módulo CRM B2C. Renombrado `Empresas` → `Clientes` en rutas, componentes, tipos y sidebar.

**SQL** (`supabase/refactor_b2b_clientes.sql`): `drop table clientes cascade`, `alter table empresas rename to clientes`, `alter table contactos_empresa rename to contactos_cliente`. Recreación de FKs desde todas las tablas dependientes.

**Frontend**: `src/components/empresas/` → `src/components/clientes/`. `Empresa` → `Cliente`. Pestaña "Estructura jerárquica" → **"Organigrama"**. Sidebar usa icono `Building2`.

### Iteración 11 — *2026-04-30* — Modal de cita + vinculación con clientes

**Server actions**: `updateEvent` (PATCH Google primero, luego Supabase), `getEvent`, soporte `ubicacion`.

**`EventModal.tsx`**: diálogo glass estilo proyecto. Combobox de clientes con debounce 250ms y AbortController. Campos: título, cliente, inicio/fin, ubicación, notas, selector de 6 colores. Insignia "Esta cita se verá en tu móvil…". Validación: título no vacío, fin > inicio. Botón eliminar con confirmación (borra Google + Supabase).

**Cableado en `CalendarView.tsx`**: `select` y botón "Nueva cita" → modal creación. `eventClick` → `getEvent(id)` → modal edición. `onSaved`/`onDeleted` recarga rango y muestra toast.

### Iteración 10 — *2026-04-30* — UI del Calendario (FullCalendar dark)

**Dependencias**: `@fullcalendar/{core,daygrid,timegrid,interaction,react}` v6.1.15.

**Estilos** (`src/components/agenda/calendar.css`): override de variables `--fc-*`, cuadrícula glass, "today" tinted cyan, indicador "ahora" fucsia con glow. Botones toolbar 44px, eventos gradient indigo con variantes por `data-color`.

**Componente `CalendarView.tsx`**: vistas month/week/day, locale español, `firstDay=1`, `slot 07:00-22:00`, `nowIndicator`. `editable` + `eventResizableFromStart` + `selectable`. Pill "Sincronizando…" / "Al día". Botones ≥56px.

**Server actions**: `listEvents`, `updateEventTime` (drag/resize), `createEvent`, `deleteEvent`.

### Iteración 9 — *2026-04-30* — Infraestructura Agenda + Google Calendar API

**SQL** (`supabase/agenda_ext.sql`):
- Tabla `agenda_eventos` con `google_event_id`, `google_etag`, `last_synced_at`, `estado`. Índice único parcial en `(negocio_id, google_event_id)`.
- Tabla `google_connections` con `access_token` y `refresh_token` cifrados con `pgp_sym_encrypt`. Una fila por usuario.
- Funciones SECURITY DEFINER: `set_google_tokens`, `update_google_access_token`, `get_google_tokens`, `set_google_sync_token`.

**Cliente Google** (`src/lib/google.ts`):
- `loadTokens` / `saveTokens` / `persistSyncToken` — RPC al schema cifrado.
- `googleFetch(path, init)` — wrapper con refresh proactivo (si `expires_at ≤ now`) y reactivo (401 → intercambia token y reintenta). Sin SDK `googleapis`.

**Motor de sync** (`src/lib/agenda.ts`):
- `syncGoogleCalendar()` — Server Action. Sync incremental con `nextSyncToken`; 410 → full sync. Pagina con `nextPageToken`. Upsert por `(negocio_id, google_event_id)`.

### Iteración 8 — *2026-04-30* — Auth Next.js 15 + Módulo B2B Empresas

**Auth fix Next.js 15:**
- `src/lib/supabase/server.ts` ahora es `async` y hace `await cookies()`.
- Login limpio: eliminados botones Apple/Facebook. `OAuthButtons` solo Google con spinner.
- Mensajes de error traducidos al español con icono `AlertCircle`.

**Módulo Empresas (CRM B2B):**
- **SQL** (`supabase/empresas_ext.sql`): tablas `empresas` y `contactos_empresa` con FK autorreferencial `reports_to`. Trigger de validación de jerarquía. RLS multi-tenant.
- **Rutas**: `/empresas` (lista + filtros + skeletons), `/empresas/nuevo`, `/empresas/[id]` (3 pestañas).
- **Tabs**: Información (edición inline), Contactos (CRUD modal con jerarquía `reports_to`), Estructura jerárquica (`HierarchyChart` con `@xyflow/react`, layout de árbol automático, nodos glass-card, drag/zoom).
- Dependencia añadida: `@xyflow/react`.

### Iteración 7 — *2026-04-28* — Botón de acceso rápido en dev
- `DevLoginButton` (`src/components/auth/DevLoginButton.tsx`) — se renderiza **solo cuando `NODE_ENV === 'development'`**; en producción Next.js lo elimina del bundle. Lee `NEXT_PUBLIC_DEV_EMAIL` / `NEXT_PUBLIC_DEV_PASSWORD` y llama a `signInWithPassword`. Badge naranja `DEV MODE` + botón con icono ⚡.

### Iteración 6 — *2026-04-28* — CRM completo + Kanban con Drag & Drop

**SQL:** nueva migración `supabase/crm_kanban_ext.sql` con tablas `comunicaciones`, `kanban_columnas` y columnas `webhook_url/webhook_activo` en `clientes`. RLS aplicado. Trigger `seed_kanban` que inicializa 4 columnas por defecto al crear un negocio.

**CRM — Clientes:**
- `/clientes` — listado en grid con búsqueda en tiempo real (debounce 300ms), botones rápidos de WhatsApp/Email/teléfono y etiquetas de color.
- `/clientes/nuevo` — formulario con etiquetas personalizadas + sugeridas.
- `/clientes/[id]` — ficha con 4 pestañas: Información (edición inline), Historial (citas), Mensajes (log comunicaciones), Automático (webhook n8n/Make con botón Probar).

**Kanban:**
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag & drop táctil y ratón. `PointerSensor` (distancia 8px) + `TouchSensor` (delay 200ms).
- `DragOverlay` con rotación sutil durante el arrastre. Placeholder punteado en posición de origen.
- Reordenación dentro de columna y cambio de columna — persistencia optimista.
- `ColumnManager` — diálogo para crear, renombrar, cambiar color y eliminar columnas.
- `TaskModal` — creación/edición: título, descripción, columna, prioridad, fecha límite, checkbox "completada". Tareas vencidas con borde rojo.

Dependencias añadidas: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

### Iteración 8 — *2026-05-14* — Hardening Storage/admin_global + script de bootstrap dev
- **Nuevo `supabase/security_storage_hardening.sql`** (idempotente). Cierra los 3 hallazgos de la auditoría anterior:
  1. Bucket `logos`: la policy `using (bucket_id = 'logos')` permitía lectura **anónima** de logos de cualquier tenant. Pasa a `storage_path_is_in_my_negocio(name)`; para compartir el logo en una factura externa, la app debe generar **signed URLs** (`createSignedUrl`).
  2. Bucket `producto-imagenes`: mismo fix por tenant.
  3. Bucket `avatars`: cerrado a usuarios autenticados (los avatares son per-user, no per-tenant).
  4. `admin_global.admin_global_self_read` redefinida a `using (user_id = auth.uid())` — cada admin sólo se ve a sí mismo.
- **Helper** `public.storage_path_is_in_my_negocio(text)` con `SECURITY DEFINER` + `search_path` fijo; valida que la primera carpeta del path coincida con el `negocio_id` del usuario (titular en `perfiles_negocio` o miembro activo en `miembros_negocio`). `revoke from public, anon`, sólo `authenticated` ejecuta.
- **Nuevo `scripts/dev-setup.sh`** (también `npm run dev:setup`). Pasos: comprueba Node/Docker, arranca colima si hace falta, `npm install`, verifica que `.env.local` apunta a localhost (si apunta a prod respalda en `.env.production.local.backup` y aborta), `supabase start`, `migration up` (o `db reset` con `--reset`), **sincroniza** las claves `sb_publishable_*`/`sb_secret_*` que genera el CLI sobre `.env.local` automáticamente, `npm run seed:admin`. Idempotente.
- Migración local regenerada al final con el hardening incluido — verificado vía `pg_policies`: 13 policies en su estado correcto (las `*_public_read` ya no existen).

### Iteración 7 — *2026-05-14* — Auditoría RLS + paridad local↔prod + guard anti-prod
- **Paridad completa**: la migración local `20260514000000_initial_schema.sql` ahora consolida los **22 archivos `.sql`** del directorio (faltaban 7 en la iteración previa: `documentos_recibo_logos`, `inventario_imagenes`, `proveedores`, `listado`, `perfil_usuario`, `theme`, `rgpd`). Orden corregido: `fix_tenant_defaults` se aplica ANTES de `proveedores_ext` porque éste último crea triggers que llaman a `tg_fill_negocio_id()`.
- **`scripts/seed-admin.mjs` blindado**: rechaza ejecutarse si `NEXT_PUBLIC_SUPABASE_URL` no apunta a `127.0.0.1` / `localhost`. Para forzarlo contra otro entorno: `ALLOW_PROD_SEED=1 npm run seed:admin`. Probado contra una URL de producción simulada (sale con `exit 1`).
- **Auditoría RLS** sobre los 22 SQL: 27 tablas con RLS habilitada y policies por tenant, 14 funciones `SECURITY DEFINER` con `search_path` fijo, 0 grants a `anon`/`public` sobre tablas de dominio. Hallazgos documentados como recomendaciones (ver más abajo) — no se modificó código de producción sin autorización.

### Iteración 6 — *2026-05-14* — Supabase local en Docker para desarrollo
- **Problema**: tras desplegar en Vercel, el `.env.local` apuntaba a producción y cualquier prueba en `localhost` impactaba la base de datos real.
- **Solución**: stack completo de Supabase (Postgres 15, GoTrue, PostgREST, Storage, Realtime) levantado en Docker vía Supabase CLI.
- **Nuevos artefactos**:
  - `supabase/config.toml` — configuración del stack local (puertos 54321 API, 54322 DB, 54324 inbucket). Studio desactivado por defecto por incompatibilidad de colima al hacer `chown` en `supabase/snippets`.
  - `supabase/migrations/20260514000000_initial_schema.sql` — consolidación de los `.sql` del repo (schema + extensiones + retention + hardening) que `supabase db reset` aplica de un golpe. Se corrigió el `search_path` de la función `find_connection_by_channel` para incluir `extensions` (donde vive `digest()` en local).
  - `supabase/seed.sql` — copia de `seed_clientes.sql`; idempotente, salta si no hay perfiles.
  - Scripts npm: `db:start`, `db:stop`, `db:reset`, `db:status`, `db:studio`.
- **`.env.local`**: reescrito para apuntar a `http://127.0.0.1:54321` con las claves `sb_publishable_*` / `sb_secret_*` generadas por `supabase start`. Las credenciales de producción quedaron salvadas en `.env.production.local.backup` (ignorado por git con la nueva regla `.env*.backup`).
- **Validación**: stack arrancado, migración aplicada sin errores, `auth/v1/health` OK, `rest/v1/clientes` responde 200 con la apikey local, `npm run seed:admin` creó `admin@r3zon.dev`.

### Iteración 5 — *2026-04-28* — Bitácora en README
- Reescrito `README.md` con el estado real del proyecto, estructura de carpetas y tabla de módulos.
- Añadida la sección **Bitácora de iteraciones** que se actualiza en cada turno.

### Iteración 4 — *2026-04-28* — Finanzas, OCR y admin
- **Credenciales admin** en `.env.local` + script `npm run seed:admin`.
- **OCR client-side**: `lib/ocr/engine.ts` (wrapper Tesseract.js con modelo spa+eng) + `lib/ocr/parser.ts` (regex específicos para tickets españoles: fecha, CIF/NIF, base, IVA % y total).
- **Pantalla `/ocr`** con cámara/upload, barra de progreso y revisión editable antes de guardar.
- **Dashboard `/finanzas`** con Recharts: 4 KPIs ("Lo que has ganado", "Lo que has gastado", "Te queda", "Apartar para Hacienda"), barras mensuales, previsión de impuestos y lista de últimos movimientos.
- **`/finanzas/nuevo`** con toggle "He cobrado / He gastado" y cálculo en vivo del total.
- Dependencias añadidas: `tesseract.js`, `recharts`.

### Iteración 3 — *2026-04-28* — Autenticación, 2FA, RGPD y legales
- **Auth completa**: `/login`, `/registro` con email + 3 botones OAuth (Google, Apple, Facebook).
- **2FA TOTP**: `/2fa/configurar` (QR + clave manual) y `/2fa` (verificación). Middleware fuerza el flujo cuando la sesión es `aal1` con `nextLevel=aal2`.
- **Email de nuevo dispositivo**: `DeviceTracker` calcula fingerprint SHA-256 y, si es nuevo, invoca la Edge Function `notify-new-device` que envía mail con Resend.
- **Onboarding RGPD**: checkboxes obligatorios (términos, privacidad, cookies) + opcional marketing → RPC `registrar_onboarding` graba en `consentimientos_rgpd` con IP, UA y versión.
- **4 páginas legales** (`/legal/*`) con plantillas RGPD/LOPDGDD/LSSI-CE.
- Nuevas tablas: `terminos_versiones`, `dispositivos_conocidos`. Columnas `onboarding_completado*` en `perfiles_negocio`.

### Iteración 2 — *2026-04-28* — Credenciales Supabase
- Guardadas las credenciales reales del proyecto en `.env.local` (gitignored).
- Migración a la nueva nomenclatura `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_DB_PASSWORD` separado sin prefijo `NEXT_PUBLIC_` para no exponerlo al bundle.

### Iteración 1 — *2026-04-28* — Fundación del proyecto
- **Stack inicial**: Next.js 14, TypeScript, Tailwind, Supabase SSR clients.
- **Esquema multi-tenant** (`supabase/schema.sql`) con `perfiles_negocio`, `clientes`, `citas`, `tareas_kanban`, `finanzas` (con IVA/IRPF como columnas generadas), `consentimientos_rgpd`, `config_keys` (cifrada con `pgcrypto`). RLS y trigger de bootstrap incluidos.
- **AppShell** con `Sidebar` (botones grandes 56px) y drawer mobile, siguiendo el R3ZON Design System. Páginas placeholder para todos los módulos.


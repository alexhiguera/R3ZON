# R3ZON Business OS — Plan hacia v1.0

> Última revisión: 2026-05-12 · Sprints 1–4 completados

---

## Estado actual

Aplicación ~90% funcional: 9 módulos, 21 archivos SQL (2.8K líneas), sincronización bidireccional con Google Calendar, Stripe, OCR client-side (Tesseract.js), 2FA TOTP, equipo multi-miembro, cumplimiento RGPD, RLS multi-tenant. El código compila limpio (TypeScript strict) y el despliegue en Vercel está configurado.

---

## 🔴 Obligatorio para v1.0

### 1. Limpieza técnica urgente ✅

- [x] Eliminar archivos duplicados: `src/app/(app)/clientes/page 2.tsx` y `src/app/(app)/clientes/nuevo/page 2.tsx`
- [x] Migrar tipos de `Producto` a `database.types` en `src/lib/inventario.ts` (TODO post-iter37)
- [x] Migrar tipos de `Documento` a `database.types` en `src/lib/documentos.ts` (TODO post-iter37)

### 2. Gestión de errores y feedback al usuario ✅

- [x] Toast/banner global para errores de red en formularios de clientes, citas y tareas
- [x] Estado vacío con CTA cuando no hay datos (`/clientes` sin clientes, `/tareas` sin columnas)
- [x] Manejo explícito del error 429 de Google Calendar API (ya parcialmente en `agenda.ts`)
- [x] Pantalla de degradación si Supabase no responde al cargar el dashboard

### 3. Flujo de onboarding completo y probado ✅

- [x] Verificar que el consentimiento RGPD se almacena correctamente antes de acceder al panel
- [x] Confirmar que `seed_kanban` trigger crea las 4 columnas por defecto al crear `perfiles_negocio`
- [x] Validar flujo completo: registro → onboarding → dashboard sin intervención manual

### 4. Variables de entorno y secrets documentados ✅

- [x] `.env.example` con **todas** las variables requeridas y comentarios explicativos
- [x] README/SETUP.md con el orden correcto de ejecución de los 21 archivos SQL y el `setup.sql` maestro
- [x] Instrucciones para `CRON_SECRET`, webhook de Stripe en local y en producción, Google OAuth

### 5. Auditoría de seguridad básica ✅

- [x] Confirmar que ninguna ruta API expone tokens de Google (`getGoogleConnectionStatus` en `src/app/actions/google.ts`)
- [x] Validar que `channel_token` del webhook de Google usa timing-safe equality
- [x] Confirmar que `SUPABASE_SERVICE_ROLE_KEY` no aparece en ningún `NEXT_PUBLIC_*`
- [x] Confirmar que el webhook de Stripe valida `stripe-signature` antes de procesar eventos (`src/app/api/billing/webhook/`)

### 6. Módulo de Comunicaciones (CRM activity log) ✅

La tabla `comunicaciones` existe en el schema pero la UI es básica.

- [x] Tab "Actividad" en `/clientes/[id]` con listado cronológico (`TabComunicaciones.tsx` existe, revisar si está completo)
- [x] Botón "Añadir nota" (tipo: nota) desde el perfil del cliente
- [x] Registro automático cuando se crea una cita vinculada a un cliente

### 7. Exportación de datos (RGPD portabilidad) ✅

- [x] Exportar lista de clientes a CSV desde `/clientes`
- [x] Exportar movimientos financieros a CSV desde `/finanzas` (con filtro de fechas)
- [x] Botón "Exportar mis datos" en `/ajustes` → genera ZIP con todos los datos del negocio en JSON

### 8. Plan "Free" con límites reales ✅

El campo `plan` existe en `perfiles_negocio` pero sin lógica de restricción.

- [x] Definir límites del plan free (ej. 5 clientes, 10 tareas, sin Google Calendar sync)
- [x] Mostrar banners de upgrade al alcanzar el límite
- [x] Bloquear rutas API que requieren plan pro si `subscription_status ≠ active`

### 9. Testing mínimo viable ✅

131 tests en 13 archivos, todos pasando. Vitest configurado.

| Qué testear | Tipo | Archivo |
|---|---|---|
| Parser OCR español (regex fecha, CIF, base, IVA) | Unitario | `src/lib/ocr/parser.ts` |
| Cálculos financieros IVA/IRPF | Unitario | `src/lib/finanzas.ts` |
| RPCs Supabase (batch kanban, sync token) | Integración | `src/lib/kanban.ts`, `src/lib/agenda.ts` |
| Webhook Stripe (checkout.session.completed) | Integración | `src/app/api/billing/webhook/` |
| Flujo OAuth Google (exchange de tokens, refresh) | Integración | `src/lib/google.ts` |

**Herramienta:** Vitest (ya disponible) + Playwright para E2E registro → onboarding → dashboard.

---

## 🟡 Muy recomendable antes de crecer

### 10. Generación de facturas PDF ✅

- [x] Plantilla PDF con logo del negocio, datos fiscales, líneas de concepto, IVA desglosado
- [x] Generación client-side con `jsPDF` + `html2canvas` (multi-página, soporte ticket 80mm y A4)
- [x] `numero_factura` ya existe en la tabla `documentos`; conectar descarga desde `/documentos/[id]`

### 11. Notificaciones y recordatorios

- [ ] Email de recordatorio de cita X horas antes (Resend + Edge Function; `notify-new-device` ya usa Resend como patrón)
- [ ] Notificación in-app cuando un miembro del equipo crea una tarea asignada
- [ ] Badge en el sidebar de tareas cuando hay tareas vencidas hoy

### 12. Observabilidad ✅

- [x] Integrar Vercel Web Analytics (gratis, ya en la plataforma)
- [x] Logs estructurados en Edge Functions con nivel de severidad
- [x] Alertas en el cron `/api/cron/refresh-google-channels` si `failed > 0`

### 13. Modo claro

La UI es solo oscura. Tokens CSS ya están en Tailwind.

- [ ] Toggle dark/light en `/ajustes` → pestaña Apariencia
- [ ] Variante `light:` para los colores glassmorphic en `tailwind.config.ts`

### 14. Búsqueda global

- [ ] Atajo `Cmd+K` / `Ctrl+K` → command palette
- [ ] Búsqueda unificada: clientes, citas, tareas, movimientos financieros
- [ ] Resultados con icono de tipo y link directo

---

## 🟢 Opcionales / Roadmap futuro

### Módulo de propuestas y contratos
- Editor de propuestas con firma digital (DocuSign / HelloSign)
- Estado: borrador → enviada → firmada → archivada
- Vinculación a cliente

### Portal de cliente
- URL única por cliente (`/portal/[token]`)
- El cliente ve facturas, acepta propuestas y deja mensajes sin crear cuenta

### Automatizaciones nativas
- Reglas "si X entonces Y" (complemento a webhooks n8n ya existentes)
- UI de triggers y acciones

### App móvil nativa (Capacitor)
- Infraestructura ya existe (`output: export`, `capacitor.config.ts`)
- Push notifications nativas (FCM / APNs)

### Inteligencia artificial
- Resumen automático de cliente (comunicaciones + citas + finanzas)
- Categorización automática de gastos OCR
- Sugerencia de siguiente acción CRM

### Multi-idioma
- `next-intl` para inglés y portugués (mercado LATAM)

### Integración contable
- Sincronización de facturas con Holded / Contasimple
- Importación de clientes desde CSV

---

## Orden de ejecución sugerido

```
Sprint 1 (semana 1-2)
  ├── Limpieza técnica (duplicados + TODOs tipos)     [§1]
  ├── Gestión de errores + estados vacíos             [§2]
  └── .env.example + documentación SQL               [§4]

Sprint 2 (semana 3-4)
  ├── Auditoría de seguridad                          [§5]
  ├── Tab Actividad en perfil de cliente              [§6]
  └── Flujo onboarding E2E probado                   [§3]

Sprint 3 (semana 5-6)
  ├── Tests unitarios (OCR parser, cálculos)         [§9]
  ├── Tests integración (Stripe webhook, Google)     [§9]
  └── Exportación CSV y ZIP de datos                 [§7]

Sprint 4 (semana 7-8)
  ├── Lógica de límites por plan Free                [§8]
  ├── Generación de facturas PDF                     [§10]
  └── Observabilidad básica (Analytics + alertas)   [§12]

v1.0 ✅

Post-v1.0
  ├── Notificaciones y recordatorios                 [§11]
  ├── Modo claro                                     [§13]
  └── Búsqueda global Cmd+K                          [§14]
```

---

## Criterios de "done" para v1.0 ✅

- [x] Cero archivos duplicados en `src/`
- [x] Tipos de `Producto` y `Documento` unificados con `database.types`
- [x] Test suite con cobertura > 60% en lógica de negocio crítica (131 tests / 13 archivos)
- [x] Flujo registro → onboarding → primer cliente → primera cita sin errores
- [x] Webhook Stripe procesa pagos reales en producción
- [x] Exportación de datos disponible (RGPD portabilidad)
- [x] Sin secrets expuestos en cliente
- [x] `.env.example` y README de despliegue completos
- [x] Plan Free con límites aplicados
- [x] Generación PDF de facturas disponible

---

*Generado con revisión completa del código fuente · R3ZON Business OS*

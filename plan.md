# R3ZON Business OS — Plan hacia v1.0

> Última revisión: 2026-05-03

---

## Estado actual

La aplicación es funcionalmente rica: 9 módulos, 16 tablas Supabase, sincronización bidireccional con Google Calendar, facturación con Stripe, OCR client-side, 2FA, equipo multi-miembro y cumplimiento RGPD. El código compila limpio y el despliegue en Vercel está configurado.

Lo que falta para considerar esto una **primera release completa y confiable** se divide en tres niveles.

---

## 🔴 Obligatorio para v1.0

Estas tareas son **bloqueantes**. Sin ellas la app no debería lanzarse a usuarios reales.

### 1. Testing mínimo viable

El proyecto tiene cero tests. Cualquier refactor o bugfix puede romper flujos críticos sin que nadie se entere.

| Qué testear | Tipo | Prioridad |
|---|---|---|
| RPCs de Supabase (batch kanban, sync token) | Integración | Alta |
| Webhook de Stripe (checkout.session.completed, invoice events) | Integración | Alta |
| Parser OCR en español (regex fecha, CIF, base, IVA) | Unitario | Alta |
| Flujo OAuth Google (exchange de tokens, refresh) | Integración | Alta |
| Cálculos financieros IVA/IRPF | Unitario | Media |

**Herramienta sugerida:** Vitest (ya disponible con Next.js) + Playwright para E2E del flujo de alta y primer uso.

---

### 2. Gestión de errores y feedback al usuario

Varios formularios y acciones async no muestran estados de error claros cuando algo falla (red, token expirado, límite de plan).

- [ ] Toast/banner global para errores de red en formularios de clientes, citas y tareas
- [ ] Estado vacío con CTA cuando no hay datos (ej. `/clientes` sin clientes, `/tareas` sin columnas)
- [ ] Manejo explícito del error 429 de Google Calendar API (rate limit)
- [ ] Pantalla de degradación si Supabase no responde al cargar el dashboard

---

### 3. Flujo de onboarding completo y probado

El onboarding es la primera impresión. Debe funcionar de extremo a extremo:

- [ ] Verificar que el consentimiento RGPD se almacena correctamente antes de acceder al panel
- [ ] Asegurar que `seed_kanban` trigger crea las 4 columnas por defecto al crear `perfiles_negocio`
- [ ] Validar que el usuario puede completar registro → onboarding → dashboard sin intervención manual

---

### 4. Variables de entorno y secrets documentados

- [ ] Archivo `.env.example` con **todas** las variables requeridas y comentarios explicativos
- [ ] Documentar en README (o SETUP.md) el orden correcto de ejecución de los 7 archivos SQL
- [ ] Instrucciones para obtener `CRON_SECRET`, configurar webhook de Stripe en local y en producción

---

### 5. Seguridad: auditoría básica

- [ ] Confirmar que ninguna ruta de API expone tokens de Google (revisar `getGoogleConnectionStatus`)
- [ ] Validar que el `channel_token` del webhook de Google se compara con timing-safe equality
- [ ] Revisar que `SUPABASE_SERVICE_ROLE_KEY` nunca se expone al cliente (no aparece en `NEXT_PUBLIC_*`)
- [ ] Confirmar que el webhook de Stripe valida `stripe-signature` antes de procesar cualquier evento

---

### 6. Módulo de Comunicaciones (CRM activity log)

La tabla `comunicaciones` existe en el schema pero no hay UI para crear o listar comunicaciones manualmente desde el perfil de un cliente. El dashboard las lista pero sin origen claro.

- [ ] Añadir tab "Actividad" en `/clientes/[id]` con listado cronológico de comunicaciones
- [ ] Botón "Añadir nota" (tipo: nota) desde el perfil del cliente
- [ ] Registro automático cuando se crea una cita vinculada a un cliente

---

### 7. Exportación de datos básica

Obligatorio para cumplimiento RGPD (derecho de portabilidad) y para que el usuario confíe en guardar sus datos.

- [ ] Exportar lista de clientes a CSV desde `/clientes`
- [ ] Exportar movimientos financieros a CSV desde `/finanzas` (con filtro de fechas)
- [ ] Botón "Exportar mis datos" en `/ajustes` (genera ZIP con todos los datos del negocio en JSON)

---

### 8. Plan "Free" con límites reales

Actualmente `plan` puede ser `free/pro/enterprise` pero no hay lógica que restrinja el acceso según el plan.

- [ ] Definir límites del plan free (ej. 5 clientes, 10 tareas, sin Google Calendar sync)
- [ ] Mostrar banners de upgrade cuando se alcanza el límite
- [ ] Bloquear las rutas de API que requieren plan pro si `subscription_status ≠ active`

---

## 🟡 Muy recomendable antes de crecer

Estas tareas no bloquean el lanzamiento pero son casi obligatorias para retener usuarios y operar con confianza.

### 9. Observabilidad

- [ ] Integrar Vercel Web Analytics (gratis, ya en la plataforma)
- [ ] Logs estructurados en las Edge Functions (Supabase) con nivel de severidad
- [ ] Alertas en el cron de Google Calendar (`/api/cron/refresh-google-channels`) si `failed > 0`

### 10. Generación de facturas PDF

Los autónomos españoles necesitan emitir facturas. El módulo de finanzas registra movimientos pero no genera documentos legales.

- [ ] Plantilla de factura PDF (logo del negocio, datos fiscales, líneas de concepto, IVA desglosado)
- [ ] Generación client-side con `jsPDF` o server-side con una Edge Function
- [ ] Numeración automática (`numero_factura` ya existe en la tabla)
- [ ] Descarga directa desde `/finanzas/[id]`

### 11. Notificaciones y recordatorios

- [ ] Email de recordatorio de cita X horas antes (Resend + Edge Function)
- [ ] Notificación in-app cuando un miembro del equipo crea una tarea asignada
- [ ] Alerta cuando una tarea vence hoy (badge en el icono de tareas en el sidebar)

### 12. Modo oscuro / claro

La UI es únicamente oscura. Para algunos usuarios (especialmente en móvil al sol) un modo claro sería necesario.

- [ ] Implementar toggle dark/light en `/ajustes` → pestaña Negocio o en el header
- [ ] Tokens CSS ya están en Tailwind; crear variante `light:` para los colores de glassmorphic

### 13. Búsqueda global

- [ ] Atajo de teclado `Cmd+K` / `Ctrl+K` que abra un command palette
- [ ] Búsqueda unificada en clientes, citas, tareas y movimientos
- [ ] Resultados con icono de tipo y link directo

---

## 🟢 Opcionales / Roadmap futuro

Funcionalidades que añaden valor diferencial pero que pueden esperar a iteraciones posteriores.

### Módulo de propuestas y contratos
- Editor de propuestas comerciales con firma digital (DocuSign / HelloSign)
- Estado: borrador → enviada → firmada → archivada
- Vinculación a cliente y proyecto

### Portal de cliente
- URL única por cliente (`/portal/[token]`)
- El cliente puede ver sus facturas, aceptar propuestas y dejar mensajes
- Sin necesidad de crear cuenta en R3ZON

### Automatizaciones nativas
- Reglas "si pasa X entonces hacer Y" (ej. "si se crea cliente → crear tarea de bienvenida")
- Complemento a los webhooks n8n ya existentes
- UI drag-and-drop de triggers y acciones

### App móvil nativa (Capacitor)
- La infraestructura ya existe (`NEXT_OUTPUT_MODE=export`, `capacitor.config.ts`)
- Publicar en App Store y Google Play
- Push notifications nativas (FCM / APNs)

### Inteligencia artificial
- Resumen automático de cliente (últimas comunicaciones + citas + finanzas)
- Sugerencia de siguiente acción basada en historial CRM
- Categorización automática de gastos OCR

### Multi-idioma
- La app está en español; añadir `i18n` con `next-intl` para inglés y portugués (mercado LATAM)

### Integración con Holded / Contasimple
- Sincronización de facturas con software contable
- Importación de clientes desde CSV de Holded

---

## Orden de ejecución sugerido

```
Sprint 1 (semana 1-2)
  ├── Gestión de errores + estados vacíos           [§2]
  ├── .env.example + documentación SQL              [§4]
  └── Auditoría de seguridad                        [§5]

Sprint 2 (semana 3-4)
  ├── Tests unitarios (OCR parser, cálculos)        [§1]
  ├── Tests integración (Stripe webhook, Google)    [§1]
  └── Tab Actividad en perfil de cliente            [§6]

Sprint 3 (semana 5-6)
  ├── Exportación CSV y ZIP de datos                [§7]
  ├── Lógica de límites por plan Free               [§8]
  └── Observabilidad básica (Analytics + alertas)  [§9]

Sprint 4 (semana 7-8)
  ├── Generación de facturas PDF                    [§10]
  ├── Notificaciones y recordatorios                [§11]
  └── Prueba E2E onboarding completo                [§3]

v1.0 ✅
```

---

## Criterios de "done" para v1.0

- [ ] Test suite con cobertura > 60% en lógica de negocio crítica
- [ ] Flujo registro → onboarding → primer cliente → primera cita funciona sin errores
- [ ] Webhook de Stripe procesa pagos reales en producción
- [ ] Exportación de datos disponible (RGPD)
- [ ] Sin secrets expuestos en cliente
- [ ] README con instrucciones de despliegue completas
- [ ] Plan Free con límites aplicados

---

*Generado con revisión completa del código fuente · R3ZON Business OS*

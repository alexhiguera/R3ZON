# R3ZON · Sistema de Autenticación

## 1. Pasos en el dashboard de Supabase

### 1.1 Ejecuta los SQL
1. `supabase/schema.sql` (esquema base + RLS)
2. `supabase/auth_extension.sql` (terminos, dispositivos, onboarding, RPCs)

### 1.2 Activa los proveedores OAuth
**Authentication → Providers**:
- **Google** → habilita y pega Client ID + Secret de Google Cloud Console.
  Redirect URL a registrar en Google: `https://htsryzrwdgllqnzbreyq.supabase.co/auth/v1/callback`
- **Apple** → habilita y pega Services ID + Team ID + Key ID + Private Key de Apple Developer.
- **Facebook** → habilita y pega App ID + App Secret de Meta for Developers.

### 1.3 Activa MFA (TOTP)
**Authentication → Policies → Multi-Factor Authentication**:
- Activa `TOTP (Time-Based One-Time Password)`.
- (Opcional) Forzar AAL2 para acciones sensibles vía RLS:
  ```sql
  using ((select auth.jwt()->>'aal') = 'aal2')
  ```

### 1.4 Email templates
**Authentication → Email Templates** → personaliza:
- Confirmación de registro
- Recuperación de contraseña
- Magic link

Supabase envía estos automáticamente. Los emails de **nuevo dispositivo** los gestiona la Edge Function (paso 1.5).

### 1.5 Despliega la Edge Function
```bash
# Configura los secrets
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set RESEND_FROM="R3ZON <noreply@tu-dominio.com>"

# Deploy
supabase functions deploy notify-new-device
```

Necesitas una cuenta gratis en [resend.com](https://resend.com) y verificar tu dominio.

## 2. Flujo completo

```
┌──────────────┐
│  /registro   │  → email+contraseña ó OAuth (Google/Apple/Facebook)
└──────┬───────┘
       │ Supabase Auth → trigger crea perfiles_negocio
       ▼
┌──────────────┐
│ /onboarding  │  → checkboxes RGPD/LSSI → RPC registrar_onboarding
└──────┬───────┘     → escribe consentimientos_rgpd con IP+UA+versión
       ▼
┌──────────────┐
│  /dashboard  │  → DeviceTracker monta y registra fingerprint
└──────────────┘     → si nuevo: invoke('notify-new-device') → Resend

       En cualquier momento:
┌──────────────────────────┐
│ /2fa/configurar (TOTP)   │  → enroll → QR → verify → factor 'verified'
└──────────────────────────┘
       Próximo login con 2FA activa:
┌──────────────┐
│    /2fa      │  → middleware detecta nextLevel='aal2' y redirige
└──────────────┘
```

## 3. Mapa de archivos

| Archivo | Rol |
|---|---|
| `src/middleware.ts` | Refresca sesión y gate de auth/2FA |
| `src/lib/supabase/{client,server,middleware}.ts` | Clientes Supabase SSR/CSR |
| `src/app/(auth)/login/page.tsx` | Email + OAuth |
| `src/app/(auth)/registro/page.tsx` | Alta nueva con OAuth |
| `src/app/(auth)/2fa/page.tsx` | Verificación TOTP en login |
| `src/app/(app)/2fa/configurar/page.tsx` | Enrolment TOTP (QR) |
| `src/app/auth/callback/route.ts` | Intercambia code OAuth |
| `src/app/(app)/onboarding/page.tsx` | Aceptación RGPD inicial |
| `src/app/(app)/layout.tsx` | Guard: fuerza onboarding si pendiente |
| `src/components/auth/OAuthButtons.tsx` | Botones Google/Apple/Facebook |
| `src/components/auth/DeviceTracker.tsx` | Fingerprint + invoca Edge Function |
| `src/lib/devices.ts` | SHA-256 de UA+plataforma+TZ |
| `src/app/legal/{aviso-legal,privacidad,cookies,terminos}/page.tsx` | Plantillas legales |
| `supabase/auth_extension.sql` | Tablas de devices, onboarding, RPCs |
| `supabase/functions/notify-new-device/index.ts` | Edge Function Resend |

## 4. Notas RGPD

- Las plantillas legales son **orientativas** — sustituye los `[campos entre corchetes]` y revisa con un asesor jurídico.
- Cada consentimiento se guarda con: `tipo`, `texto_version`, `ip`, `user_agent`, timestamp y referencia al `cliente_id`. Esto satisface el principio de **accountability** (art. 5.2 RGPD).
- El versionado vía `terminos_versiones` permite re-pedir consentimiento si cambias los textos.

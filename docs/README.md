# 📚 Documentación de R3ZON ANTARES

Documentación completa del proyecto. Este directorio se sincroniza automáticamente con la [Wiki de GitHub](https://github.com/alexhiguera/R3ZON/wiki) ejecutando [`scripts/sync-wiki.sh`](../scripts/sync-wiki.sh).

---

## 🗺 Índice

### Empezar

- **[`DEVELOPMENT.md`](DEVELOPMENT.md)** — Cómo levantar el proyecto en local con `dev-setup.sh` · webhooks · Capacitor · troubleshooting.
- **[`DEPLOYMENT.md`](DEPLOYMENT.md)** — Despliegue a producción: Supabase Cloud, Vercel, Stripe, Google, dominio y verificación.

### Arquitectura

- **[`STACK.md`](STACK.md)** — Capas tecnológicas, dependencias clave y filosofía de "0€ servidor".
- **[`STRUCTURE.md`](STRUCTURE.md)** — Árbol del repositorio, módulos de negocio y patrones arquitectónicos.
- **[`MODULES.md`](MODULES.md)** — Estado actual de cada módulo (✅ completo / 🚧 pendiente).

### Seguridad y permisos

- **[`AUTH.md`](AUTH.md)** — Auth flow completo: email, OAuth Google, 2FA TOTP, dispositivos, onboarding RGPD.
- **[`ROLES.md`](ROLES.md)** — Sistema de roles (admin_global · owner · miembro) y permisos jsonb granulares.

### Historia

- **[`CHANGELOG.md`](CHANGELOG.md)** — Bitácora completa de iteraciones (más reciente → más antiguo).

---

## ✏️ Cómo contribuir a la documentación

1. Edita los `.md` en este directorio directamente. Usa rutas relativas (`../package.json`, `STRUCTURE.md`).
2. Tras un cambio en código que afecte a la documentación, actualiza el archivo correspondiente en el **mismo commit**.
3. Para cada nueva iteración añade una sección al inicio de [`CHANGELOG.md`](CHANGELOG.md): `### Iteración N — *YYYY-MM-DD* — Título`.
4. Sincroniza la wiki cuando hagas merge a `main`:

   ```bash
   ./scripts/sync-wiki.sh
   ```

   El script clona la wiki, copia los `.md` con renombrados (`README.md` → `Home.md`, `CHANGELOG.md` → `Changelog.md`, …) y los empuja.

---

## 🤖 Para LLMs / agentes

Si estás navegando este repositorio como agente:

- Empieza por [`STRUCTURE.md`](STRUCTURE.md) para entender la disposición de archivos.
- Usa [`MODULES.md`](MODULES.md) para saber qué está implementado antes de proponer cambios.
- Consulta [`CHANGELOG.md`](CHANGELOG.md) cuando necesites contexto histórico ("¿por qué se hizo X así?").
- Recuerda actualizar `CHANGELOG.md` al final de cada iteración con una entrada nueva.

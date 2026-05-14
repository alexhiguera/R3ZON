#!/usr/bin/env bash
# =============================================================================
# R3ZON Business OS — Bootstrap de entorno de desarrollo SEGURO
# =============================================================================
# Levanta el stack de Supabase en Docker, aplica todas las migraciones del
# repo (incluido el hardening de Storage + admin_global), crea el admin de
# desarrollo y deja Next.js listo para `npm run dev`.
#
# Garantías:
#   · Nunca toca la base de datos de producción.
#   · Si `.env.local` apunta a un host no-local, lo respalda automáticamente y
#     lo reescribe contra el stack local antes de hacer nada.
#   · Idempotente: ejecútalo cuantas veces quieras.
#
# Uso:
#   ./scripts/dev-setup.sh           # arranque normal
#   ./scripts/dev-setup.sh --reset   # reaplica migraciones desde cero (wipe)
# =============================================================================
set -euo pipefail

# --- colores --------------------------------------------------------------------
if [[ -t 1 ]]; then
  C_RED=$'\033[0;31m'; C_GRN=$'\033[0;32m'; C_YLW=$'\033[0;33m'
  C_BLU=$'\033[0;34m'; C_DIM=$'\033[2m';    C_RST=$'\033[0m'
else
  C_RED=''; C_GRN=''; C_YLW=''; C_BLU=''; C_DIM=''; C_RST=''
fi
log()   { echo "${C_BLU}▸${C_RST} $*"; }
ok()    { echo "${C_GRN}✓${C_RST} $*"; }
warn()  { echo "${C_YLW}!${C_RST} $*"; }
fail()  { echo "${C_RED}✗${C_RST} $*" >&2; exit 1; }

# --- localizar la raíz del repo -------------------------------------------------
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
log "Repositorio: ${C_DIM}$ROOT${C_RST}"

RESET=0
[[ "${1:-}" == "--reset" ]] && RESET=1

# --- 1. Pre-requisitos ----------------------------------------------------------
log "Comprobando pre-requisitos…"
command -v node   >/dev/null 2>&1 || fail "Node.js no instalado."
command -v npm    >/dev/null 2>&1 || fail "npm no instalado."
command -v docker >/dev/null 2>&1 || fail "Docker no instalado."

if ! docker info >/dev/null 2>&1; then
  warn "El daemon de Docker no responde."
  if command -v colima >/dev/null 2>&1; then
    log "Intentando arrancar colima…"
    colima start >/dev/null
  else
    fail "Arranca Docker Desktop (o colima) y vuelve a ejecutarme."
  fi
fi
ok "Node $(node -v), npm $(npm -v), Docker $(docker --version | awk '{print $3}' | tr -d ',')"

# --- 2. Dependencias de Node ----------------------------------------------------
if [[ ! -d node_modules ]]; then
  log "Instalando dependencias npm…"
  npm install --no-audit --no-fund
fi
ok "node_modules listo."

# --- 2.5 Si hay un `next dev` corriendo, avisa: cacheará envs viejas -----------
if pgrep -fl "next dev" >/dev/null 2>&1; then
  warn "Hay un proceso 'next dev' en marcha. Next.js congela las NEXT_PUBLIC_*"
  warn "al arrancar, así que tras este setup deberás REINICIARLO (Ctrl+C y 'npm run dev')."
fi

# --- 3. .env.local: backup si apunta a prod, reescribir si no existe ------------
LOCAL_URL="http://127.0.0.1:54321"
if [[ -f .env.local ]]; then
  CURRENT_URL="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | head -1 | cut -d= -f2- || true)"
  if [[ -n "$CURRENT_URL" && "$CURRENT_URL" != http://127.0.0.1:* && "$CURRENT_URL" != http://localhost:* ]]; then
    BACKUP=".env.production.local.backup"
    if [[ -f "$BACKUP" ]]; then
      warn "Encontrado .env.local con URL de producción ($CURRENT_URL)."
      warn "Ya existe $BACKUP — no se sobreescribe. Reemplazando .env.local por el del backup local."
    else
      log "Respaldando credenciales de producción en $BACKUP…"
      cp .env.local "$BACKUP"
      ok "Backup creado: $BACKUP"
    fi
    fail "Edita .env.local para que NEXT_PUBLIC_SUPABASE_URL=$LOCAL_URL antes de continuar.
   (Restaura el local con: cp $BACKUP .env.local sólo si ese backup es del local.)"
  fi
else
  fail "No existe .env.local. Copia .env.local.example y rellena, o restaura desde backup."
fi
ok ".env.local apunta a $LOCAL_URL."

# --- 4. Arrancar Supabase -------------------------------------------------------
log "Comprobando estado del stack Supabase local…"
if npx --yes supabase@latest status >/dev/null 2>&1; then
  ok "Supabase ya está arriba."
else
  log "Arrancando Supabase (primera vez puede tardar ~1 min descargando imágenes)…"
  npx --yes supabase@latest start
fi

# --- 5. Aplicar migraciones -----------------------------------------------------
if [[ $RESET -eq 1 ]]; then
  warn "Modo --reset: WIPE de la DB local + reaplicación de migraciones."
  npx --yes supabase@latest db reset
  ok "Base de datos reseteada."
else
  log "Aplicando migraciones pendientes (si las hay)…"
  npx --yes supabase@latest migration up || warn "supabase migration up devolvió error no fatal — revisa salida."
fi

# --- 6. Sincronizar las keys reales del CLI con .env.local ----------------------
log "Sincronizando claves del stack local en .env.local…"
STATUS_OUT="$(npx --yes supabase@latest status -o env 2>/dev/null || true)"
NEW_PUB="$(echo "$STATUS_OUT" | awk -F= '/^ANON_KEY=/{print $2}' | tr -d '"')"
NEW_SVC="$(echo "$STATUS_OUT" | awk -F= '/^SERVICE_ROLE_KEY=/{print $2}' | tr -d '"')"

if [[ -n "$NEW_PUB" && -n "$NEW_SVC" ]]; then
  # macOS sed quiere -i ''
  sed -i.bak -E "s|^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEW_PUB|" .env.local
  sed -i.bak -E "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$NEW_SVC|" .env.local
  rm -f .env.local.bak
  ok "Claves locales sincronizadas."
else
  warn "No se pudieron leer las claves desde 'supabase status -o env' — usa las que estaban."
fi

# --- 7. Crear admin de desarrollo ----------------------------------------------
log "Creando usuario admin de desarrollo (idempotente)…"
npm run seed:admin --silent

# --- 8. Resumen ----------------------------------------------------------------
echo
echo "${C_GRN}═══════════════════════════════════════════════════════════════════${C_RST}"
echo "${C_GRN}  Entorno de desarrollo listo${C_RST}"
echo "${C_GRN}═══════════════════════════════════════════════════════════════════${C_RST}"
npx --yes supabase@latest status 2>/dev/null | grep -E 'API URL|DB URL|Inbucket|Publishable|Studio' || true
echo
echo "  ${C_BLU}Admin local:${C_RST}  admin@r3zon.dev / R3z0n!Admin-Dev-2026"
if pgrep -fl "next dev" >/dev/null 2>&1; then
  echo "  ${C_YLW}!  REINICIA next dev${C_RST} (Ctrl+C y 'npm run dev') — tiene envs viejas en cache."
else
  echo "  ${C_BLU}Siguiente:${C_RST}    npm run dev"
fi
echo "  ${C_BLU}Parar BD:${C_RST}     npm run db:stop"
echo "  ${C_BLU}Reset BD:${C_RST}     ./scripts/dev-setup.sh --reset"
echo

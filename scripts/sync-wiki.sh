#!/usr/bin/env bash
# =============================================================================
# R3ZON ANTARES — Sincronizador de docs/ con la wiki de GitHub
# =============================================================================
# Clona la wiki del repo, copia los .md de docs/ con los nombres que GitHub
# espera (Home.md, etc.), añade un footer de "última sincronización" y hace
# push.
#
# Convenciones de nombre:
#   docs/README.md      → Home.md             (página de inicio de la wiki)
#   docs/CHANGELOG.md   → Changelog.md
#   docs/DEVELOPMENT.md → Development.md
#   docs/DEPLOYMENT.md  → Deployment.md
#   docs/STACK.md       → Stack.md
#   docs/STRUCTURE.md   → Structure.md
#   docs/MODULES.md     → Modules.md
#   docs/AUTH.md        → Auth.md
#   docs/ROLES.md       → Roles.md
#
# Las wikis de GitHub no soportan subdirectorios — todos los .md viven en raíz
# y los links relativos entre ellos se traducen a links de wiki ([Page]).
#
# Uso:
#   ./scripts/sync-wiki.sh                  # sync normal
#   ./scripts/sync-wiki.sh --dry-run        # solo muestra qué se subiría
#   WIKI_REMOTE=git@... ./scripts/sync-wiki.sh   # override del remote
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

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

# --- 1. localizar el remote de la wiki -----------------------------------------
if [[ -n "${WIKI_REMOTE:-}" ]]; then
  REMOTE="$WIKI_REMOTE"
else
  ORIGIN="$(git config --get remote.origin.url || true)"
  [[ -z "$ORIGIN" ]] && fail "No hay remote 'origin' en este repo. Define WIKI_REMOTE=..."
  REMOTE="${ORIGIN%.git}.wiki.git"
fi
log "Remote de la wiki: ${C_DIM}$REMOTE${C_RST}"

# --- 2. clonar la wiki en un directorio temporal -------------------------------
TMP="$(mktemp -d -t r3zon-wiki-XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

log "Clonando wiki en $TMP…"
if ! git clone --quiet "$REMOTE" "$TMP" 2>/dev/null; then
  warn "No se pudo clonar la wiki. Probablemente esté vacía."
  warn "Crea la primera página manualmente desde la pestaña 'Wiki' del repo y vuelve a ejecutarme."
  fail "Abortado."
fi
ok "Wiki clonada."

# --- 3. mapeo de archivos ------------------------------------------------------
declare -a PAIRS=(
  "docs/README.md:Home.md"
  "docs/DEVELOPMENT.md:Development.md"
  "docs/DEPLOYMENT.md:Deployment.md"
  "docs/STACK.md:Stack.md"
  "docs/STRUCTURE.md:Structure.md"
  "docs/MODULES.md:Modules.md"
  "docs/AUTH.md:Auth.md"
  "docs/ROLES.md:Roles.md"
  "docs/CHANGELOG.md:Changelog.md"
)

# --- 4. transformar y copiar ---------------------------------------------------
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
COMMIT_SHA="$(git rev-parse --short HEAD)"

log "Transformando y copiando ${#PAIRS[@]} páginas…"
for pair in "${PAIRS[@]}"; do
  SRC="${pair%%:*}"
  DEST="${pair##*:}"

  if [[ ! -f "$SRC" ]]; then
    warn "  $SRC no existe, saltando."
    continue
  fi

  # Reescribe links docs/X.md → [[X]] (formato GitHub wiki) y elimina prefijo docs/.
  # 1) `docs/FOO.md` → `FOO.md` (en links). 2) `FOO.md` (link relativo entre docs) → `FOO`.
  # 3) `../package.json` y demás paths del repo se convierten en links a blob/main.
  REPO_BLOB="${REMOTE%.wiki.git}/blob/main"
  python3 - "$SRC" "$TMP/$DEST" "$NOW" "$COMMIT_SHA" "$REPO_BLOB" <<'PY'
import re, sys, pathlib

src, dst, now, sha, blob_base = sys.argv[1:]
text = pathlib.Path(src).read_text(encoding="utf-8")

# Mapa de renombrados conocidos (nombre relativo en docs/ → página wiki sin .md).
WIKI_PAGES = {
    "README.md": "Home",
    "DEVELOPMENT.md": "Development",
    "DEPLOYMENT.md": "Deployment",
    "STACK.md": "Stack",
    "STRUCTURE.md": "Structure",
    "MODULES.md": "Modules",
    "AUTH.md": "Auth",
    "ROLES.md": "Roles",
    "CHANGELOG.md": "Changelog",
}

def repl(match):
    label = match.group(1)
    target = match.group(2)
    # Link a otra página de docs/ (formato `FOO.md` o `docs/FOO.md`).
    bare = target.split("#")[0].split("?")[0]
    anchor = target[len(bare):]
    name = bare.split("/")[-1]
    if bare.startswith("docs/") or "/" not in bare:
        if name in WIKI_PAGES:
            page = WIKI_PAGES[name]
            return f"[{label}]({page}{anchor})"
    # Link a archivo del repo (../foo, ./foo) → URL absoluta en GitHub.
    if bare.startswith("../") or bare.startswith("./"):
        clean = bare.lstrip("./")
        return f"[{label}]({blob_base}/{clean}{anchor})"
    return match.group(0)

# Solo nos interesan markdown links [texto](path) — no URLs sueltas.
text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", repl, text)

footer = (
    f"\n\n---\n"
    f"<sub>📌 Página sincronizada automáticamente desde "
    f"[docs/{pathlib.Path(src).name}]"
    f"({blob_base}/{src}) · commit `{sha}` · {now}</sub>\n"
)

pathlib.Path(dst).write_text(text + footer, encoding="utf-8")
PY

  ok "  $SRC → $DEST"
done

# --- 5. commit y push ----------------------------------------------------------
cd "$TMP"
if git diff --quiet && [[ -z "$(git status --porcelain)" ]]; then
  ok "La wiki ya está al día — no hay cambios."
  exit 0
fi

if [[ $DRY_RUN -eq 1 ]]; then
  warn "--dry-run: no se hace commit. Diff:"
  git --no-pager diff --stat
  exit 0
fi

git add -A
git -c user.name="r3zon-sync" -c user.email="sync@r3zon.local" \
    commit -m "docs: sync from main @ ${COMMIT_SHA} (${NOW})" >/dev/null
log "Push a la wiki…"
git push --quiet
ok "Wiki actualizada."

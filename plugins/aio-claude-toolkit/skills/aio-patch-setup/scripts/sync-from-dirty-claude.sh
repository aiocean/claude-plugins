#!/usr/bin/env bash
# sync-from-dirty-claude.sh — MAINTAINER-ONLY. Refresh templates/ from upstream dirty-claude.
#
# Usage:
#   sync-from-dirty-claude.sh [dirty_claude_repo_path]
#   (default: ~/projects/dirty-claude)
#
# What it does:
#   1. rsync tools/ → templates/tools/
#   2. rsync curated docs/ subset → templates/docs/
#   3. Move tools/pipeline/patches.json → patches.json.example
#   4. Replace patches.json with an empty schema template
#   5. Move tools/pipeline/sources/dirty_control_channel.js → .example
#   6. rsync control/*.sh + client.ts → aio-patch-control/templates/control/
#   7. Apply arch-env-override.patch to scaffolded extract.sh + build.sh
#   8. Write templates/VERSION
#
# Idempotent: re-runnable; overwrites templates/. User-content suffix files
# (.example, .template) are derived from upstream — re-syncing is safe.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTROL_DIR="$(cd "$SETUP_DIR/../aio-patch-control" && pwd)"
TEMPLATES="$SETUP_DIR/templates"
CONTROL_TEMPLATES="$CONTROL_DIR/templates"
PATCH="$SCRIPT_DIR/arch-env-override.patch"

DIRTY="${1:-$HOME/projects/dirty-claude}"
if [[ ! -d "$DIRTY/tools/pipeline" ]]; then
  echo "ERROR: $DIRTY does not look like a dirty-claude repo (no tools/pipeline)." >&2
  exit 1
fi

echo "[sync] source: $DIRTY"
echo "[sync] templates dest: $TEMPLATES"
echo "[sync] control templates dest: $CONTROL_TEMPLATES"

# Capture upstream version metadata BEFORE any modifications
COMMIT="$(cd "$DIRTY" && git rev-parse HEAD)"
ORIGIN="$(cd "$DIRTY" && git remote get-url origin 2>/dev/null || echo "(local-only)")"
CLAUDE_VER="$(grep -oE 'Current pin:\*\* Claude `[^`]+`' "$DIRTY/CLAUDE.md" | grep -oE '[0-9.]+' | head -1 || echo unknown)"

# 1. rsync tools/ (excluding dist/ and runtime junk)
# node_modules/ is excluded because tools/cli-nav/ has its own; users install
# fresh after scaffolding. Native helper binaries (bfs/ugrep) are platform-
# specific build artifacts staged at runtime, not source.
mkdir -p "$TEMPLATES"
rsync -a --delete \
  --exclude '__pycache__/' --exclude '*.pyc' --exclude 'node_modules/' \
  --exclude 'pipeline/helpers/*/bfs' --exclude 'pipeline/helpers/*/ugrep' \
  "$DIRTY/tools/" "$TEMPLATES/tools/"

# 2. rsync curated docs subset (generic guides only — not dirty-claude specific)
mkdir -p "$TEMPLATES/docs"
for doc in pipeline.md architecture.md caveats.md control-channel.md \
           repatching-playbook.md symbol-resolver.md glossary.md \
           native-modules.md patches.md versioning.md; do
  if [[ -f "$DIRTY/docs/$doc" ]]; then
    cp "$DIRTY/docs/$doc" "$TEMPLATES/docs/$doc"
  fi
done
[[ -f "$DIRTY/docs/README.md" ]] && cp "$DIRTY/docs/README.md" "$TEMPLATES/docs/README.md"

# 3 + 4. Move patches.json → .example, install empty schema template
if [[ -f "$TEMPLATES/tools/pipeline/patches.json" ]]; then
  mv "$TEMPLATES/tools/pipeline/patches.json" "$TEMPLATES/tools/pipeline/patches.json.example"
fi
cat > "$TEMPLATES/tools/pipeline/patches.json" <<'EOF'
{
  "_description": "EMPTY TEMPLATE — add your patches here. See patches.json.example for a real reference.",
  "_anchor_strategy": "Anchor on invariant content (API field names, string literals, structural patterns). Never anchor on minified names — they change every Claude release.",
  "_versioning": "Bump this whenever you re-port across a Claude version. AIO_TAG env var when shipping fleet bundles.",
  "_schema": {
    "patches": [
      {"_comment": "human description", "id": "ID1", "old": "exact text to replace", "new": "replacement"},
      {"_comment": "INJECT@<name> = inject 'new' BEFORE 'old' (anchor preserved)", "id": "INJECT@my_inject", "old": "anchor literal", "new": "content to inject before anchor"},
      {"_comment": "resolver-driven; resolves {{placeholders}} via resolve_symbols.py from stable anchors", "id": "resolver_example", "resolve": true, "anchor_template": "{{var}}={{fn}}({{arg}});", "replacement_template": "{{var}}={{fn}}({{arg}});try{...}catch(_){}"}
    ]
  },
  "patches": []
}
EOF

# 5. Move dirty_control_channel.js → .example, drop a stub README in sources/
if [[ -f "$TEMPLATES/tools/pipeline/sources/dirty_control_channel.js" ]]; then
  mv "$TEMPLATES/tools/pipeline/sources/dirty_control_channel.js" \
     "$TEMPLATES/tools/pipeline/sources/dirty_control_channel.js.example"
fi
cat > "$TEMPLATES/tools/pipeline/sources/README.md" <<'EOF'
# Patch body sources

Big patch bodies live as readable `.js` files here. `inline_sources.py` reads
them and inlines them into the `new` field of the matching patch in
`tools/pipeline/patches.json` at build time.

- Name a source file `<basename>.js` and reference it in patches.json as
  `"new_from_source": "<basename>"`.
- Reference example: `dirty_control_channel.js.example` (the HTTP control-channel
  patch body from the dirty-claude reference project).

When you write your first patch body:
1. Copy `dirty_control_channel.js.example` to `my_patch.js`
2. Edit it
3. Reference it in `tools/pipeline/patches.json` patches list
4. Run `./tools/build.sh` — `inline_sources.py` syncs the body into patches.json before patching
EOF

# 6. rsync control gateway samples into aio-patch-control's OWN templates dir
mkdir -p "$CONTROL_TEMPLATES/control"
rsync -a --delete \
  --exclude '__pycache__/' --exclude '*.pyc' --exclude 'node_modules/' \
  "$DIRTY/control/" "$CONTROL_TEMPLATES/control/"

# 7. Apply arch-env-override.patch to scaffolded extract.sh + build.sh — IDEMPOTENT
# (Use -N: refuse reverse-apply, then detect already-applied state via grep.)
if (cd "$TEMPLATES" && patch -p1 -N --dry-run < "$PATCH") >/dev/null 2>&1; then
  (cd "$TEMPLATES" && patch -p1 -N < "$PATCH")
  echo "[sync] applied arch-env-override.patch"
else
  if grep -qF 'ARCH="${ARCH:-}"' "$TEMPLATES/tools/extract.sh" && \
     grep -qF 'ARCH="${ARCH:-}"' "$TEMPLATES/tools/build.sh"; then
    echo "[sync] arch-env-override.patch already applied (idempotent re-run)"
  else
    echo "[sync] ERROR: arch-env-override.patch failed to apply and ARCH override missing — investigate" >&2
    exit 1
  fi
fi

# 8. Write VERSION file
cat > "$TEMPLATES/VERSION" <<EOF
dirty_claude_commit: $COMMIT
dirty_claude_origin: $ORIGIN
tested_against_claude_version: $CLAUDE_VER
templates_synced_at: $(date -u +%Y-%m-%d)
plugin_version: $(jq -r .version "$SETUP_DIR/../../.claude-plugin/plugin.json" 2>/dev/null || echo unknown)
EOF

echo "[sync] DONE."
echo "[sync] Next steps:"
echo "  1. Inspect templates/ for unexpected changes"
echo "  2. Bump plugin.json version + commit"
echo "  3. Verify smoke test (Task 14)"

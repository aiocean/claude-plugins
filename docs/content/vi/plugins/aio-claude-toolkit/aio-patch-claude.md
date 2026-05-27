---
title: "aio-patch-claude"
description: "Patch Claude Code system prompts to maximize quality over token efficiency. Automated pipeline via patch_local.py + patches.json from godClaude, with manual fallback. Covers local cli.js patching and full binary recompilation."
document_type: "skill"
plugin: "aio-claude-toolkit"
install: "/plugin install aio-claude-toolkit@aiocean-plugins"
---

> From plugin [**aio-claude-toolkit**](/vi/plugins/aio-claude-toolkit) · `v2.6.2` · **Install:** `/plugin install aio-claude-toolkit@aiocean-plugins`

# Patch Claude Code for Maximum Quality

## Goal

Claude Code ships with system prompts that aggressively trade quality for token savings: word limits, "one sentence" rules, "don't explain", suppressed agent output. This skill patches `cli.js` to rebalance those prompts toward senior-engineer-level quality.

**Philosophy:**
- Completeness over brevity — don't suppress useful detail
- Thoroughness over speed — agents investigate fully
- Quality over token count — you're paying for intelligence, use it
- Evidence over assertion — cite file:line or flag unverified
- Verify before claiming done — "fixed" requires evidence
- Delegate-first — agent teams for non-trivial work

**Two patch flows exist — don't confuse them:**

| Flow | Scope | Tool | When to use |
|------|-------|------|-------------|
| **This skill** (`aio-patch-claude`) | Single local cli.js | `patch_local.py` | Personal install quality upgrade |
| **`update-claude` skill** (godClaude repo) | Fleet-wide patched binaries | `make claude-patch-build` + `make release-bundles` | Ship to all godClaude wrapper users |

Both read the same `patches.json` source of truth.

## Quick Start

**Detect your install type first** — patching depends on whether you have a text cli.js (npm install) or a compiled binary (godClaude bundle / Bun SFA):

```bash
CLI_JS=$(find ~/.claude /opt/homebrew/lib/node_modules /usr/local/lib/node_modules \
  -path "*/@anthropic-ai/claude-code/cli.js" 2>/dev/null | head -1)
```

### Path A: Text cli.js found (npm install)

```bash
# patches.json from godClaude repo ($GODCLAUDE_REPO defaults to ~/compass/codebase/rnd/godClaude)
PATCHES=${GODCLAUDE_REPO:-~/compass/codebase/rnd/godClaude}/bundle/extract-recompile/patches.json

python3 <this-skill-dir>/patch_local.py "$CLI_JS" "$PATCHES"
claude --version   # green ✓ PATCHED banner should appear
```

### Path B: No text cli.js (compiled binary / godClaude bundle)

Use the full build pipeline to produce a patched binary:

```bash
cd ~/compass/codebase/rnd/godClaude
make claude-patch-build CLAUDE_VERSION=<version>   # build patched bundles
make release-bundles                                # ship to fleet (3-gate verify)
```

Or for local-only: extract → patch → recompile (see "Full Binary Build" section below).

---

## Automated Patching (Primary Method)

### Step 1: Locate cli.js

The canonical path suffix — every Claude Code install ends with:
```
@anthropic-ai/claude-code/lib/node_modules/@anthropic-ai/claude-code/cli.js
```

**Discovery (do both, use whichever hits first):**

1. **Glob** — match the suffix under common install roots:
   ```
   **/@anthropic-ai/claude-code/lib/node_modules/@anthropic-ai/claude-code/cli.js
   ```
   Search: `~`, `/opt/homebrew/lib/node_modules`, `/usr/local/lib/node_modules`, `~/.claude`, `~/.npm`.

2. **Resolve from binary** — follow the `claude` symlink:
   ```bash
   readlink -f "$(which claude)"
   ```
   Walk up to the install root, append the suffix.

Both methods must converge on the **same absolute path**. If they diverge, stop — multiple installs exist.

Common install roots:
- `~/.claude/local/node_modules/` (local install)
- `/opt/homebrew/lib/node_modules/` (Homebrew global, Apple Silicon)
- `/usr/local/lib/node_modules/` (npm global)

### Step 2: Locate patches.json

The patch table lives in the godClaude repo — single source of truth for both local and fleet patching:

```
~/compass/codebase/rnd/godClaude/bundle/extract-recompile/patches.json
```

If the godClaude repo isn't available, fall back to the Manual Method below.

### Step 3: Run patch_local.py

The automated patcher lives alongside this skill:

```bash
python3 <this-skill-dir>/patch_local.py <cli.js> <patches.json>
```

**Flags:**
- `--dry-run` — report what would change, write nothing
- `--no-backup` — skip creating `cli.js.backup`
- `--strict` — exit non-zero if any patch is MISSING

**What it does:**
1. Reads cli.js as text
2. Reads patches.json
3. Creates `cli.js.backup` (unless `--no-backup`)
4. Applies each patch:
   - **Standard patches** (A–G, K, P series): replace all occurrences of `old` with `new`
   - **Inject patches** (`INJECT@*`): insert `new` content BEFORE each occurrence of `old` (anchor preserved)
   - **Resolver patches** (`resolve: true`): skipped — these need the godClaude compile pipeline
5. Injects verification banner (`✓ PATCHED cli.js`)
6. Writes patched cli.js
7. Reports: APPLIED / ALREADY PATCHED / SKIPPED / MISSING

**Idempotent:** re-running on an already-patched file classifies patches as ALREADY PATCHED.

### Step 4: Verify

```bash
# Banner check
claude --version
# Expected: green "✓ PATCHED cli.js (aio-patch-claude)" before version output

# Functional check (non-trivial question to trigger quality patches)
echo "Explain how Go channels work" | claude -p
# Expected: thorough response with structure, not a 2-sentence summary
```

If `claude --version` errors, restore immediately:
```bash
cp <cli.js>.backup <cli.js>
```

### Step 5: Report

Report to the user:
- How many patches applied
- How many already applied (from previous run)
- How many skipped (resolver-driven, need compile pipeline)
- How many MISSING (upstream reworded — investigate these)
- Remind: **patches are lost on Claude Code auto-update** — re-run after upgrades

---

## Full Binary Build (Advanced — Fleet Deployment)

When you need a recompiled binary (not just a patched text file), use the godClaude pipeline. This is for fleet deployment via `godclaude.aiocean.dev`.

### Pipeline

```
upstream npm binary (@anthropic-ai/claude-code-<platform>)
        │
        ▼
┌──────────────────┐
│ extract_cli.py   │  → cli.js (~14 MB) + meta.json
└──────────────────┘
        │
        ▼
┌────────────────────────────┐
│ extract_native_modules.py  │  → *.node files (image-processor, audio-capture, url-handler)
└────────────────────────────┘
        │
        ▼
┌────────────────┐
│ patch_cli.py   │  Strips Bun-cjs wrapper + applies patches.json
│  (+ resolver)  │  + rewrites native requires → sibling lookup
│                │  → cli-body.js (ready for bun build)
└────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ bun build cli-body.js --compile --target=bun-<platform>  │
│   --external '/$bunfs/*' --external '*.node'             │
└──────────────────────────────────────────────────────────┘
        │
        ▼
tarball: claude binary + *.node siblings
```

### Build Commands

```bash
# Full release: build 4 platform bundles
make claude-patch-build CLAUDE_VERSION=2.1.133

# Ship to server (3-gate atomic chain)
make release-bundles
#   → verify-bundles-local → upload-bundles → verify-bundles-remote

# Re-patch same upstream (e.g., patches.json edited)
AIO_TAG=aio2 make claude-patch-build CLAUDE_VERSION=2.1.133
```

### Key Differences from Local Patching

| Aspect | patch_local.py | patch_cli.py (godClaude) |
|--------|---------------|--------------------------|
| Input | npm-installed cli.js (text) | Extracted cli.js from Bun SFA binary |
| Wrapper stripping | No (not needed) | Yes (87-byte Bun-cjs prefix + suffix) |
| Native module rewrite | No | Yes (`/$bunfs/root/X.node` → sibling path) |
| Resolver patches | Skipped | Applied (via resolve_symbols.py) |
| Output | Patched cli.js (in-place) | cli-body.js → bun build → compiled binary |
| Platforms | Current machine only | darwin-arm64, darwin-amd64, linux-arm64, linux-amd64 |

### Scripts Reference

All scripts live in `~/compass/codebase/rnd/godClaude/bundle/extract-recompile/`:

| Script | Purpose |
|--------|---------|
| `build.sh` | Orchestrator — downloads upstream, runs extract/patch/compile for all platforms |
| `extract_cli.py` | Extracts cli.js bytes from Bun SFA binary (targets Bun 1.3.14+ layout) |
| `extract_native_modules.py` | Extracts .node files via string-anchor + magic-byte heuristic |
| `patch_cli.py` | Strips wrapper + applies patches + rewrites native requires |
| `resolve_symbols.py` | Resolves minified names from stable anchors (for resolver-driven patches) |
| `patches.json` | Source of truth — all patch definitions |

### Single-Platform Dev Build

```bash
# Extract cli.js from a specific platform
make claude-extract CLAUDE_VERSION=2.1.133 NPM_PLATFORM=darwin-arm64

# Inspect extracted cli.js
less dist/claude-extract/darwin-arm64/cli.js

# Dry-run patches
python3 bundle/extract-recompile/patch_cli.py \
  dist/claude-extract/darwin-arm64/cli.js \
  bundle/extract-recompile/patches.json \
  /tmp/cli-body-dryrun.js

# Full single-platform build
mkdir -p /tmp/dev-build
python3 bundle/extract-recompile/extract_cli.py upstream-claude /tmp/dev-build/cli.js /tmp/dev-build/meta.json
python3 bundle/extract-recompile/extract_native_modules.py --strict upstream-claude /tmp/dev-build/native/
python3 bundle/extract-recompile/patch_cli.py /tmp/dev-build/cli.js bundle/extract-recompile/patches.json /tmp/dev-build/cli-body.js
cd /tmp/dev-build && cp native/*.node . && \
  bun build cli-body.js --compile --target=bun-darwin-arm64 \
    --external '/$bunfs/*' --external '*.node' --outfile claude
./claude --version
```

---

## Manual Fallback

When `patch_local.py` and the godClaude repo are unavailable, patch cli.js by hand.

### Workflow (per patch)

1. **Grep** the search string in cli.js — record occurrence count
2. **Read** ±5 lines at each match — confirm the prompt means what the patch table expects
3. **Decide** — wording drift? Adapt replacement to match current phrasing while preserving intent
4. **Edit** with `replace_all: true` — never `false` (Opus/Sonnet duplicates)
5. **Verify** — Grep for a unique fragment of the replacement; confirm expected count

**Rules:**
- Replace ALL instances (prompts appear 2x: Opus + Sonnet variants)
- Content-based anchors ONLY — never minified function names (they change every release)
- If search string not found: search for 3-5 word fragments, read nearby code, adapt

### Evidence Per Patch (non-negotiable)

- **Pre-count**: `Grep output_mode: "count"` → `[A1] search: 2 matches`
- **Context proof**: Read ±5 lines, paste snippet
- **Decision**: `→ wording matches, applying as-is` or `→ drifted, adapting to: "..."`
- **Post-verify**: search=0, replacement=pre-count → `[A1] post: search=0, replacement=2 ✓`

### Report Format

```
== <path>
  banner: added | already

  APPLIED (N):
    [A1x2] Your responses should be short and concise...
           pre=2 → post search=0, replacement=2 ✓

  ALREADY PATCHED (N):
    [A2] replacement present x1

  ADAPTED (N):
    [B1] table: "Don't add features, refactor code..."
         actual (line ~12345): "Don't add unrelated features beyond..."
         applied: "<adapted replacement>"

  MISSING (N):
    [D5] fragments searched: "fast agent that returns" (0), "meant to be a fast" (0)
```

---

## Patch Categories

All patches are defined in `patches.json`. Here's what each category does:

### A: Output Quality & Brevity (A1–A7)
Removes blanket brevity mandates: "short and concise", 1-sentence caps, 25/100 word limits, "shortest response" default. Replaces with thoroughness-oriented guidelines.

### B: Code Quality & Scope (B2–B5)
Allows fixing related issues found during investigation. Replaces "don't add error handling" with "add at real boundaries". Permits reasonable abstractions when duplication causes maintenance risk.

### C: Comments & Documentation (C1–C3)
Allows meaningful code comments that explain the WHY (hidden constraints, invariants, workarounds). Removes "default to no comments" mandate.

### D: Agent & Subagent Quality (D1–D8)
Raises agent quality bar to "principal engineer would accept". Drops "fast agent" speed bias. Allows detailed reports and code context sharing. Removes 2-3 sentence cap on recommendations.

### E: Plan Mode (E5–E6)
Preserves tradeoff discussion in plans. Replaces "don't explore exhaustively" with thorough exploration nudge. Adds aio-discover/aio-map skill references.

### G: Skill Nudges (G1)
Injects pointers to aio-discover, aio-map, aio-plan into plan mode steps where they naturally help.

### H/I/J/K: Injected System-Prompt Block (~870 words)
Single large injection before `# Executing actions with care`:
- **H. Reasoning Discipline** — falsification, 3-alternatives when stuck, evidence over confidence
- **I. Engineering Mental Models** — Chesterton's Fence, second-order thinking, inversion, pre-mortem, steelman, Hanlon's razor
- **J. Engineering Convictions** — push back, propose before executing, refuse unsound tasks, state confidence, root cause over symptoms
- **K. Extreme Quality Mandate** — evidence-first, never-done-without-verify, confidence labels, delegate-first, skills-first, parallel tools, anti-sycophancy

### P: Behavioral Patches (P1–P6)
- **P1**: Delegate by default for non-trivial work (inverts "don't spawn agents")
- **P2**: Execute decisively with reasoning-first (inverts "execute immediately")
- **P3**: Spawn subagents for parallel investigation (inverts "do not spawn subagents")
- **P4**: Default toward thinking on non-trivial tasks (inverts "avoid unnecessary thinking")
- **P5b**: Planning discipline injection (steelman, pre-mortem, cite evidence, Chesterton's Fence)
- **P6**: Agent architect quality scaffolding (evidence, verify, confidence labels in generated agents)

### Resolver-Driven (rate_limit_snapshot_emit)
OTel emission after rate-limit header parsing. Only applied in the compile pipeline (needs minified-name resolution via resolve_symbols.py).

---

## patches.json Schema

```json
{
  "_description": "...",
  "_source": "...",
  "_versioning": "AIO_TAG env var (aio1 → aio2 on re-patch)",
  "_anchor_strategy": "Content-based anchors only. Never minified names.",
  "patches": [
    {
      "_comment": "Human-readable description",
      "id": "A1",
      "old": "exact search string (may contain \\u2014 unicode escapes)",
      "new": "exact replacement string"
    },
    {
      "_comment": "Anchor injection — new content inserted BEFORE old (old preserved)",
      "id": "INJECT@hijk-block",
      "old": "# Executing actions with care",
      "new": "# Reasoning Discipline\n\n...(injected content)...\n\n"
    },
    {
      "_comment": "Resolver-driven — needs compile pipeline",
      "id": "rate_limit_snapshot_emit",
      "resolve": true,
      "anchor_template": "{{buckets}}={{parser}}({{arg}});",
      "replacement_template": "{{buckets}}={{parser}}({{arg}});try{...}catch(_e){}"
    }
  ]
}
```

**Patch types:**
- **Standard**: `old` → `new` (replace all occurrences)
- **Inject** (`INJECT@*`): insert `new` before each `old` (anchor preserved)
- **Resolver** (`resolve: true`): `{{placeholder}}` → minified names at build time (compile pipeline only)

---

## Adding New Patches

### 1. Find the upstream string

```bash
# Extract cli.js from current version (godClaude repo)
make claude-extract CLAUDE_VERSION=<v> NPM_PLATFORM=darwin-arm64

# Search for the phrase you want to change
grep -F "your search phrase" dist/claude-extract/darwin-arm64/cli.js
```

Or for a local install, just grep the installed cli.js.

### 2. Choose anchor strategy

- **Substitution**: pick a phrase unique enough that `content.count(old)` returns 1 or 2 (Opus + Sonnet)
- **Injection** (`INJECT@<name>`): `old` is the anchor (preserved); `new` is prepended
- **Never** use minified function names — they change every release

### 3. Add to patches.json

```json
{
  "_comment": "<ID> — <what it changes>",
  "id": "<ID>",
  "old": "<exact search string>",
  "new": "<exact replacement>"
}
```

### 4. Test

```bash
# Local: dry-run
python3 patch_local.py <cli.js> patches.json --dry-run

# Compile pipeline: dry-run
python3 bundle/extract-recompile/patch_cli.py \
  dist/claude-extract/darwin-arm64/cli.js \
  bundle/extract-recompile/patches.json \
  /tmp/cli-body-dryrun.js
```

### 5. Smoke test

```bash
claude --version          # banner check
echo "ping" | claude -p   # basic functionality
```

---

## Drift Recovery

Anthropic rewords prompts between releases. `patch_local.py` reports MISSING patches; the compile pipeline's `patch_cli.py --strict` halts the build.

### Investigation workflow

1. **Extract the new cli.js** from the current version
2. **Search for fragments** of the missing patch's `old` string (3-5 word phrases)
3. **Read surrounding context** — understand what the new wording says
4. **Decide:**
   - **Drop**: upstream rewording already accomplishes the patch intent → remove entry from patches.json
   - **Adapt**: find equivalent phrasing, write new entry matching current wording
5. **Update** `_versioning` in patches.json and bump `AIO_TAG` when shipping fleet bundles

### The H/I/J/K injection is special

Its anchor is `# Executing actions with care`. If Anthropic renames this header:
- `patch_local.py` reports `INJECT@hijk-block` as MISSING
- Before shipping: confirm dry-run shows `injected x2` (short + long system-prompt variants)
- Find the new header text, update the `old` field in patches.json

---

## What NOT to Patch

These are reasonable design decisions, not quality trade-offs:
- **Focus mode** behavior (user explicitly chose brevity)
- **Brief mode** behavior (user explicitly chose it)
- **Continuation mode** "do not recap" (correct for resumption)
- **Read-only mode** for explore/plan agents (correct by design)
- **Side question agent** limitations (lightweight by design)
- **Security restrictions** (keep ALL safety prompts intact)

---

## Version Compatibility

The patch table evolves with upstream Claude Code versions. When updating:

1. Extract cli.js from the new version
2. Run `patch_local.py --dry-run` to see what's MISSING
3. For each MISSING: investigate drift, drop or adapt
4. Update patches.json
5. Re-run and verify all patches apply

Patches are **lost on Claude Code auto-update** — re-run this skill after every `claude` upgrade.

---
name: aio-patch-anchor
description: |
  Find and navigate anchors in the extracted cli.js — wraps tools/cli-nav/{find-anchors,navigate,build-explorer}.cjs (acorn-based AST navigator). Used primarily for drift recovery when Claude version bumps shift the location of anchored patch points.
when_to_use: aio patch anchor, find anchor in cli.js, navigate cli.js, ast cli.js, drift recovery, find patch anchor, cli-nav, locate patch point, build cli explorer
argument-hint: "find <pattern> | navigate [args] | explorer"
effort: high
---

# aio-patch-anchor — anchor discovery & AST navigation for cli.js

## Goal

Help write durable patches by surfacing structural / textual anchors in the extracted `dist/<arch>/cli.js`. Bridge between "I want to patch X" and "what's the invariant string near X I can anchor on".

## Usage

```
/aio-claude-toolkit:aio-patch-anchor find <pattern>      # grep + AST proximity hits
/aio-claude-toolkit:aio-patch-anchor navigate --fn <name>   # walk AST around a function
/aio-claude-toolkit:aio-patch-anchor navigate --at <line>   # show AST context at a line
/aio-claude-toolkit:aio-patch-anchor explorer            # render single-file HTML browser of cli.js
```

## Requires

- Scaffolded project (walk-up sentinel)
- `dist/<arch>/cli.js` already extracted (`aio-patch-extract` run before this)
- `node` (with `acorn`, `acorn-walk`, `eslint-scope` installed in `tools/cli-nav/node_modules/`)

If `tools/cli-nav/node_modules` is empty, anchor.sh runs `bun install` (preferred) or `npm install` in `tools/cli-nav/` first.

## Drift recovery workflow

1. Compile reports MISSING patch IDs.
2. For each missing ID, take a 3-5 word fragment of the patch's `old` field.
3. Run `/aio-claude-toolkit:aio-patch-anchor find "<fragment>"` to find the new location.
4. Update `tools/pipeline/patches.json` `old` field with the surrounding invariant content.
5. Re-run `/aio-claude-toolkit:aio-patch-compile` (transitive — extract first if cli.js stale).

See `docs/drift-recovery.md`.

## Implementation

Invokes `${CLAUDE_PLUGIN_ROOT}/skills/aio-patch-anchor/scripts/anchor.sh "$@"`.

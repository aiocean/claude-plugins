# tools/pipeline/

The **engine** behind the dirty-claude dev loop (`tools/extract.sh` →
`tools/build.sh` → `tools/run.sh`): carve cli.js + native `.node` modules out
of a bun-compiled claude binary, apply `patches.json`, strip the bun-cjs
wrapper, and feed the result to `bun build --compile` for a fresh host-only
binary at `dist/<arch>/claude`.

Mirrors godClaude's `tools/bundle/extract-recompile/` 1:1 — the **only**
intentional difference is that `patches.json` ships empty: dirty-claude is a
control project, not a prompt-patch project (the 66 anti-slop patches are
deliberately absent).

These files are **all load-bearing — do NOT delete**:

```
extract_cli.py             # carve cli.js bytes out of a bun SFA binary
extract_native_modules.py  # extract .node via string-anchor + magic-byte heuristic
patch_cli.py               # strip wrapper + apply patches + rewrite native requires
patches.json               # the patch table (single canonical copy)
resolve_symbols.py         # resolve minified names for resolver-driven patches
test_resolve_symbols.py    # unit tests (python3 -m pytest)
helpers/<arch>/            # helper binaries (ugrep/bfs) staged next to dist/<arch>/claude
```

Not the same as `aio-patch-claude` (external skill, plugin
`aio-claude-toolkit`) — that one patches a single local cli.js; this lane
produces a recompiled binary you can ship.

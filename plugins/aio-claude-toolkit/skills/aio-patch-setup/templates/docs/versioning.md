# Versioning

How your patch project stays in sync with Claude releases. What breaks when Anthropic ships N+1.

## Current pin

| Field | Value |
|---|---|
| Claude version | `2.1.150` |
| Platform | `darwin-arm64` |
| Bun SFA layout | 1.3.14+ (NUL-delimited modules, không phải per-blob headers) |

Recorded in `dist/<arch>/.version` (extract.sh writes it) and `dist/<arch>/cli.meta.json` (extract_cli.py writes `claude_version` extracted từ `VERSION:"..."` literal in cli.js).

## What's version-sensitive

### Highly sensitive (re-paste manually per bump)

| Item | Where | Why fragile |
|---|---|---|
| `INJECT@dirty_control_channel` anchor | `patches.json:12` | Minifier could re-order useCallback declarations |
| `kCH` reference in patch body | `patches.json:13` | Minified name, renamed every release |
| `R4` reference in patch body | `patches.json:13` | Minified name |
| `l6`, `j6` references | `patches.json:13` | Minified names (current dialog JSX state) |
| `AH.getState` reference | `patches.json:13` | Minified name (Zustand store) |

Khi version bump → follow [[repatching-playbook]] for the full 7-step procedure with copy-paste commands for each minified-name discovery + the 5-test verification suite.

TL;DR:
1. `./tools/extract.sh` → new cli.js
2. `./tools/build.sh --strict` fails với `--strict: 1 patches missing: ['INJECT@dirty_control_channel']`
3. Re-discover anchor + 5 names via [[repatching-playbook]] Steps 2–4
4. Update `old` field in `patches.json` + 5 minified names in `tools/pipeline/sources/dirty_control_channel.js`
5. Re-build, run smoke-test suite ([[repatching-playbook]] Step 7)

### Moderately sensitive (resolver handles automatically)

8 symbols in `resolve_symbols.py` survive bumps as long as anchor invariants hold:
- `emit_helper`, `state`, `parser`, `buckets`, `arg`, `shadow_cmd`, `shadow_tool`, `shadow_args`

→ Resolver-driven patches (`"resolve": true`) self-heal. Xem [[symbol-resolver]].

If your `patches.json` ships with no resolver-driven entries, that's fine — resolver support is opt-in via `"resolve": true` per patch. Patches that inject glue code referencing minified names (like the HTTP control-channel example's `kCH` / `R4` discovery) benefit most from migrating to resolvers; patches that only anchor on invariant prose can stay hard-coded indefinitely.

### Low sensitivity (rare breaks)

| Item | Where | Why mostly stable |
|---|---|---|
| Bun SFA payload layout | `extract_cli.py` | Bun 1.3.14+ NUL-delimited format stable; older format intentionally not supported |
| Native module embedding | `extract_native_modules.py` | `/$bunfs/root/` prefix hard-coded in Bun source |
| Wrapper format | `patch_cli.py:61` | `// @bun @bytecode @bun-cjs\\n(function(...))` stable Bun convention |
| OTel event names | `body:\`claude_code.${...}\`` | Customer-facing dashboard contract |
| API field names | `status:"allowed"`, etc. | API contract |

If Bun major version changes layout → `extract_cli.py:95-99` fails loud với `cli.js content marker not found`. Inspect payload manually, update parser.

## Upgrade procedure

See [[repatching-playbook]] for full step-by-step (7 steps, copy-paste commands per minified name + 5-test verification suite). The playbook covers:

- Step 1: detect bump (`build.sh --strict` fails on `INJECT@dirty_control_channel`)
- Step 2: confirm anchor wording — slice the executeQueuedInput area, find first `useCallback(async`
- Step 3: resolve each of `f6`, `kCH`, `R4`, `l6`, `j6`, `AH` via grep + structural patterns
- Step 4: verify all 5 names are in scope at the new anchor
- Step 5: update `tools/pipeline/sources/dirty_control_channel.js` + `patches.json`'s `old` field
- Step 6: rebuild
- Step 7: 5-test smoke suite (state / blocking / SSE / ambient / slash fallback)

Plus a failure-mode table mapping which test breaks → which minified name to re-investigate.

## Why not auto-resolve everything?

Tradeoff: each resolver anchor takes work to find + verify across 2-3 versions. Hard-coding is faster initially. As control channel matures, migrate critical anchors to resolver.

Observed pattern in practice: resolver typically covers a handful of critical symbols (~5-10 in mature patch tables). Hard-coded patches reference dozens more. Most don't break per release because patches anchor on invariant content (prompt prose, API field names, OTel event names), and only reference minified names when injecting glue code — and even then, surrounding scope clues usually let you re-locate them quickly.

## Bun version dependencies

`bun build --compile` is the inner loop. Need recent enough bun để:
- Match upstream Bun SFA format (so `--target=bun-darwin-arm64` produces a runtime that matches recompiled cli.js)
- Support `--external '/$bunfs/*'` and `--external '*.node'` flags

Tested: Bun ≥ 1.1. If `bun --version` < 1.1, `bun upgrade`.

## Anti-drift guards

- `patch_cli.py --strict` → fail loud on missing anchors (build.sh default)
- `resolve_symbols.py` → exit 1 nếu resolved symbol matches suspicious regex
- `extract_cli.py` → fail nếu cli.js doesn't start with `// @bun` marker or end with `})`
- Smoke test: `./tools/run.sh --version` should print Claude version

→ Pipeline never silently produces broken binary.

## Related

- [[architecture]] — Decision 4 (anchor strategy)
- [[symbol-resolver]] — resolver mechanics
- [[patches]] — schema + anchor strategy
- [[caveats]] — known version-specific limitations

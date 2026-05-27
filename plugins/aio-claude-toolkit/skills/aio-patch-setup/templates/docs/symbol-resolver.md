# Symbol resolver

Resolver-driven patches: dùng **stable anchors** để resolve **minified names** at build time. Patches survive Claude version bumps mà không cần re-paste manually.

## Why

Bun minifier rename mọi internal identifier giữa releases:

| Release N | Release N+1 |
|---|---|
| `function dA5(...) {...}` | `function $f7(...) {...}` |
| `let kCH = useCallback(...)` | `let p21 = useCallback(...)` |

→ Anchor trên `kCH` fail trên N+1. Anchor trên invariant content (e.g. `body:\`claude_code.${...}\``) survive — và resolver dùng nó để **derive** the new minified name.

## How a resolver-driven patch looks

```json
{
  "id": "ratelimit_override",
  "resolve": true,
  "anchor_template": "{{buckets}}={{parser}}({{arg}})",
  "replacement_template": "{{buckets}}={{parser}}({{arg}});{{state}}.unifiedRateLimit={{buckets}}.five_hour"
}
```

Build time:
1. `patch_cli.py:142-149` lazy-resolve symbols (`_symbols = resolve_symbols(body)`)
2. `_resolve_template` (`patch_cli.py:113-122`) substitute `{{key}}` → resolved value
3. Apply như normal replace

If any `{{placeholder}}` unresolved → `unresolved placeholders: [...]` error, fail-loud.

## Symbols resolved (8 total)

`resolve_symbols.py:56-155` resolves these từ 6 anchors:

### 1. `emit_helper` — OTel emit function name

**Anchor:** `body:\`claude_code.${...}\``

```
body:`claude_code.${ANCHOR
                       ^ idx
```

→ scan backward 8KB for `function NAME(`. Last match = enclosing function.

**Why stable:** OTel event body format dashboards query bằng. `claude_code.api_request`, `claude_code.tool_use`, etc.

### 2. `state` — rate-limit state variable

**Pattern:**
```regex
([a-zA-Z_$][\w$]*)=\{status:"allowed",unifiedRateLimitFallbackAvailable:
```

**Why stable:** `status:"allowed"` + `unifiedRateLimitFallbackAvailable` là API-contract property names. Anthropic không thể rename mà không break rate-limit consumers.

### 3. `parser` — rate-limit parser function

**Anchor:** dispatch literal
```js
[["five_hour","5h"],["seven_day","7d"],["overage","overage"]]
```

→ scan backward for `function NAME(`.

**Why stable:** maps API field names → API header suffixes. Cả hai sides của map đều là API contract.

### 4. `(validation)` — header template

**Anchor:** `\`anthropic-ratelimit-unified-${\``

Không phải symbol extraction — chỉ defense-in-depth verify rằng rate-limit code is structurally intact. Fail loud nếu missing.

### 5. `buckets` + `arg` — caller site

**Pattern** (after `parser` resolved):
```regex
([a-zA-Z_$][\w$]*)={parser}\(([^)$\s]+)\)
```

**Captures:**
- `buckets` — local var assigned từ parser call
- `arg` — argument passed in (could be `_`, `a`, `headers`, `$0H` — whatever minifier chose)

**Why JS identifier pattern (not `\w+`):** some Bun targets produce `$`-prefixed names (`$0H`). Python's `\w` doesn't match `$` → would partially capture → invalid JS in replacement.

### 6. `shadow_cmd` + `shadow_tool` + `shadow_args` — grep/find shell-shadow generator

**Anchor:** function shape + shell syntax
```regex
function [\w$]+\(([\w$]+),([\w$]+),([\w$]+)=\[\],[\w$]+=\[\]\)\{
let ([\w$]+)=\3\.length>0\?`\$\{\3\.join\(" "\)\} "\$@"`:'"\$@"',
```

**Captures:**
- `shadow_cmd` — command name param
- `shadow_tool` — tool name param
- `shadow_args` — joined-args local var

**Why stable:** function generates `function grep {…}` / `function find {…}` shell snippet. `.join(" ")` + `"$@"` are bash syntax — Anthropic cannot rename without breaking generated shell.

## Verification

Standalone CLI:
```bash
python3 tools/pipeline/resolve_symbols.py dist/darwin-arm64/cli-body.js
```

Prints JSON dict:
```json
{
  "emit_helper": "...",
  "state": "...",
  "parser": "...",
  "buckets": "...",
  "arg": "...",
  "shadow_cmd": "...",
  "shadow_tool": "...",
  "shadow_args": "..."
}
```

Sanity check at `resolve_symbols.py:167-171` — all values must match `^[a-zA-Z_$][\w$]*$`. Suspicious → exit 1.

**Unit tests:** `python3 -m pytest tools/pipeline/test_resolve_symbols.py`

## When to use resolver vs hard-coded

| Situation | Approach |
|---|---|
| Anchor là invariant content, minified name irrelevant | Plain `old`/`new` patch |
| Replacement needs to reference a minified name | Resolver-driven với `{{symbol}}` |
| Stable anchor exists → derive name | Resolver-driven |
| No stable anchor → must hard-code minified name | Plain patch + document `_caveats` + accept re-paste per version |

**Current state:** `INJECT@dirty_control_channel` falls in last bucket. References `kCH`, `R4`, `l6`, `j6` directly. Symbols cho 8 already-known anchors có thể resolve, nhưng các symbols cho REPL submit / messages state chưa được anchored.

→ Future patch (TODO ở `control/README.md:246-247`): add resolver anchors cho `kCH` + `R4` so version bumps auto-resolve.

## Adding a new resolver anchor — checklist

1. **Find invariant content** near the symbol you want. OTel name? API field? Shell syntax? Prompt prose?
2. **Verify uniqueness** — anchor matches exactly once.
3. **Verify stability across versions** — extract 2-3 different Claude releases, confirm anchor exists in all.
4. **Write extractor** — add to `resolve_symbols()` in `resolve_symbols.py`. Follow style:
   - Use `_find_function_before` for *"function enclosing this string"* pattern
   - Use named regex group for *"variable assigned from X"* pattern
5. **Add unit test** — `test_resolve_symbols.py` should cover happy path + missing anchor case
6. **Use in `patches.json`** — add `"resolve": true` entry with `{{your_symbol}}` placeholder

## Failure semantics

If resolver fails:

```python
# patch_cli.py:142-158
try:
    _symbols = resolve_symbols(body.decode(...))
except SystemExit as e:
    if strict:
        raise           # propagate exit code
    print(f"  [resolve] FAILED: {e}")
    _symbols = {}
    missing.append(pid) # mark resolver-driven patches as missing
    continue
```

→ With `--strict` (default in `build.sh`), failed resolution = build fail. Anti-silent-drift.

Without `--strict`, resolver-driven patches skip (logged), other patches still apply. Useful cho debugging.

## Related

- [[patches]] — patch contract (where resolver fits)
- [[architecture]] — Decision 4 (anchor strategy)
- [[versioning]] — when resolver pays off
- [[glossary]] — emit_helper, parser, buckets, shadow_cmd terms

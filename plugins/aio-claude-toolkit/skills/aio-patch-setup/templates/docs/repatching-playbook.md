# Re-patching playbook — surviving a Claude version bump

Concrete step-by-step procedure to re-port `INJECT@dirty_control_channel`
when Anthropic ships a new Claude version. Tools/cli-nav and grep recipes
included. **Run from repo root.**

## Mental model — why this is hard, and what survives

Bun minifies every internal identifier per release. The names you see in the
patch body (`kCH`, `R4`, `l6`, `j6`, `AH`, `f6`, `I1`) **all change**. What
survives:

1. **API contract surface** — Anthropic can't rename anything that customers'
   code depends on (OTel event names like `claude_code.api_request`, API
   field names like `status:"allowed"`, header templates, dispatch literals
   like `["five_hour","5h"]`).
2. **User-visible behavior strings** — prompt prose, error messages, system
   reminders. Anthropic could change them but rarely without intent.
3. **Structural patterns** — call shapes (`useCallback(async(_,_) => {`),
   destructure patterns (`{executeQueuedInput: NAME, ...}`), object literal
   keys passed to known APIs (`{jsx, shouldHidePromptInput, ...}`).

The playbook's job: from these invariants, **derive** the new minified names.

The patch needs **6 specific values** from cli.js to work:

| Symbol | What it is | How we anchored it last time |
|---|---|---|
| **anchor `old`** | `let I1=f6.useCallback(async(v_,z6)=>{` | First `useCallback(async` in the main REPL component, after `X74({executeQueuedInput:kCH,...})` is in scope |
| `f6` | React import alias inside main REPL component | Same identifier used elsewhere as `f6.useState`, `f6.useEffect` |
| `kCH` | `executeQueuedInput` queue-drainer submit fn | Destructured from `X74({executeQueuedInput: KCH, ...})` |
| `R4` | messages array state setter (`useState` return [1]) | Adjacent to kCH; setter used in the message-add path |
| `l6` | current `toolJSX` state value | `useState(null)` returning a JSX wrapper object |
| `j6` | `setToolJSX` setter | The [1] of the same useState as `l6` |
| `AH` | Zustand app store binding | Has a `.getState()` method called many times with slice names matching control-channel state keys |

All 6 must be in scope at the anchor point.

## Step 1 — Detect the bump

```bash
./tools/extract.sh                     # pulls newest claude binary, carves cli.js
./tools/build.sh                       # --strict by default, fail-fast
```

If it succeeds → patch survived the bump. Done. Test as in Step 7.

If it fails with `--strict: 1 patches missing: ['INJECT@dirty_control_channel']`
→ proceed.

## Step 2 — Confirm anchor wording

Grep for the old anchor exactly:

```bash
grep -c 'let I1=f6.useCallback(async(v_,z6)=>{' dist/darwin-arm64/cli-body.js
```

If `>=1` → anchor structure unchanged, only `I1`/`v_`/`z6` got new letters. Search
with a tolerant pattern:

```bash
# All useCallback(async (...) => declarations in the file
rg -no 'let [\w$]+=[\w$]+\.useCallback\(async\([^)]*\)=>\{' dist/darwin-arm64/cli-body.js | head -20
```

You'll get many matches. Narrow to the main REPL component using **the
content anchor that's right above it**: `X74({executeQueuedInput:...})`.

```bash
# Look for executeQueuedInput destructure — should appear once-or-twice
rg -no '\{executeQueuedInput:[\w$]+' dist/darwin-arm64/cli-body.js
# Find the BYTE OFFSET — then look at what's immediately after
rg -no --no-line-number -b 'executeQueuedInput:' dist/darwin-arm64/cli-body.js
```

Once you have the offset, slice a 2KB window around it and read manually:

```bash
python3 -c "
b = open('dist/darwin-arm64/cli-body.js').read()
i = b.index('executeQueuedInput:')
print(b[i:i+2000])
" | head -60
```

The first `useCallback(async(...))` AFTER the `executeQueuedInput:` line **inside
the same component function** is your new anchor. Verify uniqueness:

```bash
rg -cF 'let <NEW_ANCHOR>' dist/darwin-arm64/cli-body.js
# Must print 1.
```

> If `useCallback(async` was refactored to e.g. `useMemo` or hoisted to a sibling
> file, you need to find a different anchor — see Step 6.

## Step 3 — Resolve each minified name

Each name has a stable structural pattern. Grep with the pattern, get the new
name from the capture group.

### `f6` — React module alias

```bash
# It's the prefix in <NAME>.useCallback / <NAME>.useEffect / <NAME>.useState
rg -o '\b([a-zA-Z$_][\w$]*)\.useEffect\b' dist/darwin-arm64/cli-body.js | sort | uniq -c | sort -rn | head -5
```

The top result (highest count) is `f6`'s replacement.

### `kCH` — `executeQueuedInput` (submit fn)

```bash
rg -o '\{executeQueuedInput:([\w$]+)' -r '$1' dist/darwin-arm64/cli-body.js | sort -u
```

Should print 1–2 candidates. The one consumed by the main REPL component (use
`tools/cli-nav/navigate.cjs --find` to confirm enclosing fn) is `kCH`.

### `R4` — messages array state setter

This one is harder — no unique string pattern. Use the AST:

```bash
node tools/cli-nav/navigate.cjs dist/darwin-arm64/cli-body.js --at <OFFSET_OF_ANCHOR>
```

Lists enclosing fn + outgoing/incoming refs. Look for a `let [SOMETHING,SOMETHING]=<react>.useState([])` near the anchor where the `[]` is an empty array. The `[1]` capture is `R4`.

If multiple candidates, the right one is the setter whose argument shape matches
`(prev) => [...prev, newMsg]` — the messages-add pattern. Grep:

```bash
# In the surrounding window from Step 2, look for setter calls with array-spread updater
python3 -c "
b = open('dist/darwin-arm64/cli-body.js').read()
i = b.index('executeQueuedInput:')
import re
for m in re.finditer(r'([a-zA-Z_$][\w$]*)\((\w+)=>\[\.\.\.', b[i:i+10000]):
    print(m.group(1))
" | sort -u
```

### `l6` / `j6` — toolJSX state pair

`useState(null)` that holds the dialog JSX wrapper. The wrapper shape is
`{jsx, shouldHidePromptInput, isLocalJSXCommand, ...}`. Grep for objects with
those property names being passed to a setter:

```bash
# Pattern: setter call with object containing shouldHidePromptInput
rg -o '\b([a-zA-Z$_][\w$]*)\(\{[^}]*shouldHidePromptInput' dist/darwin-arm64/cli-body.js | sort -u
# That capture is j6 (setter).
# Then trace back: find `let [SOMETHING,j6]=<react>.useState(null)` — SOMETHING is l6.
```

Or use AST: every `useState(null)` near the anchor, intersected with setters
called with `shouldHidePromptInput`-shaped objects.

### `AH` — Zustand store binding

Grep for `.getState()` calls and intersect with stores that have the
control-channel state slices:

```bash
# All <NAME>.getState() callsites
rg -o '\b([a-zA-Z_$][\w$]*)\.getState\(\)' dist/darwin-arm64/cli-body.js | sort | uniq -c | sort -rn | head -10
```

The top 2–3 are candidates. Confirm by inspecting which store's state has
keys matching `toolPermissionContext`, `elicitation`, `activeOverlays`, etc.:

```bash
# Find the createStore call for the top candidate
node tools/cli-nav/navigate.cjs dist/darwin-arm64/cli-body.js --fn <CANDIDATE>
# Or grep for the candidate near a `create(...)` call
```

## Step 4 — Verify scope at anchor

All 5 names (`kCH`, `R4`, `l6`, `j6`, `AH`) must be in scope where the patch
injects. Use `navigate.cjs --at <offset>` and check the enclosing function's
bindings. Or eyeball: the anchor is inside the main REPL component, all 5
should be `let`-declared earlier in the same fn body.

If `AH` is module-level (declared outside the component), the patch still
works — `AH.getState` is a closure capture.

If any name is NOT in scope (e.g. cli.js moved the dialog state out of the
component) → you need either:
- A different anchor where all 5 are reachable
- OR multiple injection points + a global stash

## Step 5 — Update `tools/pipeline/sources/dirty_control_channel.js`

Replace the 6 minified names in the source file. Use `sed -i`:

```bash
# WARNING: only sed-replace WHOLE-WORD matches; some names like `j6` could collide
# with substrings. Use grep first to verify count.
cd tools/pipeline/sources
for old new in I1:NEW_I1 v_:NEW_V f6:NEW_F kCH:NEW_K R4:NEW_R l6:NEW_L j6:NEW_J AH:NEW_AH; do
  # … hand-edit safer than sed for short identifiers
done
```

In practice, **just open the file and use your editor's "Find & Replace
word-boundary" mode**. The 6 names appear ~30 times total in the source.

Also update **`old` field in `tools/pipeline/patches.json`** to the new anchor
text (Step 2 result).

## Step 6 — Build + first verification

```bash
./tools/build.sh   # → must print [INJECT@dirty_control_channel] injected ×1 delta=+~19000 bytes
```

If it fails with `missing` again → your `old` anchor wasn't unique or didn't
match. Re-check Step 2.

If build succeeds, smoke-test the binary:

```bash
./tools/run.sh -p "say hello"   # one-shot CLI mode, no REPL
# Should complete with assistant reply printed.
```

## Step 7 — End-to-end control-channel verification (5 tests)

Boot the patched binary in tmux, run each control-channel path. Copy-paste:

```bash
# Boot (tmux gives us a real TTY without occupying our terminal)
tmux kill-session -t dc-test 2>/dev/null
tmux new-session -d -s dc-test -x 200 -y 50 "./tools/run.sh"
for i in $(seq 1 30); do
  if curl -sf -o /dev/null http://127.0.0.1:47291/v1/state 2>/dev/null; then echo "HTTP up"; break; fi
  sleep 0.2
done

# ─── Test 1: GET /v1/state (server reachable, AH.getState works)
curl -sS http://127.0.0.1:47291/v1/state | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert d['hasDialog'] in (True, False), 'hasDialog field missing'
assert 'appState' in d, 'appState missing'
expected_keys = {'elicitation', 'toolPermissionContext', 'activeOverlays'}
got = set(d['appState'].keys())
missing = expected_keys - got
assert not missing, f'missing appState keys: {missing}'
print('PASS: /v1/state')
"

# ─── Test 2: POST /v1/prompt blocking (kCH + R4 work)
curl -sS -X POST http://127.0.0.1:47291/v1/prompt -d '{"prompt":"reply with exactly PONG"}' | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert d['added'] > 0, f'added=0 (kCH submit broken?)'
assert len(d['messages']) > 0, 'no messages (R4 read broken?)'
print(f'PASS: /v1/prompt blocking — added={d[\"added\"]}, waitedMs={d[\"waitedMs\"]}')
"

# ─── Test 3: POST /v1/prompt SSE (fetch wrap + broadcast + stop_reason scan)
EVENTS=$(./control/stream-client.sh "reply PONG" 2>&1 | grep -c '^event:')
echo "PASS: /v1/prompt SSE — $EVENTS events (expect >=4: turn.start + request_start + chunks + turn.end)"
[ "$EVENTS" -ge 4 ] || { echo "FAIL: expected >=4 events, got $EVENTS"; exit 1; }

# ─── Test 4: GET /v1/stream (ambient broadcast)
./control/stream-ambient.sh > /tmp/dc-smoke-amb.log 2>&1 &
AMB=$!
sleep 0.5
./control/simple-client.sh "say hi" > /dev/null 2>&1
sleep 1
kill $AMB 2>/dev/null
wait 2>/dev/null
AMB_EVENTS=$(grep -c '^\[' /tmp/dc-smoke-amb.log)
[ "$AMB_EVENTS" -ge 3 ] && echo "PASS: /v1/stream ambient — $AMB_EVENTS events" || { echo "FAIL: ambient got $AMB_EVENTS events"; exit 1; }

# ─── Test 5: slash command idle_fallback (DC_SLASH_GRACE_MS path)
./control/stream-client.sh "/clear" 2>&1 | grep -q 'idle_fallback' \
  && echo "PASS: slash idle_fallback fired" \
  || echo "FAIL: idle_fallback didn't fire — check DC_SLASH_GRACE_MS path"

# Cleanup
tmux kill-session -t dc-test 2>/dev/null
pkill -KILL -f 'dist/darwin-arm64/claude' 2>/dev/null
```

All 5 PASS → patch successfully re-ported. Bump `## Current pin` in
`docs/versioning.md` + commit.

## Failure modes — what each broken test means

| Failing test | Likely cause | Fix |
|---|---|---|
| Test 1 fails on appState | `AH.getState` broken — wrong `AH` | Re-run Step 3 `AH` discovery |
| Test 2 returns `added:0` and httpResponses empty | `kCH` resolves at enqueue, no actual submit fired — wrong `kCH` | Re-run Step 3 `kCH` discovery |
| Test 2 returns OK but `messages:[]` | `R4` reads stale state — wrong `R4` | Re-run Step 3 `R4` discovery; verify with the setter-trick pattern |
| Test 3 receives only turn.start | Fetch wrap not installed (chunks not broadcasting) — anchor scope is wrong OR fetch wrap install bombed silently | Check `/v1/diag` `total broadcasts`; if 0, fetch wrap install failed. Check console errors via tmux pane. |
| Test 3 receives chunks but no turn.end | `stop_reason` regex slice off-by-one (15 vs 16) OR `TURN_END_REASONS` Set membership wrong | Hard-coded constants, no regression unless source was edited |
| Test 4 ambient gets 0 events | `__dc_subscribers` Set lost on re-render (`||= new Set()` guard broken) | Re-check the one-time install block in source |
| Test 5 slash never closes | `sawApiCall` discriminator broken — `event: anthropic.*` prefix check failing | Check sub.write prefix-match logic |
| POST SSE closes ~10ms after handler runs | `rq.on("close")` was re-added — bun fires it on POST body end | Remove `rq.on("close")` cleanup, keep only `rs.on("close")` |

## Helpful tools recap

| Tool | Use for |
|---|---|
| `tools/cli-nav/find-anchors.cjs` | Index all invariant content (OTel, prompts, tool descs) — browsable list |
| `tools/cli-nav/navigate.cjs --find "<string>"` | Get enclosing fn + provenance for a known string |
| `tools/cli-nav/navigate.cjs --fn <name>` | Caller/callee map for a function name |
| `tools/cli-nav/navigate.cjs --at <offset>` | Enclosing fn + outgoing refs at a byte offset |
| `tools/cli-nav/build-explorer.cjs` | Generate single-file HTML browser for cli.js (large, but searchable) |
| `tools/pipeline/resolve_symbols.py` | Already-resolved symbols (8 for godClaude prompt patches) — model for adding new resolvers |
| `python3 tools/pipeline/inline_sources.py --check` | CI guard: patches.json out of sync with sources/ |

## Promoting hard-coded names to the resolver

When a name fails 2+ version bumps, write a resolver entry in
`tools/pipeline/resolve_symbols.py` so future bumps auto-derive it. Pattern:

1. Pick an invariant anchor (a string + position) for the name
2. Write the extractor (use `_find_function_before` or named-group regex)
3. Add to `resolve_symbols()` return dict
4. Update unit test in `test_resolve_symbols.py`
5. In `patches.json`, switch from hard-coded to `"resolve": true` + `{{name}}` template

The 5 minified names currently in `dirty_control_channel.js` are candidates
for promotion as the patch matures. See [[symbol-resolver]] for mechanics.

## Pre-mortem — bugs discovered while building, will bite re-port

These are documented in commit messages but worth re-listing here since they're
non-obvious and easy to reintroduce:

1. **`req.on("close")` cleanup races bun's POST body handling.** Under bun's
   node:http compat, `req.on("close")` fires shortly after `req.on("end")`
   for POST requests with bodies — NOT only on client disconnect. If you
   re-add it as cleanup for the SSE POST handler, the subscriber is removed
   ~10–15ms after add, before any broadcast fires. Use **only `rs.on("close")`**.

2. **`stop_reason` slice off-by-one.** `"stop_reason":"end_turn"` is 23
   chars; the value starts at index 15, not 16. Wrong slice → `lastStopReason
   = "nd_turn"`, `TURN_END_REASONS.has("nd_turn") === false`, turn.end never
   fires. Fix is `.slice(15, -1)`.

3. **`kCH` resolves at enqueue, not turn-end.** The submit promise settles
   as soon as the item is on the queue (~1ms), not when Anthropic returns.
   Any fallback gated on `submitDone && idle > stableMs` will fire 800ms
   in, before chunks arrive. Use `sawApiCall` flag (`event: anthropic.*`
   prefix in sub.write) instead.

4. **POST SSE closeOnTurnEnd closes on FOREIGN turn.end too.** Broadcast events
   carry no `turn_uuid` in phase 1. Classifier API call (haiku) finishing
   before the main response (opus) will close the POST SSE subscriber, and
   the user sees the classifier's JSON title instead of the actual reply.
   For chat-UX clients, use the hybrid ambient+blocking pattern
   ([`stream-text.sh`](../control/stream-text.sh)).

## Related

- [[versioning]] — what changes per release, full upgrade procedure
- [[patches]] — `new_source` workflow, anchor strategy
- [[symbol-resolver]] — promoting hard-coded names to auto-resolved
- [[caveats]] — phase-1 limitations including cross-turn pollution (#3a)
- [[control-channel]] — protocol reference + endpoint shapes

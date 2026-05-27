---
title: "Patching Claude Code: rebalance the built-in prompts (and more)"
description: "Why you'd patch the Claude Code binary — chiefly to rewrite its brevity-first system prompts for higher-quality output — what else patching can do, and a step-by-step pipeline where you describe the change and Claude investigates cli.js and writes the patch: scaffold, extract, patch, recompile, run, survive version bumps."
document_type: "guide"
created: "2026-05-27"
updated: "2026-05-27"
weight: 30
tags: ["patching", "cli.js", "advanced", "claude-code", "internals"]
---

# Patching Claude Code

Claude Code ships as a single bun-compiled binary. There is no plain source
to edit — every distribution channel (the npm tarball, the install script)
contains a compiled blob. "Patching Claude" means carving the JavaScript
back out of that blob, rewriting it, and recompiling a custom binary you run
instead of the stock one.

This guide covers the **why**, the **what**, and a runnable **step-by-step**.
It targets power users: people comfortable on the command line who want to
change how Claude Code itself behaves. The whole pipeline is wrapped by the
[`aio-claude-toolkit`](/plugins/aio-claude-toolkit) plugin, so you drive it
with slash commands rather than hand-rolling bun and Python invocations.

> **How the work is actually split.** Nothing useful ships pre-loaded — the
> scaffold gives you an *empty* patch table and the *machinery* to apply
> patches. But you don't hand-write the patches. You tell Claude what behavior
> you want changed; Claude investigates the extracted `cli.js`, locates the
> right anchor (with the AST navigator), and writes the patch entry. You
> review and approve. This guide shows that loop.

---

## Why patch at all?

Claude Code already exposes a clean process boundary for automation:

```bash
claude -p --input-format stream-json --output-format stream-json
```

If stream-json covers your need, **use it** — it survives every upgrade and
needs no patching. Patch when you want to change how Claude *itself* behaves,
which stream-json can't touch.

### The main reason — rebalance the built-in prompts

Claude Code's system prompts are tuned for token efficiency. They carry
aggressive brevity mandates: one-sentence caps, short word limits,
"don't explain," suppressed sub-agent output, plans that hide tradeoffs. Those
defaults make answers cheaper, but they also make them shorter, shallower, and
less evidenced than the model is capable of.

Patching lets you rewrite that prose. The strings live inside `cli.js`, so a
patch swaps the brevity rules for instructions that favor thoroughness,
evidence, and full investigation. After patching:

- responses are complete instead of truncated
- sub-agents investigate fully instead of stopping early
- code comments explain the *why*, not just the *what*
- plans surface tradeoffs instead of suppressing them
- reasoning precedes action on non-trivial tasks

This is the headline use case — *your* Claude, biased toward quality over
brevity, permanently (until the next upgrade — see "Surviving Claude updates").

Nothing about this ships turned on: the patch table starts empty. You point
Claude at the behavior you dislike and it writes the prompt-rewrite patches for
you (Step 2). The pipeline makes the change safe and repeatable — it doesn't
decide the policy for you.

More generally, this is "rewrite any invariant string": prompt prose,
behavioral toggles, dispatch literals — anywhere there's a stable anchor.

### The advanced reason — inject code into the agent loop

Patching isn't limited to swapping text; you can also *insert* code that runs
inside the running agent, reaching state stream-json can't: the React/Ink REPL,
the live message array, open dialogs, the `fetch` calls to `api.anthropic.com`.

The toolkit ships one worked example of this — `patches.json.example` injects a
control-channel: a localhost HTTP server, booted inside Claude, that exposes
endpoints to submit prompts, read live state, answer dialogs, and stream
events. It turns an interactive session into a controllable service while
keeping the REPL, slash commands, MCP, and hooks intact. Powerful, but a
narrower need than prompt rebalancing — most people want the prompts fixed, not
an HTTP API. Treat it as a reference for *how far* injection can go, covered
briefly later.

---

## How patching works (the mental model)

Three concerns, three scripts, run in order:

```
┌──────────────────┐    ┌───────────────┐    ┌────────────┐
│ extract           │ →  │ patch + build │ →  │ run        │
│ (once per version)│    │ (per change)  │    │ (exec)     │
└──────────────────┘    └───────────────┘    └────────────┘
   carve cli.js +          apply patches.json    exec the patched
   native .node            then bun --compile     binary, forward args
```

Four facts about this pipeline that explain every design choice:

1. **Claude ships compiled, not as source.** Extraction finds the Bun
   single-file-executable trailer and carves the raw `cli.js` (a ~14 MB
   minified JS file) back out. Re-extract only when Claude's version changes.

2. **You recompile with `bun build --compile`, not `bun run`.** Running the
   extracted source directly fails with `Expected CommonJS module to have a
   function wrapper` — Bun's runtime wants a bytecode wrapper, not plain text.
   `bun build --compile` takes the bundler path instead and packs the patched
   source into a fresh executable in ~1.2 s. That fast rebuild is the inner
   loop: edit patches → build → run → repeat.

3. **`cli.js` is minified, so you anchor on invariant content.** Bun renames
   every internal identifier (`dA5`, `kCH`, `R4`) on each release. You must
   never anchor a patch on those names. Anchor on things Anthropic can't
   rename without breaking their own contract: API field names
   (`status:"allowed"`), OpenTelemetry event names (`claude_code.api_request`),
   dispatch literals (`[["five_hour","5h"]]`), prompt prose, shell syntax.

4. **Patches fail loud, not silent.** The build runs in strict mode by
   default. If an anchor no longer matches (because Claude updated), the build
   *fails* with a "patches missing" error instead of silently producing an
   unpatched binary. That's your early-warning system for version drift.

---

## Step-by-step

### Prerequisites

- **`bun`** ≥ 1.3 (the compile + cross-compile path)
- **`python3`** (extraction + patch application scripts)
- **`npm`** (only to download a fresh Claude; skipped if you pass a local
  binary)
- **`node`** (only for the AST anchor navigator, used in drift recovery)
- The plugin installed:

  ```bash
  /plugin marketplace add aiocean/claude-plugins
  /plugin install aio-claude-toolkit@aiocean-plugins
  ```

### Step 0 — Scaffold a patching project (do this first)

Every later command walks *up* from your current directory looking for a
scaffolded project (the sentinel is `tools/pipeline/patch_cli.py`). If you
skip this step, extract/compile/run all fail with a "couldn't find project
root" error. So start in a fresh, empty directory:

```bash
mkdir my-claude-patch && cd my-claude-patch
/aio-claude-toolkit:aio-patch-setup
```

This drops a complete, runnable pipeline into the directory:

- `tools/extract.sh`, `tools/build.sh`, `tools/run.sh` — the three stages
- `tools/pipeline/*.py` — extraction and patch-application logic
- `tools/pipeline/patches.json` — **empty** patch table (this is your file)
- `tools/pipeline/patches.json.example` — the control-channel reference
- `tools/cli-nav/` — an acorn-based AST navigator for finding anchors
- `docs/` — the in-repo reference (anchor strategy, re-patching playbook)

> `FORCE=1` overwrites the generic scripts in an existing scaffold but never
> touches your `patches.json` or `sources/*.js`.

### Step 1 — Extract cli.js from a Claude binary

```bash
/aio-claude-toolkit:aio-patch-extract                  # download latest Claude for your arch
/aio-claude-toolkit:aio-patch-extract /path/to/claude  # extract from a local binary
CLAUDE_VERSION=2.1.150 /aio-claude-toolkit:aio-patch-extract   # pin a version
```

Output lands in `dist/<arch>/`: `cli.js` (raw, wrapper intact), the native
`.node` modules, and a `.version` marker. Extraction is the heavy step — run
it once per Claude version, then iterate on patches against the extracted
source.

### Step 2 — Describe the change; let Claude write the patch

You don't hand-author JSON here. You tell Claude, in the scaffolded project,
what behavior to change — for example:

> *"Find the brevity mandates in the system prompt and rewrite them to favor
> thorough, evidenced answers. Add the patches to `patches.json`."*

Claude then does the investigation a human would find tedious: it reads the
extracted `cli.js`, locates the exact prompt strings (using
`aio-patch-anchor` to search and walk the AST), confirms each anchor is unique
and stable, and writes the `patches.json` entries. You review the diff and
approve. The anchor work — the hard part — is exactly what the AST navigator
exists to support.

What Claude writes is one of three entry kinds. The structure is worth
understanding so you can review intelligently. Every top-level key starting
with `_` is a doc comment, ignored by the applier.

**(a) Replace** *(the one prompt rebalancing uses)* — swap one exact string
for another:

```json
{ "id": "P1", "old": "<exact prompt sentence from cli.js>", "new": "<your rewrite>" }
```

The `old` string is version-specific: it must be read out of *your* extracted
`cli.js`, never copied blind. That's why Claude locates it for you rather than
guessing. Most prompt-rebalancing patches are a handful of these.

**(b) INJECT@** — insert code *before* an anchor, keeping the anchor
(`old` → `new + old`). This is for code injection, not text rewriting — it's
how the control-channel example boots its server. You rarely need it for
prompt work.

**(c) Resolver-driven** — for the rare patch that must reference a minified
name, resolve that name from a stable anchor at build time instead of
hard-coding it, so it survives version bumps. Used by advanced injection
patches, not prompt rewrites.

> **The one rule behind all three:** anchor on invariant content (prompt
> prose, API field names, dispatch literals), never on minified names like
> `dA5` or `kCH` — Bun renames those every release. Claude applies this rule
> when it writes the patch; you enforce it when you review.

For large injected bodies (>~30 lines) Claude can move the code into
`tools/pipeline/sources/<name>.js` and reference it with `"new_source"`, so the
patch stays real, lintable JS instead of an escaped JSON blob.

### Step 3 — Apply patches and recompile

```bash
/aio-claude-toolkit:aio-patch-compile                                  # your host arch (fast, ~1.2 s)
/aio-claude-toolkit:aio-patch-compile --target=all                     # all 4 platforms
/aio-claude-toolkit:aio-patch-compile --target=darwin-arm64,linux-amd64
```

This inlines any `sources/*.js`, applies `patches.json` in **strict mode**,
rewrites native-module requires to sibling lookups, and runs
`bun build --compile`. Result: `dist/<arch>/claude`. If a target's `cli.js`
isn't extracted yet, compile transitively extracts it first.

A successful run reports each patch it applied, e.g. `[P1] ×1 delta=+N bytes`.
A missing anchor in strict mode aborts the build — that's the drift signal,
handled in "Surviving Claude updates" below.

### Step 4 — Run the patched binary

```bash
/aio-claude-toolkit:aio-patch-run --version
/aio-claude-toolkit:aio-patch-run -p "Explain X"
/aio-claude-toolkit:aio-patch-run            # interactive REPL
```

Same argument and environment passthrough as stock `claude`. This step only
execs — if you edited patches, run compile again first.

### Optional — Scaffold the control-channel clients

If your patch injects the HTTP control-channel, drop in sample clients:

```bash
/aio-claude-toolkit:aio-patch-control scaffold   # curl + SSE + bun TUI clients into ./control/
/aio-claude-toolkit:aio-patch-control docs       # print the protocol reference
```

These talk to the server on `127.0.0.1:47291` (override with `DC_PORT`).

---

## Surviving Claude updates

**Patches are lost on every Claude auto-update.** When Claude Code upgrades
itself, you're running the stock binary again until you re-extract and
recompile. Re-run extract → compile after every upgrade.

When you re-extract a new version, one of two things happens:

1. **Anchors still match** → the build succeeds, your patch survived. Done.
2. **An anchor moved** → strict mode fails with
   `--strict: N patches missing: [...]`. Now you re-anchor.

Re-anchoring uses the AST navigator:

```bash
/aio-claude-toolkit:aio-patch-anchor find "<3-5 word fragment of your old anchor>"
/aio-claude-toolkit:aio-patch-anchor navigate --at <byte-offset>
/aio-claude-toolkit:aio-patch-anchor explorer    # single-file HTML browser of cli.js
```

For a **Replace** patch this is usually quick: the surrounding invariant text
is still there, so you find it, copy the new exact string into `old`, rebuild.

For an **INJECT@** patch that references minified names (like the
control-channel), it's more involved. The minified names — submit function,
message-state setter, dialog-state pair, the store binding — all changed. You
re-derive each from its stable structural pattern (e.g. the React alias is
whatever `<NAME>.useEffect` resolves to most often; the submit function is
destructured from `{executeQueuedInput: <NAME>, ...}`), update them in the
source file and the `old` anchor, then rebuild and run the end-to-end smoke
tests. The toolkit ships a full step-by-step recipe for this:
`docs/repatching-playbook.md` in your scaffold, including a per-symbol
discovery table and a test-by-test failure-diagnosis map.

When a name breaks across two or more version bumps, promote it from
hard-coded to resolver-driven (Step 2c) so future bumps auto-derive it.

---

## Caveats and gotchas

Applies to any patch, including prompt rebalancing:

- **Patches are lost on every Claude auto-update** (covered above) — re-run
  extract → compile after each upgrade.
- **Extraction needs Bun 1.3.14+ layout.** Very old Claude versions used a
  different single-file-executable format and won't extract with the current
  parser.
- **Native modules are siblings of the binary.** Image, audio, and URL-handler
  features depend on the `.node` files staged next to `claude`. Extraction
  carves them automatically; verify with `ls dist/<arch>/*.node` if a feature
  silently fails.
- **Host-arch builds only, locally.** Cross-compiling to Linux from macOS uses
  the `--target` flag, but extraction of native modules is per-host — use
  Docker or a native machine for a fully foreign build.

Applies only if you inject the control-channel (the advanced reason):

- **No auth.** It binds `127.0.0.1` only — localhost is the sole barrier. If
  you tunnel the port, add a token check in the patch body first.
- **Single instance per port.** The launcher enforces a singleton (it kills a
  prior instance). Run multiple instances only on distinct `DC_PORT` values
  with `DC_NO_SINGLETON=1`.

---

## Skill quick reference

| Skill | Job |
|---|---|
| `aio-patch-setup` | Scaffold the pipeline into a fresh directory (do first) |
| `aio-patch-extract` | Carve `cli.js` + native modules from a Claude binary |
| `aio-patch-compile` | Apply `patches.json` + `bun build --compile` → patched binary |
| `aio-patch-run` | Exec the patched binary with arg/env passthrough |
| `aio-patch-anchor` | Find anchors / navigate the AST (drift recovery) |
| `aio-patch-control` | Scaffold reference HTTP control-channel clients |

The pipeline is the same machinery whether you're rewriting one prompt
sentence or injecting a whole HTTP server. What changes is only the content of
`patches.json` — and you don't write that by hand: you describe the behavior
you want, Claude investigates `cli.js` and writes the patch, you review. For
most people the destination is the same — a Claude tuned for thorough,
evidenced output instead of brevity.

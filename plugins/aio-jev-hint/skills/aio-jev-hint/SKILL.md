---
name: aio-jev-hint
description: |
  Author a UserPromptSubmit hook + `.jev-hint` catalog file — a hook that
  classifies every user prompt against a JSON catalog of
  {name, useWhen, context} entries via a batched LLM boolean-question call
  (Vercel AI SDK's experimental_evaluate, model typesafe-ai/jev), then
  injects the matched entries' `context` as additionalContext when
  confidence clears a threshold. The catalog is generic — entries can point
  at a relevant skill, an MCP server, a project rule, a dashboard to check,
  a standing reminder, or anything else worth surfacing on-topic; nothing
  about the pattern is skill-specific. Use when building a hook that
  surfaces contextual hints based on what the user's prompt is actually
  about, or when writing/tuning a `.jev-hint` catalog file: its fields, its
  `useWhen` wording, its confidence threshold. "context hint hook", "prompt
  classifier hook", ".jev-hint file", "UserPromptSubmit LLM classification",
  "surface a reminder on-topic", "viết hook gợi ý ngữ cảnh", "file .jev-hint".
when_to_use: jev-hint, .jev-hint, context hint hook, UserPromptSubmit hook, prompt classifier hook, experimental_evaluate, typesafe-ai/jev, boolean question batch classification, hint catalog file, useWhen field, additionalContext injection, fail-open hook, confidence threshold context routing, viết hook gợi ý ngữ cảnh
argument-hint: "[what you're building: 'hook' or 'catalog entry']"
effort: medium
---

# aio-jev-hint — hint-injection hooks with an LLM classifier

## The pattern

Two pieces, one job: surface the right hint at the right moment without the user asking. The catalog is a generic hint list — nothing ties it to any one kind of target. An entry can point at a skill, an MCP server, a project rule, a dashboard, or a plain reminder; the hook doesn't know or care which.

1. **`.jev-hint`** — a JSON array of `{name, useWhen, context}` entries. Global at `~/.claude/.jev-hint`, optionally overridden per-project by a `.jev-hint` at the repo root (nearest-ancestor lookup, same resolution rule as `.git`). Project entries win name collisions.
2. **A `UserPromptSubmit` hook** — on every prompt, batches all catalog entries into **one** LLM call (`experimental_evaluate` from the `ai` SDK, model `typesafe-ai/jev`) asking "does this apply?" per entry, then injects the `context` of every entry that clears a confidence threshold as `additionalContext`.

Full runnable template: `${CLAUDE_PLUGIN_ROOT}/skills/aio-jev-hint/reference/hook-template.mjs`. Example catalog: `${CLAUDE_PLUGIN_ROOT}/skills/aio-jev-hint/reference/example.jev-hint.json`.

## Writing the `.jev-hint` catalog

| Field | Required | Purpose |
|---|---|---|
| `name` | yes | Stable unique key. Used for dedup (project overrides global) and shows up in logs — pick something that identifies the target, whatever kind of target it is: a skill's slash command, an MCP server name, a rule label. |
| `useWhen` | yes | **This is what the LLM actually scores against the prompt.** Get this wrong and every other field is moot. |
| `context` | yes | Injected **verbatim** when matched — a slash command, an MCP server blurb, a dashboard URL, a project rule, a plain reminder sentence: whatever the target needs. Multiple matches get joined into one line, so keep it short. |

### `useWhen`: before/after from real tuning

The first version of this catalog copied each entry's full `SKILL.md` description verbatim — second-person, keyword-dense, built for a different discovery mechanism:

```
"useWhen": "Use whenever you change anything that has a previous version —
code (functions, branches, dead blocks), database state (rows, schema
columns, indexes), configs (env vars, feature flags, secrets),
infrastructure... [continues for 900+ characters, second person, comma-spliced
trigger list]"
```

That failed in practice — worse match quality, and unreadable at a glance. Rewritten to third person, one sentence of *intent*, a couple of representative trigger phrases:

```
"useWhen": "User is replacing, removing, or cleaning up something with a
prior version — code, config, docs, infra, or the assistant's own response —
and the result should read as if born in its current form, with no leftover
trace of the old version."
```

Same rules apply whether the entry points at a skill, an MCP server, or a one-line project reminder — only what counts as "intent" changes, not the shape of the sentence. A reminder entry, for example:

```
"useWhen": "User is debugging a slow or timing-out request path and hasn't
mentioned checking metrics yet."
```

**Rules that fell out of the rewrite:**
- Third person ("User wants X" / "User is doing Y"), not second person ("Use when you...") — this is a classification prompt, not documentation.
- One sentence naming the underlying *intent*. Not a keyword dump — the LLM classifies meaning, it doesn't need every synonym enumerated.
- A couple of concrete trigger phrases (`— e.g. "deploy to cloudflare pages", "ship to cf pages"`) earn their place; a long comma-spliced list doesn't.
- Short and complete beat long and exhaustive. If `useWhen` needs a paragraph to say what the entry is for, the entry is probably two entries.

## Writing the hook

Checklist, in the order a request flows through `hook-template.mjs`:

- **Event type: `UserPromptSubmit`.** Read `user_input`/`prompt`/`message` + `cwd` from the JSON stdin payload.
- **Fail open, always.** Any parse error, missing API key, empty catalog, or failed LLM call → return with no output, exit 0. This hook must never block or visibly break the user's prompt.
- **Filter synthetic turns.** Background-task completions arrive as a "user" turn whose entire text is a `<task-notification>` block — not something the human typed. Classifying it produced measured noise in production (13 of 38 real hint emissions in one day fired on this pattern instead of an actual request). Skip any prompt starting with it.
- **Resolve the catalog before calling out.** Walk up from `cwd` for the nearest project `.jev-hint`, merge with the global one, project wins name collisions. Skip the LLM call entirely if the merged catalog is empty.
- **Batch, don't loop.** One `evaluate()` call with one boolean question per catalog entry — not N sequential calls. In production this batches ~150-230 questions in a single request at ~1.3-2.4s total latency; that's the real budget to design around.
- **Threshold and sort.** Filter `result.answers` by `probability > threshold` (0.8 in production), sort descending. No matches → emit nothing.
- **Output shape.** `stdout` gets exactly one JSON object: `{ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: "..." } }`. Prefix the joined list with a plain label (`Context Hint: ...`) so it's recognizable in the transcript without implying the hint is always a skill.
- **Log for yourself, not the user.** Append timing (`stdin parse`, `catalog build`, `import`, `eval call`) and the scored result to a local debug log on every run. This is the only way to tune the threshold or diagnose "why didn't it fire" later — there's no other visibility into a hook that fails open.
- **Never hardcode secrets.** Read the API key from an env var first; if you need a fallback file, keep the path out of anything that gets published (this catalog is user-local, but the hook *code* may end up in a shared repo).

## Wiring it up

Register the hook once in `settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "bun /path/to/your/hook.mjs" }] }
    ]
  }
}
```

## Known unexplored lever

`experimental_evaluate` accepts an optional `criteria: { true: "...", false: "..." }` per question alongside `instructions`. Isolated testing suggested explicit criteria changes match behavior versus plain `instructions` alone, both standalone and batched — but the production hook above ships with plain `instructions` only; this was never folded in and re-validated at catalog scale. If a catalog's match quality is off and `useWhen` wording alone doesn't fix it, this is the next thing to try — not a confirmed win.

## Common mistakes

| Mistake | Fix |
|---|---|
| `useWhen` = full `SKILL.md` description pasted in | Rewrite as one third-person sentence of intent + 1-2 trigger phrases (see above) |
| Catalog / output labels assume every entry is a skill (`[skill-hint]:`, "which skill applies?") | Use target-agnostic wording — a generic label like `Context Hint:` and "does this apply?" — the catalog also carries MCP servers, project rules, plain reminders |
| Hook throws or writes to stderr on error | Wrap every step in try/catch that returns silently; a hint hook that breaks the prompt is worse than no hint |
| Classifying `<task-notification>` turns | Check `state.trimStart().startsWith('<task-notification>')` before calling out |
| One `evaluate()` call per catalog entry | Batch all entries into one call — this is what keeps latency in the ~1-2.5s range instead of minutes |
| `context` field repeats the whole `useWhen` text | Keep `context` to what should actually appear inline — a slash command or one short reminder line |
| Threshold left unset or at 0.5 | Start at 0.8; lower only after checking the debug log shows real misses, not noise |

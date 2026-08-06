---
name: aio-html-editor
description: |
  Create a purpose-built, self-contained HTML editor for one hard-to-express piece of work, with immediate preview, domain constraints, keyboard alternatives, change tracking, and a trustworthy export to JSON, diff, Markdown, prompt, or download. Use for feature flags, prompt tuning, ticket triage, config editing, annotation, curation, parameter tuning, or when the user needs to manipulate structured data rather than describe changes in chat.
---

# Purpose-built HTML editor

Build a disposable instrument for one decision or dataset—not a miniature generic product.

## Required reading

Read:

- `${CLAUDE_PLUGIN_ROOT}/references/artifact-grammar.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/aio-html-editor/references/editor-contract.md`
- `${CLAUDE_PLUGIN_ROOT}/references/quality-rubric.md`

Inspect `${CLAUDE_PLUGIN_ROOT}/examples/rollout-editor.html` for state, validation, and export behavior.

## Workflow

1. Define the source schema, invariant constraints, permitted operations, initial state, and exact export contract.
2. Seed the real initial data into the file. First paint must be useful offline.
3. Choose controls that match the domain: lanes for ordering, fields for structured config, canvas for spatial values, live preview for prompts/design parameters.
4. Validate continuously. Put warnings beside the cause and explain how to recover.
5. Track original versus current state. Make dirty state and reset behavior visible.
6. Provide keyboard/button alternatives for dragging or gesture-only actions.
7. Export only the needed result: changed keys, stable JSON, Markdown ordering, or a prompt that preserves context. Provide clipboard fallback and a visible preview.
8. Validate with:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind editor <file.html>`
   Exercise valid, invalid, empty, reset, export, and clipboard-failure paths.

## Non-negotiables

- The source of truth is explicit. Avoid two writers racing over the same state.
- Every control has a label; every state change has feedback.
- Never put secrets into a shareable artifact or browser storage.
- Do not persist by default. If persistence is requested, disclose storage and add clear reset.
- Export is a primary action, not an afterthought. The exported result must be deterministic and pasteable without cleanup.
- If the workflow needs live AI round-trips rather than a static export loop, pair with `aio-html-interactive` from `aio-message-bridge`.

## Optional: agent-assisted editing

Use the separately installed companion when the editor should **ask the agent to explain a warning, comment on a field or selection, suggest a valid change, validate a draft, or chat with the current editor state as context**. Keep browser-authoritative fields local unless the event contract explicitly makes the agent authoritative; never let both sides write the same key.

This skill defines the schema, invariants, preview, and export. `aio-html-interactive` owns the frozen UI runtime, relay, Monitor lifecycle, busy state, and push handling. Do not copy its implementation. Read `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md` for install instructions, typed event suggestions, security, and lifecycle boundaries.

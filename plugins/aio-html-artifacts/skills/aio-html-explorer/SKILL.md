---
name: aio-html-explorer
description: |
  Create a self-contained HTML exploration or decision surface that places genuinely different options side by side, aligns tradeoffs on shared criteria, exposes assumptions and falsifiers, and ends with a recommendation or decision record. Use for architecture alternatives, product/design directions, implementation approaches, vendor selection, scenario planning, or requests to compare, brainstorm visually, explore options, or decide in HTML.
---

# Side-by-side HTML explorer

Use space to reduce memory load: alternatives belong on a shared visual baseline, not in sequential prose.

## Required reading

Read:

- `${CLAUDE_PLUGIN_ROOT}/references/artifact-grammar.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/aio-html-explorer/references/explorer-grammar.md`
- `${CLAUDE_PLUGIN_ROOT}/references/quality-rubric.md`

Inspect `${CLAUDE_PLUGIN_ROOT}/examples/queue-architecture-explorer.html` for a worked example.

## Workflow

1. State the decision question, decision owner, constraints, and deadline/horizon.
2. Normalize options. Each must answer the same criteria with comparable evidence and units.
3. Make options materially different. Do not manufacture three cosmetic variants of one idea.
4. Build a first-screen option map, then aligned details, then a tradeoff matrix or scenario test.
5. Show assumptions, confidence, reversibility, failure modes, and what evidence would change the ranking.
6. If scoring is interactive, expose weights, preserve raw evidence, and show that the score is a model—not truth.
7. End with a recommendation, accepted tradeoff, and next experiment or decision record.
8. Validate with:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind explorer <file.html>`

## Non-negotiables

- Use aligned rows/columns or a matrix so comparisons do not depend on memory.
- Separate hard constraints from preferences.
- Never hide a disqualifier inside an accordion.
- Recommendations name both why the winner wins and where it loses.
- Unknown is an honest value. Do not convert missing evidence into a neutral score.
- On mobile, transform comparison columns into repeated criterion groups or a scroll-snap comparison with labels retained.

## Optional: deliberate with the agent in place

When the user wants to **select an option claim and ask why, comment on evidence, propose a new constraint, chat about a scenario, or have the agent update the comparison live**, pair this skill with the separately installed `aio-html-interactive` skill from `aio-message-bridge`.

The explorer continues to own comparable criteria, evidence, and recommendation logic. Hand stable option/criterion anchors and typed comment/chat/decision events to the companion skill; let it own the relay and event loop. Do not duplicate its scaffold. Read `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md` for the installation and integration boundary.

---
name: aio-html-deck
description: |
  Create a self-contained HTML presentation or side deck with a deliberate story arc, one claim per scene, strong visual pacing, keyboard/touch navigation, speaker context, responsive fallback, and print-to-PDF support. Use for executive briefings, technical walkthroughs, proposals, demos, narrative status presentations, and requests for slides, slide decks, side decks, or an HTML presentation.
---

# Narrative HTML deck

A deck is paced communication, not a report divided into viewports.

## Required reading

Read:

- `${CLAUDE_PLUGIN_ROOT}/references/artifact-grammar.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/aio-html-deck/references/deck-grammar.md`
- `${CLAUDE_PLUGIN_ROOT}/references/quality-rubric.md`

Inspect `${CLAUDE_PLUGIN_ROOT}/examples/migration-briefing-deck.html` for interaction and print behavior, not for a mandatory visual style.

## Workflow

1. Define audience, speaking time, desired decision, and one-sentence takeaway.
2. Create a beat sheet: setup → tension → evidence/reveal → resolution → ask. Remove beats that do not change the audience's understanding.
3. Assign one claim to each slide. Put supporting detail in visuals, notes, or an appendix—not in smaller text.
4. Select the visual sentence for each claim. Use diagrams, before/after, a single chart, or a decisive quote/code excerpt.
5. Build semantic `<section class="slide">` scenes. The DOM order must remain a readable document.
6. Add arrow/Page Up/Page Down/Home/End navigation, visible controls, progress, touch-friendly buttons, and a direct slide hash when useful.
7. Add print CSS that lays each slide on one page and exposes URLs/notes when appropriate.
8. Validate with:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind deck <file.html>`
   Then rehearse every transition at desktop and mobile widths.

## Non-negotiables

- One memorable sentence or relationship per slide.
- Minimum comfortable text size; if content does not fit, edit or split it.
- Transitions support orientation, never spectacle. Respect reduced motion.
- Essential meaning is not encoded by animation order alone.
- The final slide contains the decision, ask, or next move.
- A deck may link to a companion report for audit depth; it should not pretend to contain all evidence.

## Optional: live briefing and contextual Q&A

When the deck must support **questions anchored to the current slide, audience comments on a claim, live decision capture, or a chat rail with slide context**, pair it with the separately installed `aio-html-interactive` skill from `aio-message-bridge`. Preserve the paced deck as the primary surface; the live layer should not turn every slide into a chat dashboard.

Pass stable slide IDs, the current claim/evidence context, and explicit events such as `chat.submit` or `decision.submit` to the companion skill. Let it own transport, turn-taking, connection state, and cleanup; do not vendor its runtime here. Read `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md` when live collaboration is requested.

---
name: aio-html-report
description: |
  Create a self-contained, evidence-rich HTML report or explainer with a clear verdict, narrative spine, layered detail, diagrams, exact code/diff/log excerpts, responsive layout, and print mode. Use for code reviews, PR writeups, incident reports, implementation plans, technical explainers, research synthesis, weekly status, audits, and any long-form deliverable where Markdown would hide hierarchy or separate claims from proof.
---

# Evidence-led HTML report

Produce one readable `.html` file whose first screen tells the truth and whose deeper layers let a skeptical reader audit it.

## Required reading

Read these before composing:

- `${CLAUDE_PLUGIN_ROOT}/references/artifact-grammar.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/aio-html-report/references/report-structures.md`
- `${CLAUDE_PLUGIN_ROOT}/references/quality-rubric.md`

Use `${CLAUDE_PLUGIN_ROOT}/examples/engineering-investigation-report.html` as a capability example, not as a template to recolor.

## Workflow

1. **Ground the evidence.** Inspect the requested sources. Capture exact identifiers, time, revisions, file/symbol/line anchors, quotes, and gaps. Separate observed facts from inference.
2. **Write the report contract.** One sentence each for audience, question, decision/action, and what a careful reader could challenge.
3. **Choose one report structure** from `report-structures.md`. Write the narrative spine before HTML.
4. **Sketch the five layers.** Decide what belongs in glance, scan, understand, audit, and act. Do not repeat the same paragraph at each depth.
5. **Map relationships to visuals.** Use a timeline for sequence, flow for causality, aligned columns for comparison, and annotated code for code claims. Never default to a grid of cards.
6. **Compose a self-contained file.** Inline CSS, SVG, and minimal JS. Prefer semantic HTML and a readable no-JS order.
7. **Verify.** Run:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind report <file.html>`
   Then inspect desktop, mobile, and print as required by the shared grammar.
8. **Hand off the file.** State the verdict and link the output. Mention evidence gaps and any validator warnings.

## Non-negotiables

- Lead with the conclusion, confidence, and consequence—not a decorative title.
- If discussing source code and it is available, show the decisive lines inline with annotations.
- Provide navigation only when it reduces navigation cost; short reports do not need a sidebar.
- Use `<details>` for audit depth, never to conceal the core conclusion.
- Charts require units, scale/baseline, source, and a textual takeaway.
- Avoid KPI tiles unless the numbers truly answer the opening question.
- Do not use interactivity as decoration. Reports are readable before JavaScript runs.

## Optional: make the report a live reading room

When the user wants to read a report or plan and **select unclear text/code, leave an anchored comment, request an explanation, or chat inside the HTML with section context**, pair this skill with the separately installed `aio-html-interactive` skill from `aio-message-bridge`.

Keep this skill responsible for the report spine and evidence. Hand the live layer stable section/source anchors plus a small event contract such as `explain.request`, `comment.submit`, and `chat.submit`; let the companion skill own its scaffold, relay, Monitor loop, busy state, and cleanup. Do not copy that implementation into the report. Read `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md` only when this live tier is requested; it includes the install command and handoff contract.

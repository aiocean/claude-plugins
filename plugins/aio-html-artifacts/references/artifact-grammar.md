# The HTML artifact grammar

This is a content system, not a visual theme. Read it before composing any artifact.

## 1. Start with the human job

Name the job in one verb. The form follows that verb.

| Human job | Primary form | Avoid |
|---|---|---|
| Understand | explainer/report with annotated evidence | dashboard of disconnected facts |
| Decide | aligned alternatives and explicit tradeoffs | prose that makes comparison memory-dependent |
| Present | paced deck with one claim per scene | a report cut into slides |
| Manipulate | purpose-built editor with preview and export | a generic form with no feedback loop |
| Audit | traceable claims, source anchors, raw appendix | conclusions detached from evidence |

If the task has two jobs, choose a dominant one and make the second a supporting mode. Do not hybridize every pattern into one page.

## 2. Use the five-layer reading ladder

Every artifact must work at multiple depths without duplicating the same prose.

1. **Glance — 5 seconds.** A truthful title, status/verdict, and the single most important consequence.
2. **Scan — 30 seconds.** A map of the story: key numbers, phases, options, or findings. Readers should know where to look next.
3. **Understand — 3 minutes.** Causal explanation, sequence, comparison, or annotated diagram. This is the narrative spine.
4. **Audit — as long as needed.** Exact code, diffs, logs, citations, assumptions, methods, and raw data close to the claims they support.
5. **Act.** A decision, checklist, owner/date, copy/export action, or next prompt. An artifact that stops at “interesting” is incomplete when action is expected.

Implement the ladder spatially: headline at the top, overview near it, explanation in the main flow, evidence inline or in expandable regions, and action at the decision point. Do not make “details” a graveyard at the bottom.

## 3. Choose a visual sentence for each relationship

Do not use a card merely because it is easy to style.

| Relationship in the information | Visual sentence |
|---|---|
| Sequence / change over time | timeline, steps, before → after |
| Causality / data movement | directed flow with annotated edges |
| Comparison | aligned columns, shared baselines, matrix |
| Hierarchy / containment | nested regions or tree |
| Magnitude / trend | proportionate chart with units and baseline |
| State / lifecycle | state machine or phase strip |
| Spatial relationship | map, canvas, positioned diagram |
| Source evidence | code/diff/log block with line anchors and callouts |
| Uncertainty | confidence marker plus what would change the conclusion |

Tables are for exact lookup. Charts are for shape. Diagrams are for relationships. Prose is for reasoning. Code is for proof. Use the smallest truthful representation.

## 4. Build a narrative, then a page

Write a one-line spine before HTML:

> Context → tension/question → evidence → meaning → resolution/action.

Every section must advance that spine. Strong section headings make claims (“Retries hide the real failure”) rather than label containers (“Analysis”). Use visual rhythm to mark transitions: scale, whitespace, rule, contrast, or a change of composition. Repeating identical rounded cards destroys hierarchy.

For long artifacts, provide orientation with a sticky or compact table of contents, progress marker, or section numbering. Keep the reading order valid without CSS or JavaScript.

## 5. Put proof next to the claim

For technical artifacts:

- Show the actual relevant lines, not a paraphrase alone.
- Label repository/file, line range or symbol, revision/MR, and evidence time when known.
- Annotate the exact line that supports or contradicts the claim.
- Distinguish observed fact, inference, assumption, and recommendation.
- Never invent code, metrics, citations, or certainty to make the layout feel complete.
- Use `<details>` for supporting evidence only when the summary remains meaningful by itself.

For web research, link to the specific source near the supported claim. For sensitive material, redact secrets and personal data before embedding.

## 6. Choose the interaction tier deliberately

There are three distinct tiers. Name the tier in the artifact contract so “interactive” is not ambiguous.

1. **Readable artifact:** navigation and disclosure only; the document remains a shareable file.
2. **Local instrument:** filters, simulation, editing, and export run entirely in the browser; no agent is listening.
3. **Live agent surface:** selection, contextual comments, explanation requests, or chat travel to the active agent and answers return into the page. This requires the separately installable `aio-html-interactive` / `aio-message-bridge` runtime. Read `${CLAUDE_PLUGIN_ROOT}/references/live-collaboration.md`; reference that skill rather than copying its scaffold or protocol implementation here.

## 7. Interaction must earn its place

Add JavaScript only when it improves comprehension, comparison, rehearsal, or action. Tabs may align variants; filters may reduce a large evidence set; a slider may expose behavior; an editor may let the user express a choice.

Every interaction needs:

- a visible affordance and keyboard path;
- an initial state that is already useful;
- a non-JavaScript reading path for essential conclusions;
- clear state and feedback;
- persistence only when explicitly useful and safe;
- an export for user-authored state (`copy JSON`, `copy diff`, `download`, or `copy prompt`).

Do not hide critical evidence behind hover. Do not make drag-and-drop the only input method.

## 8. Design constraints

- Prefer one self-contained `.html` file with inline CSS, SVG, and JS. No build step.
- Do not load remote scripts, fonts, trackers, or images unless the user asks and the dependency is disclosed.
- Establish a restrained token set: canvas, ink, muted ink, rule, accent, semantic danger/warn/success, 2–3 type sizes, and a spacing rhythm.
- Optimize measure for reading (roughly 55–80 characters) but let diagrams/tables break wider when needed.
- Use semantic landmarks, one `<h1>`, ordered heading levels, real buttons, visible focus, sufficient contrast, and text alternatives for meaningful SVG.
- Reflow at 320 CSS pixels. Respect `prefers-reduced-motion`. Make touch targets practical.
- Include print CSS: remove controls, expand essential detail, avoid awkward breaks, preserve source URLs when useful.
- Make styles original to the subject. A report, deck, explorer, and editor should not look like the same component library.

## 9. Completion loop

Before handoff:

1. Run the shared validator:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-html-artifact.mjs" --kind <report|deck|explorer|editor> <file.html>`
2. Open at approximately 1440×900 and 390×844. Inspect first screen, longest section, widest data/code, focus states, and controls.
3. Check print preview for reports/decks.
4. Exercise every interaction and export. Paste exported content into a plain-text editor and verify it is complete.
5. Re-read only the glance and scan layers. They must remain truthful without the details.

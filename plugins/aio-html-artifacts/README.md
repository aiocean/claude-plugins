# aio-html-artifacts

Four skills that turn a piece of work into one HTML file a human can read, print, audit, and act on — offline, with zero remote references.

## Install

```
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-html-artifacts@aiocean-plugins
```

## Genre routing — read this before loading a skill

Route on what the human does next with the artifact. That is observable; "it is about architecture" is not, because architecture arrives as any of the four.

| The human next… | Skill | Shape of the output | Typical requests |
|---|---|---|---|
| reads it, checks the reasoning, files it | `aio-html-report` | one scrolling page: verdict first, then claim → evidence → consequence, layered detail | code review writeup, incident report, RCA, implementation plan, explainer, research synthesis, audit, status |
| sits in front of people and talks | `aio-html-deck` | scenes, one claim each, keyboard and touch navigation, speaker notes, print at 16:9 | exec briefing, technical walkthrough, proposal, demo |
| picks one option and records why | `aio-html-explorer` | alternatives aligned on shared criteria, assumptions and falsifiers exposed, recommendation at the end | architecture alternatives, vendor selection, tradeoff matrix, ADR, scenario planning |
| changes values and hands them back | `aio-html-editor` | domain-constrained controls, live preview, change tracking against an initial snapshot, deterministic export | feature flags, config editing, prompt tuning, triage, annotation, parameter sweeps |

Two shapes sit one request apart: a comparison whose answer is already known is a report with a comparison section, and an editor whose values are never exported is a report with sliders. Pick the row whose first column matches the next human action; the rest of the page follows from it.

## What this ships that comparable tools do not

The nearest comparable, `nicobailon/visual-explainer` (9,475 stars, MIT), loads `fonts.googleapis.com` and a 3.57 MB Mermaid ESM bundle from a CDN, and carries zero `@media print` and zero `location.hash` across its four templates. Five differentiators close that gap:

- **True offline self-containment** — one file, zero remote references; fonts, data, and diagrams inline, so it opens on a plane, in an air-gapped review, and in five years.
- **Print as a first-class output** — every genre ships print CSS: `<details>` open on paper, dark floods invert, decks lay out at exact 16:9. What survives printing survives forwarding.
- **Deep-linkable navigation** — state a reader would want to send lives in `location.hash`, so a scene, an option, or a section has a URL.
- **Calibrated evidence anchors** — a claim carries repository, revision, file and line range, and observation time; a confidence word carries its numeric band as literal text (ICD 203 bands; a bare confidence word matches reader intent 32% of the time versus 66% with the number — PLOS ONE 2019, N=924).
- **A validator that parses** — `scripts/validate-html-artifact.mjs` builds a tree with a zero-dependency tokenizer and asserts against elements and CSS rules, so a comment holding the right keywords proves nothing.

Self-assessment is a fixed list of binary, observable questions in each `SKILL.md`, answered in text, where any NO gets fixed and re-answered. Decomposed YES/NO checklists raise LLM-human agreement (TICK/STICK: 46.4% → 52.2%, +7.8% absolute on LiveBench via self-refinement); holistic self-scoring degrades output (Huang et al., ICLR 2024). Truth and evidence-proximity go to a separate verifier pass — those are the two judgements a generator cannot make about its own output.

## Two further genres, held back

Diagram sheets (module maps, annotated flowcharts, SVG figure sheets) and design-system galleries (token specimens, component variants, motion sandboxes) exist as validator kinds and ship as skills in a later release. Both belong in the routing table above, and a fifth and sixth row change which skill fires for requests the four core skills answer today. They land once routing on the four is validated against real prompts, since the routing table is the load-bearing surface.

## Examples and validation

Open [`examples/index.html`](examples/index.html) locally. Each example is standalone — no build step, no external dependency — and each is a fixture CI validates on every push.

```bash
node scripts/validate-html-artifact.mjs --kind report examples/engineering-investigation-report.html
```

Four negative fixtures ship, and CI asserts every one exits 1 so a check cannot quietly stop firing. `examples/slop.fixture.html` fails on shape (card soup, gradient hero, stock type) and `examples/gaming.fixture.html` on keyword bingo. `examples/bypass.fixture.html` and `examples/bypass-deck.fixture.html` carry the gaming attempts that spell around a check rather than skipping it — a runtime-assembled remote URL, a contract key padded to length, a branch ref where a 40-hex SHA belongs — so a refactor that reopens one of those holes turns the job red.

`examples/weekly-status-brief.html` is the short end of the range: a 282-word weekly status carrying `tier= brief` in its contract, which asks for five contract keys instead of twelve and stands down the falsifier block, the confidence band, and the early-evidence placement rule. CI runs it three ways — as it ships, with the `tier=` line stripped, and padded past the 600-word ceiling — and the last two are required to exit 1, so the tier stays a branch that gates something.

## Optional live agent collaboration

Standalone artifacts support reading, local interaction, and export without a server. For a live surface where a reader selects a passage, comments on evidence, or chats with the active agent inside the HTML, install the companion plugin and pair the relevant skill here with `aio-html-interactive`:

```
/plugin install aio-message-bridge@aiocean-plugins
```

This plugin supplies the content and narrative contract; the companion owns its browser scaffold, WebSocket relay, Monitor event loop, turn-taking, and cleanup. See [`references/live-collaboration.md`](references/live-collaboration.md).

## Research basis

Citations, verified links, and a confidence label per claim live in [`references/research-foundations.md`](references/research-foundations.md) — human-facing provenance, loaded by no skill. The starting point was Thariq Shihipar's Anthropic article [“The unreasonable effectiveness of HTML”](https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html) and its [example gallery](https://thariqs.github.io/html-effectiveness/).

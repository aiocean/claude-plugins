# aio-html-artifacts

Create HTML that functions as a richer communication surface between an agent and a human—not merely Markdown with CSS.

## Skills

| Skill | Human job | Typical outputs |
|---|---|---|
| `aio-html-report` | understand and audit | code review, incident, explainer, plan, status |
| `aio-html-deck` | present and persuade | briefing, walkthrough, proposal, side deck |
| `aio-html-explorer` | compare and decide | architecture options, design directions, scenario analysis |
| `aio-html-editor` | manipulate and return intent | flag/config editor, triage, prompt tuner, annotation tool |

All four use a shared five-layer reading ladder—glance, scan, understand, audit, act—plus evidence proximity, relationship-driven visual grammar, responsive/accessibility rules, and a deterministic validator. They deliberately do not share one page layout.

## Optional live agent collaboration

Standalone artifacts support reading, local interaction, and export without a server. For a live surface where a reader can select a confusing passage, comment on code/evidence, request an explanation, or chat with the active agent inside the HTML, install the companion plugin:

```bash
claude plugin install aio-message-bridge@aiocean-plugins
```

Then pair the relevant skill here with `aio-html-interactive`. This plugin supplies the content/narrative contract; the companion owns its browser scaffold, WebSocket relay, Monitor event loop, turn-taking, and cleanup. Nothing is vendored or duplicated. See [`references/live-collaboration.md`](references/live-collaboration.md).

## Examples

Open [`examples/index.html`](examples/index.html) locally. Each example is a standalone file with no build step or external dependency.

## Validation

```bash
node scripts/validate-html-artifact.mjs --kind report examples/engineering-investigation-report.html
node scripts/validate-html-artifact.mjs --kind deck examples/migration-briefing-deck.html
node scripts/validate-html-artifact.mjs --kind explorer examples/queue-architecture-explorer.html
node scripts/validate-html-artifact.mjs --kind editor examples/rollout-editor.html
```

## Research basis

The plugin is an original synthesis inspired by Thariq Shihipar's Anthropic article [“Using Claude Code: The unreasonable effectiveness of HTML”](https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html) and its [official example gallery](https://thariqs.github.io/html-effectiveness/), with supporting principles from Shneiderman's information-seeking mantra, Segel and Heer's narrative visualization research, and WCAG 2.2. See [`references/research-foundations.md`](references/research-foundations.md).

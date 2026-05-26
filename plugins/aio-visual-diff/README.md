::install-command
/plugin install aio-visual-diff@aiocean-plugins
::

# aio-visual-diff

**Frontend verification that measures instead of eyeballs.**

When an AI agent builds a UI and says "it looks right," that claim is nearly useless. Multimodal LLMs are weak at spatial pixel reasoning — comparing two screenshots and judging fidelity produces subjective, unreliable answers. Meanwhile the implementation is probably wrong in specific, measurable ways: the heading is 28px when the spec says 24px, the padding is 16px when it should be 12px, there are two SVG icons when there should be one.

This plugin replaces screenshot comparison with a measurement loop. Every property that matters — font size, line height, padding, margin, gap, border radius, color, layout mode, child count — is extracted as a number from the live DOM via `getComputedStyle` and `getBoundingClientRect`. The numbers are diffed against a reference. The deltas drive specific corrections in the form "change X to Y in file Z."

## Install

```bash
/plugin install aio-visual-diff@aiocean-plugins
```

## Requirements

- `chrome-devtools` MCP (required) — extracts measurements from the live DOM
- `figma` MCP (optional) — used in Figma fidelity mode; falls back to baseline regression if absent
- A running dev server at the URL you provide

## Two modes

**Figma fidelity** — when you have a Figma file as the spec. The skill extracts layout values from the Figma node and diffs them against live DOM measurements. Properties include dimensions, padding, font size, fill colors, and border radius.

**Baseline regression** — when you have no Figma reference but want to protect against drift. On the first run, the skill freezes the current measurements to `.aio-visual-diff/<selector-hash>.json`. On subsequent runs it diffs against that baseline. Any change becomes visible as a delta.

## The measurement loop

1. Navigate the dev server to the target URL
2. Run the measurement function against a CSS selector — returns a JSON object with box geometry, typography, spacing, color, layout, border, and child counts
3. Get reference values from Figma or the baseline file
4. Normalize colors (all representations to RGB tuple), normalize spacing shorthand (to four-value array), strip units from numeric strings
5. Output a delta table with current value, target value, and delta for every differing property
6. Convert every delta into a concrete correction: `[element].[property] is [measured], spec says [target] → change [specific token or code reference]`
7. Re-measure after the fix, re-diff, repeat until all deltas fall within threshold

Stop conditions are explicit: font size within ±0.5px, box dimensions within ±1px, colors exact after normalization, counts exact. After five iterations without convergence, the skill escalates — the root cause is likely a CSS specificity conflict, framework override, or component hierarchy issue, not a token swap.

## Why class names are not enough

AI agents guess design tokens from class names. This is unreliable because the class name is not the runtime value — cascade, theme providers, container queries, and media queries can all override it. The skill documents the specific ways common component libraries mislead:

| Library | What the agent guesses | What the browser renders |
|---------|----------------------|--------------------------|
| Radix Themes `space="6"` | 24px | 40px |
| Radix Themes `<Heading size="7">` | 24px | 28px |
| Material UI `theme.spacing(6)` | 24px | 48px (8px base unit × 6) |
| Tailwind `text-xl` line-height | 24px | 25px (1.25 × 20px) |

The fix in every case is to measure the actual runtime value rather than trust the class name.

## Selector strategy

The skill recommends `data-testid` attributes as the most stable selectors for components you plan to verify repeatedly. Semantic selectors (`header h1`, `[role="dialog"]`) work for unique elements. Utility class selectors (`.flex`, `.p-4`) are explicitly banned — they match too many elements to be reliable.

## Trigger phrases

> "visual diff", "pixel perfect", "design fidelity", "frontend verify", "UI regression", "check if the UI matches the design", "padding wrong", "font size off", "spacing off", "Figma compare", "layout diff", "visual QA", "measurement loop"

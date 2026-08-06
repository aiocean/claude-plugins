# Research foundations and design synthesis

## Primary source

Thariq Shihipar's Anthropic article, **“Using Claude Code: The unreasonable effectiveness of HTML”** (20 May 2026), argues that HTML expands agent-to-human communication beyond Markdown through higher information density, visual navigation, easy sharing, two-way interaction, and synthesis from filesystem, MCP, browser, and git context.

- Article: https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html
- Official example gallery: https://thariqs.github.io/html-effectiveness/
- Example source: https://github.com/ThariqS/html-effectiveness (Apache-2.0)

The gallery demonstrates twenty standalone formats: implementation explorations, visual directions, annotated PR review, code/module explanation, design systems, component variants, animation and interaction sandboxes, slide decks, SVG sheets, weekly and incident reports, flowcharts, explainers, plans, PR writeups, and three small editors. Its recurring pattern is to use HTML for relationships Markdown serializes poorly: side-by-side alternatives, spatial call graphs, inline code annotation, motion, and editable state that can be exported.

This plugin does not copy the gallery's templates. It turns those observed affordances into an original, reusable grammar and validation workflow.

## Supporting foundations

### Information seeking

Ben Shneiderman's 1996 visual information-seeking mantra is “overview first, zoom and filter, then details-on-demand.” The original paper also identifies relate, history, and extract as tasks. The plugin translates this into the five-layer reading ladder: glance, scan, understand, audit, act.

- Paper: https://hci.stanford.edu/courses/cs448b/papers/shneiderman96eyes.pdf

### Narrative visualization

Segel and Heer describe narrative visualization as a balance between author-driven narrative flow and reader-driven discovery. The plugin preserves both: a deliberate story spine provides direction, while details, comparisons, filters, and evidence permit exploration.

- Paper: https://homes.cs.washington.edu/~jheer/files/narrative.pdf
- DOI: https://doi.org/10.1109/TVCG.2010.179

### Accessibility

WCAG 2.2 informs the baseline: semantic relationships, contrast, reflow, focus visibility, keyboard access, target size, predictable interactions, and alternatives to motion-dependent behavior.

- Standard: https://www.w3.org/TR/WCAG22/
- Techniques: https://www.w3.org/WAI/WCAG22/Techniques/

## Original synthesis: directed freedom

The plugin's central design stance is **directed freedom**:

- The author controls the opening, sequence, hierarchy, and verdict.
- The reader controls depth, comparison, filtering, and evidence inspection.
- The interface returns user choices to the work through an explicit export.

This is why the plugin separates four genres. A report directs reading, a deck directs pacing, an explorer supports comparison, and an editor captures intent. They share a quality bar, not a page template.

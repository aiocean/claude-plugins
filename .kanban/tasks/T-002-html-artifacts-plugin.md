# T-002 — Build the aio-html-artifacts plugin

**Status:** Done
**Priority:** high
**Size:** L

## Outcome

Ship a marketplace-ready plugin that turns researched evidence into self-contained HTML reports, decks, comparison surfaces, and purpose-built editors with strong narrative structure, layered detail, accessibility, and export loops.

## Definition of done

- [x] Capture the Anthropic/Thariq source material and supporting information-design research.
- [x] Add four focused skills with shared artifact grammar and genre-specific guidance.
- [x] Include representative, self-contained example HTML files.
- [x] Add deterministic validation for structure, accessibility basics, responsiveness, and interaction contracts.
- [x] Register the plugin in the marketplace and document it in the root README.
- [x] Validate metadata and render examples at desktop and mobile widths.

## Verification

- Marketplace: 29/29 plugins, 416/416 checks passing.
- Skills: all four pass `quick_validate.py`; plugin passes `validate_plugin.py`.
- Artifacts: all four pass `validate-html-artifact.mjs` with zero warnings.
- Browser: desktop 1440×900 and mobile 390×844 render without page overflow or JavaScript errors.
- Interaction: deck navigation, explorer scenario switching, editor constraints/diff/reset pass.
- Print: report renders to 4 A4 pages; deck renders to 6 16:9 pages.

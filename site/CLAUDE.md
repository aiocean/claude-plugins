# site/ — Nuxt static-site source

This directory is a **Nuxt 4 + Nuxt Content v3 application** that renders the
marketplace at https://aiocean.github.io/claude-plugins/. It extends
[`andy-note-nuxt`](https://github.com/nguyenvanduocit/andy-note-nuxt) as a
Nuxt Layer — the layer ships theme + stacked-column UX, this project ships
marketplace content + branding.

## Data flow

```
plugins/{name}/.claude-plugin/plugin.json   ┐
plugins/{name}/skills/{skill}/SKILL.md       ├──► scripts/sync-content.py
.claude-plugin/marketplace.json              ┘            │
                                                          ▼
                                          site/content/{index.md, plugins/**}
                                                          │
                                                          ▼ nuxt generate
                                                  site/.output/public/
                                                          │
                                                          ▼ actions/deploy-pages
                                          https://aiocean.github.io/claude-plugins/
```

`sync-content.py` walks the marketplace + per-plugin frontmatter and emits one
markdown file per plugin + one per skill. Output is `.gitignored` — regen
freely (`bun run sync`).

## Commands (run from this directory)

```sh
bun install         # first time / after package.json changes
bun dev             # local dev server with HMR (sync + nuxt dev)
bun run sync        # regenerate content/ from ../plugins/
bun run generate    # sync + nuxt generate → .output/public
bun run preview     # serve .output/public locally
```

Use `bun dev` for iterating on content or theme — Nuxt HMR rebuilds on
markdown edits. Use `bun run generate` when verifying the production
static output (baseURL rewriting, prerender warnings, route manifest).

Production build sets `app.baseURL='/claude-plugins/'` by default (matches GH
Pages subpath). Override with `NUXT_APP_BASE_URL=/ bun run generate` for
custom domains or local-root preview.

## What's hand-written vs auto-generated

| Path | Source |
|---|---|
| `nuxt.config.ts` | Hand. Layer extends + baseURL + nitro.prerender config. |
| `content.config.ts` | Hand. Zod schema for marketplace + universal + layer-queried fields. |
| `app/app.config.ts` | Hand. Site branding (title, menu, themeColor). |
| `app/app.vue` | Hand. Minimal NuxtLayout wrapper. |
| `package.json` | Hand. Mirrors layer's runtime deps (`@fontsource/*`, `@floating-ui/vue`, `rehype-raw`). Extends does not auto-install layer deps. |
| `content/index.md` | **Auto** (sync-content.py). Marketplace landing. |
| `content/plugins/index.md` | **Auto**. /plugins listing intro. |
| `content/plugins/{name}.md` | **Auto**. Per-plugin overview. |
| `content/plugins/{name}/{skill}.md` | **Auto**. Per-skill detail. |

Hand-edits to auto-generated files survive only until the next `bun run sync`.
To change rendered markdown structure, edit `scripts/sync-content.py`. To change
visual rendering, override a layer component (see "Layer overrides" below).

## Layer overrides

Nuxt Layers deep-merge child over parent. To customize the layer's behavior:

- **Component**: create `app/components/{Name}.vue` matching the layer's path
  (e.g. `app/components/ContentView.vue`). Yours replaces theirs.
- **Page / layout**: same — `app/pages/[...slug].vue` or `app/layouts/default.vue`.
- **Tailwind palette**: copy `tailwind.config.js` into this directory; Tailwind
  picks up the project-local config (Nuxt does NOT deep-merge tailwind configs).
- **App config**: `app/app.config.ts` deep-merges. Override individual keys.

## Known layer issues (to fix upstream)

Tracked in `content.config.ts` comments; brief summary here so future readers
don't have to chase the workaround:

1. **PoE-domain field SELECT** — `ContentView.vue:118` queries 10 game-specific
   columns (`budget_tier`, `game`, `league`, `patch`, `build_tags`, `ratings`,
   `strategy_tier`, `profit_per_hour`, `investment_tier`). Layer's own CLAUDE.md
   forbids domain leak; this select is the leak. Workaround: declare these as
   optional in our schema so the SQLite cache materializes the columns.
2. **`document_type` filter excludes NULL** — `ContentView.vue:117` filters
   with `.where('document_type', '<>', 'convention')`. SQL `NULL <> 'x'` is
   NULL (falsy) → nodes without `document_type` are silently filtered out.
   Workaround: every generated markdown carries `document_type: "listing" |
   "plugin" | "skill"`. Proper fix is `(IS NULL OR <> 'convention')` upstream.
3. **README missing transitive deps** — andy-note-nuxt's quickstart says
   `bun add nuxt @nuxt/content @nuxtjs/tailwindcss vue vue-router` but consumers
   also need `@fontsource/literata`, `@fontsource/space-grotesk`,
   `@floating-ui/vue`, `rehype-raw`, `vite-plugin-ai-annotator`.
4. **`vite-plugin-ai-annotator` hardcoded module** — layer's `nuxt.config.ts`
   registers it as a module. Consumer must install (devDep is fine) even when
   disabled via `aiAnnotator: false`.

When the layer ships fixes, drop the workarounds from `content.config.ts`.

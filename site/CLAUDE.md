# site/ — Nuxt static-site source

This directory is a **Nuxt 4 + Nuxt Content v3 application** that renders the
marketplace at https://claude-plugins.aiocean.dev/. It extends
[`andy-note-nuxt`](https://www.npmjs.com/package/andy-note-nuxt) as a
Nuxt Layer (installed from npm) — the layer ships theme + stacked-column UX,
this project ships marketplace content + branding.

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
                                                          ▼ cloudflare/wrangler-action
                                              https://claude-plugins.aiocean.dev/
```

`sync-content.py` walks the marketplace + per-plugin frontmatter and emits one
markdown file per plugin + one per skill. Output is `.gitignored` — regen
freely (`bun run sync`).

Deploy workflow: `.github/workflows/pages.yml` (workflow name "Deploy to
Cloudflare Pages") runs on every push to `main` touching `plugins/`,
`.claude-plugin/`, `site/`, or `scripts/sync-content.py`. It builds with
`bun run generate` and ships to Cloudflare Pages via
`cloudflare/wrangler-action`.

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
static output (asset paths, prerender warnings, route manifest).

`app.baseURL` defaults to `/` (`nuxt.config.ts:67`) because the
`claude-plugins.aiocean.dev` custom domain serves from root with no
subpath. Override via `NUXT_APP_BASE_URL=/some-prefix/ bun run generate`
only if deploying to a subpath later — the env override is kept so any
future move doesn't require a code change.

## What's hand-written vs auto-generated

| Path | Source |
|---|---|
| `nuxt.config.ts` | Hand. Layer extends + baseURL + nitro.prerender config. |
| `content.config.ts` | Hand. Zod schema for marketplace + universal + layer-queried fields. |
| `app/app.config.ts` | Hand. Site branding (title, menu, themeColor). |
| `app/app.vue` | Hand. Minimal NuxtLayout wrapper. |
| `package.json` | Hand. Pins `andy-note-nuxt` (npm) — layer's transitive deps auto-install. |
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

Vue components do NOT support "extend + add" — overriding replaces wholesale.
Forward-port layer changes manually each release, or skip the override to keep
new layer features (see "Known gaps" below for the trade-off currently chosen).

## Known gaps

- **VI namespace (/vi/**) is currently 404** — the project had a 598-line
  `ContentView.vue` override that added `@nuxtjs/i18n` awareness (strip `/vi`
  prefix, route VI paths to the `content_vi` collection, localize NuxtLink
  `:to` with `localePath()`). It was removed on the npm-layer migration so
  the project picks up the layer's new copy-as-markdown button + AI-deep-link
  dropdown (layer v0.2.0). The layer queries the `content` collection with
  the raw path including `/vi`, which never matches, so every VI route
  renders the layer's Not Found fallback. EN works fully. Re-add the
  override (and forward-port the new buttons into it) when VI matters again
  — or push i18n awareness upstream into `andy-note-nuxt` so a future
  version supports it natively.

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
3. **`vite-plugin-ai-annotator` hardcoded module** — layer's `nuxt.config.ts`
   registers `vite-plugin-ai-annotator/nuxt` as a module but lists it only in
   the layer's devDependencies, so installing `andy-note-nuxt` does NOT pull
   it in. Consumer must install it (devDep is fine) even when disabled via
   `aiAnnotator: false` — otherwise the module load fails at startup.
When the layer ships fixes, drop the workarounds from `content.config.ts`.

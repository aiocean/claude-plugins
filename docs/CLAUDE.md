# docs/ — Nuxt static-site source

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
                                          docs/content/{index.md, plugins/**}
                                                          │
                                                          ▼ nuxt generate
                                                  docs/.output/public/
                                                          │
                                                          ▼ cloudflare/wrangler-action
                                              https://claude-plugins.aiocean.dev/
```

`sync-content.py` walks the marketplace + per-plugin frontmatter and emits one
markdown file per plugin + one per skill. Output is `.gitignored` — regen
freely (`bun run sync`).

Deploy workflow: `.github/workflows/pages.yml` (workflow name "Deploy to
Cloudflare Pages") runs on every push to `main` touching `plugins/`,
`.claude-plugin/`, `docs/`, or `scripts/sync-content.py`. It builds with
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

`app.baseURL` defaults to `/` (`nuxt.config.ts:114`) because the
`claude-plugins.aiocean.dev` custom domain serves from root with no
subpath. Override via `NUXT_APP_BASE_URL=/some-prefix/ bun run generate`
only if deploying to a subpath later — the env override is kept so any
future move doesn't require a code change.

## What's hand-written vs auto-generated

| Path | Source |
|---|---|
| `nuxt.config.ts` | Hand. Layer extends + i18n + SEO `site` + branding (`runtimeConfig.public.site`, menu) + baseURL + nitro.prerender config. |
| `content.config.ts` | Hand. Zod schema for marketplace + universal + layer-queried fields (incl. `rawbody` for copy-as-markdown). |
| `app/app.vue` | Hand. Minimal NuxtLayout wrapper. |
| `app/components/content/InstallCommand.vue` | Hand. MDC install-command card with copy button. |
| `app/plugins/locale-lang.ts` | Hand. Sets `<html lang>`/`dir` per locale (i18n head). |
| `package.json` | Hand. Declares the `andy-note-nuxt` caret range; `bun.lock` pins the resolved npm release — layer's transitive deps auto-install. |
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
- **Branding / site config**: set `runtimeConfig.public.site` (title, tagline,
  themeColor, author) + `site` (SEO: name, url) in `nuxt.config.ts`; Nuxt
  deep-merges these field-by-field over the layer's defaults. (The layer ships
  no `app.config.ts` surface — Nuxt 5 removed `defineAppConfig`/`useAppConfig`.)

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
  renders the layer's Not Found fallback. EN works fully. Re-confirmed still
  404 on `andy-note-nuxt@0.15.0` — the layer remains i18n-unaware. The 93 VI
  pages prerender as HTML with a correct `<html lang="vi-VN">` (our
  `app/plugins/locale-lang.ts`) but the bodies are the Not Found fallback. Re-add
  the i18n-aware override (fork 0.15.0's `ContentView`: strip `/vi`,
  query `content_vi`, localize NuxtLink `:to` via `localePath()`) when VI matters
  again — or push i18n awareness upstream into `andy-note-nuxt` for native support.

## Known layer issues (to fix upstream)

1. **`vite-plugin-ai-annotator` hardcoded module** — the layer's `nuxt.config.ts`
   registers `vite-plugin-ai-annotator/nuxt` as a module but lists it only in
   the layer's devDependencies, so installing `andy-note-nuxt` does NOT pull
   it in. Consumer must install it (devDep is fine) even when disabled via
   `aiAnnotator: false` — otherwise the module load fails at startup.

`andy-note-nuxt@0.15.0`'s `ContentView` runs a clean 6-column generic query
(`path, title, description, document_type, updated, created`) and filters
`document_type` in JS (`!== 'convention'`, so rows without the field are kept),
so the schema no longer needs domain-specific columns or a mandatory
`document_type` on every page to survive the layer's listing query.

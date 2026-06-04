// Consumer Nuxt config — extends the andy-note-nuxt layer (brutalist-terminal
// theme + stacked-column UX + Nuxt Content wiring). Layer ships the theme,
// THIS project ships the marketplace domain (schema, branding, content).
//
// Layer is installed from npm (see package.json). Version pin lives in
// package.json — `extends` just names the package so Nuxt resolves it from
// node_modules. Bump the layer by bumping the dep version.

import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Locale-prefixed content (content/vi/**) is reachable at /vi/... via the
// theme's path-driven catch-all, but `nuxt generate` only prerenders routes it
// can crawl from `/`. Nothing in the default EN site links into the /vi/ namespace,
// so without explicit seeding those pages exist in the content DB yet never get a
// static HTML file. Enumerate every content/vi/**/*.md into a route so each VI page
// is prerendered deterministically — independent of crawl reachability, which matters
// while VI is translated note-by-note and many pages have no inbound link yet.
function enumerateLocaleRoutes(locale: string): string[] {
  const dir = resolve(import.meta.dirname ?? __dirname, 'content', locale)
  let files: string[]
  try {
    files = readdirSync(dir, { recursive: true }) as string[]
  } catch {
    return [] // locale folder absent — no routes to seed
  }
  return files
    .filter(f => f.endsWith('.md') && !f.split('/').some(seg => seg.startsWith('_')))
    .map((f) => {
      const noExt = f.replace(/\.md$/, '')
      const trimmed = noExt.replace(/\/index$/, '').replace(/^index$/, '')
      return trimmed ? `/${locale}/${trimmed}` : `/${locale}`
    })
}

const viRoutes = enumerateLocaleRoutes('vi')

export default defineNuxtConfig({
  // andy-note-nuxt@0.4.x ships `"main": "./nuxt.config.ts"`, so bare module
  // resolution works — c12 finds the layer's nuxt.config.ts via node_modules
  // lookup. (Earlier 0.2.x lacked the entry-point field and required an
  // explicit `./node_modules/andy-note-nuxt` path; bumping to 0.4.x fixes
  // that upstream.)
  extends: ['andy-note-nuxt'],

  // Array module config merges with the layer's modules (Nuxt concatenates
  // across layers), so this adds i18n on top of @nuxt/content from the theme.
  modules: ['@nuxtjs/i18n'],

  // Canonical @nuxt/content × @nuxtjs/i18n integration (per content.nuxt.com).
  // EN is the default locale and stays unprefixed at the content root; VI lives
  // under content/vi/ and is served at /vi/**. No message files — UI-string
  // translation is intentionally deferred; i18n is here for locale routing,
  // <html lang>, hreflang, and switchLocalePath(). detectBrowserLanguage is off
  // so the default (EN) is deterministic on a static host — a visitor only sees
  // VI by explicitly navigating to /vi, never via an opaque cookie redirect.
  i18n: {
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    // @nuxtjs/i18n needs baseUrl or it warns `I18n baseUrl is required to
    // generate valid SEO tag links` on every page and can't resolve absolute
    // locale URLs (switchLocalePath, og:locale). Hardcoded to the production
    // origin (same value as `site.url`). Note: hreflang alternates stay
    // intentionally OFF — see app/plugins/locale-lang.ts (`seo: false`), which
    // suppresses the per-locale alternate flood while translation is
    // incremental. Canonical is owned by seo-utils, so each page emits one.
    baseUrl: 'https://claude-plugins.aiocean.dev',
    locales: [
      { code: 'en', language: 'en-US', name: 'English' },
      { code: 'vi', language: 'vi-VN', name: 'Tiếng Việt' },
    ],
    detectBrowserLanguage: false,
  },

  // Site branding — moved here from app/app.config.ts (now deleted).
  // andy-note-nuxt ≥ 0.4 reads branding from runtimeConfig.public.site; the
  // app.config.ts / useAppConfig surface was removed upstream. Nuxt deep-merges
  // these over the layer's defaults field-by-field.
  runtimeConfig: {
    public: {
      site: {
        title: 'Claude Plugins',
        description: 'A marketplace of skills, agents, and workflows for Claude Code.',
        tagline: 'Install plugins with one command.',
        author: 'aiocean',
        themeColor: '#d4ff00',
      },
      menu: [
        { name: 'Plugins', url: '/plugins', weight: 0 },
        { name: 'Guides', url: '/guides', weight: 10 },
        { name: 'GitHub', url: 'https://github.com/aiocean/claude-plugins', weight: 99, external: true },
      ],
    },
  },

  // @nuxtjs/seo site config — andy-note-nuxt ≥ 0.6.0 ships the SEO stack
  // (sitemap, robots, og-image, schema-org, seo-utils); this supplies the one
  // per-site value it needs, the production origin. `name` drives the <title>
  // template + og:site_name, `description` the meta-description fallback.
  // Canonical + hreflang stay owned by @nuxtjs/i18n — the SEO modules defer to it,
  // so each page emits exactly one canonical.
  site: {
    url: 'https://claude-plugins.aiocean.dev',
    name: 'Claude Plugins',
    description: 'A marketplace of skills, agents, and workflows for Claude Code.',
    defaultLocale: 'en',
  },

  // Deployed to Cloudflare Pages at claude-plugins.aiocean.dev — custom
  // domain serves from root, no subpath. NUXT_APP_BASE_URL overrides
  // (kept env-driven so local file:// preview can use `/` and any future
  // subpath deploy can override without code changes).
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL ?? '/',
    // No static title/description — andy-note-nuxt ≥ 0.6.0 emits per-page SEO
    // (useSeoMeta from content frontmatter) and seo-utils supplies the
    // `%s | %siteName` title template + the site.description fallback. A static
    // title here would flow back through that template and double the site name.
  },

  // Layer wires the ai-annotator dev overlay (browser feedback to claude). It's
  // a development affordance, not a marketplace-site feature — disable on the
  // module level so it doesn't ship in the production bundle.
  // The npm package still needs to be installed so Nuxt can load the module
  // entry and read this flag; see docs/package.json devDependencies.
  aiAnnotator: false,

  // Seed the crawler with /plugins so it follows links into every plugin and
  // skill page. crawlLinks: true is the Nitro default but only finds routes
  // reachable from the initial set — without /plugins seeded, the crawler
  // sits on / and never descends.
  // viRoutes seeds /vi/** explicitly because no EN page links into VI namespace.
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/plugins', ...viRoutes],
    },
  },
})

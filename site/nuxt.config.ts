// Consumer Nuxt config — extends the andy-note-nuxt layer (brutalist-terminal
// theme + stacked-column UX + Nuxt Content wiring). Layer ships the theme,
// THIS project ships the marketplace domain (schema, branding, content).
//
// Layer ref is the GitHub HEAD — consumers always pull the latest pushed layer
// state on fresh install. Pin to a tag (`github:nguyenvanduocit/andy-note-nuxt#v0.1.0`)
// if/when the layer ships releases.

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
  extends: ['github:nguyenvanduocit/andy-note-nuxt'],

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
    locales: [
      { code: 'en', language: 'en-US', name: 'English' },
      { code: 'vi', language: 'vi-VN', name: 'Tiếng Việt' },
    ],
    detectBrowserLanguage: false,
  },

  // Deployed to Cloudflare Pages at claude-plugins.aiocean.dev — custom
  // domain serves from root, no subpath. NUXT_APP_BASE_URL overrides
  // (kept env-driven so local file:// preview can use `/` and any future
  // subpath deploy can override without code changes).
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL ?? '/',
    head: {
      title: 'Claude Plugins · aiocean',
      meta: [
        {
          name: 'description',
          content: 'Reusable skills, agents, and workflows for Claude Code. Install with one command.',
        },
      ],
    },
  },

  // Layer wires the ai-annotator dev overlay (browser feedback to claude). It's
  // a development affordance, not a marketplace-site feature — disable on the
  // module level so it doesn't ship in the production bundle.
  // The npm package still needs to be installed so Nuxt can load the module
  // entry and read this flag; see site/package.json devDependencies.
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

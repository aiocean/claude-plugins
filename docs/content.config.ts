// Schema for marketplace content. Two node types:
//   - plugin: a top-level Claude Code plugin (one folder under content/plugins/)
//   - skill:  a SKILL.md under a plugin's skills/ directory
//
// All fields are .optional() so a half-written markdown file doesn't break
// the build. The sync-content.py generator always emits the full set; manual
// edits can omit anything.

import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// Shared schema — every locale collection validates against the same fields.
const contentSchema = z.object({
  // Universal — read by the layer's ContentView. All optional, but the
  // columns MUST exist in the SQLite cache or Nuxt Content's query
  // layer crashes ("no such column"). Declare even if unused.
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  author: z.string().optional(),
  weight: z.number().optional(),

  // Layer convention — pages with `document_type: convention` are
  // excluded from auto-generated listings. We don't use it but the
  // layer's ContentView SELECTs on this column, so it must exist.
  document_type: z.string().optional(),

  // TEMPORARY WORKAROUND — andy-note-nuxt's ContentView.vue line 118
  // calls `.select(...)` with 10 PoE-domain fields (game/league/patch/
  // budget_tier/etc). The layer's own CLAUDE.md forbids domain leak
  // into layer code, so this is a layer bug to be fixed upstream
  // (extract PoE chip rendering into an opt-in layer module). Until
  // then, every column the layer SELECTs must exist in our SQLite
  // cache — declare them here as optional so the schema matches the
  // query without polluting our actual markdown frontmatter.
  // Remove once https://github.com/nguyenvanduocit/andy-note-nuxt
  // drops the PoE select.
  game: z.string().optional(),
  league: z.string().optional(),
  patch: z.string().optional(),
  budget_tier: z.string().optional(),
  build_tags: z.array(z.string()).optional(),
  ratings: z.record(z.any()).optional(),
  strategy_tier: z.string().optional(),
  profit_per_hour: z.string().optional(),
  investment_tier: z.string().optional(),

  // Marketplace-specific. document_type ("listing" / "plugin" / "skill")
  // covers what `type` used to — single source of truth aligned with
  // the layer's query.
  version: z.string().optional(),
  install: z.string().optional(),        // e.g. /plugin install aio-foo@aiocean-plugins
  plugin: z.string().optional(),          // for skills: parent plugin slug
  skills_count: z.number().optional(),    // for plugins: number of skills bundled
})

export default defineContentConfig({
  collections: {
    // Default locale (English): lives at the content root, unprefixed.
    // Exclude vi/** so VI files never leak into EN listings — the root listing
    // queries this collection with a `/%` prefix and would otherwise surface
    // /vi pages mixed into the English index.
    content: defineCollection({
      type: 'page',
      source: { include: '**', exclude: ['vi/**'] },
      schema: contentSchema,
    }),
    // Vietnamese: `prefix: ''` strips the vi/ folder so stored paths are locale-
    // neutral (content/vi/plugins/x.md → /plugins/x). The /vi URL prefix is added
    // by i18n's prefix_except_default strategy at routing time, not baked here.
    content_vi: defineCollection({
      type: 'page',
      source: { include: 'vi/**', prefix: '' },
      schema: contentSchema,
    }),
  },
})

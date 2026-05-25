// Consumer Nuxt config — extends the andy-note-nuxt layer (brutalist-terminal
// theme + stacked-column UX + Nuxt Content wiring). Layer ships the theme,
// THIS project ships the marketplace domain (schema, branding, content).
//
// Layer ref is the GitHub HEAD — consumers always pull the latest pushed layer
// state on fresh install. Pin to a tag (`github:nguyenvanduocit/andy-note-nuxt#v0.1.0`)
// if/when the layer ships releases.

export default defineNuxtConfig({
  extends: ['github:nguyenvanduocit/andy-note-nuxt'],

  // GitHub Pages serves this site at https://aiocean.github.io/claude-plugins/.
  // baseURL must match the subpath so generated asset paths resolve.
  // Override locally with `NUXT_APP_BASE_URL=/ bun dev` if the subpath in dev
  // is annoying.
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL ?? '/claude-plugins/',
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
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/plugins'],
    },
  },
})

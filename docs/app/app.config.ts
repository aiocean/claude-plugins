// Override layer's site branding + top-nav menu. Deep-merged over the layer's
// app.config.ts at runtime — only override what changes.
//
// Plain object export (no `defineAppConfig` wrapper) — under andy-note-nuxt
// @0.4.x, nitro's prerender chunk inlines the macro call verbatim instead of
// stripping it, throwing `defineAppConfig is not defined` at prerender time.
// The macro is just an identity helper in Nuxt, so the equivalent plain-
// object export Just Works and avoids the auto-import gap.

export default {
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
}

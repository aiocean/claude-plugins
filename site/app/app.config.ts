// Override layer's site branding + top-nav menu. Deep-merged over the layer's
// app.config.ts at runtime — only override what changes.

export default defineAppConfig({
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
})

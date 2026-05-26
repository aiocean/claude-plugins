# aio-design-system

**Design guidance that meets you where the work is.**

Most design advice lives in Figma files, Notion docs, or Confluence pages that developers rarely consult mid-implementation. This plugin embeds three complementary design skills directly in Claude Code — one for everyday UI decisions, one for dashboard-specific data visualization, and one for applying a bold visual identity system to existing components.

The common thread: design decisions that can be reasoned about, justified with evidence, and applied to real code — not aesthetic opinions.

## Installation

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-design-system@aiocean-plugins
```

## Skills

### aio-uiux — General UI/UX advisor

The broadest skill in the bundle. It covers the full surface of web interface design: visual hierarchy, spacing systems, color science, typography, animation principles, accessibility (WCAG 2.2), UX psychology (Fitts's Law, Hick's Law, cognitive load), responsive design, modern CSS, component patterns, and UX writing.

When triggered, it runs a semantic search over a library of 100+ curated reference topics to find the most relevant material for the specific design challenge — then applies it to your actual code or component, not the general case.

> "UI", "UX", "layout", "color", "typography", "animation", "accessibility", "a11y", "design system", "responsive", "dark mode", "WCAG", "micro-interaction", "loading state", "design tokens", "component design"

Use this when building any new component, reviewing existing UI, choosing between layout approaches, or diagnosing why something looks off.

---

### aio-dashboard-design — SaaS analytics dashboard advisor

Dashboards fail not because they lack data but because they lack decisions about what the data means. This skill applies ~60 years of data visualization research (Tufte, Cleveland-McGill, Few, Munzner, Knaflic) and real-world patterns from Stripe, Linear, Vercel, Datadog, and Plausible to help you design dashboards that communicate clearly.

The skill enforces a five-step workflow: understand audience and Big Idea, select chart types using perceptual accuracy rankings (position beats angle beats area), apply principles to specific components, synthesize a prioritized recommendation, then run a pre-mortem and accessibility sweep before shipping.

It also enforces a 20-point anti-pattern checklist. If any of these appear, the design is blocked:
- Bar/area/column chart with a truncated y-axis
- 3D chart of any kind
- Pie chart with more than 3 slices
- KPI card without a comparator phrase
- Export CSV without a metadata row
- Hero chart on an explanatory surface without an annotation

> "dashboard design", "chart selection", "dashboard review", "KPI card", "dataviz", "chart accessibility", "dashboard anti-pattern", "storytelling with data"

---

### aio-neobrutalism — Apply a neobrutalism design system

Neobrutalism is a visual style defined by thick black borders, hard drop shadows (no blur), sharp corners, vibrant solid colors, and bold typography. It reads as intentional and high-contrast rather than generic.

This skill detects your tech stack (React, Vue, Svelte, Next.js, Nuxt, Tailwind, plain CSS, shadcn/ui, etc.), generates the appropriate token format (Tailwind theme extension, CSS custom properties, or a theme object), and transforms your existing components — buttons first, then cards, inputs, and navigation — showing before and after states.

The 6 rules it enforces:
1. Thick black borders: 2-4px solid #000
2. Hard shadows: `4px 4px 0 #000` (never blur)
3. Sharp corners: 0px border-radius
4. Vibrant colors: 2-3 accent colors maximum
5. Bold typography: weights 700-900
6. No gradients: solid colors only

> "apply neobrutalism", "brutalist design", "bold borders", "hard shadows", "neobrutalism", "thick borders", "flat colors", "retro UI", "high-contrast aesthetic"

## Which skill to use

| Situation | Skill |
|---|---|
| Reviewing or building any UI component | aio-uiux |
| Choosing a chart type or reviewing a dashboard | aio-dashboard-design |
| Applying a visual identity system to existing components | aio-neobrutalism |
| "Why does this look bad?" | aio-uiux |
| "Is this chart misleading?" | aio-dashboard-design |
| "Make this look bolder and more distinctive" | aio-neobrutalism |

All three skills back their recommendations with citations — researchers, design systems, perceptual studies, or specific WCAG criteria — rather than preferences.

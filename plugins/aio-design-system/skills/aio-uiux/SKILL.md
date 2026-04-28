---
name: aio-uiux
description: |
  Web UI design and review advisor — layouts, components, color, typography, animations, accessibility, and design systems. Covers UX psychology, interaction patterns, WCAG compliance, responsive design, and modern CSS.
when_to_use: UI, UX, design, layout, color, typography, animation, accessibility, a11y, design system, responsive, dark mode, WCAG, visual hierarchy, micro-interaction, loading state, design tokens, web design, CSS, component design, interaction patterns
---

# UI/UX Design Advisor

> "Design is not just what it looks like and feels like. Design is how it works."
> — Steve Jobs

## Workflow: How to Use This Skill

When this skill is triggered, follow these steps. Do NOT just dump reference content — actively analyze the user's specific design challenge and provide targeted, actionable guidance.

### Step 1: UNDERSTAND — Identify the Design Challenge

Before selecting references, understand:
- What is being built? (component, page, full app, design system)
- What's the context? (marketing site, SaaS dashboard, mobile app, e-commerce)
- What aspect needs help? (visual design, accessibility, UX flow, performance)
- What tech stack? (vanilla CSS, Tailwind, React, Vue, etc.)
- Who are the users? (general public, power users, accessibility needs)

If the user's message already contains enough context, proceed directly to Step 2.

### Step 2: SEARCH — Find Relevant References

**First, run semantic search** with the user's design challenge to find the most relevant topics:

```bash
UX="${CLAUDE_PLUGIN_ROOT}/skills/aio-uiux/scripts"
npx tsx "$UX/search-uiux.ts" "<user's design challenge>" --top 5 --json
```

Read the full markdown file for each top result before proceeding. Then cross-reference with the routing table:

| Design Challenge | Start With |
|---|---|
| **Building a new component** | Component Patterns → Design Systems → Accessibility |
| **Making something look better** | Visual Hierarchy → Whitespace → Color → Typography |
| **Choosing colors** | Color Theory → Color Harmonies → Semantic Colors → Accessibility Contrast |
| **Typography decisions** | Type Scale → Font Pairing → Readability → Fluid Typography |
| **Layout / spacing issues** | Spacing Systems → CSS Grid → Flexbox → Content Width |
| **Form design** | Form Design → Form Accessibility → Error Messages → Validation |
| **Navigation design** | Navigation Patterns → Navigation Components → Mobile UX |
| **Accessibility audit/fix** | WCAG Guide → ARIA Patterns → Keyboard Nav → Testing Checklist |
| **Animation / transitions** | Animation Principles → Motion System → CSS Transitions → Micro-animations |
| **Performance concerns** | Perceived Performance → Core Web Vitals → Image Optimization → Font Performance |
| **Dark mode** | Theming & Dark Mode → Semantic Colors → Color Accessibility |
| **Responsive / mobile** | Mobile-First → Fluid Design → Responsive Patterns → Touch Targets |
| **Design system setup** | Design Tokens → Atomic Design → Component API → Tailwind Patterns |
| **UX flow / user behavior** | UX Psychology → UX Laws → Decision Making → Cognitive Load |
| **Writing UI text** | Microcopy → Error Messages → Voice & Tone → Conversion Copy |
| **Modern CSS techniques** | Custom Properties → Container Queries → :has() → Cascade Layers |
| **Loading / empty states** | State Management UX → Perceived Performance → Loading Patterns → Skeleton Screens |
| **Buttons / CTAs** | Buttons → Visual Hierarchy → Von Restorff Effect → Conversion Copy |

State which references you selected and why they fit.

### Step 3: APPLY — Provide Targeted Guidance

For each relevant reference area, apply it to the user's specific situation:
- State the principle or pattern (one sentence)
- Show how it applies to their specific case
- Provide concrete code (CSS/HTML) when applicable
- Flag any accessibility requirements

### Step 4: SYNTHESIZE — Combine Into Actionable Advice

Merge insights into:
- Specific implementation recommendation with code
- Priority order (what to fix/implement first)
- Key tradeoffs to consider
- Accessibility checklist for the specific case

### Step 5: REVIEW — Check Against Quality Criteria

Verify the recommendation against:
- [ ] Visual hierarchy is clear (squint test)
- [ ] Spacing is consistent (uses system, not arbitrary values)
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Interactive elements have all states (hover, focus, active, disabled)
- [ ] Touch targets are ≥44×44px on mobile
- [ ] Animations respect prefers-reduced-motion
- [ ] Text is readable (45-75 char line length, 1.4-1.6 line-height)
- [ ] Component is keyboard navigable

---

## Scripts

Before calling any script, resolve the scripts directory (version may vary):
```bash
UX="${CLAUDE_PLUGIN_ROOT}/skills/aio-uiux/scripts"
```

### List Topics
```bash
$UX/list-topics.sh                          # All topics by category
$UX/list-topics.sh --category accessibility  # Filter by category
$UX/list-topics.sh --search "color"          # Search by keyword
$UX/list-topics.sh --count                   # Quick count
```

### Semantic Search

Find relevant topics by meaning, not just keywords. Uses pre-computed embeddings (snowflake-arctic-embed-xs, 384-dim, runs locally).

```bash
npx tsx "$UX/search-uiux.ts" "how to design accessible forms"
npx tsx "$UX/search-uiux.ts" "dark mode color palette" --top 3
npx tsx "$UX/search-uiux.ts" "button component best practices" --json
```

Options:
- `--top N` — Number of results (default: 5)
- `--json` — Output as JSON for programmatic use

---

## Important

**Always run semantic search first before selecting references.** The search uses embeddings to find the most relevant topics for the user's specific design challenge — this is more reliable than guessing from the catalog. After searching, read the full markdown file for each selected topic.

---

## Reference Catalog

### 01. Visual Design Foundations
_Core principles of visual communication and composition_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Gestalt Principles](./references/01-visual-design/01-gestalt-principles.md) | How humans perceive visual groups | Organizing UI elements, creating clear relationships |
| [Visual Hierarchy](./references/01-visual-design/02-visual-hierarchy.md) | Guide the eye through importance | Every layout — primary, secondary, tertiary emphasis |
| [Golden Ratio & Composition](./references/01-visual-design/03-golden-ratio-composition.md) | Mathematical harmony in layout | Hero sections, image cropping, layout proportions |
| [Whitespace & Negative Space](./references/01-visual-design/04-whitespace-negative-space.md) | Space as a design element | Feeling cramped, improving readability, luxury feel |
| [Visual Weight & Balance](./references/01-visual-design/05-visual-weight-balance.md) | How elements attract attention | Balancing asymmetric layouts, focal points |
| [Contrast & Emphasis](./references/01-visual-design/06-contrast-emphasis.md) | Difference creates focus | CTAs, important information, visual interest |
| [Alignment & Grids](./references/01-visual-design/07-alignment-grids.md) | Order through alignment | Any layout — grids, optical alignment, consistency |

---

### 02. Typography
_Type systems, font pairing, and text rendering_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Type Scale Systems](./references/02-typography/01-type-scale-systems.md) | Mathematical size progression | Setting up heading/body sizes |
| [Font Pairing](./references/02-typography/02-font-pairing.md) | Combining typefaces harmoniously | Choosing fonts for a project |
| [Vertical Rhythm](./references/02-typography/03-vertical-rhythm.md) | Consistent spacing rhythm | Page-level text layout |
| [Fluid Responsive Typography](./references/02-typography/04-fluid-responsive-typography.md) | Type that scales with viewport | Responsive text without breakpoints |
| [Readability & Legibility](./references/02-typography/05-readability-legibility.md) | Optimal reading experience | Body text, long-form content |
| [OpenType & Variable Fonts](./references/02-typography/06-opentype-variable-fonts.md) | Advanced font features | Performance, design polish |
| [Web Font Loading](./references/02-typography/07-web-font-loading.md) | Fast font delivery | Performance optimization, CLS prevention |

---

### 03. Color Science
_Color theory, spaces, palettes, and accessibility_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Color Theory Fundamentals](./references/03-color-science/01-color-theory-fundamentals.md) | Color meaning and emotion | Choosing brand/UI colors |
| [Color Harmonies](./references/03-color-science/02-color-harmonies.md) | Complementary, analogous, triadic | Building color palettes |
| [Color Spaces & Modern CSS](./references/03-color-science/03-color-spaces-modern-css.md) | oklch, Display P3, color-mix() | Modern CSS color implementation |
| [Systematic Palette Generation](./references/03-color-science/04-systematic-palette-generation.md) | Building 50-950 shade scales | Design system color setup |
| [Semantic Color Systems](./references/03-color-science/05-semantic-color-systems.md) | Primitive → semantic → component | Color token architecture |
| [Color Accessibility & Contrast](./references/03-color-science/06-color-accessibility-contrast.md) | WCAG, APCA, color blindness | Every color decision |
| [Data Visualization Colors](./references/03-color-science/07-data-visualization-colors.md) | Sequential, diverging, qualitative | Charts, graphs, dashboards |

---

### 04. Layout & Spacing
_Grid systems, spacing tokens, and responsive layout_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Spacing Systems](./references/04-layout-spacing/01-spacing-systems.md) | 4pt/8pt grid, spacing tokens | Every layout decision |
| [CSS Grid Mastery](./references/04-layout-spacing/02-css-grid-mastery.md) | Two-dimensional layout | Page layouts, dashboards, galleries |
| [Flexbox Patterns](./references/04-layout-spacing/03-flexbox-patterns.md) | One-dimensional layout | Component-level layout, alignment |
| [Responsive Layout Strategies](./references/04-layout-spacing/04-responsive-layout-strategies.md) | Adapting to screen sizes | Every responsive design |
| [Z-Index & Layering](./references/04-layout-spacing/05-z-index-layering.md) | Stacking context management | Modals, dropdowns, tooltips, toasts |
| [Box Model & Sizing](./references/04-layout-spacing/06-box-model-sizing.md) | Box-sizing, margins, logical props | Layout debugging, i18n |
| [Content Width & Containers](./references/04-layout-spacing/07-content-width-containers.md) | Max-width, container patterns | Readable content, full-bleed layouts |

---

### 05. Accessibility (a11y)
_WCAG 2.2, ARIA, keyboard navigation, screen readers_

| Topic | Core Idea | When to Use |
|---|---|---|
| [WCAG 2.2 Essential Guide](./references/05-accessibility/01-wcag-22-essential-guide.md) | Web accessibility guidelines | Every project — baseline requirements |
| [ARIA Patterns Reference](./references/05-accessibility/02-aria-patterns-reference.md) | Widget roles and states | Custom interactive components |
| [Keyboard Navigation](./references/05-accessibility/03-keyboard-navigation.md) | Tab order, focus management | Every interactive element |
| [Screen Reader Optimization](./references/05-accessibility/04-screen-reader-optimization.md) | Semantic HTML, live regions | Dynamic content, SPAs |
| [Color & Motion Accessibility](./references/05-accessibility/05-color-motion-accessibility.md) | Contrast, reduced-motion | Color decisions, animations |
| [Form Accessibility](./references/05-accessibility/06-form-accessibility.md) | Labels, errors, validation | Every form |
| [Testing Checklist](./references/05-accessibility/07-testing-checklist.md) | Automated + manual testing | Pre-launch, code review |

---

### 06. UX Psychology
_Cognitive psychology and behavioral design for interfaces_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Cognitive Load](./references/06-ux-psychology/01-cognitive-load.md) | Reduce mental effort | Complex interfaces, forms, onboarding |
| [Attention & Perception](./references/06-ux-psychology/02-attention-perception.md) | How users scan and notice | CTA placement, important info display |
| [Decision Making](./references/06-ux-psychology/03-decision-making.md) | Choice architecture | Options, pricing, configuration |
| [Persuasion & Influence](./references/06-ux-psychology/04-persuasion-influence.md) | Ethical persuasion patterns | Landing pages, conversions, trust |
| [Emotional Design](./references/06-ux-psychology/05-emotional-design.md) | Visceral, behavioral, reflective | Brand experience, delight, trust |
| [Habit Formation](./references/06-ux-psychology/06-habit-formation.md) | Hook model, engagement loops | Product engagement, onboarding |
| [Memory & Learning](./references/06-ux-psychology/07-memory-learning.md) | Recognition, recall, mental models | Navigation, onboarding, help |

---

### 07. UX Laws
_30+ evidence-based laws for interface design_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Fitts's Law](./references/07-ux-laws/01-fitts-law.md) | Target size × distance = time | Button sizing, touch targets, CTA placement |
| [Hick's Law](./references/07-ux-laws/02-hicks-law.md) | More choices = slower decisions | Menu design, option reduction |
| [Jakob's Law](./references/07-ux-laws/03-jakobs-law.md) | Users prefer familiar patterns | Convention decisions, innovation risk |
| [Miller's Law](./references/07-ux-laws/04-millers-law.md) | 7±2 chunks in working memory | Navigation, grouping, information architecture |
| [Tesler's Law](./references/07-ux-laws/05-teslers-law.md) | Complexity can't be removed | Smart defaults, progressive disclosure |
| [Doherty Threshold](./references/07-ux-laws/06-doherty-threshold.md) | 400ms for flow state | Loading optimization, perceived performance |
| [Aesthetic-Usability](./references/07-ux-laws/07-aesthetic-usability.md) | Beautiful = perceived usable | Visual polish investment |
| [Von Restorff Effect](./references/07-ux-laws/08-von-restorff-effect.md) | Distinctive items remembered | CTAs, badges, highlights |
| [Peak-End Rule](./references/07-ux-laws/09-peak-end-rule.md) | Peaks and endings matter most | Onboarding, checkout, error recovery |
| [Serial Position Effect](./references/07-ux-laws/10-serial-position-effect.md) | First/last items remembered | Navigation order, list design |
| [Goal-Gradient Effect](./references/07-ux-laws/11-goal-gradient-effect.md) | Acceleration near completion | Progress bars, multi-step flows |
| [More UX Laws](./references/07-ux-laws/12-more-ux-laws.md) | Postel's, Weber-Fechner, Prägnanz, + more | Comprehensive reference |

---

### 08. Interaction Design
_Forms, navigation, states, and user flows_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Form Design](./references/08-interaction-design/01-form-design.md) | Input types, validation, flow | Building any form |
| [Navigation Patterns](./references/08-interaction-design/02-navigation-patterns.md) | Navbar, sidebar, tabs, breadcrumbs | Information architecture |
| [State Management UX](./references/08-interaction-design/03-state-management-ux.md) | Loading, empty, error, success | Every interactive component |
| [Micro-interactions](./references/08-interaction-design/04-micro-interactions.md) | Trigger, rule, feedback, loop | Adding polish, user feedback |
| [Feedback Patterns](./references/08-interaction-design/05-feedback-patterns.md) | Toasts, alerts, progress, undo | System-to-user communication |
| [Search, Filter & Sort](./references/08-interaction-design/06-search-filter-sort.md) | Search input, facets, results | Data-heavy interfaces |
| [Drag, Drop & Gestures](./references/08-interaction-design/07-drag-drop-gestures.md) | Drag handles, touch gestures | Sortable lists, kanban, mobile |

---

### 09. Motion & Animation
_Animation principles, CSS transitions, scroll-driven effects_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Animation Principles](./references/09-motion-animation/01-animation-principles.md) | Disney's 12 principles for UI | Understanding "why" behind motion |
| [Motion Design System](./references/09-motion-animation/02-motion-design-system.md) | Duration/easing token system | Setting up consistent motion |
| [CSS Transitions](./references/09-motion-animation/03-css-transitions.md) | Property transitions, 60fps | Hover, focus, state changes |
| [CSS Keyframe Animations](./references/09-motion-animation/04-css-keyframe-animations.md) | @keyframes, multi-step | Enter/exit, loading, attention |
| [Scroll-Driven Animations](./references/09-motion-animation/05-scroll-driven-animations.md) | Scroll progress, reveal on scroll | Landing pages, storytelling |
| [Page & View Transitions](./references/09-motion-animation/06-page-view-transitions.md) | View Transitions API | Route changes, shared elements |
| [Micro-Animation Library](./references/09-motion-animation/07-micro-animation-library.md) | 25+ copy-paste CSS animations | Quick implementation reference |

---

### 10. Component Patterns
_Design patterns for UI components_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Buttons](./references/10-component-patterns/01-buttons.md) | Hierarchy, states, sizing | Every interactive UI |
| [Forms & Inputs](./references/10-component-patterns/02-forms-inputs.md) | Input types, states, validation | Building forms |
| [Cards & Containers](./references/10-component-patterns/03-cards-containers.md) | Card anatomy, grid layouts | Content display |
| [Modals, Dialogs & Sheets](./references/10-component-patterns/04-modals-dialogs-sheets.md) | When to use which overlay | Confirmations, forms, settings |
| [Tables & Data Display](./references/10-component-patterns/05-tables-data-display.md) | Sorting, filtering, responsive | Data-heavy interfaces |
| [Navigation Components](./references/10-component-patterns/06-navigation-components.md) | Navbar, sidebar, tabs, breadcrumbs | App chrome, wayfinding |
| [Feedback Components](./references/10-component-patterns/07-feedback-components.md) | Toasts, alerts, badges, progress | System feedback |
| [Complex Components](./references/10-component-patterns/08-complex-components.md) | Command palette, data grid, tree | Advanced interfaces |

---

### 11. Design Systems
_Tokens, atomic design, theming, and popular systems_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Design Token Architecture](./references/11-design-systems/01-design-token-architecture.md) | Primitive → semantic → component | Setting up any design system |
| [Atomic Design](./references/11-design-systems/02-atomic-design.md) | Atoms, molecules, organisms | Component organization |
| [Component API Design](./references/11-design-systems/03-component-api-design.md) | Props, variants, composition | Building reusable components |
| [Popular Systems Analysis](./references/11-design-systems/04-popular-systems-analysis.md) | Material, Apple, Fluent, shadcn | Learning from the best |
| [Theming & Dark Mode](./references/11-design-systems/05-theming-dark-mode.md) | CSS custom properties, themes | Dark mode, multi-theme |
| [Design System Checklist](./references/11-design-systems/06-design-system-checklist.md) | Everything a system needs | Starting or auditing a system |
| [Tailwind Design Patterns](./references/11-design-systems/07-tailwind-design-patterns.md) | cva, tailwind-merge, config | Tailwind-based projects |

---

### 12. UX Writing
_Microcopy, content design, and inclusive language_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Microcopy Patterns](./references/12-ux-writing/01-microcopy-patterns.md) | Button labels, errors, empty states | Writing any UI text |
| [Voice & Tone Guidelines](./references/12-ux-writing/02-voice-tone-guidelines.md) | Consistent brand voice | Establishing content guidelines |
| [Error Messages](./references/12-ux-writing/03-error-messages.md) | What + why + how to fix | Error handling copy |
| [Onboarding Copy](./references/12-ux-writing/04-onboarding-copy.md) | Welcome, tours, progressive | First-run experience |
| [Conversion Copy](./references/12-ux-writing/05-conversion-copy.md) | CTAs, headlines, social proof | Landing pages, signup flows |
| [Inclusive Writing](./references/12-ux-writing/06-inclusive-writing.md) | Gender-neutral, plain language | All user-facing text |

---

### 13. Performance UX
_Perceived performance, Core Web Vitals, optimization_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Perceived Performance](./references/13-performance-ux/01-perceived-performance.md) | Psychology of waiting | Making things feel fast |
| [Core Web Vitals](./references/13-performance-ux/02-core-web-vitals.md) | LCP, INP, CLS | Performance auditing |
| [Image Optimization](./references/13-performance-ux/03-image-optimization.md) | Formats, responsive, lazy | Every image implementation |
| [Font Performance](./references/13-performance-ux/04-font-performance.md) | font-display, preload, subset | Web font optimization |
| [Critical Rendering Path](./references/13-performance-ux/05-critical-rendering-path.md) | Above-the-fold, CSS containment | Page load optimization |
| [Loading Patterns Library](./references/13-performance-ux/06-loading-patterns-library.md) | Skeleton, spinner, progress CSS | Copy-paste loading patterns |

---

### 14. Modern CSS
_Custom properties, container queries, :has(), cascade layers_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Custom Properties Architecture](./references/14-modern-css/01-custom-properties-architecture.md) | CSS token system design | Any CSS architecture |
| [Container Queries](./references/14-modern-css/02-container-queries.md) | Component-level responsiveness | Self-contained components |
| [:has() Selector Patterns](./references/14-modern-css/03-has-selector-patterns.md) | Parent selector, state-based | Advanced styling without JS |
| [Cascade Layers](./references/14-modern-css/04-cascade-layers.md) | @layer for specificity control | Managing CSS specificity |
| [Modern Layout Techniques](./references/14-modern-css/05-modern-layout-techniques.md) | Subgrid, nesting, logical props | Cutting-edge layout |
| [Color Functions](./references/14-modern-css/06-color-functions.md) | oklch, color-mix, light-dark() | Modern color implementation |
| [Scroll Snap & Popover](./references/14-modern-css/07-scroll-snap-popover.md) | Scroll snap, popover, dialog | Native browser patterns |

---

### 15. Responsive Design
_Mobile-first, fluid design, touch targets_

| Topic | Core Idea | When to Use |
|---|---|---|
| [Mobile-First Strategy](./references/15-responsive-design/01-mobile-first-strategy.md) | Progressive enhancement | Starting any responsive project |
| [Breakpoint System](./references/15-responsive-design/02-breakpoint-system.md) | Content-based breakpoints | Defining responsive breakpoints |
| [Fluid Design](./references/15-responsive-design/03-fluid-design.md) | clamp(), no-breakpoint layouts | Truly fluid interfaces |
| [Responsive Patterns](./references/15-responsive-design/04-responsive-patterns.md) | Stack, sidebar, grid, table | Common responsive transformations |
| [Touch Targets & Mobile UX](./references/15-responsive-design/05-touch-targets-mobile-ux.md) | 44px minimum, thumb zones | Mobile-specific design |
| [Responsive Images](./references/15-responsive-design/06-responsive-images.md) | srcset, picture, art direction | Image delivery optimization |
| [Print Stylesheets](./references/15-responsive-design/07-print-stylesheets.md) | @media print, page breaks | Print-friendly pages |

---

## Quick Reference Card

### The 10 Most Impactful Design Decisions

1. **Visual Hierarchy** — Guide the eye: size, color, weight, space
2. **Spacing System** — Use 8pt grid, consistent tokens, generous whitespace
3. **Color Contrast** — WCAG AA minimum: 4.5:1 text, 3:1 UI components
4. **Typography** — Max 2 fonts, clear type scale, 45-75 char line length
5. **Component States** — Every element needs: hover, focus, active, disabled, loading, error
6. **Touch Targets** — Minimum 44×44px, use full clickable area
7. **Loading States** — Skeleton screens > spinners > nothing
8. **Error Handling** — What happened + why + how to fix
9. **Keyboard Navigation** — Tab order, focus visible, escape to dismiss
10. **Motion** — 200-300ms transitions, ease-out for enters, respect prefers-reduced-motion

### Design Review Checklist

Before shipping any UI, verify:

- [ ] Visual hierarchy is clear (squint test passes)
- [ ] Spacing uses system tokens, not arbitrary values
- [ ] Color contrast meets WCAG AA (test with browser devtools)
- [ ] All interactive elements have hover, focus, active, and disabled states
- [ ] Touch targets are at least 44×44px
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Text line length is 45-75 characters
- [ ] Forms have visible labels, clear errors, proper autocomplete
- [ ] Empty states, loading states, and error states are designed
- [ ] Page is navigable with keyboard only
- [ ] Screen reader announces dynamic changes (aria-live)
- [ ] Images have meaningful alt text (or alt="" for decorative)

---

## Sources & Further Reading

- [Refactoring UI](https://www.refactoringui.com/) — Steve Schoger & Adam Wathan
- [Laws of UX](https://lawsofux.com/) — Jon Yablonski
- [Inclusive Components](https://inclusive-components.design/) — Heydon Pickering
- [Every Layout](https://every-layout.dev/) — Andy Bell & Heydon Pickering
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — W3C
- [Material Design 3](https://m3.material.io/) — Google
- [Human Interface Guidelines](https://developer.apple.com/design/) — Apple
- [A11y Project](https://www.a11yproject.com/) — Community
- [web.dev](https://web.dev/) — Google (performance, CSS, accessibility)
- [Don't Make Me Think](https://sensible.com/dont-make-me-think/) — Steve Krug
- [The Design of Everyday Things](https://www.nngroup.com/) — Don Norman
- [100 Things Every Designer Needs to Know About People](https://www.susanweinschenk.com/) — Susan Weinschenk

---

_"Good design is obvious. Great design is transparent."_
— Joe Sparano

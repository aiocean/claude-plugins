# Jakob's Law: The Power of Familiar Patterns

## Definition

Jakob's Law states that users spend most of their time on other websites and apps, so they prefer interfaces that work the same way as those they already know.

**Attributed to:** Jakob Nielsen, co-founder of Nielsen Norman Group, formalized in 2000.

The core insight: when a user first encounters your interface, they don't come empty-handed. They arrive with mental models built from every other digital product they've ever used. Your design either works with those models (reducing learning cost) or against them (introducing friction).

---

## The Science Behind It

### Mental Models

A mental model is an internal representation of how something works. Users form mental models through:
- **Direct experience** with similar products
- **Transfer** from analogous physical objects (e-commerce cart from shopping cart)
- **Instruction** (reading documentation, onboarding)
- **Inference** from visible affordances

Mental models don't need to be accurate — they just need to be predictive enough to guide action. A user who believes a computer "runs faster when restarted" has a wrong model but a useful one.

**When interface matches mental model:** Action → Expected outcome. Flow state maintained.
**When interface violates mental model:** Action → Unexpected outcome → Confusion → Recovery cost.

### Transfer of Learning

Cognitive psychology distinguishes:
- **Positive transfer:** Prior learning helps new learning (QWERTY skills transfer between keyboards)
- **Negative transfer:** Prior learning hinders new learning (driving on opposite side of road)
- **Zero transfer:** Prior learning is irrelevant

Jakob's Law is a recommendation to maximize positive transfer. By following conventions, you let users import their existing skill set directly.

### The Cost of Innovation

Every departure from convention is a forced retraining. The cost is paid in:
1. **Time:** Learning the new interaction
2. **Errors:** Making mistakes before the new behavior is learned
3. **Frustration:** The emotional cost of feeling stupid or lost
4. **Support:** Users who can't learn escalate to help channels

These costs compound across your user base: (learning time per user) × (number of users).

---

## UI/UX Applications

### 1. Respect Established Web Conventions

These patterns are so universal that violating them creates immediate confusion. They are not "best practices" — they are cognitive contracts.

**Navigation:**
- Logo in top-left corner links to home
- Primary navigation horizontal at top (desktop) or hamburger/bottom bar (mobile)
- Breadcrumbs read left-to-right from home to current
- Search field in top-right or top-center
- Footer contains legal, contact, secondary links

**Interaction:**
- Blue/underlined text is a hyperlink
- Clicking a logo returns to home
- Red = danger/delete/error
- Green = success/confirm/safe
- Gray = disabled/inactive
- Strikethrough = deleted/unavailable

**Forms:**
- Required fields marked with asterisk (*)
- Error messages appear near the field that caused them, in red
- Submit button is primary, Cancel is secondary
- Tab order follows visual flow (top-left to bottom-right)

**E-commerce:**
- Shopping cart in top-right
- "Add to Cart" button on product pages
- Checkout as a multi-step process
- Order confirmation via email

```css
/* Follow the convention: links look like links */
a {
  color: #0066cc;           /* Users expect blue */
  text-decoration: underline; /* Users expect underline */
}

/* Even if you update the color, maintain distinction */
a {
  color: var(--color-link);   /* Brand color */
  text-decoration: underline; /* Keep the underline signal */
}

/* DON'T style non-links to look like links */
.fake-button-styled-like-link {
  color: blue;
  text-decoration: underline;
  cursor: pointer;
  /* This breaks Jakob's Law — users expect navigation, get action */
}
```

### 2. Platform Conventions

Beyond web conventions, each platform has its own vocabulary. Users of iOS expect iOS patterns; Android users expect Material Design conventions. Violating these feels "wrong" even when users can't articulate why.

**iOS conventions:**
- Navigation: back arrow top-left, action buttons top-right
- Bottom tab bar for main sections (5 items max)
- Swipe right to go back
- Swipe left on list item to reveal delete
- Pull to refresh
- Long press for contextual actions
- System share sheet for sharing

**Android/Material conventions:**
- Back navigation: hardware or gesture-based
- Bottom navigation bar (3–5 items)
- Floating action button (FAB) for primary action
- Snackbar for transient messages (not alerts)
- Navigation drawer for secondary navigation

**Desktop conventions:**
- Keyboard shortcuts: Ctrl/Cmd+C copy, +V paste, +Z undo, +S save
- Right-click for contextual menu
- Double-click to open/edit
- Drag to rearrange
- Window chrome: minimize/maximize/close in consistent position

### 3. Industry-Specific Conventions

Beyond general web patterns, specific domains have developed their own conventions. Users of your product type have built models from competing products.

**Dashboard/Analytics:**
- KPI cards at top, charts below
- Filter controls above data tables
- Date range picker in top-right
- Export button near data it exports

**SaaS settings:**
- Sidebar with category list, content area on right
- "Save Changes" or auto-save with indicator
- Danger zone section at bottom for destructive actions

**Email clients:**
- Three-pane layout (folders | list | preview)
- Compose button prominent, top of folders or floating
- Unread = bold, read = normal weight

**Maps:**
- Plus/minus zoom, or pinch gesture
- Current location button (crosshair icon)
- Tap to pin, long-press for more options

---

## When to Break Conventions

Jakob's Law is not an argument for stagnation. Conventions evolve — the pull-to-refresh gesture was once novel, now universal. There are legitimate reasons to deviate:

### Valid Reasons to Innovate

**1. Your domain has no convention yet**
Emerging product categories lack established patterns. AR/VR interfaces, voice UIs, and novel hardware interactions are being defined now — there's no convention to follow.

**2. The existing convention is genuinely broken**
The floppy disk save icon persists even though most users have never used a floppy disk. When a convention has lost its meaning for your users, replacing it can be correct — but do it with a clear affordance and good onboarding.

**3. Your differentiation depends on interaction**
Duolingo's gamified learning UI broke language-learning conventions intentionally. The unusual interaction model is part of the brand and value proposition.

**4. The convention imposes accessibility barriers**
Sometimes "what everyone else does" is wrong. Custom select dropdowns that are keyboard-inaccessible are conventional but harmful. Breaking the visual convention to improve the accessible implementation is correct.

### How to Break Conventions Safely

- **Onboard explicitly.** If you've invented a new gesture or pattern, teach it. Don't rely on discovery.
- **Test early.** Usability testing catches "but I expected it to work like..." feedback before launch.
- **Provide fallbacks.** New interaction plus familiar alternative during the transition period.
- **Monitor.** Track task success rates, error rates, support tickets for the novel area.

---

## Concrete Examples

### Good: Notion's editor conventions
Despite being a novel tool, Notion's slash command (/) for inserting blocks followed no prior convention — but it onboards clearly, and the rest of the editor respects markdown and Google Docs habits.

### Good: Stripe Dashboard
Follows SaaS dashboard conventions precisely. Sidebar navigation, data tables with filters, inline editing. New users from other SaaS tools are immediately oriented.

### Bad: Hamburger menu on desktop
Mobile hamburger menu convention adopted on desktop where a horizontal navigation bar is expected. Users have to discover that the three lines mean "menu" — it's not intuitive on a platform where the real estate for a nav bar exists.

### Bad: Custom video player controls
A custom HTML5 video player that hides the standard scrubber and replaces it with a drag-based timeline. The 0.1% differentiation is not worth the re-learning cost for 100% of users.

### Bad: Shopping cart in top-left
Users have an iron-clad expectation that the cart is top-right. Moving it anywhere else causes users to look for it where it isn't — even if your placement is logically justified.

### Good: macOS Dark Mode toggle
Placed in System Preferences > General > Appearance, exactly where macOS users expect appearance settings. No need to discover it.

---

## Mental Model Mapping Table

| User Expects | Convention Source | Application |
|---|---|---|
| Logo → Home | All major websites since ~2000 | Always make logo clickable to home |
| Underline = link | Web 1.0 convention | Don't style non-links with underline |
| Red = error | Traffic lights, danger signals | Use red for validation errors |
| Asterisk = required | Paper forms | Mark required fields with `*` |
| Top-right = cart | Amazon, et al. | Place cart icon top-right |
| Swipe right = back | iOS navigation | Implement for mobile web too |
| Pull down = refresh | iOS/Twitter convention (2009) | Implement for list-based views |
| Infinite scroll | Twitter, Facebook | In feeds, not in search results |

---

## The Convention Spectrum

```
Fully Conventional          Partially Novel          Fully Novel
       |__________________________|__________________________|

   Low learning cost            Medium               High learning cost
   Low differentiation                               High differentiation

Best for:                    Best for:            Best for:
- Core navigation            - Secondary UX       - Core value proposition
- Forms                      - Micro-interactions - New product category
- Error handling             - Visual style        - Intentional brand break
```

---

## Anti-Patterns

| Anti-Pattern | Jakob's Law Violation | Fix |
|---|---|---|
| Custom scrollbar that doesn't behave like a scrollbar | Breaks scrolling mental model | Use standard scrollbar or CSS-only styling |
| Accordion that requires double-click to expand | Users expect single click | Use single click for all toggle interactions |
| "Logout" hidden under profile icon with no label | Breaks finding patterns | Show "Sign Out" in dropdown from avatar |
| Drag-to-confirm instead of button | Novel interaction with no affordance | Use standard button; drag for optional power feature |
| Right-click disabled "for security" | Breaks browser/OS convention | Never disable browser defaults without strong reason |

---

## Key Takeaways

1. **Users import their mental models.** Every other app they've used has shaped their expectations of yours.
2. **Conventions reduce the learning tax.** Following them is not laziness — it's respecting your users' time.
3. **Innovation has a real cost.** Measure the benefit of novelty against the friction of relearning.
4. **Platform conventions are promises.** iOS users expect swipe-back; breaking it feels like a bug.
5. **Break conventions deliberately and with onboarding.** If you must innovate in interaction, teach the new pattern explicitly.
6. **Test assumptions.** What seems like "obvious convention" in your office may be unknown to your target users.

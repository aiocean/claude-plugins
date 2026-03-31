# More UX Laws: Comprehensive Reference

## Postel's Law (Robustness Principle)

**"Be liberal in what you accept, and conservative in what you output."**

Originally a principle for TCP/IP implementations by Jon Postel, it translates directly to UI design.

### In Forms and Input

Accept messy, inconsistent input and normalize it silently:

- Phone numbers: accept `(555) 123-4567`, `555-123-4567`, `5551234567`, `+1 555 123 4567` — store as `+15551234567`
- Dates: accept `3/5/25`, `March 5`, `05-03-2025` — store as ISO 8601
- Email: trim whitespace, lowercase automatically — never reject `User@Example.COM `
- Credit cards: accept with or without spaces/dashes

**Conservative in output:** Display data in a consistent, clean, predictable format regardless of how it was entered.

### In Error Handling

Don't fail loudly on recoverable edge cases. If a user submits a form with a minor issue (trailing space in email, mismatched password confirmation), fix what can be fixed and guide what cannot — don't surface a wall of error messages.

### Application Pattern

```
Input layer:  Accept wide range → normalize → validate
Storage:      Canonical, consistent format
Output:       Clean, formatted, predictable display
```

---

## Weber-Fechner Law

**The perception of change is relative to the initial magnitude.**

The just-noticeable difference (JND) between two stimuli is a constant proportion of the original stimulus, not a constant absolute amount.

### In Typography

A 1px increase from 12px to 13px is noticeable. A 1px increase from 48px to 49px is not. Type scales should grow by ratio (1.25×, 1.333×, 1.5×), not by constant increments.

```
Modular scale (1.25 ratio):
12 → 15 → 19 → 24 → 30 → 38 → 48
```

### In Spacing

A 4px increase from 4px to 8px is a 100% change — very perceptible. A 4px increase from 32px to 36px is an 12.5% change — barely visible. Use exponential spacing scales, not linear ones.

### In Color and Brightness

Humans perceive brightness logarithmically. A color palette with perceptually equal steps must use non-linear lightness increments in absolute terms. OKLCH's L axis is designed to be perceptually uniform; HSL's L axis is not.

### In Animation Duration

A 100ms reduction from 200ms to 100ms is dramatic. The same 100ms reduction from 600ms to 500ms is barely noticeable. Optimize animation duration from the bottom up.

---

## Law of Prägnanz (Good Form)

**People perceive ambiguous or complex images as the simplest possible form.**

The mind resolves visual ambiguity toward the interpretation requiring the least cognitive effort.

### Implications

**Simplify ruthlessly.** Complex layouts are resolved to simple ones in perception — if you don't control the simplification, the user does, and they may simplify away detail you intended them to see.

**Alignment creates implied structure.** Elements that share an edge are perceived as related even without a visible border. Misaligned elements disrupt the perceived simplicity of a layout.

**Closure.** Users complete incomplete shapes. A circle with a 10% gap is still perceived as a circle. Use this for progress rings, icon design, and logo construction.

**Symmetry bias.** Symmetric layouts are perceived as simpler and more organized than asymmetric ones, even when they contain the same information. Reserve asymmetry for emphasis.

### In Icon Design

The simplest recognizable form of a concept is always preferable to a detailed illustration. A trash can icon works at 16px because it resolves to its simplest form. A detailed photorealistic trash can does not.

---

## Zeigarnik Effect

**Incomplete tasks are remembered better than completed ones.**

Bluma Zeigarnik (1927) found that waiters could recall unpaid orders in detail but forgot paid ones almost immediately. The open "loop" of an unfinished task keeps it active in working memory.

### Applications

**Progress indicators keep tasks alive.** A half-filled progress bar creates cognitive tension that motivates return. "Your profile is 60% complete" is an open loop.

**Cliffhangers in onboarding.** End an onboarding session mid-flow with explicit indication of what comes next: "You're almost set up — finish adding your team tomorrow." The incomplete state increases return rate.

**Notification dots.** The unread badge is a Zeigarnik trigger — an open loop that demands closure. Use responsibly; badge fatigue sets in quickly when everything carries a notification.

**Save drafts.** Email clients, document editors, and form builders that auto-save and show "Draft saved" create a Zeigarnik loop — the draft exists as an incomplete task that invites completion.

### Warning

The Zeigarnik Effect can cause anxiety when overused. Too many open loops (excessive notifications, unresolvable badges, endless incomplete state indicators) create cognitive load and stress rather than motivation.

---

## Parkinson's Law

**Work expands to fill the time available for its completion.**

### In UX: Decision Time Expands to Fill Available Complexity

The more options presented, the more time a user will spend deciding — regardless of how simple each option is individually. (This overlaps with Hick's Law.)

### Application: Constrain the Frame

- Limit time-based inputs: "Pick a date in the next 30 days" rather than any date
- Pre-select defaults that fit 80% of users — they will accept rather than explore
- Remove options that serve fewer than 5% of users from the primary flow (put them in advanced settings)
- Set concrete deadlines in CTAs: "Offer ends Sunday" — an open-ended offer invites indefinite deferral

### In Project/Task Management UI

Task lists with no due dates expand indefinitely. UI that enforces or strongly encourages deadlines (default due date to tomorrow, highlight overdue tasks) counteracts Parkinson's Law in the user's workflow.

---

## Occam's Razor in UX

**Among competing explanations, the simplest is usually correct. Among competing designs, the simplest is usually better.**

### Do Not Add Until You Cannot Subtract

Before adding a new feature, control, or element, ask: can the existing design handle this use case without addition? Before shipping, ask: what can be removed without reducing capability?

### Signs of Occam's Razor Violation

- Settings panels with 40+ options
- Forms that ask for information not used downstream
- Navigation with more than 7 primary items
- Tooltip text that exceeds 50 words
- Modals that contain other modals
- Loading states for data that could be cached

### Application

When two designs solve the same problem, choose the one with fewer elements, fewer states, fewer interactions, and fewer words. Complexity is a cost paid by the user, not the designer.

---

## Law of Common Region

**Elements within a bounded region are perceived as belonging to the same group.**

Any visual enclosure — border, background color, card container, rounded rect — creates a "region" whose contents are perceived as a unit.

### Applications

**Cards.** A card boundary defines a content unit. Everything inside the card is perceived as related. This is why cards work so well for product listings, user profiles, and content feeds.

**Form fieldsets.** Grouping related fields within a visible region reduces the cognitive load of parsing a long form.

**Notification panels.** A dropdown panel or sheet creates a region that contextually separates notification content from the main UI.

**Contextual menus.** A floating menu panel creates a temporary region that users understand as a related set of actions for the target element.

### Pitfall

Overuse of containers creates "card soup" — a layout where everything is in a card and no visual hierarchy exists between regions. Use common region to group, not to decorate.

---

## Law of Proximity

**Objects near each other are perceived as related; objects far apart are perceived as unrelated.**

The most fundamental principle of visual grouping. Proximity is stronger than color, size, or shape as a grouping signal.

### Applications

**Form labels.** Labels should be closer to their input field than to adjacent fields. 4px gap between label and input; 16–24px gap between groups.

**Button groups.** Related actions (Save / Cancel) should be adjacent. Destructive actions (Delete) should be spatially separated by at least 24px and often a visual divider.

**Data relationships.** In dashboards, related metrics should cluster together. A metric that is visually equidistant from two other metrics implies no relationship — adjust spacing to create clear groupings.

**Navigation.** Top-level nav items should have consistent spacing. Items that function as a group (language/region selectors, utility links) should be visually tighter than the gap between nav sections.

### Proximity vs. Common Region

Proximity works without any enclosure — space alone creates groups. Common region reinforces grouping with an explicit boundary. Use proximity first; add a region boundary only when proximity alone is insufficient for clarity.

---

## Quick Reference Summary

| Law | Core Application |
|---|---|
| Postel's Law | Accept messy input, emit clean output; normalize silently |
| Weber-Fechner | Use ratio-based scales (type, spacing, color) not linear ones |
| Prägnanz | Design toward simplest perceivable form; align and close |
| Zeigarnik Effect | Open loops motivate return; progress indicators and drafts |
| Parkinson's Law | Constrain scope and options; set deadlines; remove rarely-used choices |
| Occam's Razor | Subtract before adding; simplest effective solution wins |
| Common Region | Enclosures create groups; use cards and panels deliberately |
| Proximity | Space creates relationships; related elements must cluster |

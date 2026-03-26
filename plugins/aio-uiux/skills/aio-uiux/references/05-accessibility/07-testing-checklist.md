# Accessibility Testing Checklist

Accessibility testing requires a combination of automated tools (catches ~30-40% of issues), manual keyboard testing, and screen reader testing. No single method is sufficient alone.

---

## Automated Testing Tools

### axe-core (browser extension + library)

axe-core is the most reliable automated accessibility checker. It has the lowest false-positive rate of any major tool.

```bash
# Install axe-core for automated testing
npm install --save-dev axe-core @axe-core/playwright
# or
npm install --save-dev @axe-core/react  # React integration
```

```javascript
// Playwright + axe integration
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no accessibility violations', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  // Print violations for debugging
  if (results.violations.length > 0) {
    console.table(results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
    })));
  }

  expect(results.violations).toEqual([]);
});

// Test specific component
test('modal dialog is accessible', async ({ page }) => {
  await page.goto('/');
  await page.click('#open-modal-btn');

  const results = await new AxeBuilder({ page })
    .include('#modal-dialog')
    .analyze();

  expect(results.violations).toEqual([]);
});

// Exclude known issues while fixing them
const results = await new AxeBuilder({ page })
  .exclude('#legacy-widget')  // tracked in issue #1234
  .analyze();
```

```javascript
// Jest + axe for component testing
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Button component is accessible', async () => {
  const { container } = render(
    <Button onClick={() => {}}>Save changes</Button>
  );
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### What axe-core catches automatically

- Missing image alt text
- Missing form labels
- Duplicate IDs
- Insufficient color contrast (with caveats — context-dependent cases may be missed)
- Missing document language
- Empty buttons/links
- Invalid ARIA attribute usage
- Missing required ARIA attributes
- Keyboard focus management (some cases)
- Table markup errors
- Frame title missing

### What axe-core does NOT catch

- Wrong alt text (present but meaningless)
- Logical heading hierarchy issues (context-dependent)
- Focus order problems
- Keyboard trap scenarios
- Screen reader UX issues
- Cognitive accessibility issues
- Motion/animation violations
- Touch target size (partly)

---

## Lighthouse Accessibility Audit

Lighthouse is built into Chrome DevTools and runs a subset of axe-core checks plus additional audits.

```bash
# CLI usage
npx lighthouse https://example.com --only-categories=accessibility --output=json

# Programmatic
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
const options = {
  logLevel: 'info',
  output: 'html',
  onlyCategories: ['accessibility'],
  port: chrome.port,
};
const runnerResult = await lighthouse('https://example.com', options);
console.log('Accessibility score:', runnerResult.lhr.categories.accessibility.score * 100);
```

**Lighthouse score vs WCAG compliance**: A 100 Lighthouse score does NOT mean WCAG AA compliant. It only means no automated violations were detected. Manual testing is always required.

---

## Manual Testing Protocol

### Order of operations

```
1. Tab order audit (keyboard only)
2. Focus visibility check
3. Screen reader pass (one full page read)
4. Form interaction check
5. Dynamic content check
6. Zoom + text resize
7. Color contrast spot-check
8. Mobile/touch check
```

---

## Keyboard-Only Testing Steps

Unplug or disable your mouse. Navigate the entire page using only:
- `Tab` — forward through focusable elements
- `Shift+Tab` — backward
- `Enter` — activate links and buttons
- `Space` — activate buttons, checkboxes
- `Arrow keys` — within composite widgets
- `Escape` — close dialogs/menus

### Keyboard testing checklist

```
[ ] Every interactive element receives focus in logical order
[ ] Focus indicator is visible at all times (never hidden)
[ ] No keyboard traps (except intentional focus traps in modals)
[ ] Modals: focus enters modal, stays trapped, returns to trigger on close
[ ] Dropdowns/menus open with Enter/Space, close with Escape
[ ] Skip link appears and works on first Tab press
[ ] Forms: all inputs, selects, and buttons reachable
[ ] Error messages: after submit failure, focus moves to error summary
[ ] Custom widgets use correct arrow key navigation
[ ] Date pickers, sliders, carousels operable without mouse
[ ] All functionality available via keyboard (no mouse-only interactions)
[ ] Sticky headers do not cover focused element (WCAG 2.4.11)
```

---

## Screen Reader Testing

### VoiceOver (macOS / iOS)

```
Enable:  Cmd + F5  (or System Settings → Accessibility → VoiceOver)
Disable: Cmd + F5

Basic navigation:
  VO = Control + Option

  VO + Right/Left Arrow  — Read next/previous item
  VO + A                 — Read from cursor
  VO + F6                — Read current item
  Tab                    — Move to next interactive element
  VO + U                 — Open Rotor (navigate by heading, link, form, landmark)
  VO + Cmd + H           — Next heading
  VO + Cmd + J           — Next form control
  VO + Cmd + L           — Next link
  VO + Space             — Activate element

  In forms:
  VO + Shift + Down      — Enter form control
  VO + Shift + Up        — Exit form control / escape
  Escape                 — Close dialog / exit application mode
```

### NVDA (Windows, free)

```
Download: https://www.nvaccess.org/download/
Works best with: Firefox, Chrome

Enable:   NVDA key = Insert (desktop) or CapsLock (laptop)

Basic navigation:
  NVDA + Down Arrow      — Read from cursor
  Down Arrow             — Read next line (browse mode)
  H                      — Next heading
  Shift + H              — Previous heading
  K                      — Next link
  F                      — Next form field
  B                      — Next button
  1–6                    — Heading levels 1–6
  Tab                    — Next focusable element
  Enter                  — Activate link / enter form mode
  NVDA + Space           — Toggle browse / forms mode
  Escape                 — Return to browse mode
```

### JAWS (Windows, commercial — most common in enterprise)

```
Similar to NVDA navigation keys.
  Insert = JAWS key
  Insert + F6            — Heading list
  Insert + F7            — Links list
  Insert + F5            — Form fields list
  Insert + F3            — Find
  H                      — Next heading (browse mode)
  Tab                    — Next interactive element
```

### Screen reader testing checklist

```
[ ] Page title is announced correctly
[ ] Landmark regions are present and meaningful
[ ] Heading hierarchy is logical (h1 → h2 → h3)
[ ] All images have meaningful alt text (or empty alt for decorative)
[ ] All form inputs are announced with their label
[ ] Required fields are announced as required
[ ] Error messages are announced when validation fails
[ ] Live regions announce dynamic content (cart updates, notifications)
[ ] Buttons and links have descriptive names (not "click here")
[ ] Dialogs: title announced on open, focus trapped, Escape works
[ ] Tables: headers announced when entering cells
[ ] No orphaned ARIA references (aria-labelledby pointing to nonexistent ID)
[ ] Custom widgets (tabs, accordions) role and state announced correctly
[ ] Loading/busy states communicated via aria-busy or live region
[ ] Success messages announced after form submission
```

---

## Color Contrast Checking

### Browser DevTools

```
Chrome:
  1. Open DevTools → Elements panel
  2. Select any text element
  3. In Styles panel, click on the color swatch
  4. Color Picker shows contrast ratio against background
  5. AA / AAA pass/fail indicators shown

Firefox:
  1. DevTools → Accessibility panel
  2. Check "Show tabbing order" for focus order
  3. Color contrast shown in element details
```

### Online tools

```
WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
  - Enter hex values, see ratio and AA/AAA pass/fail

Colour Contrast Analyser (desktop app):
  https://www.tpgi.com/color-contrast-checker/
  - Eyedropper tool to check any color on screen

Who Can Use: https://www.whocanuse.com/
  - Shows how many users would struggle with a color pair
  - Simulates color blindness, low vision, etc.

APCA Contrast Calculator: https://www.myndex.com/APCA/
  - For WCAG 3.0 readiness
```

---

## Browser DevTools Accessibility Panel

### Chrome Accessibility Panel

```
DevTools → Elements → Accessibility tab (right panel)

Shows:
  - Accessibility tree node for selected element
  - Computed name, role, description
  - ARIA attributes and their values
  - Keyboard focusable status

Shortcut: Right-click element → Inspect → Accessibility tab

Accessibility tree view:
  DevTools → Elements → ... menu → Show accessibility tree
  Visualizes entire page accessibility tree
```

### Full-page axe scan in DevTools

```
1. Install axe DevTools Chrome extension
2. Open DevTools → axe tab
3. Click "Scan all of my page"
4. Review violations grouped by impact (critical, serious, moderate, minor)
5. Each violation shows: which element, why it fails, how to fix
```

---

## Top 20 Most Common Accessibility Failures

Based on WebAIM Million annual report and real-world audits:

### 1. Low contrast text

**Violation**: Text below 4.5:1 ratio on background.

```css
/* FIX */
body { color: #1a1a1a; background: #fff; } /* 16.7:1 */
```

### 2. Missing image alt text

**Violation**: `<img>` without `alt` attribute.

```html
<!-- FIX -->
<img src="product.jpg" alt="Blue leather wallet, front view">
<img src="divider.svg" alt="">  <!-- decorative -->
```

### 3. Empty links

**Violation**: `<a href="..."></a>` or `<a href="..."><img src="..." /></a>` (no alt).

```html
<!-- FIX -->
<a href="/home"><img src="logo.svg" alt="Home — Acme Inc."></a>
```

### 4. Missing form labels

**Violation**: `<input>` with no associated `<label>`.

```html
<!-- FIX -->
<label for="search">Search</label>
<input type="search" id="search">
```

### 5. Empty buttons

**Violation**: `<button>` with only an icon and no text.

```html
<!-- FIX -->
<button aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>
```

### 6. Missing document language

**Violation**: `<html>` without `lang` attribute.

```html
<!-- FIX -->
<html lang="en">
```

### 7. Duplicate IDs

**Violation**: Multiple elements with same `id` value.

```javascript
// FIX: Audit and make all IDs unique
// In React: use useId() hook for generated IDs
import { useId } from 'react';
const id = useId();
```

### 8. Skipped heading levels

**Violation**: Going h1 → h3, skipping h2.

```html
<!-- FIX: Sequential heading levels -->
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

### 9. `outline: none` with no replacement

**Violation**: Focus styles removed globally.

```css
/* FIX */
:focus-visible {
  outline: 3px solid #0056b3;
  outline-offset: 2px;
}
```

### 10. Mouse-only event handlers

**Violation**: `onmouseover`, `ondblclick`, drag-only interactions with no keyboard alternative.

```javascript
// FIX: Add keyboard equivalent
element.addEventListener('mouseenter', showTooltip);
element.addEventListener('focus', showTooltip);
element.addEventListener('mouseleave', hideTooltip);
element.addEventListener('blur', hideTooltip);
```

### 11. Inaccessible custom dropdowns

**Violation**: `<div>` styled as select, no ARIA, not keyboard accessible.

```html
<!-- FIX: Use native select or implement full combobox ARIA pattern -->
<select id="country">
  <option value="us">United States</option>
</select>
```

### 12. Auto-playing media without controls

**Violation**: Video or audio starts playing automatically with no pause control.

```html
<!-- FIX: Never autoplay audio. Video: muted, no autoplay, or add controls -->
<video controls muted>
  <source src="intro.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English" default>
</video>
```

### 13. Inadequate error identification

**Violation**: Errors shown only in red, no text description.

```html
<!-- FIX -->
<input aria-invalid="true" aria-describedby="email-error">
<p id="email-error" role="alert">Enter a valid email address.</p>
```

### 14. No skip navigation link

**Violation**: Long navigation with no way to skip to main content.

```html
<!-- FIX: First element in body -->
<a href="#main" class="skip-link">Skip to main content</a>
```

### 15. Placeholder as only label

**Violation**: `<input placeholder="Email address">` with no `<label>`.

```html
<!-- FIX -->
<label for="email">Email address</label>
<input id="email" type="email" placeholder="name@example.com">
```

### 16. Inaccessible modals

**Violation**: Dialog without focus trap, no Escape close, focus not returned.

```javascript
// FIX: Implement full dialog pattern
// See 02-aria-patterns-reference.md Dialog section
```

### 17. Positive tabindex

**Violation**: `tabindex="1"`, `tabindex="2"` etc.

```html
<!-- FIX: Use tabindex="0" only, rely on DOM order -->
<button tabindex="0">Save</button>
```

### 18. Icon fonts with no text alternative

**Violation**: `<i class="fa fa-times"></i>` inside interactive element.

```html
<!-- FIX -->
<button>
  <i class="fa fa-times" aria-hidden="true"></i>
  <span class="sr-only">Close</span>
</button>
```

### 19. Missing caption/title on frames

**Violation**: `<iframe>` without `title` attribute.

```html
<!-- FIX -->
<iframe
  src="https://maps.google.com/..."
  title="Map showing our office location in Austin, Texas"
></iframe>
```

### 20. Content only in CSS (pseudo-elements)

**Violation**: Meaningful content in `::before`/`::after` content property.

```css
/* BAD: Required indicator as CSS content only */
.required::after { content: " *"; color: red; }
/* Screen readers may or may not read CSS content — unreliable */

/* FIX: Put it in HTML */
```

```html
<label for="name">
  Name
  <span aria-hidden="true"> *</span>
  <span class="sr-only"> (required)</span>
</label>
```

---

## Testing Integration Summary

| Tool | Coverage | When to run |
|---|---|---|
| axe-core (automated) | ~35% of issues | Every PR / CI pipeline |
| Lighthouse | ~30% of issues | Weekly / staging |
| Keyboard testing | Navigation, focus, interactions | New component / feature |
| VoiceOver (macOS) | Screen reader UX | New component / major feature |
| NVDA (Windows) | Screen reader UX (Windows users) | Quarterly / release |
| Color contrast tools | 1.4.3, 1.4.11 | Design review + code review |
| Browser DevTools a11y panel | ARIA, names, roles | During development |
| Forced-colors emulation | Windows High Contrast | Before release |
| Zoom to 200% | 1.4.4 Resize Text | Responsive QA pass |
| 320px viewport | 1.4.10 Reflow | Responsive QA pass |

**Recommended minimum**: axe-core in CI + keyboard test + VoiceOver pass for every new feature before release.

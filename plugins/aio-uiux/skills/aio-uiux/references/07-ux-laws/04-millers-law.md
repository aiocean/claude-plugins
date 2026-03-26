# Miller's Law: The Magic Number 7 ± 2

## Definition

Miller's Law states that the average person can hold approximately **7 (plus or minus 2) items** in their working memory at one time.

**Source:** George A. Miller's 1956 paper "The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information" — one of the most cited papers in psychology.

The range 5–9 reflects individual variation. Some people max out at 5 items; others can juggle 9. The average is 7. Modern research (Cowan, 2001) suggests the true limit may be closer to **4 chunks** for pure working memory, but Miller's 7±2 remains accurate when people use verbal rehearsal strategies.

---

## The Science Behind It

### Working Memory vs. Long-Term Memory

Working memory (short-term memory) is the mental "scratchpad" — active, temporary storage for items currently being processed. It is:
- **Limited in capacity:** ~7 items (or ~4 chunks without rehearsal)
- **Limited in duration:** Items fade in ~15–30 seconds without rehearsal
- **Susceptible to interference:** New items displace old ones

Long-term memory is effectively unlimited and persistent — but requires encoding (attention + repetition or emotional salience) to get information in.

### Chunking

The critical mechanism is **chunking** — grouping individual items into meaningful units. A chunk is processed as a single item in working memory regardless of how much information it contains.

**Example — phone number:**
- Raw digits: `8005550199` = 10 separate items (exceeds capacity)
- Grouped: `800-555-0199` = 3 chunks (easily held)
- Further chunked: `800-555-SXXX` (with meaning) = 2-3 chunks

The size of a chunk scales with expertise. A chess grandmaster sees "king-side castled king with rook on f1, bishop on g2" as one chunk; a novice sees 3+ individual pieces. **Expertise is largely the accumulation of larger, richer chunks.**

### Working Memory and Cognitive Load

Cognitive Load Theory (Sweller, 1988) extends Miller's insight:
- **Intrinsic load:** Complexity inherent to the task
- **Extraneous load:** Complexity imposed by poor design
- **Germane load:** Mental effort building new schemas

Good UI reduces extraneous load (the unnecessary part) so users can spend cognitive resources on the task itself.

---

## UI/UX Applications

### 1. Navigation Design

Primary navigation should stay within 5–7 items. Beyond 9, users must scan the full list rather than holding options in memory while comparing.

**Why the limit matters for navigation:**
- Users hold candidate options in memory while scanning the rest
- More than 7 items means candidates drop out of memory before the scan finishes
- Users resort to re-scanning, increasing time and frustration

```html
<!-- Good: 6 navigation items, well within range -->
<nav>
  <a href="/">Home</a>
  <a href="/products">Products</a>
  <a href="/pricing">Pricing</a>
  <a href="/docs">Docs</a>
  <a href="/blog">Blog</a>
  <a href="/contact">Contact</a>
</nav>

<!-- Problematic: 11 navigation items -->
<nav>
  <!-- Home, Products, Features, Solutions, Pricing, Enterprise,
       Developers, Docs, Blog, Case Studies, Contact -->
  <!-- Solution: group into 5-6 top-level categories -->
</nav>
```

**Mega-menu design:** Even with a mega-menu, group items into clusters of 5–7. A mega-menu with 40 ungrouped items is as bad as 40 nav items; one with 8 groups of 5 is manageable.

### 2. Form Design

Long forms overwhelm working memory. Users must remember what they've already filled in, what fields remain, and the form's overall purpose — simultaneously.

**Strategies:**
- **Group related fields** into labeled sections (address block, payment block)
- **Multi-step forms:** Present 4–7 fields per step, not 20+ at once
- **Progress indicators:** Offload "where am I?" from memory to the UI
- **Inline validation:** Immediate feedback so users don't need to remember errors while continuing

```html
<!-- Chunked form: address as one named group -->
<fieldset>
  <legend>Shipping Address</legend>
  <input name="street" placeholder="Street address" />
  <input name="city" placeholder="City" />
  <select name="state">...</select>
  <input name="zip" placeholder="ZIP code" />
</fieldset>

<!-- Payment as separate chunk -->
<fieldset>
  <legend>Payment</legend>
  <input name="card" placeholder="Card number" />
  <input name="expiry" placeholder="MM/YY" />
  <input name="cvv" placeholder="CVV" />
</fieldset>
```

### 3. Data Formatting via Chunking

Format numbers and codes to match natural chunking patterns.

```
Phone:        800-555-0199        (3-3-4 chunks)
Credit card:  4532 1234 5678 9012 (4-4-4-4 chunks)
SSN:          123-45-6789         (3-2-4 chunks)
Date:         2024-03-15          (4-2-2 chunks, ISO)
UUID:         550e8400-e29b-41d4  (standard hyphenated)
IBAN:         GB29 NWBK 6016 1331 (space-separated groups)
License key:  XXXXX-XXXXX-XXXXX   (5-5-5 chunks)
```

**Auto-format inputs** to apply chunking as users type:

```javascript
// Auto-format credit card input
input.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, ''); // digits only
  value = value.match(/.{1,4}/g)?.join(' ') ?? value; // group by 4
  e.target.value = value;
});

// Auto-format phone number
input.addEventListener('input', (e) => {
  let digits = e.target.value.replace(/\D/g, '');
  if (digits.length >= 6) {
    e.target.value = `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6,10)}`;
  } else if (digits.length >= 3) {
    e.target.value = `${digits.slice(0,3)}-${digits.slice(3)}`;
  }
});
```

### 4. List and Table Design

Long flat lists force users to scan-and-remember repeatedly. Apply chunking through visual grouping.

**Tables:**
- Zebra striping helps group rows visually (every 2 rows is a mini-chunk)
- Section headers in long lists break them into manageable groups
- Pagination vs. infinite scroll: pagination imposes chunk boundaries; infinite scroll removes them (which helps browsing but hinders finding specific items)

**Dropdown menus:**
- Under 7 options: show flat list
- 7–15 options: consider grouping with `<optgroup>`
- 15+ options: use searchable dropdown

```html
<!-- Grouped select uses chunking -->
<select name="timezone">
  <optgroup label="Americas">
    <option>Eastern (UTC-5)</option>
    <option>Central (UTC-6)</option>
    <option>Mountain (UTC-7)</option>
    <option>Pacific (UTC-8)</option>
  </optgroup>
  <optgroup label="Europe">
    <option>London (UTC+0)</option>
    <option>Berlin (UTC+1)</option>
    <option>Moscow (UTC+3)</option>
  </optgroup>
</select>
```

### 5. Feature Lists and Pricing Tables

Marketing pages frequently list product features. Apply Miller's Law to structure the cognitive experience:

- **Pricing table columns:** 3–4 tiers max. Five or more tiers force users to keep too many comparisons in working memory.
- **Feature list per tier:** Group features into categories. "Security features (5)" as a group is one chunk; listing all 5 individually is 5 chunks.
- **Highlighting:** A highlighted "recommended" tier gives users an anchor, reducing the comparison problem to "is this better or worse than the recommended?" instead of n-way comparison.

### 6. Error Messages and Validation

Don't show all errors simultaneously on a long form. Users can't process 12 error messages at once.

**Better approach:**
- Inline validation on blur (error appears on the field as soon as user leaves it)
- Summary at top of form with max 5–7 items, linked to fields
- Fix-as-you-go: as errors are corrected, they disappear from the summary

```javascript
// Show max N errors in summary to respect working memory
function showErrorSummary(errors) {
  const MAX_VISIBLE = 5;
  const visible = errors.slice(0, MAX_VISIBLE);
  const remaining = errors.length - MAX_VISIBLE;

  let summary = visible.map(e => `<li><a href="#${e.field}">${e.message}</a></li>`).join('');
  if (remaining > 0) {
    summary += `<li>...and ${remaining} more errors below</li>`;
  }
  errorContainer.innerHTML = `<ul>${summary}</ul>`;
}
```

---

## Concrete Examples

### Good: iPhone dialer
Keypad with 12 keys (0–9, *, #). Call log shows recent calls in batches. Contact list uses alphabetical grouping with section headers (A, B, C...) — each letter is a chunk boundary.

### Good: Amazon product specs
Technical specifications grouped into sections: "Technical Details", "Additional Information", "Product Dimensions". Each section contains 5–8 items.

### Good: Stripe API documentation
Code examples chunked into discrete steps. Each step isolated with a numbered heading. Complex multi-parameter calls formatted with one parameter per line.

### Bad: Unformatted account numbers
Displaying `43921847392847` as a flat string of digits. Users making a payment must mentally chunk it while cross-referencing with their bank statement. Format it: `4392 1847 3928 47`.

### Bad: 15-item primary navigation
Every top-level section of a complex enterprise app listed in a horizontal bar. Users can't hold all options in memory while scanning; they end up mouse-hovering each one in sequence.

### Bad: Walls of text settings panels
A settings page with 30+ individual toggle options in a single scrollable list. No grouping, no sections. Each user must build their own chunking strategy from scratch, every visit.

---

## Chunking Cheat Sheet

| Domain | Unchunked (hard) | Chunked (easy) |
|---|---|---|
| Phone number | 8005550199 | 800-555-0199 |
| Credit card | 4532123456789012 | 4532 1234 5678 9012 |
| Navigation | 11 flat items | 5 categories with sub-items |
| Error list | 12 errors at once | Inline validation + top 5 summary |
| Pricing tiers | 6 plans | 3 plans + custom |
| Feature list | 20 items | 4 groups × 5 items |
| Form fields | 20 questions on one page | 4 steps × 5 questions |
| Date | 20240315 | 2024-03-15 |

---

## Anti-Patterns

| Anti-Pattern | Miller's Law Problem | Fix |
|---|---|---|
| 12+ option dropdown, no grouping | Exceeds working memory for comparison | Add `<optgroup>` headers or use search |
| Multi-column nav with 40+ items ungrouped | No chunk structure | Group into 5–7 labeled categories |
| Form showing all 20 fields at once | Extraneous cognitive load | Wizard with 5±2 fields per step |
| Error list with 15 items | Can't hold all errors in memory | Show inline errors + max 5 in summary |
| Pricing with 7 tiers | 7-way comparison exceeds working memory | Consolidate to 3–4 tiers |
| Unformatted numeric strings | Requires manual chunking by user | Auto-format with separators |

---

## Key Takeaways

1. **7±2 is a capacity limit, not a design target.** Aim for 5–7; don't pad to reach 7.
2. **Chunking is the key mechanism.** Group items into meaningful units to multiply effective capacity.
3. **Expertise changes chunk size.** Your power users have richer chunks than new users. Design for both.
4. **Reduce extraneous cognitive load.** The mental effort wasted on bad UI takes away from the task itself.
5. **Format data to support chunking.** Phone numbers, credit cards, and long codes should be pre-chunked visually.
6. **Navigation, forms, and lists** are the three highest-impact areas for applying Miller's Law in UI design.

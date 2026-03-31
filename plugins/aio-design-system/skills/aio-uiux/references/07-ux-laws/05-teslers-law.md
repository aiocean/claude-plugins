# Tesler's Law: Conservation of Complexity

## Definition

Tesler's Law, also known as the **Law of Conservation of Complexity**, states that every application has an inherent amount of complexity that cannot be removed — only moved.

**Attributed to:** Larry Tesler, computer scientist at Xerox PARC and Apple (coined ~1984).

The key corollary: **someone must deal with the complexity**. The design question is never "can we eliminate this complexity?" — it is "who should bear this complexity: the user or the developer/system?"

The answer, almost always, should be: the system and developer.

---

## The Science Behind It

### What Is Inherent Complexity?

Some tasks are genuinely complex. Booking international travel with multiple carriers, seat preferences, loyalty numbers, and passport requirements involves real complexity — the information must exist somewhere in the process. You cannot make it disappear; you can only decide who handles it.

**Intrinsic complexity:** The minimum complexity required to accomplish a task, no matter how well designed.

**Extraneous complexity:** Complexity added by poor design, unnecessary steps, confusing language, or missing automation. This CAN be eliminated.

Tesler's Law is specifically about intrinsic complexity. No amount of design genius makes booking a flight as simple as buying a candy bar — the domains differ in inherent complexity.

### The Zero-Sum Nature

When designers simplify a user interface:
- The complexity doesn't vanish
- It shifts to developers (who must write more sophisticated code)
- Or to the system (which must make more decisions automatically)
- Or to a later stage of the user experience
- Or to support/help documentation

**Example — email client "Send" button:**
- User complexity: click Send
- System complexity: handle SMTP queuing, retry logic, DNS resolution, spam filtering, delivery receipts, bounce handling, attachment size limits

The user experience of sending email is simple because enormous complexity was moved into the infrastructure and software. Someone built that complexity — it didn't disappear.

### Folding vs. Hiding

There are two fundamentally different ways to "reduce" apparent complexity:

1. **Folding (absorption):** The system absorbs the complexity. Smart defaults, automation, inference. The complexity is genuinely handled on behalf of the user. Example: "New document" creates a document with sensible defaults — the user never specifies font, margins, encoding. The system chose.

2. **Hiding (deferral):** The complexity is tucked behind "Advanced" or disclosed only when needed. It hasn't been absorbed — just deferred. Example: "Advanced settings" panel. Less cognitive burden at the start, but the complexity is still there, waiting.

Both are valid strategies. Neither eliminates complexity.

---

## UI/UX Applications

### 1. Identify Who Should Bear the Complexity

Before designing, ask: "Who is best positioned to handle this complexity?"

**The system is better positioned when:**
- The decision can be made from available data (user history, context, preferences)
- The error rate of user decisions is high
- The decision is made repeatedly (amortize the automation cost)
- The user doesn't care about the outcome, only the result

**The user is better positioned when:**
- The decision requires personal preference or judgment
- The stakes are high enough that the user must be accountable
- The user needs to understand the outcome (not just receive it)
- Automation would produce wrong results for edge cases users care about

### 2. Smart Defaults (Absorbing Complexity)

Smart defaults are the highest-leverage application of Tesler's Law. The system makes a decision on behalf of the user. If the default is correct >90% of the time, you've eliminated 90% of the interaction cost.

**High-value default opportunities:**

```
User's timezone          → Detect from browser (Intl.DateTimeFormat)
Country/region           → Detect from IP or browser locale
Language preference      → Detect from Accept-Language header
Shipping address         → Pre-fill from user account
Payment method           → Default to last used card
Notification preferences → Sane defaults, not opt-in everything
Document title           → "Untitled" is worse than "Meeting Notes - [date]"
File save location       → Last used folder, not root directory
```

```javascript
// Absorb timezone complexity with browser API
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// → "America/New_York", "Asia/Tokyo", etc.
// Pre-select this in the UI; let user change if wrong

// Absorb date format complexity by detecting locale
const locale = navigator.language; // "en-US", "de-DE", "ja-JP"
const dateFormatter = new Intl.DateTimeFormat(locale, {
  year: 'numeric', month: 'long', day: 'numeric'
});
// Each user sees dates in their expected format
```

### 3. Progressive Disclosure (Deferring Complexity)

When complexity cannot be absorbed, defer it. Show simple first; reveal advanced on demand.

**Layering strategy:**
- **Layer 0 (always visible):** What 80% of users need 80% of the time
- **Layer 1 (expandable):** Additional options for common variations
- **Layer 2 (advanced):** Power-user configurations and edge cases
- **Layer 3 (documentation):** Deep technical reference, rarely needed

```html
<!-- Layer 0: Basic date selection -->
<input type="date" name="date" />

<!-- Layer 1: Progressive disclosure for time -->
<details>
  <summary>Add time (optional)</summary>
  <input type="time" name="time" />
  <select name="timezone">...</select>
</details>

<!-- Layer 2: Recurring event configuration — revealed only if needed -->
<details>
  <summary>Repeat event</summary>
  <!-- Recurrence rule builder — complex but rarely used -->
</details>
```

### 4. Contextual Help (Distributing Complexity)

Some complexity can be distributed across time — instead of presenting all necessary information upfront, surface it exactly when needed.

- **Inline help text:** "?" icon next to complex fields, expands explanation on click
- **Tooltips:** Appear on hover/focus, provide just-in-time context
- **Validation with explanation:** Don't just say "invalid" — say "Password must be 8+ characters and include a number"
- **Onboarding flows:** Front-load learning for new users, reduce it for returning users

```html
<!-- Complexity distributed via contextual help -->
<label for="cvv">
  CVV
  <button type="button" aria-label="What is CVV?" class="help-trigger">?</button>
</label>
<input id="cvv" name="cvv" maxlength="4" />
<div class="help-content" hidden>
  <p>The CVV is the 3-4 digit code on the back of your card (front for Amex).</p>
  <img src="cvv-diagram.png" alt="CVV location on card" />
</div>
```

### 5. Complexity in Multi-Step vs. Single Forms

Multi-step forms don't reduce complexity — they redistribute it across time. The same information is collected; the experience of providing it changes.

**When multi-step wins:**
- Completion rate matters more than total time
- Early steps qualify users (no point collecting payment details before eligibility is confirmed)
- Psychological commitment builds through steps (sunk cost aids completion)
- Mobile context: one question at a time is easier to handle on small screen

**When single form wins:**
- Users need to see the full scope before committing
- Forms are revisited or edited frequently (single view aids comparison)
- Power users resent forced stepping through known steps

### 6. The "Simple" Trap

Stripping features to appear simple is not applying Tesler's Law — it's often just removing functionality that some users need. True simplicity absorbs complexity; false simplicity hides or removes it.

**Signs of false simplicity:**
- Users constantly searching for "where did X go?"
- Complaints that the product "can't do" things it technically can
- Support volume increases as users hunt for features
- Power users migrate to competitors with more capability

**Honest simplicity:**
- Common tasks take fewer steps
- The system makes good decisions automatically
- Advanced tasks are possible but not in the way
- Users feel capable, not restricted

---

## Case Studies

### Case Study 1: Gmail Compose Window

**Old complexity:** Setting up an email required understanding: To, CC, BCC, subject line, body, attachments, formatting, sending vs. scheduling.

**Gmail's absorption strategies:**
- Smart Compose: predicts full sentences from context
- Smart Reply: generates 3 responses, absorbing "what to say"
- Schedule Send: absorbs timezone calculation
- Undo Send: absorbs the "wait, I made a mistake" consequence
- Auto-save drafts: absorbs "did I save this?" anxiety

The complexity of email still exists — Gmail moved much of it into the system.

### Case Study 2: Stripe Radar (Fraud Detection)

**User-facing experience:** One toggle "Enable Radar" and a risk threshold slider.

**Absorbed complexity:** ML model training on billions of transactions, rule evaluation, velocity checks, geographic anomaly detection, device fingerprinting, IP reputation scoring.

Stripe's engineers bore the complexity so merchants don't have to build fraud systems.

### Case Study 3: iPhone Photo Library

**Pre-iPhone camera apps:** Manual ISO, aperture simulation, focus modes.

**iPhone approach:** The system absorbs all exposure decisions. HDR processing, portrait mode depth mapping, night mode multi-frame blending — all absorbed by the camera software.

Trade-off: professional photographers lose control. Apple judged that 99% of users prefer absorbed complexity over explicit control. (Hence: ProRAW and ProRes modes for the 1% who need control back.)

---

## The Developer's Burden

Tesler's Law makes an important implicit point: **design decisions have engineering costs**.

"Just make it automatic" typically means:
- Write an inference algorithm
- Handle edge cases and errors
- Build configuration management if users ever need to override
- Test the automation thoroughly
- Maintain it as usage patterns change

Good design requires understanding this trade-off honestly. A designer who constantly says "just make it automatic" without engaging with the engineering complexity is shifting their burden onto developers, which creates technical debt and sustainability problems.

The best products come from teams that actively discuss: "Is this worth automating? What does it cost? What's the failure mode?"

---

## Anti-Patterns

| Anti-Pattern | Complexity Problem | Fix |
|---|---|---|
| "Advanced Settings" dumping ground | Hides complexity, doesn't absorb it | Audit each advanced setting; can it be automated? |
| Form with no smart defaults | Forces user to provide all information | Pre-populate from context/history |
| Stripping features to look simple | Removes user capability, doesn't absorb complexity | Add progressive disclosure instead |
| One-size-fits-all flow | Novice user path = expert user path | Offer adaptive complexity based on user expertise |
| Asking user for info the system has | Unnecessary user burden | Infer from available data, ask only if unsure |

---

## Key Takeaways

1. **Complexity cannot be destroyed, only moved.** The question is always: who bears it?
2. **The system is usually the right place for complexity.** Especially for repeated decisions, inferable data, and high-error-rate choices.
3. **Smart defaults are the highest ROI design investment.** Each correct default eliminates a decision for every user, every time.
4. **Progressive disclosure defers complexity without eliminating it.** Valid, but know the difference.
5. **False simplicity removes capability.** Real simplicity absorbs complexity while maintaining power.
6. **Design decisions are engineering costs.** Honest collaboration means acknowledging that absorbing complexity requires someone to build that absorption.

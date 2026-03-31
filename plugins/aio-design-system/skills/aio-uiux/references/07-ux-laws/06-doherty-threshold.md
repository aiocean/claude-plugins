# Doherty Threshold: 400ms and the Flow State

## The Principle

The Doherty Threshold states that productivity soars when a computer and its user interact at a pace of under 400 milliseconds each, such that neither has to wait on the other. Response times above 400ms break the feedback loop, interrupt concentration, and reduce a user from a participant into a spectator.

Originally defined by Walter Doherty and Ahrvind Thadhani at IBM in 1982, the finding was economic as well as psychological: users doing sub-400ms tasks completed significantly more work per hour. The threshold has held up — modern eye-tracking and brain-imaging studies confirm that attention starts drifting around 300–400ms.

---

## Why 400ms Is the Magic Number

| Response Time | User Perception |
|---|---|
| 0–100ms | Instantaneous; feels direct manipulation |
| 100–300ms | Fast; minor but acceptable lag |
| 300–400ms | Noticeable but still tolerable |
| 400ms–1s | Connection broken; user registers a wait |
| 1s+ | Attention wanders; perceived unreliability |
| 10s+ | User abandons task |

The 400ms boundary corresponds roughly to the human working memory refresh cycle. Responses within it feel part of the same cognitive action; responses beyond it feel like a separate, costly round trip.

---

## Perceived Performance vs. Actual Performance

Actual performance is how fast the system responds. Perceived performance is how fast the user *believes* it responds. These are not the same, and perceived performance is what drives satisfaction and flow.

**Key insight:** You can improve perceived performance without improving actual performance — often for a fraction of the engineering cost.

### Techniques

**Optimistic UI**
Assume the network request will succeed and update the UI immediately. Reverse only on confirmed failure.

```
User clicks "Like" →
  1. Immediately flip heart icon to filled (optimistic update)
  2. Send POST /likes in background
  3. On failure: flip back + show error toast
```

Appropriate when:
- The operation has a >99% success rate
- Reversals are cheap and visible
- Data loss on failure is low-stakes

Not appropriate when:
- Financial transactions
- Irreversible actions (delete, send email)
- High-failure-rate operations

**Skeleton Screens**
Replace loading spinners with layout placeholders that mimic the shape of incoming content. The user perceives forward progress rather than a void.

```
Skeleton screen structure:
  ┌──────────────────────────────┐
  │ ████ (avatar placeholder)    │
  │ ████████████ (title)         │
  │ ████████████████████ (body)  │
  │ ████████ (meta)              │
  └──────────────────────────────┘
```

Rules for effective skeletons:
- Match the approximate shape of real content
- Animate with a shimmer (left-to-right gradient sweep) to signal loading
- Use muted, desaturated colors (gray-200 / gray-300)
- Avoid exact content prediction — skeletons that mismatch final layout cause jarring reflow

**Progress Indicators**
For operations that genuinely take 1–10 seconds, a progress indicator sustains engagement.

| Duration | Best Indicator |
|---|---|
| < 1s | No indicator needed (or subtle spinner) |
| 1–3s | Spinner or indeterminate bar |
| 3–10s | Determinate progress bar with percentage |
| > 10s | Step-by-step status ("Uploading... Processing... Done") |

Progress bars should never go backward. Never show 100% and then pause — move to the next phase at 99% if necessary.

---

## Implementation Patterns

### Pre-loading and Prefetching

Load content before the user requests it:

```
On hover over a nav link →
  fetch('/page-data') in background
On focus of a search input →
  fetch('/search-index') in background
```

This is the most impactful technique because the work completes before the user acts.

### Instant Visual Feedback on Every Interaction

Every tap/click/keypress must produce visible feedback within 100ms, even if the operation takes longer:

```
Button click →
  Immediate: visual press state (scale down, darken)
  50ms later: spinner replaces label
  2s later: success state
```

Absence of immediate feedback is the most common cause of double-clicks, rage-taps, and form resubmissions.

### Streaming and Progressive Rendering

Render partial results as they arrive instead of waiting for completion:

- Render the page header and navigation while the main content loads
- Show the first 10 search results while the remaining 90 fetch
- Stream AI-generated text token by token rather than displaying it all at once

### Local State First

For data the user controls, update local state synchronously and sync to the server in background. Notes apps, to-do lists, and settings screens should feel instantaneous.

---

## Doherty Threshold in Different Contexts

**Search**
Display results as the user types (debounced at 150–200ms). Show a loading indicator only if results take longer than 300ms to arrive.

**Form Submission**
- Validate fields inline on blur, not on submit
- Disable the submit button immediately on click to prevent double submission
- Show a loading spinner in the button itself
- Redirect or show success state as soon as the response arrives

**File Upload**
- Show upload progress in bytes and percentage
- Display a thumbnail preview immediately after file selection (before upload begins)
- Allow continued use of the app during upload

**Navigation**
- Client-side routing should feel instant (< 50ms transition)
- Use route-level code splitting to keep bundles small
- Prefetch the next likely route on hover

---

## Common Mistakes

**Spinner theater**: Showing a spinner for a 50ms operation trains users to distrust response times.

**Progress bar lies**: A bar that jumps to 80% then stalls for 10 seconds is worse than no bar — it breaks the contract of a progress indicator.

**Skeleton mismatch**: Skeletons that look nothing like the loaded content create jarring layout shifts (CLS), worsening the perceived experience even if actual load time is fast.

**Optimistic update without rollback**: Showing success then silently failing destroys trust permanently.

---

## Measurement

Track these metrics:

- **Time to First Byte (TTFB)**: Server response latency
- **First Contentful Paint (FCP)**: When first pixels render
- **Largest Contentful Paint (LCP)**: When main content is visible (target: < 2.5s)
- **Interaction to Next Paint (INP)**: Responsiveness to all interactions (target: < 200ms)
- **Cumulative Layout Shift (CLS)**: Visual stability (target: < 0.1)

Core Web Vitals (LCP, INP, CLS) are the industry-standard proxy for perceived performance.

---

## Quick Reference

- **400ms is the ceiling** — responses beyond this break flow
- **Optimistic UI** — update first, sync second, rollback on failure
- **Skeletons over spinners** — shape communicates progress; void communicates nothing
- **Instant visual feedback** — every interaction within 100ms regardless of operation duration
- **Prefetch aggressively** — the best load time is the one that already happened
- **Measure INP** — not just LCP; responsiveness to every click/tap matters

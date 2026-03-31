# Error Messages

Error messages are a product's immune system. They activate under stress, when users are already frustrated. A good error message turns a dead end into a recoverable moment. A bad one makes users feel blamed, confused, or abandoned.

---

## 1. The Error Message Framework

Every error message should answer three questions:

1. **What happened?** — Plain language. What went wrong.
2. **Why did it happen?** — The cause, when it helps the user. Skip when it adds no value.
3. **What should I do?** — A specific, actionable next step.

Not every error needs all three parts. A simple validation error might only need #1 and #3. A complex system error needs all three.

**Template:**
```
[What happened] because [why, if helpful]. [Specific action to fix it.]
```

GOOD: `Your payment didn't go through because the card was declined. Try a different card or contact your bank.`

GOOD: `We couldn't save your changes. Check your connection and try again.`

GOOD: `Password too short. Add at least 3 more characters.`

### What to Never Do in Error Messages

- Blame the user ("You entered the wrong password")
- Use technical jargon without explanation ("Error 403", "null pointer exception")
- Be vague ("Something went wrong", "An error occurred")
- Be scary ("CRITICAL ERROR", "FATAL")
- Use passive voice that hides responsibility ("The request was not processed")
- End with no next step, leaving users stranded

---

## 2. Inline Validation Errors

Inline errors appear directly below the field that has a problem. They trigger on blur (when user leaves the field) or on submit — not on every keystroke.

### Missing Required Field

BAD: `This field is required.`
BAD: `Required`
GOOD: `Enter your email address.`
GOOD: `Add a project name to continue.`
GOOD: `Choose at least one team member.`

**Pattern: Tell them what to add, not that they forgot.**

### Invalid Format

BAD: `Invalid email`
BAD: `Invalid format`
BAD: `Please enter a valid email address.`
GOOD: `Check the email format — it should look like name@domain.com`
GOOD: `Phone number should be 10 digits, no dashes.`
GOOD: `Date should be in MM/DD/YYYY format.`
GOOD: `URL must start with https://`

**Pattern: Show the expected format, not just "invalid."**

### Value Out of Range

BAD: `Value out of range`
BAD: `Invalid number`
GOOD: `Enter a number between 1 and 100.`
GOOD: `Maximum file size is 10 MB. This file is 14 MB.`
GOOD: `Team names must be between 3 and 50 characters.`

### Already Taken (Uniqueness Conflict)

BAD: `Username already exists.`
BAD: `This email is taken.`
GOOD: `That username is taken. Try adding numbers or a different word.`
GOOD: `An account with this email already exists. Sign in or reset your password.`

**Pattern: Offer a path forward, not just rejection.**

### Password Errors

BAD: `Password too weak`
BAD: `Password doesn't meet requirements`
GOOD: `Add at least 2 more characters.`
GOOD: `Add a number or symbol to make your password stronger.`
GOOD: `Passwords don't match. Re-enter your new password.`

### Card/Payment Field Errors

BAD: `Invalid card number`
GOOD: `Check your card number — it looks like a digit is missing.`
BAD: `Invalid expiry`
GOOD: `That expiration date has passed. Use a card that's still valid.`
BAD: `Invalid CVV`
GOOD: `CVV is the 3-digit code on the back of your card.`

---

## 3. Form-Level Error Summary

When a form is submitted with multiple errors, show a summary at the top of the form. Link each item to its field.

**Structure:**
- Headline: number of issues
- List: one item per error, phrased as an action
- Each item is a link or scroll anchor to the field

BAD:
```
Please fix the errors below.
```
(No count, no specifics, no links)

GOOD:
```
Fix 3 issues before continuing:
• Email address — enter a valid email
• Password — must be at least 8 characters
• Phone — digits only, no dashes or spaces
```

GOOD (single error summary):
```
One thing to fix:
• Card number — check that you've entered all 16 digits
```

**Accessibility note:** Move focus to the error summary on submit. Screen reader users need to hear the errors, not land on a field that now has an error below it.

---

## 4. Toast and Banner Errors

Toasts are temporary, dismissible notifications. Banners are persistent. Use the right one for the severity.

### Toast Errors (non-critical, recoverable)

Toasts auto-dismiss after 5–7 seconds. Include a manual dismiss. For errors, include an action when possible.

BAD: `Error`
BAD: `Something went wrong.`
GOOD: `Couldn't send message. Try again.` with [Retry] action
GOOD: `Upload failed — file exceeds 10 MB.`
GOOD: `Changes not saved. Your connection dropped.` with [Retry] and [Dismiss]

**Toast should persist for errors** — do not auto-dismiss an error before the user has read it. 7 seconds minimum. Or keep it until the user dismisses.

### Banner Errors (persistent, systemic)

Banners sit at the top of the page and require user action or inform about ongoing issues.

BAD: `There is a system error.`
BAD: `Service disruption detected.`

GOOD:
```
[!] We're experiencing delays with file uploads. Your files are safe — this usually resolves in minutes.
[Check status page] [Dismiss]
```

GOOD:
```
[!] Your payment method failed. Update your billing details to keep your account active.
[Update billing]
```

GOOD (data integrity warning):
```
[!] Some changes from your last session weren't saved due to a connection issue. Review your recent edits before continuing.
[Review changes] [Dismiss]
```

---

## 5. 404 Pages

The user followed a broken link or typed a wrong URL. Do not make them feel lost or punished.

**What to include:**
- Acknowledge the page is missing (briefly)
- Explain possible causes (optional)
- Give 2–3 paths forward
- Search or navigation

BAD:
```
404
Page Not Found
```
(No explanation, no action)

BAD:
```
Oops! The page you're looking for doesn't exist. It may have been moved or deleted. Error code: 404.
```
(Error code adds nothing for users)

GOOD:
```
Page not found

The page you're looking for doesn't exist or may have moved.

Try these instead:
→ Go to the dashboard
→ Search for what you need
→ Browse all features

[Go to dashboard] [Search]
```

GOOD (for logged-in app):
```
We can't find that page

It might have been deleted, moved, or you may not have access.

[Go to your projects] [Contact support]
```

---

## 6. 500 / Server Error Pages

A server error is the product's fault. Own it. Do not leave users with a technical message and no next step.

BAD:
```
500 Internal Server Error
```

BAD:
```
Oops! Our bad! Something broke on our end. Hehe. 😅 Try refreshing!
```
(Casual tone is wrong for a system failure)

GOOD:
```
Something went wrong on our end

We're aware of the issue and working to fix it. Your data is safe.

In the meantime:
• Refresh the page — it may resolve on its own
• Check our status page for updates
• Contact support if this persists

[Refresh page] [Check status] [Contact support]
```

GOOD (with incident acknowledgment):
```
We're having trouble right now

Our team is investigating. We'll update our status page as we learn more.

[Check status page]
```

---

## 7. Network / Offline Errors

The user has lost connectivity. Meet them where they are — do not pretend the issue is on your end when it is likely theirs.

BAD: `Connection failed.`
BAD: `Network error 503.`

GOOD: `You appear to be offline. Check your internet connection and try again.`
GOOD: `Can't connect right now. Your work is saved — it will sync when you're back online.`
GOOD: `No connection. We'll keep trying automatically.` with a subtle reconnecting indicator

**For apps with offline support:**
GOOD: `You're offline, but you can keep working. Changes will sync when you reconnect.`

---

## 8. Permission / Access Errors

The user tried to access something they should not. Do not expose why — just give them a path forward.

BAD: `403 Forbidden`
BAD: `Access denied.`
BAD: `You are not authorized to perform this action because your role is set to Viewer.`
(Role exposure can be a security issue in some contexts)

GOOD: `You don't have permission to view this page. Ask your workspace admin for access.`
GOOD: `Only admins can delete workspaces. Contact your admin to proceed.`
GOOD: `This file is private. Request access from the owner.` with [Request access] button

**When the user just needs to authenticate:**
BAD: `401 Unauthorized`
GOOD: `Sign in to view this page.` with [Sign in] button

---

## 9. Timeout Errors

The request took too long. Tell the user, explain it is not their fault, and give a recovery action.

BAD: `Request timed out.`
BAD: `Error: timeout after 30000ms`

GOOD: `This is taking longer than expected. Try refreshing the page.`
GOOD: `The report is taking a while to generate. It will be ready in a few minutes — we'll email you when it's done.`
GOOD: `Connection timed out. Your data is safe. Try again or check your connection.`

---

## 10. Rate Limit Errors

The user has hit a usage cap. Be transparent. Tell them when they can try again.

BAD: `Too many requests.`
BAD: `Rate limit exceeded.`
BAD: `Error 429`

GOOD: `You've reached the limit for today (100 exports). Your limit resets at midnight UTC.`
GOOD: `Slow down — you're sending messages too quickly. Wait 30 seconds and try again.`
GOOD: `You've used all 50 free API calls this month. Upgrade to continue, or your limit resets on March 1.` with [Upgrade] button

---

## 11. Destructive Action Confirmation Errors

When a user tries to take an action that will destroy data, confirm specifically before executing.

BAD: `This cannot be undone. [OK]`
BAD: `Are you sure? [Yes] [No]`

GOOD:
```
Delete "Q4 Campaign"?
This will permanently delete the project and all 23 files inside it. You won't be able to recover them.

[Delete project] [Keep project]
```

GOOD (with type-to-confirm for high-stakes actions):
```
Delete workspace "Acme Design Team"?
This will remove all 14 members, 340 projects, and all files. This cannot be undone.

Type "Acme Design Team" to confirm:
[_________________________]

[Delete workspace]  (disabled until text matches)
```

---

## 12. Validation Error Timing

When to show inline errors:

| Trigger | Use When |
|---|---|
| On blur (field loses focus) | Most fields — user has finished entering |
| On submit | Short forms with 1–3 fields |
| On input (real-time) | Password strength only; character counts |
| On submit only | Destructive forms where early interruption is disruptive |

Never show errors on focus (user just arrived at the field). Never clear errors immediately when the user starts retyping — wait until they have entered something valid.

---

## Quick Reference: 20+ Error Examples

| Situation | BAD | GOOD |
|---|---|---|
| Empty required field | `Required` | `Enter your email address.` |
| Invalid email | `Invalid email` | `Check the format — name@domain.com` |
| Password too short | `Too short` | `Add at least 3 more characters.` |
| Passwords don't match | `Mismatch` | `Passwords don't match. Re-enter your new password.` |
| Username taken | `Username unavailable` | `That username is taken. Try adding numbers.` |
| Card declined | `Payment failed` | `Card declined. Try a different card or contact your bank.` |
| File too large | `File error` | `File is 14 MB. Maximum size is 10 MB.` |
| No internet | `Network error` | `You're offline. Check your connection and try again.` |
| Server error | `500 error` | `Something went wrong on our end. Try again in a moment.` |
| 404 | `Page not found` | `We can't find that page. Go to your dashboard.` |
| Permission denied | `403 Forbidden` | `You don't have permission. Ask your admin for access.` |
| Session expired | `Session invalid` | `Your session expired. Sign in again — your work is saved.` |
| Rate limited | `Too many requests` | `Daily limit reached. Resets at midnight UTC.` |
| Timeout | `Request timed out` | `This is taking longer than usual. Try refreshing.` |
| Form multi-error | `Please fix errors` | `Fix 3 issues before continuing: [list]` |
| Delete confirmation | `Are you sure?` | `Delete "Project Name"? This cannot be undone.` |
| Upload failed | `Upload error` | `Upload failed. Check your connection and try again.` |
| Sync conflict | `Conflict error` | `Someone else edited this file. Review the changes before saving.` |
| Export failed | `Export error` | `Export failed. Try again or contact support if this continues.` |
| Search no results | `No results` | `No results for "query." Try fewer or different keywords.` |

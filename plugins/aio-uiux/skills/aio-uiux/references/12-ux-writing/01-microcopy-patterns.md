# Microcopy Patterns

Microcopy is the small text that guides users through an interface: button labels, form hints, error messages, empty states, loading indicators. Though small, it has outsized impact on conversion, trust, and task completion. Every word is a decision.

---

## 1. Button Labels

### The Golden Rule
Buttons should answer: "What happens when I click this?" Use verb + object format. The user should never have to guess.

### Primary Action Buttons

Primary buttons commit a user to an action. Be specific. Generic labels like "Submit" or "OK" force users to re-read surrounding context to understand what they are confirming.

**Pattern: Verb + Object**

BAD: `Submit`
GOOD: `Save changes`

BAD: `OK`
GOOD: `Confirm booking`

BAD: `Send`
GOOD: `Send message`

BAD: `Continue`
GOOD: `Continue to payment`

BAD: `Done`
GOOD: `Finish setup`

**Pattern: Mirror the outcome**
The button label should echo what just happened or what will happen next.

BAD: `Submit` (on a contact form)
GOOD: `Send message`

BAD: `Submit` (on a registration form)
GOOD: `Create account`

BAD: `Submit` (on a checkout)
GOOD: `Place order`

### Destructive Action Buttons

Destructive actions delete, remove, cancel, or permanently change something. Be explicit about what is being destroyed. Never use vague labels on destructive buttons.

**Pattern: Name the thing being destroyed**

BAD: `Delete`
GOOD: `Delete project`

BAD: `Remove`
GOOD: `Remove team member`

BAD: `Yes, continue`
GOOD: `Yes, delete 47 files`

BAD: `Confirm`
GOOD: `Cancel subscription`

**Pattern: Include consequence in confirmation dialogs**

BAD:
> Are you sure?
> [Delete] [Cancel]

GOOD:
> Delete "Marketing Campaign Q4"?
> This will permanently remove the project and all 23 files. This cannot be undone.
> [Delete project] [Keep project]

Note: The cancel/escape action should be the safer, more prominent option on destructive dialogs.

### Cancel / Escape Buttons

Cancel buttons should return users to safety. Avoid "Close" when the action is truly canceling a flow — it implies passive dismissal rather than active abandonment.

BAD: `Close` (when canceling a multi-step form)
GOOD: `Cancel`

BAD: `No` (as a standalone label)
GOOD: `Keep subscription`

BAD: `Go back`
GOOD: `Cancel` or `Discard changes`

**Pair destructive/cancel buttons clearly:**

BAD: [Delete] [Cancel]
GOOD: [Delete project] [Keep project]

BAD: [Yes] [No]
GOOD: [Remove card] [Keep card]

### Disabled Button States

Never leave a disabled button without explanation. Users deserve to know why they cannot proceed.

BAD: A grayed-out `Save` button with no explanation.

GOOD: A grayed-out `Save changes` button with nearby text: "Add a title before saving."

GOOD: Tooltip on hover of disabled button: "You need admin permissions to publish."

---

## 2. Form Labels and Placeholder Text

### Labels: Always Visible

Labels must always be visible — not just when the field is empty. Floating labels that disappear on focus cause users to forget what they were filling in.

**Pattern: Short, noun-based labels**

BAD: `Please enter your first name here`
GOOD: `First name`

BAD: `What is your email address?`
GOOD: `Email address`

BAD: `Enter the name of your company (required)`
GOOD: `Company name` with a required indicator (*)

**Pattern: Match the label to the user's mental model**

BAD: `Username` (for a login that uses email)
GOOD: `Email address`

BAD: `Subscriber identifier`
GOOD: `Account number`

### Placeholder Text: Hints Only

Placeholder text is a hint, not a label. It disappears on input. Never use it as the sole label. Use it to show format examples or clarify expectations.

**Pattern: Format examples**

BAD placeholder: `Name`
GOOD placeholder: `e.g. Jane Smith`

BAD placeholder: `Phone number`
GOOD placeholder: `e.g. +1 (555) 000-0000`

BAD placeholder: `Date`
GOOD placeholder: `MM/DD/YYYY`

**Pattern: Hint at what is acceptable**

BAD placeholder: `Password`
GOOD placeholder: `At least 8 characters`

BAD placeholder: `Code`
GOOD placeholder: `6-digit code from your authenticator app`

### Required vs Optional Fields

Mark the minority. If most fields are required, mark optional ones. If most are optional, mark required ones. Never leave users guessing.

BAD: All fields have asterisks but no legend explaining what (*) means.

GOOD: "* Required" legend near the form top. Required fields marked (*).

GOOD (alternative): Label optional fields with "(optional)" in muted text.

### Help Text Below Fields

Use persistent help text for fields where the requirement is not obvious from the label alone.

BAD: `API key` with no guidance on format or where to find it.

GOOD:
```
API key
[___________________________]
Find this in Settings → API → Your keys
```

BAD: `Password` with no requirements shown until submission fails.

GOOD:
```
Password
[___________________________]
Must be at least 8 characters with one number
```

---

## 3. Error Messages

The three-part error message framework:
1. **What happened** — plain language, no blame, no jargon
2. **Why it happened** — cause, when it adds clarity
3. **How to fix it** — specific, actionable next step

### Inline Field Errors

Appear directly below the offending field. Trigger on blur or on submit, not on every keystroke.

BAD: `Error`
BAD: `Invalid input`
BAD: `This field is required.`
BAD: `Please enter a valid email.`

GOOD: `Enter your email address` (missing)
GOOD: `Check the email format — it should look like name@domain.com` (invalid format)
GOOD: `Password is too short — add at least 3 more characters` (specific feedback)
GOOD: `This email is already registered — sign in instead or reset your password` (conflict)

**Never blame the user:**

BAD: `You entered the wrong password.`
GOOD: `That password doesn't match. Try again or reset your password.`

BAD: `You forgot to fill in your name.`
GOOD: `Add your name to continue.`

### Form-Level Error Summary

When a form has multiple errors on submit, show a summary at the top and link to each field.

BAD: Red borders on multiple fields with no summary, leaving users to hunt for errors.

GOOD:
```
Fix 3 issues before continuing:
• Email address — enter a valid email
• Password — must be at least 8 characters
• Phone number — enter digits only, no dashes
```
Each item links to or scrolls to the field.

### Success Messages

Confirm what happened, specifically. Avoid generic "Success!" messages that leave users wondering what succeeded.

BAD: `Success!`
BAD: `Done.`
BAD: `Changes saved.`

GOOD: `Profile updated successfully.`
GOOD: `Password changed. You'll use your new password next time you sign in.`
GOOD: `Invitation sent to sarah@company.com`
GOOD: `Project "Q4 Campaign" deleted.` (with Undo link if reversible)

---

## 4. Empty States

Empty states occur in three contexts: first use, no results, and errors. Each requires different copy.

### First-Use Empty State

The user has arrived but has no data yet. This is a call to action, not an error.

**Pattern: Orient + Benefit + Action**

BAD:
```
No projects
```

GOOD:
```
Your projects will appear here

Create a project to start organizing your work and collaborating with your team.

[Create your first project]
```

BAD:
```
Nothing to show
```

GOOD:
```
No messages yet

When teammates send you messages, they'll appear here.

[Start a conversation]
```

### No Search Results

The user searched and found nothing. Help them try differently.

BAD: `No results.`
BAD: `We couldn't find anything.`

GOOD:
```
No results for "markeeting report"

Try:
• Checking for typos
• Using fewer or different keywords
• Searching in All Files instead of Recent

[Clear search]
```

GOOD (with spelling suggestion):
```
No results for "markeeting report"
Did you mean "marketing report"?

[Search "marketing report"] [Clear search]
```

### Error Empty State

Something went wrong loading content. Give users a path forward.

BAD: `Error loading data.`

GOOD:
```
Couldn't load your projects

There may be a connection issue. Your work is safe — this is just a display problem.

[Try again]
```

---

## 5. Loading Copy

Loading states are underused opportunities to set expectations and reduce perceived wait time.

### Short Loads (under 2 seconds)
Use a simple spinner with a brief label. Do not explain what is happening in detail.

BAD: `Loading...` (generic, but acceptable)
GOOD: `Loading your dashboard…`
GOOD: `Fetching results…`

### Medium Loads (2–10 seconds)
Set context so users know the wait is normal.

BAD: `Loading...` (feels broken after 3 seconds)

GOOD: `Analyzing your data — this takes about 5 seconds`
GOOD: `Generating your report…`

### Long Loads (10+ seconds)
Provide progress indicators and reassurance.

GOOD:
```
Building your export… (Step 2 of 3)
Formatting 2,340 records
This usually takes under a minute.
```

### After Load Completes
Briefly confirm what loaded, especially after slow operations.

GOOD: `Report ready — 2,340 rows exported`
GOOD: `Analysis complete`

---

## 6. Confirmation Dialogs

Confirmation dialogs interrupt flow. Use them only for irreversible or high-consequence actions.

### When to Use
- Deleting data that cannot be recovered
- Canceling a paid subscription
- Sending a bulk communication
- Overwriting someone else's work

### When NOT to Use
- Saving or publishing (users expect these to just work)
- Navigation away from a page (browser handles this)
- Actions that can be undone

### Structure

1. **Headline**: State what will happen. Not a question unless necessary.
2. **Body**: Explain the specific consequence. Name the thing affected.
3. **Primary button**: Label matches the action. Never just "Yes."
4. **Cancel button**: Clear escape hatch.

BAD:
```
Are you sure?
This action cannot be undone.
[OK] [Cancel]
```

GOOD:
```
Delete "Q4 Marketing Report"?
This will permanently remove the report and all its comments. You won't be able to recover it.
[Delete report] [Keep report]
```

BAD:
```
Confirm action?
[Yes] [No]
```

GOOD:
```
Remove Sarah Chen from this workspace?
Sarah will lose access to all projects and files immediately. You can invite her back at any time.
[Remove Sarah] [Cancel]
```

---

## 7. Permission Requests

Permission requests (camera, location, notifications) succeed when they explain the benefit before asking. The OS dialog comes after the in-app request — if users deny the in-app one, they never see the OS dialog.

**Pattern: Benefit before request**

BAD:
```
Allow notifications?
[Allow] [Deny]
```

GOOD:
```
Stay on top of your tasks

Get notified when deadlines approach, teammates mention you, or a file is ready to review. You can change this anytime in Settings.

[Turn on notifications] [Not now]
```

BAD:
```
Access your location?
[Allow] [Deny]
```

GOOD:
```
Find stores near you

Share your location to see real-time stock at nearby stores and get accurate delivery estimates.

[Share location] [Skip]
```

**Never request permissions on first launch** without context. Wait until the user takes an action that requires the permission.

---

## Quick Reference Checklist

- [ ] Button labels use verb + object format
- [ ] Destructive buttons name the thing being destroyed
- [ ] Form labels are always visible (not just placeholders)
- [ ] Placeholder text shows format examples, not repeats the label
- [ ] Error messages state what happened + how to fix it
- [ ] No error message blames the user
- [ ] Empty states have an action, not just a description
- [ ] Loading copy sets time expectations for waits over 3 seconds
- [ ] Confirmation dialogs name the specific item being affected
- [ ] Permission requests explain the user benefit before asking

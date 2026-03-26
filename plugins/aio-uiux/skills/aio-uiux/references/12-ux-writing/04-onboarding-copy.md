# Onboarding Copy

Onboarding copy is the first conversation your product has with a new user. It sets expectations, builds trust, and answers the question every new user is silently asking: "Am I in the right place, and can I do what I came here to do?" Good onboarding copy is invisible — it moves users forward without feeling like a tutorial.

---

## 1. Welcome Messages

The welcome message is the product's handshake. It should be brief, warm, and immediately useful. It is not the place for marketing language — the user already signed up.

### Principles
- Acknowledge the user, not the product
- Point to the immediate next action
- Set a time expectation if setup is required
- Never re-explain what the product is

BAD: `Welcome to Acme! Acme is the world's leading project management platform for teams of all sizes. We're so glad you're here! To get started, please complete the onboarding wizard.`

GOOD: `Welcome, Sarah. Let's get your workspace ready — it takes about 3 minutes.`

BAD: `You have successfully registered. Please configure your settings.`

GOOD: `You're in. Here's what to do first:`

BAD: `Welcome! Unlock the full power of Acme by completing your profile!`

GOOD: `Hi Marcus — your account is ready. Start by creating your first project.`

### First-Run Welcome Screen Copy

**Pattern: Name + Next action + Time estimate (optional)**

```
Welcome, [Name]

[Product] is ready. Here's how to get the most out of it in the next few minutes:

1. Create your first [core object]
2. Invite your team
3. Connect your [integration]

[Get started]  or  [Skip setup]
```

Always offer a skip. Forcing users through setup they are not ready for creates drop-off.

---

## 2. Feature Tours

Feature tours introduce UI elements. They fail when they describe what a button looks like rather than what it does for the user. Users scan tours — make every tooltip earn its place.

### Principles
- Benefit-focused, not feature-focused
- 3–5 steps maximum per tour
- Each tooltip: one idea, one action
- Always provide skip or exit
- Never block the UI entirely with a tour

### Tooltip Copy Pattern

**Weak (feature-focused):**
> This is the Dashboard. It shows your data.

**Strong (benefit-focused):**
> Your dashboard updates in real time — see how your campaigns are performing at a glance.

**Weak:**
> Click here to create a new project.

**Strong:**
> Create a project to organize tasks, files, and your team's work in one place.

**Weak:**
> This button exports your data.

**Strong:**
> Export to CSV or PDF anytime — your data, your format.

### Tour Step Count and Labels

BAD: A 12-step tour. Users abandon after step 3.
GOOD: 3–5 steps covering only the critical path.

BAD step label: `Step 4 of 9`
GOOD step label: `3 of 5` (brevity signals the end is near)

BAD last step: `You've completed the tour! Explore the app!`
GOOD last step: `You're ready. Your first project is one click away.` with primary CTA.

---

## 3. Empty State Guidance

Empty states during onboarding are the highest-leverage copy in the product. The user is staring at a blank slate — this is the moment to guide them.

### First-Use Empty State Pattern

**Structure: What it is + Why it matters + How to start**

BAD:
```
No projects yet
```

GOOD:
```
Your projects will live here

Bring together tasks, files, and your team's conversations in one place.

[Create your first project]
```

BAD:
```
Nothing here
```

GOOD:
```
No reports yet

Build a report to track progress, spot trends, and share results with your team.

[Create a report]   [See an example report]
```

### Show an Example

When empty states are complex (dashboards, charts, tables), consider showing a faded/skeleton example of what populated data looks like, with copy like:

GOOD: `This is what your dashboard looks like once you connect your data. [Connect now]`

GOOD: `Here's a sample report — create yours to see your actual numbers.`

---

## 4. Progressive Disclosure

Progressive disclosure shows information when the user needs it, not all at once. The copy principle: say less now, offer more on demand.

### Patterns

**Show/hide detail:**

BAD: Explain every setting in full on the settings page with long paragraphs.
GOOD: One-line description per setting + "Learn more" link for users who need detail.

**Staged onboarding:**

BAD: Show all 8 setup steps immediately.
GOOD: Show the first 2 steps. Reveal the next step only after the current one is complete.

**Contextual help:**

BAD: A help section at the bottom of the page that users must scroll to find.
GOOD: A `?` icon next to the field that opens a tooltip with the relevant explanation.

**Progressive field revelation:**

BAD: Show all optional fields immediately in a long form.
GOOD: Show required fields. Reveal optional fields with "Add more details (optional)" toggle.

---

## 5. Tooltip Help Text

Tooltips appear on hover or tap to explain UI elements. They are for clarification, not tutorials.

### Principles
- Max 2 sentences
- Explain the why, not the what
- Do not repeat the label
- Do not put critical information in tooltips (keyboard-only users cannot hover)

BAD tooltip on "API Key" label: `This is your API key.`
GOOD tooltip: `Used to connect external tools to your account. Keep it private — anyone with this key can access your data.`

BAD tooltip on "Two-factor authentication" toggle: `Two-factor authentication.`
GOOD tooltip: `Adds a second verification step when you sign in. Strongly recommended for accounts with admin access.`

BAD tooltip on "Archive" button: `Archives this item.`
GOOD tooltip: `Hides this project from your main view. You can restore it anytime from Archive.`

---

## 6. Permission Request Rationale

Permission requests (push notifications, camera, location, contacts) succeed when copy explains the benefit before the OS dialog appears. If users say no to the in-app prompt, they never reach the OS prompt.

### The Formula: Context + Benefit + Reassurance

BAD:
```
Enable notifications?
[Allow] [Deny]
```

GOOD:
```
Never miss what matters

Get notified when teammates mention you, deadlines approach, or a file is ready to review. You can customize or turn off notifications anytime.

[Turn on notifications] [Not now]
```

BAD (camera):
```
Camera access needed.
[OK]
```

GOOD (camera):
```
Scan to connect instantly

Point your camera at a QR code to join a workspace or connect a device — no typing needed.

[Allow camera access] [Enter code manually]
```

BAD (location):
```
Allow location access?
[Allow] [Deny]
```

GOOD (location):
```
Find what's near you

Share your location to see nearby stores, get accurate delivery times, and find events in your area. We never store your location.

[Share location] [Skip]
```

**Always include a "not now" or "skip" option.** Users who feel forced will deny and resent it.

---

## 7. Setup Wizard Copy

Multi-step setup wizards need to maintain momentum. Each step should feel achievable, not bureaucratic.

### Step Headlines

BAD step titles:
- `Step 1: Account Configuration`
- `Step 2: Profile Information`
- `Step 3: Notification Preferences`

GOOD step titles:
- `Set up your profile`
- `Invite your team`
- `Connect your tools`

### Progress Indicators

BAD: `Step 3 of 7 — Configuring workspace parameters`
GOOD: `3 of 5 — Almost there`

BAD: No indication of how many steps remain.
GOOD: `2 minutes left` or `Last step`

### Step Introduction Copy

Each step should open with a single sentence explaining why this step matters, not what to do.

BAD: `Fill in the fields below.`
GOOD: `Your profile helps teammates recognize you and know your role.`

BAD: `Complete this step to proceed.`
GOOD: `Connect your calendar to see deadlines alongside your events.`

### Skip Options

Provide skips for optional steps. Label them honestly.

BAD: `Skip` (on a step that has real consequences for skipping)
GOOD: `Set up later` (implies it can be done but is not urgent)
GOOD: `Skip this step` (if truly optional with no consequence)
BAD: No skip option on an optional step, forcing users to provide data they may not have ready.

---

## 8. First-Run Experience

The first-run experience covers the period from signup through the first "aha moment" — when the user gets value for the first time.

### Immediate Value Delivery

Do not defer value. The first action should produce a result the user can see or feel.

BAD first-run flow: Sign up → Fill 6-field profile → Verify email → Set notifications → Tour → Dashboard (empty)

GOOD first-run flow: Sign up → Create one thing → See it work → Invite (optional) → Done

### Confirmation Copy After First Action

When a user completes their first meaningful action, confirm it specifically.

BAD: `Done!`

GOOD: `Your first project is ready. Add tasks or invite a teammate to get started.`

GOOD: `Report created. Here's what you'll see once data starts flowing in.`

---

## 9. Delight Moments

Delight moments are unexpected moments of warmth or humor that make users feel good. They should be rare, contextual, and optional — never intrusive.

### When to Use Delight
- After a significant milestone (100th action, first export, 1-year anniversary)
- At completion of a hard or long task
- On a genuinely clever Easter egg path

### When NOT to Use Delight
- On error messages
- On routine actions (saving a file)
- As a substitute for actual UX quality

### Examples

BAD delight (wrong moment): `You're crushing it! 🔥🔥🔥` (on every button click)

GOOD delight (right moment):
```
100 tasks completed! 🎉
That's a serious amount of getting things done.
```

GOOD delight (end of long setup):
```
All done. Go make something great.
```

GOOD delight (Easter egg on repeated action):
```
You've exported 50 reports. We appreciate your commitment to spreadsheets.
```

---

## 10. Re-engagement Copy

Re-engagement copy brings dormant users back. It appears in emails, push notifications, and in-app banners after extended absence.

### Principles
- Do not guilt-trip ("You haven't logged in in 30 days!")
- Lead with what is new or waiting for them
- Make the action specific

BAD re-engagement email subject: `We miss you! Come back!`
GOOD: `3 new comments on your project`

BAD in-app banner: `Welcome back! You haven't been here in a while.`
GOOD: `Welcome back. You have 4 unread notifications and 2 tasks due this week.`

BAD push notification: `Your account needs attention.`
GOOD: `Mia left feedback on your design — check it out.`

---

## 11. Churn Prevention Copy

When a user is about to cancel or downgrade, copy can address the actual reason without being manipulative.

### Patterns

**Surface what they will lose (specific, not generic):**

BAD: `Are you sure you want to cancel? You'll lose access to premium features.`

GOOD:
```
Before you cancel, here's what you'll lose:
• 24 active projects (you can export them first)
• Custom domain yourname.acme.com
• Priority support access

[Export my data] [Continue to cancel] [Keep my plan]
```

**Offer a pause instead of cancel:**
GOOD: `Need a break? Pause your subscription for up to 3 months — your data stays put and you can resume anytime.`

**Downgrade gracefully:**
GOOD: `Moving to the free plan. You'll keep access to your 3 most recent projects. Archive the rest to keep them safe.`

**Never:**
- Dark patterns that hide the cancel button
- Making cancellation require a phone call
- Repeated "are you sure?" dialogs
- Guilt language ("Abandon your team?")

---

## Quick Reference: Onboarding Copy Checklist

- [ ] Welcome message is brief and points to next action (not re-explaining the product)
- [ ] Feature tour is 5 steps or fewer, benefit-focused
- [ ] Empty states have a headline + benefit + action CTA
- [ ] Progressive disclosure hides advanced options behind "learn more" or toggles
- [ ] Tooltips are 1–2 sentences and explain the why, not the what
- [ ] Permission requests explain user benefit before the OS dialog appears
- [ ] Setup wizard steps have human-readable titles, not "Step N of N: Action"
- [ ] Each wizard step has a skip option if the step is optional
- [ ] First meaningful action produces visible value
- [ ] Delight moments are rare and contextually appropriate
- [ ] Re-engagement copy leads with what is waiting, not absence shaming
- [ ] Churn prevention shows specific losses with a data export option

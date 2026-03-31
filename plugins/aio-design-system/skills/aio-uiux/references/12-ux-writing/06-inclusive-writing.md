# Inclusive Writing

Inclusive writing ensures your product communicates clearly and respectfully with every user — regardless of gender, culture, ability, language background, or technical literacy. It is not about avoiding offense for its own sake. It is about writing that works for more people without working against anyone.

---

## 1. Gender-Neutral Language

Default to gender-neutral language in all UI copy, documentation, and marketing. Do not assume gender unless the user has explicitly told you their pronouns.

### Avoid Gendered Pronouns in Generic Contexts

BAD: `When a user submits their form, he will receive a confirmation email.`
GOOD: `When a user submits the form, they will receive a confirmation email.`

BAD: `Each team member can access his or her own dashboard.`
GOOD: `Each team member can access their own dashboard.`

BAD: `The admin can manage his settings from the control panel.`
GOOD: `The admin can manage their settings from the control panel.`

**"They/them" as singular is grammatically correct and widely accepted.** It has been used in English for centuries. Do not avoid it.

### Rewrite to Eliminate Pronoun Need

Often the cleanest fix is a rewrite that removes the pronoun entirely.

BAD: `When a developer pushes code, he should run the test suite.`
GOOD: `Run the test suite before pushing code.`

BAD: `Ask your manager for his approval.`
GOOD: `Get manager approval.`

BAD: `The customer must verify his identity.`
GOOD: `Customers must verify their identity.` or `Verify your identity before continuing.`

### Gendered Role Titles

BAD: `Salesman`, `Fireman`, `Stewardess`, `Chairman`, `Manpower`
GOOD: `Sales rep`, `Firefighter`, `Flight attendant`, `Chair` or `Chairperson`, `Workforce` or `Staffing`

BAD: `Hey guys` (in UI copy or emails to groups)
GOOD: `Hey everyone`, `Hi team`, `Hello`

### User-Set Pronouns

If your product collects user pronouns, use them consistently in generated copy.

GOOD: Profile settings include `Pronouns` field with options (She/her, He/him, They/them, Other, Prefer not to say).

GOOD: System-generated text like "Sarah updated her profile" uses the stored pronoun.

---

## 2. Cultural Sensitivity

Copy written for one culture can be confusing, offensive, or meaningless in another. Assume a global audience.

### Avoid Culture-Specific References

BAD: `This is a home run for your team.` (baseball metaphor — unfamiliar outside North America)
GOOD: `This is a big win for your team.`

BAD: `Knock it out of the park.`
GOOD: `Make it a success.`

BAD: `It's a slam dunk.`
GOOD: `It's a clear choice.`

BAD: `Like a Super Bowl commercial — but for your brand.`
GOOD: `Like your biggest, most polished campaign ever.`

### Avoid Idioms That Do Not Translate

Idioms translate literally and produce nonsense in other languages (and for users reading in a second language).

BAD: `Get the ball rolling`
GOOD: `Get started`

BAD: `Hit the ground running`
GOOD: `Start quickly`

BAD: `Burn the midnight oil`
GOOD: `Work late`

BAD: `Bite the bullet`
GOOD: `Accept the difficult option`

BAD: `Under the weather`
GOOD: `Not feeling well`

### Date and Time Formats

Never hardcode date formats in UI copy. Use system locale or show the format explicitly.

BAD: `Expires 04/05/26` (Is that April 5 or May 4?)
GOOD: `Expires April 5, 2026` (unambiguous)
GOOD: Display using user's locale format, detected automatically

BAD: `Meeting at 3pm` (Which timezone?)
GOOD: `Meeting at 3:00 PM EST (UTC-5)`
GOOD: `Meeting at 3:00 PM — your local time`

### Currency and Measurements

BAD: Show all prices in USD with no localization.
GOOD: Detect locale and show local currency (with conversion note if needed).

BAD: `Distance: 5 miles`
GOOD: Show miles or kilometers based on locale.

BAD: `Temperature: 98°F`
GOOD: Show °F or °C based on locale.

---

## 3. Plain Language

Plain language is not dumbing down. It is respecting the reader's time. Even expert users prefer plain language for UI — they are trying to complete a task, not read a textbook.

### Target Grade 8 Reading Level

Use the Hemingway App or Flesch-Kincaid tests to verify. Grade 8 means:
- Average sentence length: 15–20 words
- Common vocabulary
- Active voice
- Concrete nouns

### Replace Jargon with Plain Alternatives

| Jargon | Plain Alternative |
|---|---|
| Authenticate | Sign in / Verify your identity |
| Deprecate | Remove / Phase out |
| Instantiate | Create / Start |
| Provision | Set up / Create |
| Leverage | Use |
| Utilize | Use |
| Interface with | Work with / Connect to |
| Facilitate | Help / Allow |
| Implement | Add / Build / Set up |
| Modality | Mode / Method |
| Granular | Detailed / Specific |
| Holistic | Full / Complete / Overall |
| Onboard (verb) | Set up / Get started |
| Sunset | Remove / End / Stop supporting |
| Whitelist / Blacklist | Allow list / Block list |

### Define Technical Terms on First Use

When a technical term is necessary, define it the first time.

BAD: `Your webhook is now active.`

GOOD: `Your webhook is now active. Webhooks send automatic notifications to your other tools when something happens in this app.`

BAD: `Configure your OAuth credentials.`

GOOD: `Configure your OAuth credentials — these let users sign in with their existing Google or GitHub account instead of creating a password.`

After first use, the term can stand alone.

---

## 4. Technical Term Handling

### When to Use Technical Terms

Use technical terms when:
- The user is clearly technical (developer docs, API reference, admin settings)
- The term is more precise than plain alternatives
- The term is widely understood in the user's domain

Do not use technical terms in:
- General user-facing UI
- Onboarding flows
- Error messages shown to non-technical users
- Marketing copy

### Layered Documentation Pattern

Serve different audiences in the same docs using progressive disclosure.

GOOD:
```
Webhook
A webhook sends a real-time notification to another service when something happens.
[For developers: see the full webhook API reference →]
```

GOOD settings page:
```
Two-factor authentication
Sign in with your password plus a one-time code for extra security.
[Advanced: Configure TOTP or hardware key →]
```

---

## 5. Bias-Free Language

Language reflects assumptions. Audit copy for assumptions about users' abilities, backgrounds, health, and identity.

### Ability and Disability

Use person-first language or identity-first language based on context. When uncertain, use person-first.

BAD: `Disabled users`, `The handicapped`, `Suffers from dyslexia`
GOOD: `Users with disabilities`, `People with disabilities`, `Has dyslexia`

BAD: `Normal users` (implies others are abnormal)
GOOD: `Users without assistive technology` or simply restructure to not require the distinction

BAD: `Blind to these limitations`
GOOD: `Unaware of these limitations`

BAD: `Deaf to feedback`
GOOD: `Unresponsive to feedback`

### Age

BAD: `Even your grandparents could use this.` (condescending)
BAD: `For tech-savvy millennials`
GOOD: Describe the actual user need or skill level without age references

BAD: `Young professional`
GOOD: `Early-career professional` (if age-adjacent language is unavoidable)

### Socioeconomic Assumptions

BAD: `Everyone has a smartphone.` (in documentation)
GOOD: Consider users on older devices, limited data plans, or shared devices.

BAD: Assuming all users have reliable high-speed internet.
GOOD: Design for slow connections; copy should not promise speed-dependent features without fallback.

### Mental Health Language

BAD: `This feature is insane.`, `The response time is crazy fast.`, `I'm OCD about clean code.`
GOOD: `This feature is incredible.`, `The response time is blazing fast.`, `I'm meticulous about clean code.`

---

## 6. Screen Reader Friendly Copy

Copy must make sense when read aloud by a screen reader, out of original context.

### Link Text

Screen reader users often navigate by jumping between links. Links must be meaningful without surrounding context.

BAD: `Click here to read the full report.`
BAD: `Read more.`
BAD: `Learn more.` (multiple times on the same page)

GOOD: `Read the Q4 performance report.`
GOOD: `Learn more about two-factor authentication.`
GOOD: `Download the accessibility guide (PDF, 2.4 MB).`

### Button Labels

BAD: `X` (close button with no label)
GOOD: `Close` or `Close dialog` (visible or aria-label)

BAD: Icon-only buttons with no accessible name.
GOOD: Every interactive element has either visible text or an `aria-label`.

### Alt Text Patterns

Alt text for informational images: describe what the image communicates, not what it looks like.

BAD: `A graph.`
BAD: `Image of bar chart.`
GOOD: `Bar chart showing monthly revenue growth from $120K in January to $340K in June.`

BAD alt for decorative images: Long description of a decorative flourish.
GOOD: Empty alt (`alt=""`) for purely decorative images — screen readers skip them.

### Form Labels and Instructions

BAD: Placeholder text as the only label — vanishes on input, screen readers may not read it.
GOOD: Visible `<label>` element for every form field.

BAD: Error announced only by color change (red border).
GOOD: Error text injected into the DOM, associated with the field via `aria-describedby`.

---

## 7. Localization-Ready Writing

Writing for a global product must survive translation. Translators work from your source strings — if the English is idiomatic, ambiguous, or pun-dependent, it breaks.

### String Length Budget

Translated text is often 30–50% longer than English. Design for expansion.

BAD: A button that fits `Save` in English but clips `Enregistrer` in French or `Сохранить` in Russian.
GOOD: Button UI allows for text 40% longer than the English string.

BAD: Hardcoded pixel widths for UI elements containing text.
GOOD: Flexible containers that expand with content.

### Avoid Concatenated Strings

Concatenated strings break when word order changes in other languages.

BAD (code): `"Hello " + username + ", you have " + count + " messages."`
(Word order in Japanese, Arabic, or German may be completely different)

GOOD: Use a single translatable string with placeholders:
`"Hello {name}, you have {count} messages."`
Translators can reorder the placeholders as their language requires.

### Avoid Text in Images

Text baked into images cannot be translated or resized.

BAD: Marketing images with English text overlaid.
GOOD: Text as HTML over the image, styled with CSS.

### Remove Untranslatable Elements

Puns, rhymes, and wordplay do not translate.

BAD: `Automate. Celebrate.` (rhyme depends on English)
BAD: `We Excel at Sheets.` (spreadsheet pun)
GOOD: Write without rhyme or pun. Let translators write naturally in their language.

### Pluralization

English has two plural forms (1 item / 2 items). Other languages have up to 6 (Arabic). Never hardcode plurals.

BAD: `1 message` / `2 messages` handled as string concatenation
GOOD: Use an i18n library (ICU MessageFormat, i18next, etc.) that handles plural rules per locale.

---

## 8. Right-to-Left (RTL) Considerations

Arabic, Hebrew, Persian, and Urdu read right to left. RTL support is a technical and copy challenge.

### Directional Language in Copy

Avoid directional references that break in RTL layouts.

BAD: `Click the arrow on the right to continue.`
GOOD: `Click the forward arrow to continue.` (direction is relative to reading direction)

BAD: `See the panel on the left.`
GOOD: `See the navigation panel.` (refer to by name, not direction)

BAD: `Swipe left to delete.`
GOOD: `Swipe to delete.` (direction is mirrored in RTL; let gesture handle it)

### Numbers in RTL Text

Numbers always read left-to-right, even in RTL text. Do not reverse them.

BAD: Displaying `2026-03-15` as `51-30-6202` in RTL context.
GOOD: Numbers remain LTR within RTL text flow.

### Quotation Marks

Different languages use different quotation marks. Use Unicode characters, not ASCII, and ensure your i18n layer handles locale-specific punctuation.

English: "quote"
French: « quote »
German: „quote"
Japanese: 「quote」

---

## 9. Bias Audit Checklist

Run this checklist on all UI copy, marketing, and documentation before publishing.

**Gender:**
- [ ] No gendered pronouns used for generic roles
- [ ] Role titles are gender-neutral
- [ ] "They/them" used for users whose gender is unknown
- [ ] No "guys" used for mixed or unknown groups

**Culture:**
- [ ] No sports or culture-specific metaphors
- [ ] No idioms that require cultural knowledge
- [ ] Dates, times, currencies shown in locale-aware format

**Ability:**
- [ ] No casual use of disability-related language ("blind to," "deaf to," "lame")
- [ ] All links are meaningful without context
- [ ] All buttons have accessible names
- [ ] Form fields have visible labels, not just placeholders

**Localization:**
- [ ] No text concatenation — single translatable strings with placeholders
- [ ] No text baked into images
- [ ] No puns or rhymes that depend on English
- [ ] UI allows for 40% string expansion

**Plain Language:**
- [ ] Technical terms defined on first use
- [ ] No jargon in user-facing error messages or onboarding
- [ ] Reading level tested at Grade 8 or below for general UI

**Representation:**
- [ ] Stock imagery includes diverse people (age, race, ability, body type)
- [ ] Examples use diverse names (not all Western European)
- [ ] No socioeconomic assumptions (e.g., "everyone has the latest iPhone")

---

## Quick Reference: Inclusive Writing Substitutions

| Avoid | Use Instead |
|---|---|
| He / she (generic) | They |
| His or her | Their |
| Guys | Everyone, team, all |
| Mankind | People, humanity |
| Manpower | Workforce, staff, team |
| Blacklist / whitelist | Block list / allow list |
| Master / slave | Primary / replica, leader / follower |
| Click here | [Descriptive action] |
| Read more | Read more about [topic] |
| Crazy / insane | Impressive, remarkable, intense |
| OCD (casual) | Meticulous, thorough, precise |
| Blind to | Unaware of |
| Deaf to | Unresponsive to |
| Suffers from X | Has X, lives with X |
| Normal users | Users without assistive technology |
| Get the ball rolling | Get started |
| Hit the ground running | Start quickly |
| Home run | Big win, great result |

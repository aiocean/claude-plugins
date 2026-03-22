---
name: aio-editor-review
description: Review translated chapters as a biên tập viên — checks glossary consistency, tone, completeness, and cross-chapter coherence. Triggers: "review translation", "editor review", "biên tập", "check translation quality", "kiểm tra bản dịch".
context: fork
---

# Editor Review — Translation Quality Review & Editing

## Environment
- jread: !`which jread 2>/dev/null || echo "NOT INSTALLED — see references/installation.md"`

Act as a **biên tập viên** (editor) who reviews existing translations for quality, consistency, and adherence to the style guide in CLAUDE.md.

## Gate: Verify Setup & Translations

```bash
jread stats workspace/
```

If this fails → **STOP**. Tell user: "Project not set up. Run `aio-epub-setup` first."

If no chapters have translations → **STOP**. Tell user: "No translations found. Run `aio-epub-translate` first."

```bash
test -f CLAUDE.md && echo "OK" || echo "MISSING"
```

If CLAUDE.md missing → **STOP**. Tell user: "No CLAUDE.md found. Run `aio-epub-setup` first."

## Core Principle

> The editor does NOT re-translate. The editor **reads the original and translation side by side**,
> checks against the style guide and glossary, and makes surgical fixes.
> Every edit must have a reason.

## Workflow

```
1. READ CLAUDE.md    → internalize style guide, glossary, translation notes
2. PICK CHAPTER      → user specifies or pick first translated chapter not yet reviewed
3. BATCH REVIEW      → 20 items at a time: original vs translation side by side
4. FIX ISSUES        → jread set for each fix
5. UPDATE CLAUDE.md  → glossary additions, translation notes, mark chapter as reviewed
6. CROSS-CHECK       → glossary consistency across previously reviewed chapters
```

## Phase 1: Preparation

### Step 1: Read CLAUDE.md
Read the entire CLAUDE.md. Internalize:
- Author's voice and tone
- All glossary entries (People, Domain Terms, Recurring Phrases)
- Translation notes from previous chapters
- "Do NOT" rules

### Step 2: Check progress
```bash
jread stats workspace/
```

Pick the chapter to review (user specifies, or first translated chapter).

## Phase 2: Review (per chapter)

### Step 3: Batch review — 20 items at a time

**NEVER dump all items.** Always use `--limit`:

```bash
# Get first 20 items (translated or not)
jread list workspace/OEBPS/Text/chapter0001.html --limit=20
```

For each item in the batch, use `jread get` to see the original text, context, and current translation:
```bash
jread get workspace/OEBPS/Text/chapter0001.html <id>
```

### Step 4: Review checklist per batch

For each translated item, check:

| Check | What to look for |
|-------|-----------------|
| **Glossary consistency** | Does this item use glossary terms correctly? Any term translated differently from what CLAUDE.md says? |
| **Tone & voice** | Does the translation match the author's voice described in CLAUDE.md? Too formal? Too casual? |
| **Completeness** | Is anything from the original missing in the translation? Added? |
| **Natural Vietnamese** | Does it read naturally? Awkward phrasing? Unnatural sentence structure? |
| **Pronoun consistency** | Are pronouns (tôi/bạn/chúng ta) consistent with CLAUDE.md rules? |
| **Cultural adaptation** | Are cultural references handled per CLAUDE.md guidelines? |
| **Flow between paragraphs** | Does the translation flow naturally from the previous paragraph? |

### Step 5: Fix issues

For each issue found, fix with `jread set`:
```bash
jread set workspace/OEBPS/Text/chapter0001.html <id> "<corrected translation>" --lang=vi
```

**Document every fix reason** — you'll add these to Translation Notes later.

### Step 6: Next batch
```bash
# Next 20 items
jread list workspace/OEBPS/Text/chapter0001.html --from=20 --limit=20
```

Repeat Steps 4-6 until all translated items in the chapter are reviewed.

## Phase 3: Update CLAUDE.md

After reviewing the chapter:

### Update Glossary section
- Add any new terms discovered during review
- Change TENTATIVE terms to CONFIRMED if now certain
- Add to Rejected Translations if you changed a term
- Add new Recurring Phrases found

### Update Translation Notes section
Add a review entry for the chapter:
```markdown
### Chapter N — [Title] (REVIEWED)
- Reviewed: [date]
- Issues found: [count]
- Fixes: [brief list of what was changed and why]
- Glossary updates: [any terms added/changed]
- Status: REVIEWED
```

## Phase 4: Cross-Chapter Consistency

After reviewing 3+ chapters, do a cross-chapter glossary audit:

1. Read all glossary entries in CLAUDE.md
2. For each key term, spot-check usage across reviewed chapters:
   ```bash
   # Check a specific item in another chapter
   jread get workspace/OEBPS/Text/chapter0002.html <id>
   ```
3. If inconsistencies found, fix them and note in Translation Notes

## Review Priority

When deciding what to focus on:

1. **Glossary violations** (highest) — inconsistent terms break reader trust
2. **Missing/added content** — accuracy is non-negotiable
3. **Tone mismatches** — must match author's voice
4. **Awkward phrasing** — readability matters
5. **Minor style preferences** (lowest) — don't over-edit

## Common Editor Mistakes

**Do NOT re-translate from scratch.** The editor improves, not replaces. If a translation is fundamentally wrong, flag it and re-translate that specific item only.

**Do NOT edit for personal style preference.** Edit for consistency with CLAUDE.md guidelines. If the style guide says casual, don't make it formal just because you prefer formal.

**Do NOT skip the glossary update.** Every review session must end with CLAUDE.md updates.

## Related Skills

- **aio-epub-setup** — set up a new translation project
- **aio-epub-research** — research book before translating
- **aio-epub-translate** — translate chapters
- **aio-epub-package** — export final EPUB files

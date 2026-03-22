---
name: aio-epub-translate
description: Translate chapters in a set-up EPUB project in batches of 20 items with glossary maintenance. Triggers: "dịch sách", "translate epub", "translate chapter", "dịch tiếp", "continue translating". Requires aio-epub-setup first.
---

# EPUB Translate — Chapter Translation

## Environment
- jread: !`which jread 2>/dev/null || echo "NOT INSTALLED — see references/installation.md"`

Translate chapters in an already-set-up EPUB project. This skill ONLY translates.

## Gate: Verify Setup

```bash
jread stats workspace/
```

If this fails → **STOP**. Tell user: "Project not set up. Run `aio-epub-setup` first."

Also verify:
```bash
test -f CLAUDE.md && echo "OK" || echo "MISSING"
```

If CLAUDE.md missing → **STOP**. Tell user: "No CLAUDE.md found. Run `aio-epub-setup` first."

## Core Principles

> Claude is NOT a translation API that processes one paragraph at a time.
> Claude is the **translation director** who reads the batch first,
> understands the author's voice, then translates with full awareness.

> The goal is a translation that reads naturally in the target language.
> You are free to add sentences, split paragraphs, restructure ideas, rephrase for flow,
> use literary techniques native to the target language. What matters is preserving
> meaning, tone, and emotional impact — not mirroring the source word-for-word.

## Before Translating

1. **Read CLAUDE.md** — internalize style guide, glossary, translation notes, do-not rules
2. **Check progress** — find where to resume:
   ```bash
   jread stats workspace/ --incomplete
   ```

## Translation Loop (per chapter)

### Step 1: Get chapter overview
```bash
jread stats workspace/ --incomplete
```

Pick the next chapter to translate.

### Step 2: Read batch of 20 items
**NEVER dump all items at once.** Always use `--limit`:

```bash
# First 20 untranslated items
jread list workspace/OEBPS/Text/chapter0001.html --untranslated --limit=20
```

For each batch, understand:
- What is happening in this section?
- What new terms are introduced?
- What is the author's tone?
- Any ambiguous passages?

### Step 3: Update Glossary in CLAUDE.md
Before writing translations, update the Glossary section with:
- New proper nouns
- New technical terms
- Recurring phrases
- Uncertain terms (mark as [TENTATIVE])

### Step 4: Translate the batch

Translate all items in the batch simultaneously — not one at a time. This allows:
- Forward reference (a term in para 5 clarified in para 12)
- Consistent pronoun choices
- Natural flow between consecutive sentences

**HTML Preservation Rule:** The `text` field from `jread list` contains innerHTML — it may include inline tags like `<em>`, `<strong>`, `<a href="...">`, `<span>`, etc. You MUST preserve all HTML tags in the translation. Only translate the visible text content, never alter or remove tags, attributes, or structure.

Example:
- Source: `He was <em>absolutely</em> certain.`
- Correct: `Anh ta <em>hoàn toàn</em> chắc chắn.`
- Wrong: `Anh ta hoàn toàn chắc chắn.` ← lost `<em>`

Write translations:
```bash
jread set workspace/OEBPS/Text/chapter0001.html <id> "<translation>" --lang=vi
```

### Step 5: Next batch
```bash
jread list workspace/OEBPS/Text/chapter0001.html --untranslated --limit=20
```

Repeat Steps 2-5 until no untranslated items remain.

### Step 6: Verify chapter completion
```bash
jread stats workspace/ --incomplete
```

Chapter should no longer appear when `translated == total`.

### Step 7: Update Translation Notes in CLAUDE.md
Note decisions made, difficulties encountered, terms added to Glossary.

Then move to next chapter.

## Resuming Work

If starting a new session:

1. Read `CLAUDE.md` — style guide, glossary, translation notes
2. `jread stats workspace/ --incomplete` — find resume point
3. `jread list <chapter.html> --untranslated --limit=20` — start translating

## Common Mistakes

**Listing all items at once without `--limit`** — floods context. Always use `--limit=20`.

**Translating without reading the batch first** — causes inconsistent terminology and wrong tone.

**Translating one paragraph at a time via jread get** — too slow, misses cross-paragraph context.

**Not updating Glossary in CLAUDE.md** — same term translated 3 different ways.

**Not checking stats after each chapter** — missed paragraphs discovered at the end.

## Related Skills

- **aio-epub-setup** — set up a new translation project
- **aio-epub-research** — research book before translating
- **aio-editor-review** — review and edit existing translations
- **aio-epub-package** — export final EPUB files

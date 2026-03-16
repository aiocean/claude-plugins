# Translation Workflow

Complete step-by-step guide for translating an EPUB book with jread and Claude.

## Phase 0: Setup (Once per book)

### Step 1: Create project structure
```bash
mkdir -p my-book/{source,workspace,output}
cp original.epub my-book/source/book.epub
cd my-book
```

### Step 2: Create CLAUDE.md
Copy template from `claude-md-template.md` and fill in:
- Book title, author, language
- Translation style (tone, voice, audience)
- Key terms you already know

### Step 3: Unpack and mark
```bash
jread unpack source/book.epub workspace/
jread info workspace/        # → note rootDir and spine
jread mark workspace/        # → marks all translatable elements
```

### Step 4: Check progress
```bash
jread stats workspace/       # → shows all chapters, 0% translated
```

You're ready to translate.

---

## Phase 1: Per-Chapter Translation

### The Golden Rule
**Read the entire chapter before translating any paragraph.**

Why: Translation context is cumulative. The meaning of paragraph 3 often depends on what was said in paragraph 1. If you translate sequentially without reading ahead, you'll make choices in paragraph 3 that contradict paragraph 15.

### Step 1: Get chapter overview
```bash
# Check total items and find resume point
jread stats workspace/ --incomplete
# → shows lastTranslatedIndex per chapter; -1 means not started
```

### Step 2: Read in batches of 20 items
**NEVER dump all items at once.** Use `--limit` to read 20 items per batch:

```bash
# Batch 1: first 20 untranslated items
jread list workspace/OEBPS/Text/chapter0001.html --untranslated --limit=20

# Batch 2: next 20 (after translating the first batch)
jread list workspace/OEBPS/Text/chapter0001.html --untranslated --limit=20
# (--untranslated automatically skips already-translated items, no manual offset needed)
```

For each batch, read the text and understand:
- What is happening in this section?
- What new terms are introduced?
- What is the author's tone (energetic? reflective? technical)?
- Are there ambiguous passages?

### Step 3: Update glossary before translating
Before writing a single translation, update the Glossary section in `CLAUDE.md` with:
- New proper nouns (people, places, organizations)
- New technical terms
- Recurring phrases that should be consistent
- Any terms you're uncertain about (mark as [TENTATIVE])

### Step 4: Translate each batch

For untranslated items only:
```bash
jread list workspace/OEBPS/Text/chapter0001.html --untranslated --limit=20
```

Translate all items in the batch simultaneously in Claude's context — not one at a time. This allows:
- Forward reference (a term in para 5 clarified in para 12)
- Consistent pronoun choices across the batch
- Natural flow between consecutive sentences

Write translations:
```bash
jread set workspace/OEBPS/Text/chapter0001.html <id> "<translation>" --lang=vi
```

Then move to the next batch of 20 until the chapter is complete.

### Step 4: Verify chapter completion
```bash
jread stats workspace/ --incomplete
# chapter0001 should no longer appear when translated == total
```

### Step 5: Update Translation Notes in CLAUDE.md
Note any decisions made, difficulties encountered, terms added to the Glossary section.

---

## Phase 2: Quality Review

After completing 3-5 chapters, do a consistency check:

### Glossary audit
Read the Glossary section in `CLAUDE.md`. Are all terms actually being used consistently? If you find inconsistencies, use `jread get` to check specific paragraphs and `jread set` to correct them.

### Export for review
```bash
jread pack workspace/ output/book-bilingual.epub
```

Open in an EPUB reader. Read the translation naturally. Fix any awkward passages with `jread set`.

---

## Phase 3: Final Export

When all chapters are 100% translated:

```bash
# Check 100% completion
jread stats workspace/

# Export bilingual (for reference / learning)
jread pack workspace/ output/book-bilingual.epub

# Export clean (for reading)
jread pack workspace/ output/book-clean.epub --mode=clean
```

---

## Handling Special Content

### Headings
Translate headings like regular text. The `mark` command skips headings that look like "Chapter 1", "Part II", etc. Translate descriptive headings normally.

### Lists
Each list item is marked separately. Translate each item independently but with awareness of the list as a whole.

### Block quotes
Translate the quote AND verify the attribution (author name) against the Glossary section in CLAUDE.md.

### Footnotes / endnotes
Translate the note text. Keep citation numbers unchanged.

### Code / technical commands
These are NOT marked by `jread mark` (blacklisted). Don't translate them.

### Tables
Table cells that are prose are marked. Column headers may or may not be marked depending on length. Check with `jread list`.

---

## Common Mistakes

**❌ Listing all items at once without `--limit`**
Result: Chapters with 100+ items flood the context window. Always use `--limit=20`.

**❌ Translating without reading the chapter first**
Result: Inconsistent terminology, wrong tone choices, missed context.

**❌ Translating one paragraph at a time via jread get**
Result: Very slow, misses cross-paragraph context, unnatural flow.

**❌ Never updating the Glossary section in CLAUDE.md**
Result: The same English term translated 3 different ways across chapters.

**❌ Not checking jread stats after each chapter**
Result: Missed paragraphs discovered only at the end.

**❌ Editing workspace/ HTML files directly**
Result: Broken EPUB structure, lost markers.

---

## Resuming Work

If Claude starts a new session:

1. Read `CLAUDE.md` — understand the book, style guide, glossary, and translation notes
2. Run `jread stats workspace/ --incomplete` — see which chapters still need work and their `lastTranslatedIndex`
3. Resume: `jread list <next-chapter.html> --untranslated --limit=20`

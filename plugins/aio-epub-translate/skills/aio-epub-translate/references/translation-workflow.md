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

### Step 4: Create glossary.md
Copy template from `glossary-guide.md`. Leave tables empty for now.

### Step 5: Check progress
```bash
jread stats workspace/       # → shows all chapters, 0% translated
```

You're ready to translate.

---

## Phase 1: Per-Chapter Translation

### The Golden Rule
**Read the entire chapter before translating any paragraph.**

Why: Translation context is cumulative. The meaning of paragraph 3 often depends on what was said in paragraph 1. If you translate sequentially without reading ahead, you'll make choices in paragraph 3 that contradict paragraph 15.

### Step 1: Read the full chapter
```bash
jread list workspace/OEBPS/Text/chapter0001.html | jq -r '.items[].text'
```

Read ALL the text. Understand:
- What is this chapter about?
- What new terms are introduced?
- What is the author's tone here (energetic? reflective? technical)?
- Are there any ambiguous passages?

### Step 2: Update glossary before translating
Before writing a single translation, update `glossary.md` with:
- New proper nouns (people, places, organizations)
- New technical terms
- Recurring phrases that should be consistent
- Any terms you're uncertain about (mark as [TENTATIVE])

### Step 3: Translate in batches of 15-20 paragraphs

Get the IDs:
```bash
jread list workspace/OEBPS/Text/chapter0001.html | jq '.items[] | select(.hasTranslation == false) | .id'
```

For each batch, translate all paragraphs in Claude's context simultaneously — not one at a time. This allows:
- Forward reference (a term in para 5 clarified in para 12)
- Consistent pronoun choices across the batch
- Natural flow between consecutive sentences

Write translations:
```bash
jread set workspace/OEBPS/Text/chapter0001.html <id> "<translation>" --lang=vi
```

### Step 4: Verify chapter completion
```bash
jread stats workspace/ | jq '.chapters[] | select(.file | contains("chapter0001"))'
```

Should show `total == translated`.

### Step 5: Update translation-notes.md
Note any decisions made, difficulties encountered, terms added to glossary.

---

## Phase 2: Quality Review

After completing 3-5 chapters, do a consistency check:

### Glossary audit
Read `glossary.md`. Are all terms actually being used consistently? If you find inconsistencies, use `jread get` to check specific paragraphs and `jread set` to correct them.

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
jread stats workspace/ | jq '{total, translated, progress}'

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
Translate the quote AND verify the attribution (author name) against the glossary.

### Footnotes / endnotes
Translate the note text. Keep citation numbers unchanged.

### Code / technical commands
These are NOT marked by `jread mark` (blacklisted). Don't translate them.

### Tables
Table cells that are prose are marked. Column headers may or may not be marked depending on length. Check with `jread list`.

---

## Common Mistakes

**❌ Translating without reading the chapter first**
Result: Inconsistent terminology, wrong tone choices, missed context.

**❌ Translating one paragraph at a time via jread get**
Result: Very slow, misses cross-paragraph context, unnatural flow.

**❌ Never updating glossary.md**
Result: The same English term translated 3 different ways across chapters.

**❌ Not checking jread stats after each chapter**
Result: Missed paragraphs discovered only at the end.

**❌ Editing workspace/ HTML files directly**
Result: Broken EPUB structure, lost markers.

---

## Resuming Work

If Claude starts a new session:

1. Read `CLAUDE.md` — understand the book and style guide
2. Read `glossary.md` — recall all established terminology
3. Run `jread stats workspace/` — see current progress
4. Run `jread list <next-chapter.html>` — find where to continue
5. Resume from first item with `hasTranslation: false`

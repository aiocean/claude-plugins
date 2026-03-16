---
name: aio-epub-research
description: |
  Use when user wants to research a book before translating, says "research sách",
  "tìm hiểu sách", "research book", "nghiên cứu trước khi dịch", "prepare translation",
  "tìm thuật ngữ", "research terminology", "find Vietnamese equivalents",
  or needs to understand a book's context, author style, domain terminology,
  and Vietnamese translation conventions before starting translation.
  Run after aio-epub-setup, before aio-epub-translate.
---

# EPUB Research — Pre-Translation Book Research

Research the book thoroughly before translating. Understand the author, domain, terminology, and Vietnamese translation conventions. Populates CLAUDE.md with informed glossary and style guide.

## Gate: Verify Setup

```bash
jread stats workspace/
test -f CLAUDE.md && echo "OK" || echo "MISSING"
```

If either fails → **STOP**. Tell user: "Run `aio-epub-setup` first."

## Why This Step Matters

> A translator who doesn't understand the book will translate words.
> A translator who researches the book will translate meaning.

Skipping research leads to:
- Wrong terminology choices discovered 10 chapters in
- Tone that doesn't match the genre
- Glossary rewrites that cascade across all chapters

## Research Workflow

```
1. BOOK CONTEXT     → metadata, author, genre, audience
2. SAMPLE READING   → read first 2-3 chapters to understand style
3. DOMAIN RESEARCH  → search for terminology conventions online
4. VIETNAMESE CONVENTIONS → find how similar books were translated
5. POPULATE CLAUDE.md → glossary, style guide, do-not rules
```

## Phase 1: Book Context

### Step 1: Read metadata
```bash
jread info workspace/
```

Note: title, author, language, publisher.

### Step 2: Search for the book online

Use web search to find:
- **Book summary and reviews** — what is this book about? What do readers say?
- **Author background** — who is this person? What's their writing style known for?
- **Genre conventions** — how are books in this genre typically written?
- **Target audience** — who reads this book? Academics? General public? Professionals?

Search queries:
- `"{book title}" {author} review`
- `"{book title}" summary`
- `{author} writing style`

### Step 3: Check if Vietnamese translation exists

Search for existing Vietnamese translations or discussions:
- `"{book title}" tiếng Việt` or `"{book title}" bản dịch`
- `"{book title}" Vietnamese translation`
- `{author} dịch tiếng Việt`

If a Vietnamese edition exists:
- Note the translated title — this is the market-established name
- Note the publisher and translator
- Check reviews of the Vietnamese edition for quality feedback
- **Do NOT copy the translation** — but learn from terminology choices

## Phase 2: Sample Reading

### Step 4: Read first 2-3 chapters

```bash
# Chapter 1 — first 20 items
jread list workspace/OEBPS/Text/chapter0001.html --limit=20

# Continue reading
jread list workspace/OEBPS/Text/chapter0001.html --from=20 --limit=20
```

While reading, note:
- **Author's voice**: Short sentences? Long flowing prose? Rhetorical questions? Direct or indirect?
- **Sentence structure patterns**: Simple or complex? Active or passive?
- **Tone**: Academic? Conversational? Inspirational? Technical?
- **Pronoun usage**: First person? Second person? Collective "we"?
- **Recurring phrases**: Catchphrases, mottos, repeated expressions
- **Domain-specific terms**: List every technical or specialized term

### Step 5: Read a middle chapter for contrast

Pick a chapter from the middle of the book to check if tone/style changes:
```bash
jread list workspace/OEBPS/Text/chapter0010.html --limit=20
```

## Phase 3: Domain Research

### Step 6: Research domain terminology

For each domain-specific term found, search for Vietnamese conventions:

Search queries:
- `"{english term}" tiếng Việt là gì`
- `"{english term}" thuật ngữ tiếng Việt`
- `"{english term}" Vietnamese equivalent`
- `{domain} terminology Vietnamese` (e.g., "rowing terminology Vietnamese")

For each term, determine:
- Is there an established Vietnamese equivalent?
- Is the English term commonly used as-is in Vietnamese? (e.g., "marketing", "startup")
- Are there multiple Vietnamese options? Which is most common?

### Step 7: Research Vietnamese translation conventions for the genre

Search for how similar books in this genre have been translated:
- `dịch sách {genre} tiếng Việt` (e.g., "dịch sách self-help tiếng Việt")
- `quy ước dịch thuật {domain}` (e.g., "quy ước dịch thuật kinh doanh")
- `cách dịch {specific challenge}` (e.g., "cách dịch đại từ nhân xưng tiếng Anh sang tiếng Việt")

Key questions to answer:
- How are English pronouns (I/you/we) typically rendered in this genre?
- Should technical terms be kept in English, transliterated, or translated?
- What tone do Vietnamese readers expect for this genre?

## Phase 4: Populate CLAUDE.md

### Step 8: Update CLAUDE.md with research findings

Now update every section in CLAUDE.md with informed decisions:

**Book Summary** — write 2-3 sentences based on your research, not just metadata.

**Target Audience** — specific Vietnamese reader profile based on genre research.

**Author's Voice** — concrete description based on sample reading (not generic).

**Translation Style Guide** — informed by Vietnamese genre conventions:
- Tone (backed by research on how similar books are translated)
- Sentence structure (based on author's actual patterns)
- Cultural adaptation rules (based on what Vietnamese readers expect)
- Pronoun choices (based on genre conventions)

**Technical Vocabulary Decisions** — for each domain, state the rule:
- Which terms keep English?
- Which terms get translated? To what?
- Which terms get English + Vietnamese gloss?

**Glossary** — populate with all terms found during research:
- People & Organizations (from the book)
- Domain Terms (with researched Vietnamese equivalents and status)
- Recurring Phrases (from sample reading)

**Do NOT rules** — based on understanding what would break the author's voice.

### Step 9: Verify completeness

Check that CLAUDE.md has:
- [ ] Book Summary (not placeholder)
- [ ] Target Audience (specific)
- [ ] Author's Voice (concrete, from actual reading)
- [ ] Translation Style Guide (all subsections filled)
- [ ] Technical Vocabulary Decisions (per-domain rules)
- [ ] Glossary with at least 10+ terms
- [ ] Do NOT rules (at least 2-3 specific rules)

## Done

Tell the user: "Research complete. CLAUDE.md is populated with glossary and style guide. Ready to translate — use `aio-epub-translate`."

## Related Skills

- **aio-epub-setup** — set up project (run before this)
- **aio-epub-translate** — translate chapters (run after this)
- **aio-editor-review** — review existing translations
- **aio-epub-package** — export final EPUB files

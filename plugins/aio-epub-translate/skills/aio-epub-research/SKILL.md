---
name: aio-epub-research
description: Research a book before translating — finds existing translations, genre conventions, benchmark books, and terminology via web searches. Triggers: "research sách", "research book", "tìm thuật ngữ", "research terminology". Run after aio-epub-setup, before aio-epub-translate.
context: fork
agent: Explore
---

# EPUB Research — Pre-Translation Book Research

## Environment
- jread: !`which jread 2>/dev/null || echo "NOT INSTALLED — see references/installation.md"`

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
1. METADATA        → jread info, read CLAUDE.md
2. SAMPLE READING  → read 2-3 chapters to understand style
3. FACET DECOMPOSE → break research into 4 parallel facets
4. PARALLEL SEARCH → run all facets concurrently via web search
5. SYNTHESIZE      → merge findings into structured report
6. POPULATE        → update CLAUDE.md with evidence-backed decisions
```

## Phase 1: Book Context

### Step 1: Read metadata
```bash
jread info workspace/
```

Note: title, author, language, publisher, genre.

### Step 2: Read CLAUDE.md
Read existing CLAUDE.md to see what's already filled in from setup.

## Phase 2: Sample Reading

### Step 3: Read first 2-3 chapters

```bash
# Chapter 1 — first 20 items
jread list workspace/OEBPS/Text/chapter0001.html --limit=20

# Continue
jread list workspace/OEBPS/Text/chapter0001.html --from=20 --limit=20
```

While reading, note:
- **Author's voice**: Short sentences? Long flowing prose? Rhetorical questions?
- **Sentence structure**: Simple or complex? Active or passive?
- **Tone**: Academic? Conversational? Inspirational? Technical?
- **Pronoun usage**: First person? Second person? Collective "we"?
- **Recurring phrases**: Catchphrases, mottos, repeated expressions
- **Domain-specific terms**: List every technical or specialized term

### Step 4: Read a middle chapter for contrast

Pick a chapter from the middle to check if tone/style shifts:
```bash
jread list workspace/OEBPS/Text/chapter0010.html --limit=20
```

## Phase 3: Faceted Web Research

### Step 5: Decompose into research facets

Based on what you learned from sample reading, define 4 research facets:

**Facet 1: Existing Vietnamese translation**
- Search Tiki, Fahasa, Goodreads for Vietnamese editions
- Check if any translation exists in any language
- Note translated title, publisher, translator if found

**Facet 2: Vietnamese translation style for this genre**
- How do major publishers (Alpha Books, NXB Trẻ, First News) handle this genre?
- What translation framework do they follow? (e.g., Alpha Books: Đúng/Hay/Đẹp)
- Common terminology decisions (keep English vs translate)

**Facet 3: Benchmark books — similar books already translated to Vietnamese**
- Find 2-3 books in the same genre that have Vietnamese translations
- How were they received? What did readers praise/criticize about the translation?
- What can we learn from their translator's approach?

**Facet 4: Domain terminology conventions**
- How are the book's domain-specific terms handled in Vietnamese?
- Are there established Vietnamese equivalents or do professionals use English?
- Any translator community discussions about this domain?

### Step 6: Run all facets via web search

Run web searches for all 4 facets. Search queries per facet:

**Facet 1:**
- `"{book title}" tiếng Việt` / `"{book title}" bản dịch`
- `"{book title}" Vietnamese translation`
- `"{book title}" Tiki` / `"{book title}" Fahasa`

**Facet 2:**
- `dịch sách {genre} tiếng Việt` (e.g., "dịch sách self-help tiếng Việt")
- `Alpha Books phong cách dịch` / `NXB Trẻ cách dịch`
- `quy ước dịch thuật {domain}`

**Facet 3:**
- `sách {genre} hay tiếng Việt` (e.g., "sách self-help hay tiếng Việt")
- `"{similar book title}" bản dịch review`
- `dịch giả {translator name} phong cách`

**Facet 4:**
- `"{english term}" tiếng Việt là gì`
- `{domain} terminology Vietnamese`
- `cách dịch {specific challenge}` (e.g., "cách dịch đại từ nhân xưng")

## Phase 4: Synthesize Findings

### Step 7: Structure research into a report

Present findings to the user in this format:

**Quick answer**: Does a Vietnamese translation exist? Yes/No.

**Benchmark books**: 2-3 comparable Vietnamese translations with:
- Title (Vietnamese + English)
- Publisher, translator
- Reader reception — what worked, what didn't
- What we can learn for our translation

**Terminology table**: Key terms with Vietnamese conventions:

| English Term | Vietnamese Convention | Source/Evidence |
|-------------|---------------------|----------------|
| [term] | [keep English / translate to X] | [which publisher/book uses this] |

**Key findings**: 3-5 bullet points of the most important discoveries.

**Gaps in CLAUDE.md**: What's missing or needs updating based on research.

## Phase 5: Populate CLAUDE.md

### Step 8: Update CLAUDE.md with evidence-backed decisions

Update every section with findings:

**Book Summary** — informed by reviews and context, not just metadata.

**Target Audience** — specific Vietnamese reader profile.

**Author's Voice** — concrete description from actual sample reading.

**Translation Style Guide**:
- Tone (backed by genre research and benchmark comparisons)
- Sentence structure (when to split long English sentences, when to keep)
- Rhetorical questions handling
- Cultural adaptation rules
- Pronoun choices (backed by genre conventions)
- Quality criteria (e.g., Alpha Books Đúng/Hay/Đẹp framework if applicable)

**Technical Vocabulary Decisions** — per-domain rules with evidence:
- Which terms keep English? (with evidence: "Alpha Books keeps 'coaching'")
- Which terms get translated? To what?
- Which terms get English + Vietnamese gloss on first use?

**Glossary** — populate with researched terms:
- People & Organizations
- Domain Terms (with Vietnamese equivalents and CONFIRMED/TENTATIVE status)
- Recurring Phrases (from sample reading)

**Do NOT rules** — based on what would break the author's voice + benchmark learnings.

### Step 9: Verify completeness

Check that CLAUDE.md has:
- [ ] Book Summary (evidence-based, not placeholder)
- [ ] Target Audience (specific Vietnamese reader profile)
- [ ] Author's Voice (concrete, from actual reading)
- [ ] Translation Style Guide (all subsections, with benchmark references)
- [ ] Technical Vocabulary Decisions (per-domain, with evidence)
- [ ] Glossary with 10+ terms (researched Vietnamese equivalents)
- [ ] Do NOT rules (3+ specific rules from research)

## Done

Tell the user: "Research complete. CLAUDE.md populated with evidence-backed glossary and style guide. Ready to translate — use `aio-epub-translate`."

## Related Skills

- **aio-epub-setup** — set up project (run before this)
- **aio-epub-translate** — translate chapters (run after this)
- **aio-editor-review** — review existing translations
- **aio-epub-package** — export final EPUB files

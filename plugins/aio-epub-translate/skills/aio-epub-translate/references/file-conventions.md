# File Conventions for Translation Projects

Every translation project MUST follow this structure. Consistent structure lets Claude find files without asking.

## Directory Structure

```
{book-slug}/                        ← Root: use kebab-case book title
├── CLAUDE.md                       ← Translation guidelines (REQUIRED)
├── source/
│   └── {book-slug}.epub            ← Original EPUB (NEVER modify)
├── workspace/                      ← jread unpack output
│   ├── META-INF/
│   │   └── container.xml
│   └── OEBPS/                      ← or similar, per EPUB structure
│       ├── content.opf
│       └── Text/
│           ├── chapter0001.html
│           └── ...
├── output/                         ← Final EPUBs
│   ├── {book-slug}-bilingual.epub  ← Both languages
│   └── {book-slug}-clean.epub      ← Translation only
├── glossary.md                     ← Terminology database (REQUIRED)
└── translation-notes.md            ← Per-chapter notes (optional)
```

## Naming Rules

- **Root directory**: `{kebab-case-title}/` e.g., `will-it-make-the-boat-go-faster/`
- **Source EPUB**: keep original filename or use `{book-slug}.epub`
- **Workspace**: always `workspace/` — jread operates here
- **Output**: always `output/` — never overwrite source

## CLAUDE.md (Required)

Every translation project MUST have a `CLAUDE.md` at the root. This file is what makes AI translation context-aware.

See `claude-md-template.md` for the full template.

**Minimum required sections:**
1. Book metadata (title, author, source/target language)
2. Translation style guide (voice, tone, audience)
3. Critical glossary terms (the most important 10-20 terms)
4. Do NOT rules (what to never translate or change)

**Claude reads CLAUDE.md before every translation session.**

## glossary.md (Required)

A living document that grows as you translate. Must exist from day 1, even if empty.

See `glossary-guide.md` for format and workflow.

## translation-notes.md (Optional but Recommended)

Track decisions and issues per chapter:

```markdown
# Translation Notes

## Chapter 1 — Introduction
- "Make the boat go faster" → "Làm cho thuyền đi nhanh hơn" (keep metaphor)
- Several rowing terms introduced — see glossary
- Status: COMPLETE

## Chapter 2 — The Race
- Note: The flashback structure is confusing in Vietnamese — added clarifying conjunctions
- Status: IN PROGRESS
```

## What NOT to Put in workspace/

- Never manually edit files in `workspace/` except via `jread` commands
- Never commit `workspace/` to git (it can be regenerated from source)
- Never put the original EPUB in `workspace/`

## Git Setup

Recommended `.gitignore` for translation projects:
```
workspace/
output/
```

Commit: `source/`, `CLAUDE.md`, `glossary.md`, `translation-notes.md`

## Multi-Book Setup

If translating multiple books, use one directory per book:
```
translations/
├── will-it-make-the-boat-go-faster/
│   ├── CLAUDE.md
│   ├── source/
│   ├── workspace/
│   └── ...
└── another-book/
    ├── CLAUDE.md
    └── ...
```

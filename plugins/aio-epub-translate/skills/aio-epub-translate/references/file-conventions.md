# File Conventions for Translation Projects

Every translation project MUST follow this structure. Consistent structure lets Claude find files without asking.

## Directory Structure

```
{book-slug}/                        <- Root: use kebab-case book title
├── CLAUDE.md                       <- Everything lives here (REQUIRED)
├── source/
│   └── {book-slug}.epub            <- Original EPUB (NEVER modify)
├── workspace/                      <- jread unpack output
│   ├── META-INF/
│   │   └── container.xml
│   └── OEBPS/                      <- or similar, per EPUB structure
│       ├── content.opf
│       └── Text/
│           ├── chapter0001.html
│           └── ...
└── output/                         <- Final EPUBs
    ├── {book-slug}-bilingual.epub  <- Both languages
    └── {book-slug}-clean.epub      <- Translation only
```

## Naming Rules

- **Root directory**: `{kebab-case-title}/` e.g., `will-it-make-the-boat-go-faster/`
- **Source EPUB**: keep original filename or use `{book-slug}.epub`
- **Workspace**: always `workspace/` — jread operates here
- **Output**: always `output/` — never overwrite source

## CLAUDE.md (Required)

Every translation project MUST have a `CLAUDE.md` at the root. This is the **single source of truth** for the entire translation project. It contains:

1. Book metadata (title, author, source/target language)
2. Translation style guide (voice, tone, audience)
3. Glossary tables (terminology, recurring phrases, rejected translations)
4. Translation notes (per-chapter decisions and issues)
5. Do NOT rules (what to never translate or change)
6. Project status

See `claude-md-template.md` for the full template.

**Claude reads CLAUDE.md before every translation session.** No other files needed.

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

Commit: `source/`, `CLAUDE.md`

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

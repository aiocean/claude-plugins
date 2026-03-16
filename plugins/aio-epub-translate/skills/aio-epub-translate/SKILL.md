---
name: aio-epub-translate
description: Use when user wants to translate an EPUB book, set up a book translation project, says "dịch sách", "translate epub", "translate chapter", "dịch chapter", "setup translation workspace", "install jread", or asks how to use jread CLI for translation. Orchestrates AI-driven EPUB translation using jread CLI primitives.
---

# EPUB Translate — AI-Driven Book Translation

Translate EPUB books using `jread` CLI as primitive file operations. Claude acts as the translation intelligence: reading full chapters for context, building glossaries, maintaining consistency, and making quality decisions.

## Prerequisites

```bash
which jread || echo "NOT INSTALLED"
```

If missing → see `references/installation.md`

## Core Principle

> Claude is NOT a translation API that processes one paragraph at a time.
> Claude is the **translation director** who reads the whole chapter first,
> builds the glossary, understands the author's voice, then translates with full awareness.

This produces dramatically better results than paragraph-by-paragraph translation.

## Workflow (Quick Reference)

```
1. SETUP     → unpack + mark + read CLAUDE.md
2. PER CHAPTER → read all → update glossary → batch translate (15-20 paragraphs)
3. FINISH    → pack bilingual + pack clean
```

Full workflow with examples: `references/translation-workflow.md`

## Project Structure

```
my-book/
├── CLAUDE.md              ← Translation guidelines (REQUIRED — see template)
├── source/
│   └── book.epub          ← Original file (never modified)
├── workspace/             ← Unpacked EPUB — jread works here
│   └── [epub contents]
├── output/                ← Export destination
│   ├── book-bilingual.epub
│   └── book-clean.epub
├── glossary.md            ← Living terminology database
└── translation-notes.md  ← Per-chapter decisions & issues
```

Full conventions: `references/file-conventions.md`

## jread Commands (Quick Reference)

| Command | Purpose |
|---------|---------|
| `jread unpack <epub> <dir>` | Extract EPUB |
| `jread info <dir>` | Metadata + spine |
| `jread mark <dir>` | Add content IDs to all paragraphs |
| `jread list <html>` | List all translatable elements |
| `jread get <html> <id>` | Get text + context (above/below) |
| `jread set <html> <id> <text> [--lang=vi]` | Write translation |
| `jread stats <dir>` | Progress per chapter |
| `jread clear <html>` | Remove translations (keep markers) |
| `jread pack <dir> <epub>` | Export bilingual EPUB |
| `jread pack <dir> <epub> --mode=clean` | Export translation-only EPUB |

Full reference with examples: `references/jread-commands.md`

## Starting a New Translation Project

1. Create project directory and `source/` subfolder
2. Place EPUB in `source/`
3. Create `CLAUDE.md` from template: `references/claude-md-template.md`
4. Create `glossary.md` from template: `references/glossary-guide.md`
5. Run setup commands:
   ```bash
   jread unpack source/book.epub workspace/
   jread info workspace/
   jread mark workspace/
   ```
6. Read CLAUDE.md to understand translation guidelines
7. Begin translation chapter by chapter

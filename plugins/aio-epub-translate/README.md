# aio-epub-translate

**AI-powered EPUB book translation for Claude Code.**

Translate entire books with literary-quality Vietnamese using Claude as your translator. Upload EPUBs, analyze style and characters before translating, translate chapter by chapter with cross-chapter consistency, run automated and literary quality review, and export polished bilingual or Vietnamese-only EPUBs.

## Why this plugin?

Traditional machine translation treats each paragraph in isolation. This plugin treats translation as a **literary craft**:

- Claude reads the full chapter context before translating
- A **glossary** of recurring terms is automatically extracted from previous chapters and merged with your hand-curated one
- Translation follows the **Tin-Dat-Nha** framework (faithfulness, comprehensibility, elegance) — a classical Vietnamese standard codified in 1898
- Books are analyzed for genre, characters, tone, and key terms before the first sentence is translated
- Batch API submits all translations in a single request instead of one-by-one
- Two-stage quality checking: mechanical detection (empty, mixed-language, too-short) followed by literary review (fluency, style, cross-chapter consistency)

## Installation

```bash
# Add the marketplace (one-time)
/plugin marketplace add aiocean/claude-plugins

# Install the plugin
/plugin install aio-epub-translate@aiocean-plugins
```

## Skills

The plugin includes 9 skills that form a complete translation pipeline. Each skill cross-references the others, so Claude always knows what to suggest next.

```
aio-epub-setup → aio-epub-upload → aio-epub-analyze → aio-epub-translate → aio-epub-quality → aio-epub-review → aio-epub-export
                                                              ↕                                         ↕
                                                       aio-epub-manage                          aio-epub-vn-style
```

### aio-epub-setup

> "setup epub", "cai dat epub", "configure api key"

First-time setup: register an account at [read.aiocean.io](https://read.aiocean.io), purchase a license, and configure your API key. Includes connection verification, quota check, and optional custom model configuration (OpenAI-compatible API keys accepted).

### aio-epub-upload

> "upload epub", "tai sach len", "prepare book"

Upload an EPUB file to the server. Automatically unpacks, cleans HTML, marks translatable content, and generates AI translation guidelines tailored to the book's style and genre. Also supports fine-tuning content markings (unmark code blocks, change element tags) after the initial prepare step.

### aio-epub-analyze

> "analyze book", "phan tich sach", "pre-translate", "prepare translation"

Pre-translation intelligence — run this before translating a new book. Samples chapters from the beginning, middle, and end; identifies genre, writing style, narrator voice, and sentence rhythm; extracts a character table with Vietnamese pronoun assignments; builds a key-term glossary; estimates translation difficulty. Saves a custom guideline and glossary to the server so every subsequent `aio-epub-translate` call inherits them automatically.

Running analyze before translating produces guidelines that are specific to the actual text, not a generic template.

### aio-epub-translate

> "dich sach", "translate chapter", "dich tiep", "translate book"

The core translation skill. For each chapter:

1. **Fetches cross-chapter context** via `GetChapterContext` — previous chapter summary, merged glossary (hand-curated + auto-extracted), book-level and chapter-level guidelines
2. **Loads content** via `GetPageJson` — structured JSON with original text and existing translations
3. **Loads the vn-style reference library** — translation principles, sentence structure, word choice, common errors, genre strategies (mandatory gate before first sentence)
4. **Claude translates in mini-batches of 5** — translate, self-review against checklist, submit, reflect on errors before the next batch
5. **Batch submits** via `BatchCreateManualTranslation` — all translations in a single API call per batch

Translation principles built into the skill:

| Principle | What it means |
|-----------|---------------|
| Tin (faithfulness) | Faithful to meaning and spirit, not word-for-word |
| Dat (comprehensibility) | Reads naturally, as if written in Vietnamese |
| Nha (elegance) | Beautiful prose with rhythm and balance |

### aio-epub-quality

> "check quality", "kiem tra chat luong", "find bad translations"

Mechanical quality analysis across a chapter or the entire book. Detects:

| Issue | Detection |
|-------|-----------|
| Mixed language | >50% of words still in English |
| Empty translation | Translation element exists but is blank |
| Too short | Translation is <30% the length of original |
| Untranslated | Translation identical to original text |
| Missing element | Translation ID referenced but element not found |

Returns a quality score (0-100%) and can automatically re-translate flagged items. Also includes a literary quality evaluation mode — when the mechanical score is high but the text still "sounds like machine translation", load the vn-style rubric and check for calque patterns, passive-voice overuse, and inconsistent pronouns.

### aio-epub-review

> "review translation", "danh gia ban dich", "consistency check", "literary review"

Deep literary review — evaluates translation quality beyond mechanical checks. Reads original and translated text side by side and scores against five criteria: Tin/Accuracy (35%), Dat/Fluency (25%), Nha/Style (20%), consistency (12%), cultural fit (8%). Fixes issues directly via `EditTranslation` (single item) or `BulkEditTranslation` (cross-chapter). Uses `SearchTranslations` to find every occurrence of a term across the whole book and fix inconsistencies in one pass.

**Distinct from aio-epub-quality**: quality checks mechanical signals; review reads the prose and judges literary craft.

### aio-epub-vn-style

> "dich sao cho hay", "phong cach dich", "translation style guide", "Tin Dat Nha"

A standalone reference library for Vietnamese literary translation. Ten reference files covering sentence structure, word choice (including the full 8-cell pronoun table), rhythm and voice, common errors, genre strategies (self-help, fiction, science, philosophy, children's, historical), advanced techniques (compensation, metaphor, humor, wordplay), Vietnamese linguistics (classifiers, modal particles, onomatopoeia), structure conversion tables, and a full MQM/ATA quality rubric.

Use standalone to look up a translation question, or as a prerequisite: `aio-epub-translate` and `aio-epub-review` both require loading these references before any translation work begins.

### aio-epub-manage

> "list books", "check progress", "update guideline", "book info", "fork book"

The hub skill for book management:

- List all books; view table of contents with file paths and word counts
- Check translation progress per chapter with completion indicators
- View, update, or AI-generate translation guidelines (book-level and chapter-level)
- Manage glossary entries (add, update, delete individual terms or replace the full set)
- Search translations across the entire book — by original text or translated text
- View LLM usage stats and cost per book
- Fork a book to create a personal translation without affecting the source
- Publish or unpublish a book to the community library
- Reset a chapter (clears translations and markings) or remark a chapter (clears translations, keeps markings)

### aio-epub-export

> "export epub", "xuat sach", "pack epub", "send to kindle"

Export translated books in two formats:

| Mode | Output |
|------|--------|
| Bilingual | Original + translation side by side (for learning) |
| Translation only | Clean Vietnamese text only (for reading) |

`stripMarkers: true` with translation-only mode removes all `data-*` attributes for clean publishable HTML. Supports sending directly to Kindle via email.

## API

The plugin communicates with the translation server via ConnectRPC (JSON over HTTP POST). All calls use Python — not bash curl — because Vietnamese Unicode escaping is unreliable in shell.

| Endpoint | Purpose |
|----------|---------|
| `BatchCreateManualTranslation` | Submit multiple translations in one request |
| `GetChapterContext` | Cross-chapter glossary, guidelines, previous chapter |
| `GetTranslationQualityReport` | Mechanical quality analysis |
| `GetPageJson` / `BatchGetPageJson` | Content retrieval (single chapter or batch) |
| `GetTranslationProgress` | Per-chapter and book-level progress |
| `EditTranslation` / `BulkEditTranslation` | Fix single or cross-chapter translations |
| `SearchTranslations` | Full-book text search in original or translated text |
| `GetBookStats` | Word counts, chapter sizes, translation ratio |
| `PackEpub` / `SendToKindle` | Export and delivery |

**Server**: https://read-api.aiocean.dev  
**Web app**: https://read.aiocean.io

## Example workflow

```
You: upload this book [attaches file.epub]
     → aio-epub-upload handles upload, marking, guideline generation

You: analyze the book before we start translating
     → aio-epub-analyze samples chapters, extracts characters and terms,
       saves custom guideline and glossary to server

You: translate chapter 3
     → aio-epub-translate loads vn-style references, fetches context,
       translates in mini-batches of 5, self-reviews each batch before submit

You: check quality of the whole book
     → aio-epub-quality scans all chapters, reports mechanical issues

You: review chapter 5 — the score is 90% but it reads stiffly
     → aio-epub-review reads prose side by side, scores Tin/Dat/Nha,
       finds calque patterns and passive-voice overuse, fixes inline

You: re-translate the mechanically bad ones
     → aio-epub-translate re-translates flagged items

You: export as vietnamese-only epub
     → aio-epub-export packs clean EPUB, provides download link
```

## Requirements

- Claude Code with plugin support
- A license key from [read.aiocean.io](https://read.aiocean.io)
- `AIO_EPUB_API_KEY` environment variable set with your license key

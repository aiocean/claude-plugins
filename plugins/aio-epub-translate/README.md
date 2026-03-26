# aio-epub-translate

**AI-powered EPUB book translation for Claude Code.**

Translate entire books with literary-quality Vietnamese using Claude as your translator. Upload EPUBs, translate chapter by chapter with cross-chapter consistency, automatically detect poor translations, and export polished bilingual or Vietnamese-only EPUBs.

## Why this plugin?

Traditional machine translation treats each paragraph in isolation. This plugin treats translation as a **literary craft**:

- Claude reads the full chapter context before translating
- A **glossary** of recurring terms is automatically extracted from previous chapters
- Translation follows the **Tin-Dat-Nha** framework (faithfulness, comprehensibility, elegance)
- Batch API submits all translations in a single request instead of one-by-one
- Quality detection catches mixed-language text, suspiciously short translations, and untranslated passages

## Installation

```bash
# Add the marketplace (one-time)
/plugin marketplace add aiocean/claude-plugins

# Install the plugin
/plugin install aio-epub-translate@aiocean-plugins
```

## Skills

The plugin includes 6 skills that form a complete translation pipeline. Each skill cross-references the others, so Claude always knows what to suggest next.

```
aio-epub-setup → aio-epub-upload → aio-epub-translate → aio-epub-quality → aio-epub-export
                                          ↕
                                   aio-epub-manage
```

### aio-epub-setup

> "setup epub", "cai dat epub", "configure api key"

First-time setup: register an account at [read.aiocean.io](https://read.aiocean.io), purchase a license, and configure your API key. Includes connection verification and model configuration.

### aio-epub-upload

> "upload epub", "tai sach len", "prepare book"

Upload an EPUB file to the server. Automatically unpacks, cleans HTML, marks translatable content, and generates AI translation guidelines tailored to the book's style and genre.

### aio-epub-translate

> "dich sach", "translate chapter", "dich tiep", "translate book"

The core translation skill. For each chapter:

1. **Fetches cross-chapter context** via `GetChapterContext` API — previous chapter summary, recurring term glossary, book-level and chapter-level guidelines
2. **Loads content** via `GetPageJson` — structured JSON with original text and existing translations
3. **Claude translates** following literary Vietnamese principles — Topic-Comment structure, active voice, rhythmic balance, idiomatic expressions
4. **Batch submits** via `BatchCreateManualTranslation` — all translations in a single API call

Translation principles built into the skill:

| Principle | What it means |
|-----------|---------------|
| Tin (faithfulness) | Faithful to meaning and spirit, not word-for-word |
| Dat (comprehensibility) | Reads naturally, as if written in Vietnamese |
| Nha (elegance) | Beautiful prose with rhythm and balance |

### aio-epub-quality

> "check quality", "kiem tra chat luong", "find bad translations"

Runs automated quality analysis on translations. Detects:

| Issue | Detection |
|-------|-----------|
| Mixed language | >50% of words still in English |
| Empty translation | Translation element exists but is blank |
| Too short | Translation is <30% the length of original |
| Untranslated | Translation identical to original text |
| Missing element | Translation ID referenced but element not found |

Returns a quality score (0-100%) and can automatically re-translate flagged items.

### aio-epub-manage

> "list books", "check progress", "update guideline", "book info"

The hub skill for book management:

- List all books on the server
- View table of contents with file paths
- Check translation progress per chapter (with completion indicators)
- View, update, or AI-generate translation guidelines
- Reset chapters for re-translation
- Delete books

### aio-epub-export

> "export epub", "xuat sach", "pack epub", "send to kindle"

Export translated books in two formats:

| Mode | Output |
|------|--------|
| Bilingual | Original + translation side by side (for learning) |
| Translation only | Clean Vietnamese text only (for reading) |

Supports sending directly to Kindle via email.

## API

The plugin communicates with the translation server via ConnectRPC (JSON over HTTP POST).

| Endpoint | Purpose |
|----------|---------|
| `BatchCreateManualTranslation` | Submit multiple translations in one request |
| `GetChapterContext` | Cross-chapter glossary, guidelines, previous chapter |
| `GetTranslationQualityReport` | Automated quality analysis |
| `GetPageJson` / `GetTranslationProgress` | Content retrieval and progress tracking |
| `PackEpub` / `SendToKindle` | Export and delivery |

**Server**: https://read-api.aiocean.dev
**Web app**: https://read.aiocean.io

## Example workflow

```
You: upload this book [attaches file.epub]
     → aio-epub-upload handles upload, marking, guideline generation

You: translate chapter 3
     → aio-epub-translate fetches context, translates, submits batch

You: check quality of the whole book
     → aio-epub-quality scans all chapters, reports issues

You: re-translate the bad ones
     → aio-epub-translate re-translates flagged items

You: export as vietnamese-only epub
     → aio-epub-export packs clean EPUB, provides download link
```

## Requirements

- Claude Code with plugin support
- A license key from [read.aiocean.io](https://read.aiocean.io)
- `JREAD_API_KEY` environment variable set with your license key

## Version history

| Version | Changes |
|---------|---------|
| 3.0.0 | Complete rewrite. Replaced jread CLI with ConnectRPC API. 6 cross-referenced skills. New batch translation, quality detection, and chapter context APIs. |
| 2.5.1 | Previous version using jread CLI (deprecated) |

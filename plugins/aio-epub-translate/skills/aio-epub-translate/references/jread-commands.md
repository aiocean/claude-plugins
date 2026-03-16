# jread CLI — Complete Reference

`jread` is the CLI tool for EPUB translation operations. All commands output JSON to stdout. Errors go to stderr with exit code 1.

## Installation

See `installation.md`.

## Commands

### `jread unpack <epub_file> <output_dir>`

Extract an EPUB file to a directory for editing.

```bash
jread unpack source/book.epub workspace/
```

Output:
```json
{ "success": true, "dir": "workspace/", "files": 90 }
```

Notes:
- Creates `output_dir` if it doesn't exist
- Preserves exact EPUB internal structure
- Safe: rejects path traversal attacks
- Run once per project

---

### `jread pack <dir> <output.epub> [--mode=clean]`

Repack a directory back into an EPUB file.

```bash
# Bilingual: original + translation side by side (default)
jread pack workspace/ output/book-bilingual.epub

# Clean: translation only, all markers stripped
jread pack workspace/ output/book-clean.epub --mode=clean
```

Output:
```json
{ "success": true, "output": "output/book-clean.epub" }
```

Notes:
- `--mode=clean`: removes original paragraphs that have translations, keeps translations, strips all `data-*` markers
- Default (bilingual): keeps both original and translation elements, keeps markers
- Writes atomically (temp file + rename)
- `mimetype` file written first uncompressed (EPUB spec requirement)

---

### `jread info <dir>`

Get book metadata and spine (reading order).

```bash
jread info workspace/
```

Output:
```json
{
  "id": "book-name",
  "title": "Will It Make The Boat Go Faster?",
  "author": "Ben Hunt-Davis",
  "language": "en-US",
  "publisher": "Matador",
  "rootDir": "workspace/OEBPS",
  "spine": [
    { "id": "chapter0001", "href": "Text/chapter0001.html", "mediaType": "application/xhtml+xml" }
  ]
}
```

Use this to:
- Understand the reading order (spine = correct chapter sequence)
- Find `rootDir` (prepend to `href` to get absolute HTML file paths)
- Confirm source language before starting

---

### `jread mark <dir>`

Scan all HTML files in the spine and add `data-content-id` attributes to translatable elements.

```bash
jread mark workspace/
```

Output:
```json
{ "success": true, "filesProcessed": 68, "elementsMarked": 2079 }
```

Notes:
- Must run before `list`/`get`/`set`
- Safe to run multiple times — skips already-marked elements
- Skips: code blocks, nav elements, too-short text, chapter headings like "Chapter 1"
- Marks: paragraphs, headings, list items, blockquotes, figcaptions

---

### `jread list <html_file> [--untranslated] [--from=N] [--limit=N]`

List translatable elements in a file with their IDs.

Flags:
- `--untranslated` — only items without a translation
- `--from=N` — skip first N items (useful to paginate or resume)
- `--limit=N` — cap output to N items

```bash
# Get first 20 untranslated items
jread list workspace/OEBPS/Text/chapter0001.html --untranslated --limit=20

# Next page: use nextFrom from the previous response
jread list workspace/OEBPS/Text/chapter0001.html --untranslated --from=20 --limit=20
```

Output:
```json
{
  "file": "workspace/OEBPS/Text/chapter0001.html",
  "total": 41,
  "nextFrom": 20,
  "items": [
    {
      "id": "Gjsbg3jOAD14QNrK",
      "text": "The idea for this book came from a simple question...",
      "hasTranslation": false
    },
    {
      "id": "E3VaMFIXLmEmT75-",
      "text": "Olympic gold is won in the <em>margins</em>.",
      "hasTranslation": true,
      "translationId": "6fa840b1b60a2ad5"
    }
  ]
}
```

`total` always reflects the full chapter size regardless of filters.
`nextFrom` is the value to pass to `--from` to fetch the next page.

Use this to:
- Get untranslated IDs in batches of 20 for translation
- Paginate by passing `nextFrom` as `--from` in the next call
- Track progress: compare `total` vs items returned by `--untranslated`

---

### `jread get <html_file> <content_id>`

Get a specific element's text plus the paragraph above and below for context.

```bash
jread get workspace/OEBPS/Text/chapter0001.html Gjsbg3jOAD14QNrK
```

Output:
```json
{
  "id": "Gjsbg3jOAD14QNrK",
  "text": "The idea for this book came from a simple question...",
  "context": {
    "above": "Previous paragraph text...",
    "below": "Next paragraph text..."
  },
  "translation": null
}
```

If translation exists:
```json
{
  "translation": {
    "id": "6fa840b1b60a2ad5",
    "text": "Ý tưởng cho cuốn sách này...",
    "lang": "vi"
  }
}
```

Notes:
- `context.above/below` help understand the surrounding narrative
- For batch translation, you usually don't need `get` per element — just read the full file text and translate from `list` output
- Use `get` when a specific paragraph is ambiguous or needs extra context

---

### `jread set <html_file> <content_id> <translation_text> [--lang=vi]`

Write a translation for a specific content element.

```bash
jread set workspace/OEBPS/Text/chapter0001.html Gjsbg3jOAD14QNrK \
  "Ý tưởng cho cuốn sách này xuất phát từ một câu hỏi đơn giản..." \
  --lang=vi
```

Output:
```json
{
  "success": true,
  "contentId": "Gjsbg3jOAD14QNrK",
  "translationId": "6fa840b1b60a2ad5",
  "lang": "vi"
}
```

Notes:
- `--lang` defaults to `vi` (Vietnamese) if omitted
- If the element already has a translation, it gets updated in place
- Translation text can contain HTML (e.g., `<em>`, `<strong>`, `<a>`)
- Quote the translation text: `jread set file.html ID "text with spaces"`
- For multiline translations, use a shell variable: `TRANS="line1\nline2"; jread set ... "$TRANS"`

---

### `jread stats <dir> [--incomplete]`

Show translation progress across all chapters.

Flags:
- `--incomplete` — only show chapters that still have untranslated items

Each chapter entry includes `lastTranslatedId` (content ID of the last translated item, empty string if none).

```bash
# Full overview
jread stats workspace/

# Only chapters still needing work
jread stats workspace/ --incomplete
```

Output:
```json
{
  "total": 2079,
  "translated": 156,
  "progress": "7.5%",
  "chapters": [
    { "file": "OEBPS/Text/chapter0001.html", "total": 41, "translated": 41, "lastTranslatedId": "E3VaMFIXLmEmT75-" },
    { "file": "OEBPS/Text/chapter0002.html", "total": 14, "translated": 3, "lastTranslatedId": "Gjsbg3jOAD14QNrK" }
  ]
}
```

Use this to:
- Track progress after each chapter
- Find chapters with 0 translation (not started): `lastTranslatedId == ""`
- Verify a chapter is 100% before moving on: `translated == total`

---

### `jread clear <html_file>`

Remove all translations from a file. Keeps `data-content-id` markers (so the file stays marked and ready for re-translation).

```bash
jread clear workspace/OEBPS/Text/chapter0001.html
```

Output:
```json
{ "success": true, "cleared": 41 }
```

Use this to:
- Re-translate a chapter from scratch
- Fix systematic translation errors in a chapter

---

## Working with Paths

The `jread info` command gives you `rootDir` and the `spine` with relative `href` values.

To get the absolute path of a chapter:
```
absolute_path = rootDir + "/" + href
```

Example: `rootDir = "workspace/OEBPS"`, `href = "Text/chapter0001.html"`
→ `workspace/OEBPS/Text/chapter0001.html`

---

## Batch Translation Pattern

**IMPORTANT: Never list all items at once.** Chapters can have 100+ items which floods context. Always process 20 items per batch.

```bash
# 1. Check chapter size and find resume point
jread stats workspace/ --incomplete

# 2. Get first batch of untranslated items
jread list workspace/OEBPS/Text/chapter0001.html --untranslated --limit=20
# → response includes "nextFrom": 20

# 3. Translate the batch, write each using the "id" field:
jread set workspace/OEBPS/Text/chapter0001.html <id1> "<translation1>"
jread set workspace/OEBPS/Text/chapter0001.html <id2> "<translation2>"
# ...

# 4. Next batch — pass nextFrom from the previous response
jread list workspace/OEBPS/Text/chapter0001.html --untranslated --from=20 --limit=20

# 5. Repeat steps 3-4 until no items are returned (chapter complete)

# 6. Verify chapter completion
jread stats workspace/ --incomplete
# → chapter0001 should no longer appear
```

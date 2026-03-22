---
name: aio-epub-setup
description: Set up a new EPUB translation project — unpack EPUB, mark translatable content, and generate CLAUDE.md with glossary and style guide. Triggers: "setup translation", "tạo project dịch", "unpack epub", "chuẩn bị dịch", install jread.
---

# EPUB Setup — Translation Project Setup

## Environment
- jread: !`which jread 2>/dev/null || echo "NOT INSTALLED — see references/installation.md"`
- bun: !`which bun 2>/dev/null || echo "NOT INSTALLED"`

Set up a new EPUB translation project. Creates project structure, unpacks the EPUB, marks content, and generates CLAUDE.md with glossary and style guide.

## What This Skill Does

This skill handles ONLY setup. After setup is complete, use:
- `aio-epub-translate` to translate chapters
- `aio-editor-review` to review translations
- `aio-epub-package` to export final EPUBs

## Setup Workflow

### Step 1: Create project structure

```bash
mkdir -p {source,workspace,output}
```

### Step 2: Place EPUB in source/

User should place or copy the original EPUB file into `source/`.

```bash
ls source/*.epub
```

If no EPUB found, ask the user where the file is.

### Step 3: Unpack and mark

```bash
jread unpack source/*.epub workspace/
jread info workspace/
jread mark workspace/
```

Note the output of `jread info` — you'll need the book metadata for CLAUDE.md.

### Step 4: Create CLAUDE.md

Generate `CLAUDE.md` using the template from `references/claude-md-template.md`.

Fill in from `jread info` output:
- Title, Author, Language, Publisher from metadata
- Leave Glossary tables empty (populated during translation)
- Leave Translation Notes empty

**Ask the user** for:
- Target language (default: Vietnamese)
- Target audience
- Translation tone (formal / semi-formal / casual)
- Any known key terms or proper nouns

### Step 5: Verify setup

```bash
# Verify workspace is unpacked and marked
jread stats workspace/

# Verify CLAUDE.md exists
cat CLAUDE.md | head -20
```

Setup is complete when:
- `workspace/` has marked HTML files
- `CLAUDE.md` exists with all sections filled
- `jread stats` shows chapters with 0% translated

### Done

Tell the user: "Setup complete. Run `aio-epub-research` to research the book before translating."

## Project Structure

```
my-book/
├── CLAUDE.md              <- Everything lives here (style guide, glossary, notes)
├── source/
│   └── book.epub          <- Original file (NEVER modify)
├── workspace/             <- Unpacked EPUB — jread works here
│   └── [epub contents]
└── output/                <- Export destination (created by aio-epub-package)
```

## Related Skills

- **aio-epub-research** — research the book before translating (run after this)
- **aio-epub-translate** — translate chapters
- **aio-editor-review** — review existing translations
- **aio-epub-package** — export final EPUB files

## References

- Full CLAUDE.md template: `references/claude-md-template.md`
- File conventions: `references/file-conventions.md`
- jread installation: `references/installation.md`

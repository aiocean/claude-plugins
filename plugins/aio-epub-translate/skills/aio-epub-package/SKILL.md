---
name: aio-epub-package
description: Export translated EPUB projects into final bilingual or clean output files. Triggers: "pack epub", "export epub", "đóng gói", "xuất epub", "export bilingual", "song ngữ", "package translation".
---

# EPUB Package — Export Translated Books

## Environment
- jread: !`which jread 2>/dev/null || echo "NOT INSTALLED — see references/installation.md"`

Export translated content from workspace into final output files. Supports multiple formats and language modes.

## Prerequisites

This skill ONLY packages. The project must already be set up and have translations.

```bash
# Verify translations exist
jread stats workspace/
```

If `workspace/` doesn't exist or has no translations → reject and tell user to run `aio-epub-setup` first, then `aio-epub-translate`.

## Export Modes

| Mode | Flag | Description |
|------|------|-------------|
| **Bilingual** | (default) | Original + translation side by side |
| **Clean** | `--mode=clean` | Translation only, all markers stripped |

## Workflow

### Step 1: Check translation progress

```bash
jread stats workspace/
```

Show the user:
- Total progress percentage
- Any incomplete chapters

**Warn** if not 100% translated. Ask if they want to proceed anyway.

### Step 2: Ask export preferences

Ask the user what they want:

1. **Language mode**:
   - Bilingual (original + translation) — good for learning/reference
   - Clean (translation only) — good for reading

2. **Format**: EPUB (default)

3. **Output filename**: suggest `{book-slug}-bilingual.epub` or `{book-slug}-clean.epub`

### Step 3: Create output directory

```bash
mkdir -p output
```

### Step 4: Pack

```bash
# Bilingual
jread pack workspace/ output/{book-slug}-bilingual.epub

# Clean (translation only)
jread pack workspace/ output/{book-slug}-clean.epub --mode=clean
```

### Step 5: Verify output

```bash
ls -la output/*.epub
```

Confirm file was created and report file size.

## Quick Export (No Questions)

If user says "pack everything" or "export all", do both:

```bash
mkdir -p output
jread pack workspace/ output/{book-slug}-bilingual.epub
jread pack workspace/ output/{book-slug}-clean.epub --mode=clean
```

## Common Issues

**"workspace/ not found"** → Project not set up. Run `aio-epub-setup` first.

**"0 translations found"** → Nothing to pack. Run `aio-epub-translate` first.

**Incomplete chapters** → Warn but allow export. User may want a partial preview.

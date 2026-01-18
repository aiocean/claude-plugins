---
name: epub-packing
description: Generate professional EPUB ebooks from Markdown files with auto-generated covers and embedded images. Use when creating ebooks, converting Markdown to EPUB, packaging web articles for offline reading, or user mentions epub, ebook, e-reader, kindle.
---

# EPUB Generator Skill

Convert Markdown documents into professional EPUB ebooks with auto-generated neo-brutalism covers and embedded images.

## Simple Single-Document EPUB

Converting a single article, document, or essay into an ebook:

```bash
# Install dependencies (first time only)
pip3 install -r requirements.txt

# Generate EPUB
python3 generate_epub.py \
  --input article.md \
  --output article.epub \
  --title "Understanding System Design" \
  --author "Engineering Team"
```

The tool will:

- Convert Markdown to EPUB-compatible HTML
- Auto-generate table of contents from H1 headings
- Create a professional neo-brutalism cover
- Package everything into a valid EPUB ready for any e-reader

## Multi-Chapter Book

For books, guides, or documentation split across multiple files:

```bash
# Organize your chapters as separate .md files
# Example:
#   chapter-01-intro.md
#   chapter-02-basics.md
#   chapter-03-advanced.md

# Generate EPUB (chapters processed in order)
python3 generate_epub.py \
  --input chapter-01-intro.md chapter-02-basics.md chapter-03-advanced.md \
  --output complete-guide.epub \
  --title "Complete Guide to Python" \
  --author "Your Name"
```

Chapter titles are automatically extracted from the first H1 (`#`) heading in each file.

## Converting Web Articles to EPUB

Saving articles from the web for offline reading:

```bash
# Download and convert HTML to Markdown
python3 download_html_to_md.py https://example.com/article --output ./raw

# Clean up the markdown (AI or manual editing)
# - Remove ads, navigation, footers
# - Fix formatting issues
# - Improve structure

# Generate EPUB (automatically downloads and embeds images)
python3 generate_epub.py \
  --input ./raw/article-title.md \
  --output article.epub \
  --title "Article Title" \
  --author "Original Author"
```

Note:

- `download_html_to_md.py` produces raw markdown that needs cleanup before EPUB generation
- Images are automatically downloaded and embedded in the EPUB - no internet needed to read

## Custom Cover Design

Control cover colors and appearance:

```bash
# Generate EPUB with specific cover color
python3 generate_epub.py \
  --input book.md \
  --output book.epub \
  --title "My Book" \
  --author "Author" \
  --color yellow \
  --seed 42  # For consistent colors

# Or generate cover separately
python3 generate_cover.py \
  --title "System Design" \
  --top-text "Tech Interview Guide" \
  --bottom-text "By Engineering Team" \
  --output cover.png \
  --color cyan \
  --seed 42
```

Available colors: `yellow`, `pink`, `cyan`, `green`, `orange`, `purple`, `red`, `random`

Using seed: Same seed = same random color every time (useful for series consistency)

## Advanced Topics

### Manual NCX Control

By default, the table of contents (NCX file) is auto-generated from your chapter files. For advanced control, you can provide a custom NCX file.

**When to use custom NCX:**

- You need custom chapter ordering that differs from file order
- You want nested sub-chapters (multi-level TOC)
- You need precise control over chapter IDs and metadata

**Create custom NCX:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345678-1234-1234-1234-123456789abc"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>

  <docTitle><text>Book Title</text></docTitle>
  <docAuthor><text>Author Name</text></docAuthor>

  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>Introduction</text></navLabel>
      <content src="chapter_01.xhtml"/>
    </navPoint>
    <navPoint id="navPoint-2" playOrder="2">
      <navLabel><text>Getting Started</text></navLabel>
      <content src="chapter_02.xhtml"/>
    </navPoint>
    <!-- Add more chapters... -->
  </navMap>
</ncx>
```

**NCX Requirements:**

- `dtb:uid` must contain a valid UUID (generate with `python3 -c "import uuid; print(uuid.uuid4())"`)
- `playOrder` must be sequential: 1, 2, 3, 4...
- Chapter filenames must match pattern: `chapter_01.xhtml`, `chapter_02.xhtml`, etc.
- Each `navPoint id` must be unique

**Use custom NCX:**

```bash
python3 generate_epub.py \
  --input ch01.md ch02.md ch03.md \
  --ncx toc.ncx \
  --output book.epub \
  --title "Book Title" \
  --author "Author Name"
```

The tool will validate your NCX and warn you about any issues.

---

### All Available Parameters

**EPUB Generation:**

```bash
python3 generate_epub.py \
  --input file1.md file2.md        # Input Markdown files
  --output book.epub                # Output EPUB file
  --title "Book Title"              # Book title
  --author "Author Name"            # Author name
  --ncx toc.ncx                     # (Optional) Custom NCX file
  --language en                     # Language code (default: en)
  --publisher "Publisher Name"      # Publisher (optional)
  --color cyan                      # Cover color scheme
  --seed 42                         # Random seed for colors
  --top-text "Series Name"          # Cover top text
  --bottom-text "Subtitle"          # Cover bottom text
```

**Cover-Only Generation:**

```bash
python3 generate_epub.py \
  --cover-only \
  --title "Title" \
  --author "Author" \
  --output cover.png \
  --color yellow \
  --seed 42 \
  --top-text "Category" \
  --bottom-text "Subtitle"
```

**Standalone Cover Generator:**

```bash
python3 generate_cover.py \
  --title "Book Title" \
  --output cover.png \
  --top-text "Series/Category" \
  --bottom-text "Author/Subtitle" \
  --color purple \
  --seed 42 \
  --width 1600 \
  --height 2400
```

---

### Markdown Support

The tool supports comprehensive Markdown features:

- **Headings:** `#` through `######`
- **Bold/Italic:** `**bold**`, `*italic*`
- **Code blocks:** Triple backticks with syntax highlighting
- **Inline code:** Single backticks
- **Tables:** GitHub-flavored markdown tables
- **Lists:** Ordered and unordered
- **Links:** `[text](url)`
- **Blockquotes:** `> quote`
- **Images:** `![alt](url)` (auto-embedded)
- **Horizontal rules:** `---` or `***`
- **YAML frontmatter:** Automatically stripped

**Frontmatter metadata extraction:**

```yaml
---
title: My Book Title
author: Author Name
---
# Chapter 1
...
```

If you include frontmatter with `title` and `author`, you can omit the `--title` and `--author` flags.

---

## Troubleshooting

### NCX Validation Warnings

If you use a custom NCX, the tool validates it and shows warnings:

```
⚠️  NCX validation warnings:
  - playOrder values must be sequential 1-3, got: [1, 3, 4]
  - NCX has 3 chapters but 4 input files provided
```

**Fix:** Ensure your NCX file has the correct number of chapters and sequential playOrder values.

---

### Missing Dependencies

```
Error: Missing required dependency: No module named 'ebooklib'
Install dependencies: pip3 install -r requirements.txt
```

**Fix:** Run `pip3 install -r requirements.txt`

---

### File Not Found

```
Error: Input file not found: chapter-01.md
```

**Fix:** Check file paths are correct and files exist. Use absolute paths if needed.

---

## File Structure

```
.claude/skills/epub-packing/
├── fonts/
│   ├── BricolageGrotesque-Variable.ttf  # Neo-brutalism cover font
│   └── Roboto-Bold.ttf                  # Fallback font
├── download_html_to_md.py               # HTML to Markdown converter
├── generate_epub.py                     # Main EPUB generator
├── generate_cover.py                    # Cover image generator
├── requirements.txt                     # Python dependencies
└── SKILL.md                             # This file
```

---

## Tips for Best Results

1. **Use clear H1 headings:** First H1 becomes the chapter title
2. **Split long content:** Use multiple files for books (easier to organize)
3. **Clean HTML downloads:** Always review/edit downloaded HTML → Markdown conversions
4. **Consistent naming:** Use `chapter-01.md`, `chapter-02.md` for easy ordering
5. **Test on e-readers:** Open generated EPUBs in calibre or Apple Books to verify
6. **Use seeds for series:** Same seed = consistent branding across book series

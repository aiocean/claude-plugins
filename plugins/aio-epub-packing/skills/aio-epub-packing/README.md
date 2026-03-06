# EPUB Generator

Generate professional EPUB ebooks from Markdown files with auto-generated neo-brutalism covers.

## Features

- 📚 Convert Markdown to EPUB format
- 🤖 **Auto-generate NCX** (table of contents) from chapter files
- 📖 Multi-chapter support (multiple Markdown files → one EPUB)
- 🎨 Auto-generate professional neo-brutalism book covers
- 🎯 Extract metadata from YAML frontmatter
- 💅 Beautiful typography with bundled fonts
- 🌈 7 color schemes + deterministic color generation
- ✅ NCX validation for custom table of contents

## Quick Start

```bash
# 1. Install dependencies
pip3 install -r requirements.txt

# 2. Generate EPUB (NCX auto-generated!)
python3 generate_epub.py \
  --input document.md \
  --output book.epub \
  --title "My Book" \
  --author "Author Name"
```

That's it! For detailed usage, workflows, and advanced features, see **[SKILL.md](SKILL.md)**.

## Documentation

📖 **[SKILL.md](SKILL.md)** - Complete guide with:
- Quick start (30 seconds to first EPUB)
- Common workflows (single-doc, multi-chapter, web articles, custom covers)
- Advanced topics (manual NCX control, all parameters, markdown features)
- Troubleshooting
- Examples

## What's New

### Major Improvements (Latest)

✅ **Auto-NCX Generation** - No more manual NCX file creation!
```bash
# Before: Required manual toc.ncx creation
# Now: Just pass your files
python3 generate_epub.py --input ch1.md ch2.md --output book.epub --title "Book" --author "Author"
```

✅ **Deterministic Cover Colors** - Consistent branding for book series
```bash
# Same seed = same color every time
python3 generate_epub.py --input book.md --output book.epub --color random --seed 42
```

✅ **Named Color Schemes** - 7 built-in neo-brutalism palettes
```bash
# Available: yellow, pink, cyan, green, orange, purple, red
python3 generate_epub.py --input book.md --output book.epub --color cyan
```

✅ **NCX Validation** - Automatic validation with helpful error messages

✅ **Improved Documentation** - Progressive disclosure pattern in SKILL.md

## Examples

See the [examples/](examples/) directory for:
- Single-document EPUB example
- Multi-chapter book example
- Sample Markdown files
- Generated EPUBs

## File Structure

```
.claude/skills/epub-generator/
├── SKILL.md                  # 📖 Complete documentation (START HERE)
├── README.md                 # This file (quick overview)
├── generate_epub.py          # Main EPUB generator
├── generate_cover.py         # Neo-brutalism cover generator
├── download_html_to_md.py    # HTML to Markdown converter
├── requirements.txt          # Python dependencies
├── fonts/                    # Bundled fonts
│   ├── BricolageGrotesque-Variable.ttf
│   └── Roboto-Bold.ttf
└── examples/                 # Example files and EPUBs
    ├── README.md
    ├── simple-article.md
    ├── simple-article.epub
    ├── chapter-01.md
    ├── chapter-02.md
    ├── chapter-03.md
    └── multi-chapter-book.epub
```

## Quick Examples

**Single document:**
```bash
python3 generate_epub.py \
  --input article.md \
  --output article.epub \
  --title "My Article" \
  --author "Author"
```

**Multi-chapter book:**
```bash
python3 generate_epub.py \
  --input ch1.md ch2.md ch3.md \
  --output book.epub \
  --title "Complete Guide" \
  --author "Author" \
  --color purple \
  --seed 123
```

**Custom cover:**
```bash
python3 generate_cover.py \
  --title "System Design" \
  --top-text "Tech Interview Series" \
  --bottom-text "Volume 1" \
  --output cover.png \
  --color cyan \
  --seed 42
```

## Requirements

- Python 3.7+
- Dependencies in `requirements.txt`:
  - `EbookLib` - EPUB generation
  - `Markdown` - Markdown parsing
  - `python-slugify` - URL-safe filenames
  - `Pillow` - Cover image generation
  - `requests` - HTTP downloads
  - `beautifulsoup4` - HTML parsing
  - `html2text` - HTML to Markdown conversion

## Contributing

This is a Claude Code skill. For issues or improvements, update the code and documentation following the patterns established in SKILL.md.

## License

MIT License - Free to use and modify.

---

**For complete documentation, workflows, and advanced usage, see [SKILL.md](SKILL.md)**

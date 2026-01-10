# EPUB Generator Examples

This directory contains example files and generated EPUBs to demonstrate the tool's capabilities.

## Files

### Single-Document Example
- **`simple-article.md`** - Example single-document article about system design
- **`simple-article.epub`** - Generated EPUB (cyan color scheme, seed 42)

**Command used:**
```bash
python3 generate_epub.py \
  --input examples/simple-article.md \
  --output examples/simple-article.epub \
  --title "Introduction to System Design" \
  --author "Engineering Team" \
  --color cyan \
  --seed 42
```

### Multi-Chapter Example
- **`chapter-01.md`** - First chapter: Getting Started
- **`chapter-02.md`** - Second chapter: Core Concepts
- **`chapter-03.md`** - Third chapter: Advanced Techniques
- **`multi-chapter-book.epub`** - Generated multi-chapter EPUB (purple color scheme, seed 123)

**Command used:**
```bash
python3 generate_epub.py \
  --input examples/chapter-01.md examples/chapter-02.md examples/chapter-03.md \
  --output examples/multi-chapter-book.epub \
  --title "Complete Guide" \
  --author "Expert Author" \
  --color purple \
  --seed 123
```

## Key Features Demonstrated

1. **Auto-NCX Generation** - No manual NCX file needed
2. **Chapter Title Extraction** - Automatically extracts H1 headings as chapter titles
3. **Deterministic Colors** - Using `--seed` ensures consistent cover colors
4. **Named Color Schemes** - Using `--color` to choose specific palettes
5. **Multi-Chapter Support** - Multiple markdown files combined into one EPUB

## Testing the Examples

You can regenerate these examples anytime:

```bash
# Regenerate single-document EPUB
python3 generate_epub.py \
  --input examples/simple-article.md \
  --output examples/simple-article.epub \
  --title "Introduction to System Design" \
  --author "Engineering Team" \
  --color cyan \
  --seed 42

# Regenerate multi-chapter EPUB
python3 generate_epub.py \
  --input examples/chapter-*.md \
  --output examples/multi-chapter-book.epub \
  --title "Complete Guide" \
  --author "Expert Author" \
  --color purple \
  --seed 123
```

## View the EPUBs

Open the generated EPUBs with:
- **macOS:** Apple Books (double-click the .epub file)
- **Windows:** Calibre, Edge browser, or any EPUB reader
- **Linux:** Calibre, FBReader, or similar
- **Online:** Use [EPUB.js Reader](https://s3.amazonaws.com/epubjs/reader/)

## Customization Ideas

Try modifying the examples:

```bash
# Different color scheme
python3 generate_epub.py \
  --input examples/simple-article.md \
  --output examples/simple-article-yellow.epub \
  --title "Introduction to System Design" \
  --author "Engineering Team" \
  --color yellow

# Random color (no seed)
python3 generate_epub.py \
  --input examples/simple-article.md \
  --output examples/simple-article-random.epub \
  --title "Introduction to System Design" \
  --author "Engineering Team"

# Custom cover text
python3 generate_epub.py \
  --input examples/chapter-*.md \
  --output examples/custom-cover.epub \
  --title "Complete Guide" \
  --author "Expert Author" \
  --top-text "ADVANCED SERIES" \
  --bottom-text "Volume 1" \
  --color orange
```

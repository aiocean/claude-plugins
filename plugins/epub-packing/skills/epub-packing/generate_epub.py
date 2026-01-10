#!/usr/bin/env python3
"""
Generate EPUB ebooks from Markdown files with auto-generated covers.

This script converts Markdown documents to EPUB format with:
- Auto-generated professional covers
- Table of contents
- Metadata (title, author, language, publisher)
- Clean typography and styling
"""

import argparse
import os
import re
import sys
import tempfile
import uuid
from pathlib import Path
from urllib.parse import urljoin, urlparse
import urllib.request
import mimetypes
import ssl

try:
    from ebooklib import epub
    import markdown
    from slugify import slugify
    from PIL import Image
except ImportError as e:
    print(f"Error: Missing required dependency: {e}", file=sys.stderr)
    print("Install dependencies: pip3 install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

# Import cover generator
from generate_cover import generate_cover


def strip_frontmatter(content):
    """Remove YAML frontmatter from Markdown content."""
    # Match YAML frontmatter (between --- delimiters)
    frontmatter_pattern = r'^---\s*\n.*?\n---\s*\n'
    content = re.sub(frontmatter_pattern, '', content, flags=re.DOTALL)
    return content


def extract_metadata_from_frontmatter(content):
    """Extract metadata from YAML frontmatter."""
    metadata = {}

    # Match YAML frontmatter
    frontmatter_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, flags=re.DOTALL)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(1)

        # Extract title
        title_match = re.search(r'title:\s*["\']?(.+?)["\']?\s*$', frontmatter, flags=re.MULTILINE)
        if title_match:
            metadata['title'] = title_match.group(1).strip()

        # Extract author/owner
        author_match = re.search(r'(?:author|owner):\s*["\']?(.+?)["\']?\s*$', frontmatter, flags=re.MULTILINE)
        if author_match:
            metadata['author'] = author_match.group(1).strip()

        # Extract candidate_name (for interview documents)
        candidate_match = re.search(r'candidate_name:\s*["\']?(.+?)["\']?\s*$', frontmatter, flags=re.MULTILINE)
        if candidate_match:
            # Use as subtitle or append to title
            metadata['candidate'] = candidate_match.group(1).strip()

    return metadata


def download_image(url, output_path, timeout=30):
    """
    Download an image from a URL.

    Args:
        url: Image URL to download
        output_path: Path to save the image
        timeout: Request timeout in seconds

    Returns:
        True if successful, False otherwise
    """
    try:
        # Set user agent to avoid 403 errors
        headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
        req = urllib.request.Request(url, headers=headers)

        # Create SSL context that doesn't verify certificates (for downloading images)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        with urllib.request.urlopen(req, timeout=timeout, context=ssl_context) as response:
            if response.status == 200:
                with open(output_path, 'wb') as f:
                    f.write(response.read())
                return True
    except Exception as e:
        print(f"  Warning: Failed to download image {url}: {e}")
        return False
    return False


def extract_images_from_markdown(md_content, base_url=None):
    """
    Extract all image references from markdown content.

    Args:
        md_content: Markdown content as string
        base_url: Base URL for resolving relative image paths (optional)

    Returns:
        List of tuples: (alt_text, image_url, original_markdown)
    """
    # Pattern to match markdown images: ![alt](url)
    image_pattern = r'!\[([^\]]*)\]\(([^\)]+)\)'
    images = []

    for match in re.finditer(image_pattern, md_content):
        alt_text = match.group(1)
        image_url = match.group(2)
        original_md = match.group(0)

        # Resolve relative URLs if base_url provided
        if base_url and not urlparse(image_url).scheme:
            image_url = urljoin(base_url, image_url)

        images.append((alt_text, image_url, original_md))

    return images


def process_images_for_epub(md_content, book, temp_dir, base_url=None):
    """
    Download images from markdown content and embed them in EPUB.

    Args:
        md_content: Markdown content as string
        book: EpubBook instance
        temp_dir: Temporary directory for downloading images
        base_url: Base URL for resolving relative image paths (optional)

    Returns:
        Updated markdown content with local image references
    """
    images = extract_images_from_markdown(md_content, base_url)

    if not images:
        return md_content

    print(f"  Found {len(images)} image(s) to process")

    updated_content = md_content
    downloaded_count = 0

    for idx, (alt_text, image_url, original_md) in enumerate(images):
        # Skip data URLs
        if image_url.startswith('data:'):
            print(f"    Skipping data URL image")
            continue

        # Generate filename from URL
        parsed_url = urlparse(image_url)
        url_filename = os.path.basename(parsed_url.path) or f'image_{idx}'

        # Clean filename and add extension if missing
        clean_filename = slugify(url_filename)
        if not os.path.splitext(clean_filename)[1]:
            # Guess extension from URL or default to .jpg
            ext = mimetypes.guess_extension(parsed_url.path.split('.')[-1]) or '.jpg'
            clean_filename = f"{clean_filename}{ext}"

        # Ensure unique filename
        epub_image_path = f"images/{clean_filename}"
        temp_image_path = os.path.join(temp_dir, clean_filename)

        # Download image
        print(f"    Downloading: {image_url[:80]}...")
        if download_image(image_url, temp_image_path):
            try:
                # Verify it's a valid image
                with Image.open(temp_image_path) as img:
                    img.verify()

                # Re-open to get the actual image data (verify() closes the file)
                with open(temp_image_path, 'rb') as img_file:
                    image_data = img_file.read()

                # Determine media type
                mime_type = mimetypes.guess_type(temp_image_path)[0]
                if not mime_type:
                    mime_type = 'image/jpeg'  # Default fallback

                # Create EPUB image item
                epub_image = epub.EpubItem(
                    uid=f"image_{idx}",
                    file_name=epub_image_path,
                    media_type=mime_type,
                    content=image_data
                )
                book.add_item(epub_image)

                # Update markdown to reference embedded image
                new_md = f"![{alt_text}]({epub_image_path})"
                updated_content = updated_content.replace(original_md, new_md)

                downloaded_count += 1
                print(f"    ✓ Embedded as {epub_image_path}")

            except Exception as e:
                print(f"    Warning: Invalid image file, skipping: {e}")
        else:
            print(f"    ✗ Failed to download, keeping original URL")

    print(f"  Successfully embedded {downloaded_count}/{len(images)} image(s)")
    return updated_content


def markdown_to_html(md_content):
    """Convert Markdown to HTML."""
    # Strip frontmatter
    md_content = strip_frontmatter(md_content)

    # Configure Markdown extensions
    # nl2br: converts single newlines to <br> tags (like GitHub Flavored Markdown)
    md = markdown.Markdown(extensions=[
        'extra',
        'codehilite',
        'tables',
        'toc',
        'fenced_code',
        'nl2br'
    ])

    html = md.convert(md_content)
    return html


def validate_ncx(ncx_content, input_files):
    """
    Validate NCX content against chapter files.

    Args:
        ncx_content: NCX XML content as string
        input_files: List of input Markdown file paths

    Returns:
        Tuple of (is_valid, list of error messages)
    """
    errors = []

    # Check for valid UUID
    uid_match = re.search(r'<meta name="dtb:uid" content="urn:uuid:([^"]+)"', ncx_content)
    if not uid_match:
        errors.append("NCX missing valid UUID in dtb:uid meta tag")
    else:
        uid = uid_match.group(1)
        try:
            uuid.UUID(uid)  # Validate UUID format
        except ValueError:
            errors.append(f"Invalid UUID format: {uid}")

    # Extract playOrder values
    play_orders = re.findall(r'playOrder="(\d+)"', ncx_content)
    if play_orders:
        play_orders = [int(po) for po in play_orders]

        # Check playOrder is sequential starting from 1
        expected_orders = list(range(1, len(play_orders) + 1))
        if play_orders != expected_orders:
            errors.append(f"playOrder values must be sequential 1-{len(play_orders)}, got: {play_orders}")

        # Check playOrder count matches input files
        if len(play_orders) != len(input_files):
            errors.append(f"NCX has {len(play_orders)} chapters but {len(input_files)} input files provided")
    else:
        errors.append("No navPoint elements found in NCX")

    # Extract chapter filenames from NCX
    ncx_filenames = re.findall(r'<content src="([^"]+)"', ncx_content)
    expected_filenames = [f'chapter_{idx + 1:02d}.xhtml' for idx in range(len(input_files))]

    if ncx_filenames != expected_filenames:
        errors.append(f"NCX chapter filenames don't match expected pattern")
        errors.append(f"  Expected: {expected_filenames}")
        errors.append(f"  Got: {ncx_filenames}")

    return (len(errors) == 0, errors)


def auto_generate_ncx(input_files, title, author, language='en'):
    """
    Auto-generate NCX file from chapter files.

    Args:
        input_files: List of input Markdown file paths
        title: Book title
        author: Author name
        language: Language code (default: 'en')

    Returns:
        NCX content as string
    """
    # Generate UUID for the book
    book_uid = str(uuid.uuid4())

    # Extract chapter titles
    chapters = []
    for idx, input_file in enumerate(input_files):
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract chapter title from first H1
        chapter_title = f"Chapter {idx + 1}"
        h1_match = re.search(r'^#\s+(.+)$', strip_frontmatter(content), flags=re.MULTILINE)
        if h1_match:
            chapter_title = h1_match.group(1).strip()

        chapters.append({
            'title': chapter_title,
            'filename': f'chapter_{idx + 1:02d}.xhtml',
            'play_order': idx + 1
        })

    # Build NCX content
    ncx_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">',
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">',
        '  <head>',
        f'    <meta name="dtb:uid" content="urn:uuid:{book_uid}"/>',
        '    <meta name="dtb:depth" content="1"/>',
        '    <meta name="dtb:totalPageCount" content="0"/>',
        '    <meta name="dtb:maxPageNumber" content="0"/>',
        '  </head>',
        '  <docTitle>',
        f'    <text>{title}</text>',
        '  </docTitle>',
        '  <docAuthor>',
        f'    <text>{author}</text>',
        '  </docAuthor>',
        '  <navMap>',
    ]

    # Add navigation points for each chapter
    for chapter in chapters:
        ncx_lines.extend([
            f'    <navPoint id="navPoint-{chapter["play_order"]}" playOrder="{chapter["play_order"]}">',
            f'      <navLabel>',
            f'        <text>{chapter["title"]}</text>',
            f'      </navLabel>',
            f'      <content src="{chapter["filename"]}"/>',
            f'    </navPoint>',
        ])

    ncx_lines.extend([
        '  </navMap>',
        '</ncx>',
    ])

    return '\n'.join(ncx_lines)


def create_epub(input_files, output_file, title, author, ncx_file=None, language='en', publisher=None, cover_color='random', cover_seed=None):
    """
    Create an EPUB file from Markdown file(s).

    Args:
        input_files: Path to input Markdown file OR list of paths (for multi-chapter books)
        output_file: Path to output EPUB file
        title: Book title
        author: Author name
        ncx_file: Path to custom NCX file (optional - will auto-generate if not provided)
        language: Language code (default: 'en')
        publisher: Publisher name (optional)
        cover_color: Cover color scheme (default: 'random')
        cover_seed: Random seed for deterministic cover colors (optional)
    """
    # Handle single file or list of files
    if isinstance(input_files, str):
        input_files = [input_files]

    print(f"Reading {len(input_files)} input file(s)")

    # Read all Markdown files
    chapters_content = []
    for input_file in input_files:
        print(f"  - {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            chapters_content.append(f.read())

    # Use first file for metadata extraction
    md_content = chapters_content[0]

    # Try to extract metadata from frontmatter if not provided
    frontmatter_metadata = extract_metadata_from_frontmatter(md_content)

    # Use frontmatter metadata if not explicitly provided
    if not title and 'title' in frontmatter_metadata:
        title = frontmatter_metadata['title']
        # Append candidate name if it exists
        if 'candidate' in frontmatter_metadata:
            title = f"{title}: {frontmatter_metadata['candidate']}"

    if not author and 'author' in frontmatter_metadata:
        author = frontmatter_metadata['author']

    # Validate required fields
    if not title:
        print("Error: Title is required (use --title or include in frontmatter)", file=sys.stderr)
        sys.exit(1)
    if not author:
        print("Error: Author is required (use --author or include in frontmatter)", file=sys.stderr)
        sys.exit(1)

    print(f"Creating EPUB: {title} by {author}")

    # Create EPUB book
    book = epub.EpubBook()

    # Set metadata
    book.set_identifier(slugify(f"{title}-{author}"))
    book.set_title(title)
    book.set_language(language)
    book.add_author(author)
    if publisher:
        book.add_metadata('DC', 'publisher', publisher)

    # Generate cover image
    print("Generating cover image...")
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as cover_file:
        cover_path = cover_file.name

    generate_cover(
        title=title,
        output_path=cover_path,
        bottom_text=author,
        color_scheme=cover_color,
        seed=cover_seed
    )

    # Add cover image to EPUB
    with open(cover_path, 'rb') as f:
        book.set_cover('cover.jpg', f.read())

    # Clean up temporary cover file
    os.unlink(cover_path)

    # Add CSS
    css_content = '''
        @namespace epub "http://www.idpf.org/2007/ops";

        body {
            font-family: Georgia, serif;
            font-size: 1.1em;
            line-height: 1.6;
            margin: 2em;
            color: #333;
        }

        h1 {
            font-size: 2em;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 0.3em;
        }

        h2 {
            font-size: 1.6em;
            margin-top: 1.2em;
            margin-bottom: 0.4em;
            color: #34495e;
        }

        h3 {
            font-size: 1.3em;
            margin-top: 1em;
            margin-bottom: 0.3em;
            color: #555;
        }

        p {
            margin: 0.8em 0;
            text-align: justify;
        }

        code {
            font-family: "Courier New", monospace;
            background-color: #f4f4f4;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-size: 0.9em;
        }

        pre {
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 1em;
            overflow-x: auto;
            line-height: 1.4;
        }

        pre code {
            background-color: transparent;
            padding: 0;
        }

        blockquote {
            border-left: 4px solid #3498db;
            padding-left: 1em;
            margin-left: 0;
            color: #555;
            font-style: italic;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 0.6em;
            text-align: left;
        }

        th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }

        tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        ul, ol {
            margin: 0.8em 0;
            padding-left: 2em;
        }

        li {
            margin: 0.3em 0;
        }

        a {
            color: #3498db;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        hr {
            border: none;
            border-top: 2px solid #ddd;
            margin: 2em 0;
        }

        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1.5em auto;
            border-radius: 4px;
        }
    '''

    # Create CSS file
    nav_css = epub.EpubItem(
        uid="style_nav",
        file_name="style/nav.css",
        media_type="text/css",
        content=css_content
    )
    book.add_item(nav_css)

    # Create temporary directory for image processing
    with tempfile.TemporaryDirectory() as temp_images_dir:
        # Convert each Markdown file to a chapter
        print(f"Converting {len(chapters_content)} chapter(s) to HTML...")
        chapters = []
        toc_entries = []

        for idx, chapter_md in enumerate(chapters_content):
            # Extract chapter title from first H1 or use generic title
            chapter_title = f"Chapter {idx + 1}"
            h1_match = re.search(r'^#\s+(.+)$', strip_frontmatter(chapter_md), flags=re.MULTILINE)
            if h1_match:
                chapter_title = h1_match.group(1).strip()

            print(f"  - Chapter {idx + 1}: {chapter_title}")

            # Process and embed images
            print(f"  Processing images for chapter {idx + 1}...")
            chapter_md = process_images_for_epub(chapter_md, book, temp_images_dir)

            # Convert Markdown to HTML
            html_content = markdown_to_html(chapter_md)

            # Create chapter
            chapter = epub.EpubHtml(
                title=chapter_title,
                file_name=f'chapter_{idx + 1:02d}.xhtml',
                lang=language
            )
            chapter.content = f'<html><head></head><body>{html_content}</body></html>'
            chapter.add_item(nav_css)

            # Add chapter to book
            book.add_item(chapter)
            chapters.append(chapter)

            # Add to table of contents
            toc_entries.append(epub.Link(f'chapter_{idx + 1:02d}.xhtml', chapter_title, f'chapter_{idx + 1}'))

        # Create table of contents (outside the for loop, inside tempdir context)
        book.toc = tuple(toc_entries)

        # Handle NCX file - use custom or auto-generate
        if ncx_file:
            print(f"Using custom NCX file: {ncx_file}")
            with open(ncx_file, 'r', encoding='utf-8') as f:
                ncx_content = f.read()

            # Validate custom NCX
            print("Validating NCX...")
            is_valid, validation_errors = validate_ncx(ncx_content, input_files)
            if not is_valid:
                print("⚠️  NCX validation warnings:", file=sys.stderr)
                for error in validation_errors:
                    print(f"  - {error}", file=sys.stderr)
                print("", file=sys.stderr)
                print("Continuing with EPUB generation, but you may want to fix these issues.", file=sys.stderr)
                print("", file=sys.stderr)
        else:
            print("Auto-generating NCX from chapter files...")
            ncx_content = auto_generate_ncx(input_files, title, author, language)

        # Create NCX item
        ncx = epub.EpubItem(
            uid="ncx",
            file_name="toc.ncx",
            media_type="application/x-dtbncx+xml",
            content=ncx_content
        )
        book.add_item(ncx)

        book.add_item(epub.EpubNav())

        # Define spine (reading order)
        book.spine = ['nav'] + chapters

        # Write EPUB file
        print(f"Writing EPUB file: {output_file}")
        epub.write_epub(output_file, book, {})

        # Get file size
        file_size = os.path.getsize(output_file)
        file_size_mb = file_size / (1024 * 1024)

        print(f"✓ EPUB created successfully!")
        print(f"  Output: {output_file}")
        print(f"  Size: {file_size_mb:.2f} MB")
        print(f"  Title: {title}")
        print(f"  Author: {author}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate EPUB ebook from Markdown file',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Single file
  %(prog)s --input document.md --output book.epub --title "My Book" --author "Author Name"

  # Multiple files (multi-chapter book) - NCX auto-generated
  %(prog)s --input chapter-01.md chapter-02.md chapter-03.md --output book.epub --title "My Book" --author "Author"

  # Multiple files with custom NCX
  %(prog)s --input chapter-01.md chapter-02.md chapter-03.md --ncx toc.ncx --output book.epub --title "My Book" --author "Author"

  # With publisher
  %(prog)s --input doc.md --output book.epub --title "Title" --author "Author" --publisher "Publisher"

  # Generate cover only
  %(prog)s --title "My Book" --author "Author" --cover-only --output cover.jpg
        '''
    )

    parser.add_argument('--input', nargs='+', help='Input Markdown file(s) - can specify multiple files in order')
    parser.add_argument('--output', required=True, help='Output EPUB file or cover image')
    parser.add_argument('--title', help='Book title (or extract from frontmatter)')
    parser.add_argument('--author', help='Author name (or extract from frontmatter)')
    parser.add_argument('--ncx', help='Path to custom NCX file (optional - will auto-generate from chapters if not provided)')
    parser.add_argument('--language', default='en', help='Language code (default: en)')
    parser.add_argument('--publisher', help='Publisher name (optional)')
    parser.add_argument('--cover-only', action='store_true', help='Only generate cover image')
    parser.add_argument('--top-text', help='Cover: text at top (category/series)')
    parser.add_argument('--bottom-text', help='Cover: text at bottom (subtitle/author) - defaults to --author if not specified')
    parser.add_argument('--color', choices=['random', 'yellow', 'pink', 'cyan', 'green', 'orange', 'purple', 'red'], default='random', help='Cover color scheme (default: random)')
    parser.add_argument('--seed', type=int, help='Random seed for deterministic cover colors')

    args = parser.parse_args()

    if args.cover_only:
        # Generate cover only
        if not args.title:
            print("Error: --title is required for cover generation", file=sys.stderr)
            sys.exit(1)
        generate_cover(
            title=args.title,
            output_path=args.output,
            top_text=args.top_text,
            bottom_text=args.bottom_text or args.author,
            color_scheme=args.color,
            seed=args.seed
        )
    else:
        # Generate EPUB
        if not args.input:
            print("Error: --input is required for EPUB generation", file=sys.stderr)
            sys.exit(1)

        # Validate all input files exist
        for input_file in args.input:
            if not os.path.exists(input_file):
                print(f"Error: Input file not found: {input_file}", file=sys.stderr)
                sys.exit(1)

        # Validate NCX file exists if provided
        if args.ncx and not os.path.exists(args.ncx):
            print(f"Error: NCX file not found: {args.ncx}", file=sys.stderr)
            sys.exit(1)

        create_epub(
            input_files=args.input if len(args.input) > 1 else args.input[0],
            output_file=args.output,
            title=args.title,
            author=args.author,
            ncx_file=args.ncx,
            language=args.language,
            publisher=args.publisher,
            cover_color=args.color,
            cover_seed=args.seed
        )


if __name__ == '__main__':
    main()

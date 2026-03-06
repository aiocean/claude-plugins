#!/usr/bin/env python3
"""
Download HTML content from URLs and convert to raw markdown files.
Uses markitdown to convert HTML to markdown format.
Output files are RAW and need refinement before packaging into EPUB.
"""

import argparse
import sys
from pathlib import Path
from slugify import slugify
from markitdown import MarkItDown


def download_and_convert(url: str, output_dir: Path) -> Path:
    """
    Download HTML from URL and convert to raw markdown.

    Args:
        url: URL to download
        output_dir: Directory to save markdown file

    Returns:
        Path to the created markdown file
    """
    try:
        print(f"Downloading: {url}")

        # Initialize MarkItDown
        md = MarkItDown()

        # Convert URL to markdown
        result = md.convert(url)

        # Get title from result or use URL as fallback
        title = result.title if hasattr(result, 'title') and result.title else url

        # Slugify title to create filename
        filename = f"{slugify(title)}.md"
        output_path = output_dir / filename

        # Write raw markdown content
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result.text_content)

        print(f"✓ Saved to: {output_path}")
        return output_path

    except Exception as e:
        print(f"✗ Error downloading {url}: {e}", file=sys.stderr)
        raise


def main():
    parser = argparse.ArgumentParser(
        description='Download HTML from URLs and convert to raw markdown files for AI refinement',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download single URL
  python3 download_html_to_md.py https://example.com/article --output ./raw

  # Download multiple URLs
  python3 download_html_to_md.py https://site1.com https://site2.com --output ./raw

Note: Output files are RAW markdown that need AI refinement before packaging.
Filenames are auto-generated from page titles using slugify.
        """
    )

    parser.add_argument(
        'urls',
        nargs='+',
        help='One or more URLs to download and convert'
    )

    parser.add_argument(
        '-o', '--output',
        type=Path,
        required=True,
        help='Output directory for raw markdown files (required)'
    )

    args = parser.parse_args()

    # Create output directory if needed
    args.output.mkdir(parents=True, exist_ok=True)

    print(f"Output directory: {args.output.absolute()}")
    print(f"Processing {len(args.urls)} URL(s)...\n")

    # Download and convert each URL
    success_count = 0
    failed_urls = []

    for url in args.urls:
        try:
            download_and_convert(url, args.output)
            success_count += 1
        except Exception:
            failed_urls.append(url)
        print()  # Blank line between downloads

    # Summary
    print("=" * 50)
    print(f"Summary: {success_count}/{len(args.urls)} successful")

    if failed_urls:
        print(f"\nFailed URLs:")
        for url in failed_urls:
            print(f"  - {url}")
        sys.exit(1)
    else:
        print("All downloads completed successfully!")
        print("\nNote: These are RAW files that need refinement before EPUB packaging.")
        sys.exit(0)


if __name__ == '__main__':
    main()

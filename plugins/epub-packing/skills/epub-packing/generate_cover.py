#!/usr/bin/env python3
"""
Generate neo-brutalism style book covers for EPUB files.

This script creates a book cover image with:
- Bold, flat colors (no gradients)
- Strong black borders and shadows
- Top text (optional category/series)
- Title text (large, bold)
- Bottom text (optional subtitle/author)
- Neo-brutalism aesthetic with harsh shadows and borders
- Standard ebook dimensions (1600x2400)
"""

import argparse
from PIL import Image, ImageDraw, ImageFont
import sys
import os
import random


def get_font_path(filename):
    """Get path to bundled font file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, 'fonts', filename)


def wrap_text(text, font, max_width, draw):
    """Wrap text to fit within max_width."""
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        width = bbox[2] - bbox[0]

        if width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]

    if current_line:
        lines.append(' '.join(current_line))

    return lines


def get_neo_brutalism_colors(color_scheme='random', seed=None):
    """
    Get neo-brutalism color palette - bold, flat colors.

    Args:
        color_scheme: Color scheme name or 'random' (default)
        seed: Random seed for deterministic color selection (optional)

    Returns:
        Dictionary with color values
    """
    # Named color palettes
    named_palettes = {
        'yellow': {'bg': (255, 220, 0), 'accent': (0, 0, 0), 'text': (0, 0, 0), 'box_shadow': (0, 0, 0)},
        'pink': {'bg': (255, 0, 127), 'accent': (0, 0, 0), 'text': (0, 0, 0), 'box_shadow': (0, 0, 0)},
        'cyan': {'bg': (0, 255, 255), 'accent': (0, 0, 0), 'text': (0, 0, 0), 'box_shadow': (0, 0, 0)},
        'green': {'bg': (0, 255, 0), 'accent': (0, 0, 0), 'text': (0, 0, 0), 'box_shadow': (0, 0, 0)},
        'orange': {'bg': (255, 127, 0), 'accent': (0, 0, 0), 'text': (0, 0, 0), 'box_shadow': (0, 0, 0)},
        'purple': {'bg': (147, 51, 234), 'accent': (255, 220, 0), 'text': (0, 0, 0), 'box_shadow': (0, 0, 0)},
        'red': {'bg': (255, 0, 0), 'accent': (255, 255, 255), 'text': (0, 0, 0), 'box_shadow': (0, 0, 0)},
    }

    # If named color scheme requested, return it
    if color_scheme in named_palettes:
        return named_palettes[color_scheme]

    # Otherwise use random selection
    palettes = list(named_palettes.values())

    # Set seed if provided for deterministic selection
    if seed is not None:
        random.seed(seed)

    return random.choice(palettes)


def draw_brutal_box(draw, x, y, width, height, fill_color, border_color, box_shadow_color, border_width=12, shadow_offset=18):
    """Draw a box with neo-brutalism style (thick border and harsh shadow)."""
    # Draw single colored shadow (darker yellow)
    draw.rectangle(
        [x + shadow_offset, y + shadow_offset, x + width + shadow_offset, y + height + shadow_offset],
        fill=box_shadow_color
    )

    # Draw black border box
    draw.rectangle(
        [x, y, x + width, y + height],
        fill=border_color
    )

    # Draw bright yellow inner fill
    draw.rectangle(
        [x + border_width, y + border_width, x + width - border_width, y + height - border_width],
        fill=fill_color
    )


def generate_cover(title, output_path, top_text=None, bottom_text=None, width=1600, height=2400, color_scheme='random', seed=None):
    """
    Generate a neo-brutalism style book cover image.

    Args:
        title: Book title (required)
        output_path: Output file path
        top_text: Text at top (optional - category/series)
        bottom_text: Text at bottom (optional - subtitle/author)
        width: Image width (default: 1600)
        height: Image height (default: 2400)
        color_scheme: Color scheme - 'random', 'yellow', 'pink', 'cyan', 'green', 'orange', 'purple', 'red' (default: 'random')
        seed: Random seed for deterministic color selection when using 'random' (optional)
    """
    # Get color palette
    colors = get_neo_brutalism_colors(color_scheme=color_scheme, seed=seed)
    bg_color = colors['bg']
    accent_color = colors['accent']
    text_color = colors['text']
    box_shadow_color = colors['box_shadow']
    text_shadow_color = accent_color  # Black for text shadow

    # Create base image with solid background (black)
    img = Image.new('RGB', (width, height), accent_color)
    draw = ImageDraw.Draw(img)

    # Draw outer border first (at the bottom layer) - extra thick for neo-brutalism
    border_thickness = 80  # Increased from 60
    inner_border_thickness = 25

    # Fill border area with accent color (black) - this creates the frame
    # Top border
    draw.rectangle([0, 0, width, border_thickness], fill=accent_color)
    # Bottom border
    draw.rectangle([0, height - border_thickness, width, height], fill=accent_color)
    # Left border
    draw.rectangle([0, 0, border_thickness, height], fill=accent_color)
    # Right border
    draw.rectangle([width - border_thickness, 0, width, height], fill=accent_color)

    # Draw inner border line for extra brutalism
    inner_offset = border_thickness - inner_border_thickness
    draw.rectangle(
        [inner_offset, inner_offset, width - inner_offset, height - inner_offset],
        outline=bg_color,
        width=12  # Thicker inner border
    )

    # Load fonts - using Bricolage Grotesque ExtraBold
    try:
        # Bricolage Grotesque is a variable font
        # For variable fonts, we can set weight via font variations
        # Weight 800 = ExtraBold
        title_font_path = get_font_path('BricolageGrotesque-Variable.ttf')
        small_font_path = get_font_path('BricolageGrotesque-Variable.ttf')

        title_font = ImageFont.truetype(title_font_path, 180)  # 96pt ≈ 128-180px depending on DPI
        small_font = ImageFont.truetype(small_font_path, 70)

        # Set font variations for ExtraBold (weight 800)
        # PIL supports font variations for variable fonts
        if hasattr(title_font, 'set_variation_by_name'):
            title_font.set_variation_by_name('ExtraBold')
            small_font.set_variation_by_name('ExtraBold')
        elif hasattr(title_font, 'set_variation_by_axes'):
            # Manually set weight axis to 800 (ExtraBold)
            title_font.set_variation_by_axes([800])
            small_font.set_variation_by_axes([800])

    except Exception as e:
        print(f"Warning: Could not load Bricolage Grotesque ({e}), trying Roboto fallback", file=sys.stderr)
        try:
            title_font = ImageFont.truetype(get_font_path('Roboto-Bold.ttf'), 160)
            small_font = ImageFont.truetype(get_font_path('Roboto-Bold.ttf'), 60)
        except:
            print(f"Warning: Could not load any fonts, using default", file=sys.stderr)
            title_font = ImageFont.load_default()
            small_font = ImageFont.load_default()

    # Border and shadow configuration - more aggressive for neo-brutalism
    title_shadow_offset = 30  # Increased for harsher shadow
    title_box_padding = 50
    title_border_width = 18  # Thicker borders
    small_shadow_offset = 20  # Increased shadow
    small_box_padding = 30
    small_border_width = 14  # Thicker borders

    # Calculate safe area (inside border) - using border_thickness already defined above
    safe_left = border_thickness
    safe_right = width - border_thickness
    safe_top = border_thickness
    safe_bottom = height - border_thickness
    safe_width = safe_right - safe_left
    safe_height = safe_bottom - safe_top

    # For centered boxes: box_width + shadow must fit in safe_width
    # box_width = text_width + 2*padding + 2*border_width
    # So: text_width + 2*padding + 2*border_width + shadow <= safe_width
    max_text_width = safe_width - 2*(title_box_padding + title_border_width) - title_shadow_offset - 50
    # = 1480 - 2*54 - 22 - 50 = 1300

    # Calculate layout positions
    margin = safe_left + 30
    current_y = safe_top + 30

    # Draw top text if provided
    if top_text:
        top_bbox = draw.textbbox((0, 0), top_text.upper(), font=small_font)
        top_width = top_bbox[2] - top_bbox[0]
        top_height = top_bbox[3] - top_bbox[1]

        # Create box for top text
        box_padding = small_box_padding
        box_width = top_width + (box_padding * 2) + (small_border_width * 2)
        box_height = top_height + (box_padding * 2) + (small_border_width * 2)
        box_x = margin
        box_y = current_y

        draw_brutal_box(draw, box_x, box_y, box_width, box_height, bg_color, accent_color, box_shadow_color, border_width=small_border_width, shadow_offset=small_shadow_offset)

        # Center text in the box
        inner_x = box_x + small_border_width
        inner_y = box_y + small_border_width
        inner_width = box_width - (small_border_width * 2)
        inner_height = box_height - (small_border_width * 2)

        text_x = inner_x + (inner_width - top_width) // 2 - top_bbox[0]
        text_y = inner_y + (inner_height - top_height) // 2 - top_bbox[1]

        # Main text only
        draw.text((text_x, text_y), top_text.upper(), font=small_font, fill=text_color)

        current_y += box_height + 120

    # Draw title in center
    title_lines = wrap_text(title.upper(), title_font, max_text_width - 100, draw)

    # Calculate title block dimensions - increased spacing to prevent shadow overlap
    line_height = 240
    title_block_height = len(title_lines) * line_height

    # Calculate vertical center for title
    remaining_height = height - current_y - margin
    if bottom_text:
        remaining_height -= 200  # Reserve space for bottom text

    title_y_start = current_y + (remaining_height - title_block_height) // 2

    # Draw title lines with brutal boxes
    for i, line in enumerate(title_lines):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Create box for each line - much bigger padding and shadows
        box_padding = title_box_padding
        box_width = text_width + (box_padding * 2) + (title_border_width * 2)
        box_height = text_height + (box_padding * 2) + (title_border_width * 2)
        box_x = (width - box_width) // 2
        box_y = title_y_start + (i * line_height)

        draw_brutal_box(draw, box_x, box_y, box_width, box_height, bg_color, accent_color, box_shadow_color, border_width=title_border_width, shadow_offset=title_shadow_offset)

        # Center text in the box
        # Calculate the inner area (inside border)
        inner_x = box_x + title_border_width
        inner_y = box_y + title_border_width
        inner_width = box_width - (title_border_width * 2)
        inner_height = box_height - (title_border_width * 2)

        # Center the text within the inner area
        text_x = inner_x + (inner_width - text_width) // 2 - bbox[0]
        text_y = inner_y + (inner_height - text_height) // 2 - bbox[1]

        # Main text only
        draw.text((text_x, text_y), line, font=title_font, fill=text_color)

    # Draw bottom text if provided
    if bottom_text:
        # Calculate safe bottom position
        # bottom_y + box_height + shadow_offset must be <= safe_bottom
        small_box_height_est = 120  # Estimated box height for small text
        bottom_y = safe_bottom - small_box_height_est - small_shadow_offset - 30
        bottom_bbox = draw.textbbox((0, 0), bottom_text, font=small_font)
        bottom_width = bottom_bbox[2] - bottom_bbox[0]
        bottom_height = bottom_bbox[3] - bottom_bbox[1]

        # Create box for bottom text
        box_padding = small_box_padding
        box_width = bottom_width + (box_padding * 2) + (small_border_width * 2)
        box_height = bottom_height + (box_padding * 2) + (small_border_width * 2)
        box_x = (width - box_width) // 2
        box_y = bottom_y

        draw_brutal_box(draw, box_x, box_y, box_width, box_height, bg_color, accent_color, box_shadow_color, border_width=small_border_width, shadow_offset=small_shadow_offset)

        # Center text in the box
        inner_x = box_x + small_border_width
        inner_y = box_y + small_border_width
        inner_width = box_width - (small_border_width * 2)
        inner_height = box_height - (small_border_width * 2)

        text_x = inner_x + (inner_width - bottom_width) // 2 - bottom_bbox[0]
        text_y = inner_y + (inner_height - bottom_height) // 2 - bottom_bbox[1]

        # Main text only
        draw.text((text_x, text_y), bottom_text, font=small_font, fill=text_color)

    # Save the image
    img.save(output_path, 'PNG', quality=95)
    print(f"Neo-brutalism cover generated: {output_path}")
    print(f"Dimensions: {width}x{height}")
    print(f"Colors: BG={bg_color}, Text={text_color}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate a neo-brutalism style book cover',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Simple cover with just title
  python3 generate_cover.py --title "Design Patterns" --output cover.png

  # Cover with top text (category/series)
  python3 generate_cover.py \\
    --title "Python Advanced" \\
    --top-text "Programming Series" \\
    --output cover.png

  # Full cover with top and bottom text
  python3 generate_cover.py \\
    --title "System Design" \\
    --top-text "Tech Interview Guide" \\
    --bottom-text "By Engineering Team" \\
    --output cover.png
        """
    )

    parser.add_argument('--title', required=True, help='Book title (required)')
    parser.add_argument('--top-text', help='Text at top (optional - category/series)')
    parser.add_argument('--bottom-text', help='Text at bottom (optional - subtitle/author)')
    parser.add_argument('--output', required=True, help='Output image path')
    parser.add_argument('--width', type=int, default=1600, help='Image width (default: 1600)')
    parser.add_argument('--height', type=int, default=2400, help='Image height (default: 2400)')
    parser.add_argument('--color', choices=['random', 'yellow', 'pink', 'cyan', 'green', 'orange', 'purple', 'red'], default='random', help='Color scheme (default: random)')
    parser.add_argument('--seed', type=int, help='Random seed for deterministic color selection')

    args = parser.parse_args()

    generate_cover(
        title=args.title,
        output_path=args.output,
        top_text=args.top_text,
        bottom_text=args.bottom_text,
        width=args.width,
        height=args.height,
        color_scheme=args.color,
        seed=args.seed
    )


if __name__ == '__main__':
    main()

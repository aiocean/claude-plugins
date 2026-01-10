---
name: remove-bg
description: Remove background from images and trim transparent edges. Use when user wants to remove background, make image transparent, or mentions bgrem, rembg, transparent PNG.
---

# remove-bg

Remove image backgrounds using threshold (fast, for mono/simple images) or rembg AI (complex images). Automatically trims transparent edges.

## Quick start

```bash
# Simple/mono images (threshold-based)
python3 ~/.claude/skills/remove-bg/remove_bg.py image.png

# Complex images (AI-based with rembg)
python3 ~/.claude/skills/remove-bg/remove_bg.py image.jpg --rembg
```

Output: `{filename}-transparent.png` in same directory.

## When to use which method

| Method | Flag | Best for |
|--------|------|----------|
| Threshold | (default) | Mono logos, simple graphics, checkered backgrounds |
| rembg | `--rembg` | Photos, complex images, gradients |

## Output

- Removes background → alpha=0
- Trims transparent edges → smaller file size
- Prints size before/after and transparency percentage

## Requirements

- opencv-python, numpy, Pillow (always)
- rembg (only for `--rembg` flag)

Install if needed:
```bash
pip3 install opencv-python numpy Pillow rembg
```

---
name: aio-remove-bg
description: Remove image backgrounds using threshold (fast) or rembg AI (complex images) and trim transparent edges. Triggers: "remove background", "make image transparent", "cutout image", bgrem, rembg.
---

> **DEPRECATED**: This plugin is deprecated. Use ImageMagick (`convert`) or `rembg` CLI directly for background removal.

# remove-bg

## Environment
- python3: !`which python3 2>/dev/null || echo "NOT INSTALLED"`
- rembg: !`python3 -c "import rembg" 2>/dev/null && echo "installed" || echo "NOT INSTALLED"`
- opencv: !`python3 -c "import cv2" 2>/dev/null && echo "installed" || echo "NOT INSTALLED"`
- Scripts: !`ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-remove-bg/*/skills/aio-remove-bg 2>/dev/null | sort -V | tail -1 || echo "NOT FOUND"`

Remove image backgrounds using threshold (fast, for mono/simple images) or rembg AI (complex images). Automatically trims transparent edges.

```bash
RB="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-remove-bg/*/skills/aio-remove-bg 2>/dev/null | sort -V | tail -1)"
```

## Quick start

```bash
# Simple/mono images (threshold-based)
python3 $RB/remove_bg.py image.png

# Complex images (AI-based with rembg)
python3 $RB/remove_bg.py image.jpg --rembg
```

Output: `{filename}-transparent.png` in same directory.

## When to use which method

| Method    | Flag      | Best for                                           |
| --------- | --------- | -------------------------------------------------- |
| Threshold | (default) | Mono logos, simple graphics, checkered backgrounds |
| rembg     | `--rembg` | Photos, complex images, gradients                  |

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

## Errors

| Error                                          | Cause              | Fix                              |
| ---------------------------------------------- | ------------------ | -------------------------------- |
| `ModuleNotFoundError: No module named 'cv2'`   | Missing opencv     | `pip3 install opencv-python`     |
| `ModuleNotFoundError: No module named 'rembg'` | Missing rembg      | `pip3 install rembg`             |
| `FileNotFoundError`                            | Invalid image path | Check file path exists           |
| Poor threshold result                          | Complex image      | Use `--rembg` flag instead       |
| rembg slow first run                           | Downloading model  | Wait for model download (~150MB) |

## Tips

- **Threshold struggles with gradients** - Use `--rembg` for photos
- **rembg is slow but accurate** - First run downloads AI model
- **Check transparency %** - Script outputs how much was removed
- **Output always PNG** - Alpha channel requires PNG format

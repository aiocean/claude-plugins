::install-command
/plugin install aio-image@aiocean-plugins
::

# aio-image

Every major text-to-image model has the same problem: reliable transparent PNG output either does not exist or is gated behind API flags that do not actually work consistently. gpt-image-2 rejects `background: transparent` at the API level. Imagen 3 has no transparency flag. Midjourney and Grok output opaque RGB. FLUX and SDXL support it only with specific checkpoints.

The industry workaround for this has existed since the early days of VFX and game art: render the subject on a flat chroma key color, then matte it out in post. This plugin owns the matting step.

## How it works

Render your subject on a flat magenta background (`#FF00FF`) using whichever image generation engine you have. Then run the plugin's script. RMBG-2.0 (BiRefNet architecture) produces a soft alpha matte that follows silhouettes accurately, including hair, smoke, and glow. A despill pass then removes the color contamination that the magenta background casts onto edges — the color unmixing problem that simple threshold matting ignores. A final 1px erode tightens fringe. The output is always a clean PNG RGBA file.

```
prompt (subject on flat #FF00FF)
  → your image generation engine
  → render-raw.png
  → chroma-key.py (RMBG-2.0 + despill + erode)
  → sprite.png  (PNG RGBA, clean edges)
```

The script also works on photos and screenshots without a chroma key — pass `--no-despill` when the background is not a flat uniform color, since the despill algorithm samples the four corners and those samples are meaningless on complex backgrounds.

## Install

```bash
/plugin install aio-image@aiocean-plugins
```

## Skill

**aio-remove-background** — trigger phrases: "remove background", "transparent PNG", "alpha matte", "chroma key", "cutout", "knock out background", "xoa nen", "tach nen".

## Requirements

- Python 3
- `pip install pillow numpy torch torchvision transformers kornia`
- HuggingFace account + `hf auth login` (RMBG-2.0 is a gated repo — accept the license at huggingface.co/briaai/RMBG-2.0 first)
- First run downloads the model (~150 MB); subsequent runs use the local cache

## License

RMBG-2.0 is CC BY-NC 4.0 — personal, research, and non-commercial open-source use only. For commercial projects, either purchase a Bria commercial license or pass `--model ZhengPeng7/BiRefNet` to use the MIT-licensed BiRefNet alternative, which produces comparable quality without the license restriction.

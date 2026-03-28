# aio-remove-bg

Remove background from images and trim transparent edges. Supports threshold-based (fast) and AI-based (rembg) methods.

## Install

```bash
/plugin install aio-remove-bg@aiocean-plugins
```

> **Deprecated.** Use ImageMagick or rembg CLI directly instead of this plugin.

## What It Does

- Threshold-based background removal (fast, no model required)
- AI-based background removal via rembg
- Trim transparent edges after removal

## Requirements

- python3
- rembg
- opencv

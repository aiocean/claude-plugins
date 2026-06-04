---
name: aio-remove-background
description: |
  Remove image backgrounds via RMBG-2.0 alpha matting with despill + 1px erode — produces clean PNG RGBA cutout that handles hair, smoke, glow, soft edges. Use when the user wants to remove background, xoá nền, make transparent, cutout, chroma key, or post-process a text-to-image render (gpt-image, Imagen, FLUX, SDXL, Grok, Midjourney) — especially with flat magenta (#FF00FF) key.
when_to_use: remove background, transparent PNG, alpha matte, chroma key, despill, cutout, knock out background, sprite from render, RMBG, BiRefNet, image matting, xoá nền, tách nền, làm trong suốt, hậu xử lý ảnh gen, halo fringe removal
argument-hint: <input-image> <output.png> [--no-despill] [--model ZhengPeng7/BiRefNet]
effort: medium
---

# aio-remove-background — RMBG-2.0 alpha matting → PNG RGBA cutout

Tách nền ảnh thành **PNG RGBA cutout** bằng **RMBG-2.0** (BiRefNet) — alpha matte
mềm bám sát silhouette, kể cả tóc/khói/glow. Pipeline đóng cứng (không tham số
fiddle): matting → despill (color unmixing khử ánh nền hắt lên mép) → erode 1px.

**Engine-agnostic.** Ảnh nguồn từ đâu cũng được — chụp thật, screenshot, render từ
gpt-image / Imagen / SDXL / FLUX / Grok. Không phụ thuộc nền phải phẳng. Nếu ảnh có
nền phẳng (vd flat-magenta `#FF00FF` key từ render), despill còn ăn thêm — mép
sạch nhất.

## Environment

- python3: !`which python3 2>/dev/null || echo "NOT INSTALLED"`
- Pillow: !`python3 -c "import PIL" 2>/dev/null && echo "installed" || echo "NOT INSTALLED"`
- numpy: !`python3 -c "import numpy" 2>/dev/null && echo "installed" || echo "NOT INSTALLED"`
- torch: !`python3 -c "import torch" 2>/dev/null && echo "installed" || echo "NOT INSTALLED"`
- transformers: !`python3 -c "import transformers" 2>/dev/null && echo "installed" || echo "NOT INSTALLED"`
- HF auth: !`hf auth whoami 2>/dev/null || huggingface-cli whoami 2>/dev/null || echo "NOT LOGGED IN (cần cho RMBG-2.0 gated repo)"`
- Script: !`echo "${CLAUDE_PLUGIN_ROOT}/skills/aio-remove-background/scripts/chroma-key.py"`

## Quick start

```bash
RB="${CLAUDE_PLUGIN_ROOT}/skills/aio-remove-background/scripts"

python3 $RB/chroma-key.py input.png output.png
python3 $RB/chroma-key.py render-magenta.png sprite.png         # despill on (default)
python3 $RB/chroma-key.py photo.jpg cutout.png --no-despill     # nền không phẳng → không cần despill
python3 $RB/chroma-key.py input.png out.png --model ZhengPeng7/BiRefNet  # MIT, không gated
```

Output **luôn là PNG RGBA** — auto thêm `.png` nếu thiếu đuôi.

## Hợp đồng

| Tham số | Bắt buộc | Ý nghĩa |
|---|---|---|
| `<input>` | ✅ | Ảnh nguồn bất kỳ (PNG/JPG/WEBP). |
| `<output.png>` | ✅ | Path PNG RGBA. Script auto thêm `.png` nếu thiếu. |
| `--despill` / `--no-despill` | ⬜ | Mặc định **bật**. Khử ánh nền hắt lên mép (color unmixing dựa trên alpha và màu góc). Nền lộn xộn (ảnh chụp) → tắt vì sample 4 góc không còn nghĩa. |
| `--model` | ⬜ | Mặc định `briaai/RMBG-2.0` (CC BY-NC 4.0, gated). Thương mại → `ZhengPeng7/BiRefNet` (MIT, không gated). |

## Despill — khi nào bật / tắt

Despill giải mô hình pixel **C = α·F + (1−α)·Key**, lấy `Key` từ trung bình **4 góc** ảnh.

- ✅ **Bật** (default) khi nền phẳng đồng màu (magenta key, green screen, white studio): mép sạch, không halo.
- ❌ **Tắt** (`--no-despill`) khi nền lộn xộn (ảnh chụp ngoài trời, cảnh phức tạp): 4 góc không đại diện nền → despill kéo lệch màu subject. Lúc đó chỉ dùng matting + erode.

## Setup lần đầu

```bash
pip install pillow numpy torch torchvision transformers kornia
hf auth login          # paste HuggingFace access token
# vào https://huggingface.co/briaai/RMBG-2.0 → bấm chấp nhận điều khoản
```

Lần chạy đầu sẽ tải model (~150MB), những lần sau cached.

## License

**RMBG-2.0 = CC BY-NC 4.0 (phi thương mại).** Dùng cho personal / research / open-source non-commercial OK. Thương mại hoá → 2 đường:

1. Mua license Bria (commercial tier).
2. Chuyển sang `--model ZhengPeng7/BiRefNet` (MIT, hiệu năng tương đương, không gated).

## Errors

| Triệu chứng | Nguyên nhân | Fix |
|---|---|---|
| `cần Pillow` / `numpy` / `torch transformers` | Chưa cài deps | Chạy lệnh `pip install` ở mục Setup |
| `không tải được 'briaai/RMBG-2.0'` | Gated repo, chưa accept terms hoặc chưa `hf auth login` | Accept ToS trên model page + `hf auth login`, hoặc đổi `--model ZhengPeng7/BiRefNet` |
| Halo magenta/lục còn dính mép | Despill tắt hoặc nền không thực sự phẳng | Bật despill; nếu nền photo lộn xộn, despill không cứu được → re-render trên nền phẳng |
| Subject mất vùng | Subject color trùng nền (subject magenta trên nền magenta) | Đổi màu key, hoặc thêm rim light trong prompt để tách subject khỏi nền |
| Erode quá gắt với subject mảnh | Subject < 3px (tóc thưa, dây) | Hiện cố định 1px — fork script chỉnh `ERODE_PX = 0` nếu cần |

## Pipeline điển hình với flat-magenta render

Hầu hết text-to-image engine (gpt-image-2, Imagen, FLUX, SDXL, Midjourney, Grok) **không xuất
transparent PNG ổn định**. Workaround universal: render subject trên nền phẳng `#FF00FF` rồi chroma-key:

```
prompt (subject on flat magenta #FF00FF)
   → [bất kỳ image gen engine của bạn]
   → render-raw.png (subject + nền magenta phẳng)
   → python3 $RB/chroma-key.py render-raw.png sprite.png
   → sprite.png (PNG RGBA, mép sạch, không halo magenta)
```

Câu nền nên copy nguyên vào cuối prompt để engine không nhét magenta lên subject:

> *"The subject stands alone, centered on a completely flat uniform solid pure chroma magenta
> background (hex FF00FF) filling the entire frame; this magenta appears nowhere on the subject
> itself. A clean image with no lettering, no interface elements, no text, no watermark."*

Nền lộn xộn (photo, screenshot) → cứ chạy thẳng script với `--no-despill`, RMBG-2.0 vẫn matte tốt.

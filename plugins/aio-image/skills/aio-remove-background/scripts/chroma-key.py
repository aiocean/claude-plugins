#!/usr/bin/env python3
"""chroma-key.py — tách nền ảnh thành PNG RGBA cutout bằng RMBG-2.0 matting.

Engine-agnostic: nhận bất kỳ ảnh nào (PNG/JPG/WEBP). Model RMBG-2.0 (BiRefNet
architecture) sinh alpha matte mềm đẳng cấp studio — xử lý tóc/khói/glow, KHÔNG
phụ thuộc nền phải phẳng. Khi nền phẳng (vd magenta #FF00FF từ pipeline
generate-png), despill bằng color unmixing khử ánh nền hắt lên mép subject.

Pipeline cố định:
  1. RMBG-2.0 → alpha matte mềm.
  2. DESPILL bằng color unmixing: coi pixel viền = alpha·F + (1-alpha)·Key (Key lấy mẫu
     4 góc) → giải ngược ra F, khử ánh nền hắt lên subject.
  3. Erode 1px khử dải viền còn sót.

⚠ LICENSE: RMBG-2.0 = CC BY-NC 4.0 (phi thương mại). Nếu thương mại hoá: mua license
  Bria, hoặc --model ZhengPeng7/BiRefNet (MIT).

Cách dùng:
  python3 chroma-key.py <input> <output.png>
        [--despill | --no-despill] [--model briaai/RMBG-2.0]
"""

import argparse
import sys

try:
    from PIL import Image, ImageFilter
except ImportError:
    sys.exit("[chroma-key] cần Pillow: pip install pillow")

try:
    import numpy as np
except ImportError:
    sys.exit("[chroma-key] cần numpy: pip install numpy")

ERODE_PX = 1  # cố định — gặm 1px khử dải viền nền còn sót


def sample_corners(im) -> "tuple[float,float,float]":
    """Màu nền = trung bình 4 góc (góc ảnh luôn là nền)."""
    w, h = im.size
    pts = [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)]
    cols = [im.getpixel(p)[:3] for p in pts]
    return tuple(sum(c[i] for c in cols) / len(cols) for i in range(3))


def despill_unmix(rgb, alpha, key):
    """Khử màu nền hắt lên subject (despill) bằng color unmixing.

    Mô hình pixel quan sát: C = alpha·F + (1-alpha)·Key  →  F = (C - (1-alpha)·Key) / alpha.
    alpha=1 (subject thuần) → F=C giữ nguyên. alpha~0.5 (viền) → trả lại màu thật,
    bỏ phần ánh nền. Pixel alpha~0 thì F vô nghĩa nên giữ nguyên C để tránh rác.
    """
    a = alpha[..., None]
    a_safe = np.maximum(a, 1e-3)
    f = (rgb - (1.0 - a) * key) / a_safe
    f = np.clip(f, 0.0, 255.0)
    return np.where(a < 1e-3, rgb, f)


def finalize(rgb, alpha, key, do_despill: bool):
    """Ghép RGB (đã/chưa despill) + alpha matte → ảnh RGBA, erode 1px."""
    h, w = alpha.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., :3] = np.round(
        despill_unmix(rgb, alpha, key) if do_despill else rgb
    ).astype(np.uint8)
    out[..., 3] = np.round(np.clip(alpha, 0.0, 1.0) * 255.0).astype(np.uint8)

    amask = Image.fromarray(out[..., 3], "L").filter(
        ImageFilter.MinFilter(ERODE_PX * 2 + 1)
    )
    out[..., 3] = np.asarray(amask)
    return Image.fromarray(out, "RGBA")


def main():
    ap = argparse.ArgumentParser(
        description="RMBG-2.0 matting → PNG RGBA cutout", allow_abbrev=False
    )
    ap.add_argument("input")
    ap.add_argument("output", help="luôn lưu PNG RGBA (đặt đuôi .png)")
    ap.add_argument(
        "--despill",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="khử ánh màu nền hắt lên subject bằng color unmixing (mặc định bật)",
    )
    ap.add_argument(
        "--model",
        default="briaai/RMBG-2.0",
        help="model matting (đổi 'ZhengPeng7/BiRefNet' nếu cần license thương mại)",
    )
    args = ap.parse_args()

    print("[chroma-key] model RMBG-2.0 — license CC BY-NC 4.0 (dùng phi thương mại)")
    try:
        import torch
        from torchvision import transforms
        from transformers import AutoModelForImageSegmentation
    except ImportError:
        sys.exit("[chroma-key] cần: pip install torch torchvision transformers kornia")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        model = (
            AutoModelForImageSegmentation.from_pretrained(
                args.model, trust_remote_code=True
            )
            .eval()
            .to(device)
        )
    except OSError as e:
        # RMBG-2.0 là gated repo: phải đăng nhập HF + chấp nhận license trên model page.
        sys.exit(
            f"[chroma-key] không tải được '{args.model}': {type(e).__name__}\n"
            f"  • RMBG-2.0 là gated repo — vào https://huggingface.co/{args.model} "
            f"bấm chấp nhận điều khoản, rồi chạy: hf auth login (dán access token).\n"
            f"  • Hoặc đổi sang model công khai MIT, không gated: "
            f"--model ZhengPeng7/BiRefNet"
        )

    transform_image = transforms.Compose(
        [
            transforms.Resize((1024, 1024)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    im = Image.open(args.input)
    rgb_im = im.convert("RGB")
    input_tensor = transform_image(rgb_im).unsqueeze(0).to(device)
    with torch.no_grad():
        preds = model(input_tensor)[-1].sigmoid().cpu()
    mask = transforms.ToPILImage()(preds[0].squeeze()).resize(rgb_im.size)

    rgb = np.asarray(rgb_im, dtype=np.float64)
    alpha = np.asarray(mask, dtype=np.float64) / 255.0
    key = np.array(sample_corners(im.convert("RGBA")), dtype=np.float64)
    result = finalize(rgb, alpha, key, args.despill)

    out = args.output if args.output.lower().endswith(".png") else args.output + ".png"
    result.save(out)

    total = alpha.size
    transparent = int((alpha < 0.02).sum())
    opaque = int((alpha > 0.98).sum())
    soft = total - transparent - opaque
    print(
        f"[chroma-key] model={args.model} device={device} "
        f"despill={'on' if args.despill else 'off'} erode={ERODE_PX}px"
    )
    print(
        f"[chroma-key] trong suốt {100 * transparent // total}%  "
        f"đục {100 * opaque // total}%  viền mềm {100 * soft // total}%"
    )
    print(f"[chroma-key] saved {out}")


if __name__ == "__main__":
    main()

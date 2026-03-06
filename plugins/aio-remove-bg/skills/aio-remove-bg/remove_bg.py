#!/usr/bin/env python3
"""Remove background and trim transparent edges"""

import argparse
import subprocess
import cv2
import numpy as np
from pathlib import Path
from PIL import Image


def remove_checkered_bg(img):
    """Remove checkered background using threshold (for mono logos)"""
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    _, mask = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)

    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    result = img.copy()
    result[:, :, 3] = mask
    return result


def remove_bg_rembg(input_path, output_path):
    """Remove background using rembg (AI-based)"""
    subprocess.run(["rembg", "i", str(input_path), str(output_path)], check=True)
    return cv2.imread(str(output_path), cv2.IMREAD_UNCHANGED)


def trim_transparent(img):
    """Trim transparent edges from RGBA image"""
    alpha = img[:, :, 3]
    coords = cv2.findNonZero(alpha)
    if coords is None:
        return img
    x, y, w, h = cv2.boundingRect(coords)
    return img[y:y+h, x:x+w]


def process(input_path, use_rembg=False):
    input_path = Path(input_path)
    output_path = input_path.parent / f"{input_path.stem}-transparent.png"

    if use_rembg:
        img = remove_bg_rembg(input_path, output_path)
    else:
        img = cv2.imread(str(input_path), cv2.IMREAD_UNCHANGED)
        if img is None:
            raise FileNotFoundError(f"Cannot read {input_path}")
        img = remove_checkered_bg(img)

    # Trim transparent edges
    trimmed = trim_transparent(img)

    cv2.imwrite(str(output_path), trimmed)
    print(f"Saved: {output_path}")
    print(f"Size: {img.shape[1]}x{img.shape[0]} -> {trimmed.shape[1]}x{trimmed.shape[0]}")

    # Verify
    arr = np.array(Image.open(output_path).convert("RGBA"))
    alpha = arr[:, :, 3]
    transparent = np.sum(alpha == 0)
    print(f"Transparent: {transparent:,} ({100*transparent/alpha.size:.1f}%)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="Input image path")
    parser.add_argument("--rembg", action="store_true", help="Use rembg (AI) instead of threshold")
    args = parser.parse_args()

    process(args.input, use_rembg=args.rembg)

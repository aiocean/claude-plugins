#!/usr/bin/env python3
"""
Extract native modules (.node files) embedded in a Bun-compiled Claude Code binary.

Bun stores native modules inside the SFA payload as a sequence of
`<path>\\0<binary_dylib>` blobs. We locate them by scanning for the
hard-coded path prefix `/$bunfs/root/<name>.node\\0` followed by the
platform-specific magic bytes (Mach-O, ELF, or PE).

For each match, the dylib content extends until the start of the next
matching entry, or until the trailer (last entry).

This bypasses the more complex Bun StringPointer / module-table format,
which has shifted across Bun versions and is hard to track stably.
The string-anchor heuristic is robust because:
  - `/$bunfs/root/` is a hard-coded constant in Bun's StandaloneModuleGraph
  - Each native module gets its own length-1 entry in the modules table
  - Module bodies are ALWAYS preceded by the `name\\0` prefix
  - Magic bytes confirm the body is a real native module, not a string ref
    in cli.js source

Usage:
  extract_native_modules.py <input-binary> <output-dir>

Output: <output-dir>/<name>.node (one file per extracted module)

If a `.node` reference appears in cli.js as a string literal (e.g.
`require("/$bunfs/root/X.node")`), the regex won't match because there's
no magic-byte signature after the string — only the actual embedded
dylib has the magic bytes. So false positives are filtered automatically.
"""

import argparse
import os
import re
import struct
import sys
from pathlib import Path

TRAILER = b"\n---- Bun! ----\n"

# Patterns: <bunfs_root>/<name>.node\0<magic>
# Bun base_path is `/$bunfs/` on POSIX and `B:\~BUN\` on Windows
# (per StandaloneModuleGraph.zig). Forward slashes appear in serialized
# `file://` URLs, so we accept either separator on Windows.
# Magic bytes per platform:
#   Mach-O 64 LE (darwin-arm64, darwin-x64): cffaedfe
#   Mach-O 64 BE: feedfacf
#   ELF (linux): \x7fELF
#   PE (windows): MZ
_PATTERN = re.compile(
    rb'(?:/\$bunfs/root|B:[\\/]~BUN[\\/]root)[\\/]([a-zA-Z0-9_\-]+)\.node\x00'
    rb'(\xcf\xfa\xed\xfe|\xfe\xed\xfa\xcf|\x7fELF|MZ)'
)


def find_payload_end(data: bytes) -> int:
    """Return absolute file offset where the payload ends (= trailer_pos
    minus the 32-byte Offsets struct). This is the upper bound for native
    module body extraction."""
    trailer_pos = data.rfind(TRAILER)
    if trailer_pos < 0:
        sys.exit("ERROR: not a Bun SFA binary (no trailer)")
    return trailer_pos - 32  # before Offsets struct


def extract(binary_path: str, out_dir: str, strict: bool = False) -> dict:
    """Extract all native modules from `binary_path` into `out_dir`.

    Returns a dict {name: bytes_written}. Output files are named
    `<name>.node` (without the `/$bunfs/root/` prefix) so they sit
    naturally as siblings of the rebuilt binary.

    If `strict=True`, raise SystemExit on 0 matches — release builds use
    this so a Bun layout change can't silently ship binaries with no
    native modules (which would fail at first runtime require).
    """
    data = Path(binary_path).read_bytes()
    payload_end_abs = find_payload_end(data)
    print(f"[extract-native] {binary_path}  size={len(data):,}")
    print(f"[extract-native] payload end (before Offsets) @ abs {payload_end_abs:,}")

    matches = list(_PATTERN.finditer(data))
    print(f"[extract-native] candidate native modules: {len(matches)}")

    if not matches:
        msg = ("[extract-native] no native modules found. Either binary uses "
               "no native modules, or Bun's path-prefix convention changed "
               "(check `strings <binary> | grep '\\.node$'`).")
        if strict:
            sys.exit(f"ERROR: {msg}")
        print(f"WARNING: {msg}")
        return {}

    os.makedirs(out_dir, exist_ok=True)
    extracted = {}

    for i, m in enumerate(matches):
        name = m.group(1).decode()
        magic = m.group(2)
        magic_label = {
            b'\xcf\xfa\xed\xfe': "Mach-O 64 LE",
            b'\xfe\xed\xfa\xcf': "Mach-O 64 BE",
            b'\x7fELF':          "ELF",
            b'MZ':               "PE",
        }[magic]
        # Body starts right after the null terminator, at the magic byte.
        path_str = m.group(0).split(b'\x00')[0]  # `/$bunfs/root/<name>.node`
        body_start = m.start() + len(path_str) + 1  # past the \0

        # Body ends at the start of the NEXT native module entry, or at
        # payload end (trailer minus offsets) for the last one.
        if i + 1 < len(matches):
            body_end = matches[i + 1].start()
        else:
            body_end = payload_end_abs

        # Bun pads with null bytes between entries — strip trailing nulls so
        # the extracted dylib is byte-exact.
        while body_end > body_start and data[body_end - 1] == 0:
            body_end -= 1

        body_len = body_end - body_start
        if body_len < 1024:
            print(f"  [{i}] {name}.node — TOO SMALL ({body_len:,} bytes), skipping")
            continue

        out_path = Path(out_dir) / f"{name}.node"
        out_path.write_bytes(data[body_start:body_end])
        extracted[name] = body_len
        print(f"  [{i}] {name}.node  {magic_label}  {body_len:,} bytes  -> {out_path}")

    print(f"[extract-native] extracted {len(extracted)} native modules into {out_dir}")
    return extracted


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("input_binary", help="Upstream Bun-compiled Claude Code binary")
    ap.add_argument("output_dir", help="Directory to write extracted .node files")
    ap.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero if zero native modules are found (release builds).",
    )
    args = ap.parse_args()
    extract(args.input_binary, args.output_dir, strict=args.strict)


if __name__ == "__main__":
    main()

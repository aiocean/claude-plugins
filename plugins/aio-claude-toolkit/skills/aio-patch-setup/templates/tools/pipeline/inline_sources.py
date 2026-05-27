#!/usr/bin/env python3
"""
inline_sources.py — inline external source files into patches.json's "new" field.

Big patch bodies (200+ lines of JS) are unreadable when stuffed into a one-line
JSON string. This script lets the JS live as a real .js file (in sources/) and
inlines it into patches.json before patch_cli.py runs.

Convention: any patch entry with `"new_source": "<basename>.js"` triggers an
inline. The script reads `sources/<basename>.js`, JSON-encodes it, and sets
`"new"` to that string. The `"new_source"` field is preserved so the next
build re-inlines from the source-of-truth (idempotent).

Idempotent: re-running with no source changes leaves patches.json byte-identical.

Usage:
    python3 tools/pipeline/inline_sources.py [--check]

    --check  Exit 1 if patches.json would change (CI guard).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
PATCHES = HERE / "patches.json"
SOURCES = HERE / "sources"


def load_patches() -> dict:
    return json.loads(PATCHES.read_text())


def inline_one(patch: dict) -> bool:
    """Mutate patch in place. Return True if changed."""
    src = patch.get("new_source")
    if not src:
        return False
    src_path = SOURCES / src
    if not src_path.exists():
        sys.exit(
            f"ERROR: patch {patch.get('id')!r} references missing source {src_path}"
        )
    body = src_path.read_text()
    if patch.get("new") == body:
        return False
    patch["new"] = body
    return True


def main() -> None:
    check_mode = "--check" in sys.argv
    data = load_patches()
    changed = False
    for patch in data.get("patches", []):
        if inline_one(patch):
            changed = True
            print(
                f"[inline] {patch['id']} <- sources/{patch['new_source']} ({len(patch['new'])} bytes)"
            )
    if not changed:
        print("[inline] no changes")
        return
    if check_mode:
        sys.exit(
            "ERROR: --check: patches.json out of sync with sources/, re-run without --check"
        )
    PATCHES.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"[inline] wrote {PATCHES}")


if __name__ == "__main__":
    main()

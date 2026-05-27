#!/usr/bin/env python3
"""
Extract cli.js source from a Bun-compiled Claude Code binary.

Targets the Bun 1.3.14+ SFA layout used by Claude Code 2.1.133+:

  payload[0..]:
    <name table: full file:/// URLs separated by NUL>
    ...
    \x00/$bunfs/root/src/entrypoints/cli.js\x00
    // @bun @bytecode @bun-cjs\n(function(exports, ...) { <cli.js body> })\n
    \x00/$bunfs/root/<next-module>.js\x00
    // @bun @bytecode @bun-cjs\n(function(...) { ... })\n
    ...
    <modules metadata table @ modules_off>

The earlier Bun 1.3.13 layout (Claude 2.1.131 and prior) used per-blob
[u64 tag][u32 flags][u32 len] headers instead of NUL-delimited content.
That layout is intentionally not supported here — godClaude only ever
extracts the latest upstream, and keeping a second code path would rot
without anyone exercising it. To recover an older binary, check out the
matching extract_cli.py from git history.

Algorithm:
  1. Find the `// @bun @bytecode @bun-cjs\n(function(exports, require, module`
     marker that is preceded by `/$bunfs/.../cli.js\x00` (so we pick the
     entrypoint, not a sibling module).
  2. Content end = position of the next `\x00/$bunfs/` separator.
  3. Sanity-check the body ends with the cjs wrapper close `})` (\\n optional).

`bun build --compile` reads cli.js source and produces a fresh SFA, so
meta.json offsets are informational only.

Usage:
  extract_cli.py <path-to-claude-binary> <output-cli.js> <output-meta.json>
"""

import json
import re
import struct
import sys
from pathlib import Path

TRAILER = b"\n---- Bun! ----\n"
OFFSETS_SIZE = 32

CONTENT_MARKER = b"// @bun @bytecode @bun-cjs\n(function(exports, require, module"
# Module paths use POSIX `/$bunfs/root/...` on macOS+linux and Windows-style
# `B:/~BUN/root/...` on win32 per Bun's StandaloneModuleGraph.zig. Both the
# preceding cli.js path tail and the trailing inter-module separator must
# accept either form. A single binary uses only one form, so the per-binary
# separator is whichever form's path tail matched.
PATH_VARIANTS = (
    (b"/$bunfs/root/src/entrypoints/cli.js\x00", b"\x00/$bunfs/"),
    (b"B:/~BUN/root/src/entrypoints/cli.js\x00", b"\x00B:/~BUN/"),
)


def extract(binary_path: str, out_cli: str, out_meta: str):
    data = Path(binary_path).read_bytes()

    trailer_pos = data.rfind(TRAILER)
    if trailer_pos < 0:
        raise SystemExit(f"ERROR: no Bun trailer in {binary_path}")

    byte_count, modules_off, modules_len, entry_id, argv_off, argv_len, flags = \
        struct.unpack("<QIIIIII", data[trailer_pos - OFFSETS_SIZE:trailer_pos])

    payload_end = trailer_pos + len(TRAILER)
    payload_start = payload_end - byte_count
    if payload_start < 0 or payload_start >= len(data):
        raise SystemExit(f"ERROR: invalid payload offsets (byte_count={byte_count})")

    payload = data[payload_start:payload_end]
    print(f"[extract] {binary_path}")
    print(f"          size={len(data):,} trailer@{trailer_pos:,} payload={byte_count:,}")

    # Find the cli.js content marker — the occurrence whose preceding bytes
    # contain the cli.js path (so we don't grab a sibling .js module). Also
    # captures the matching separator variant (POSIX vs Windows) so we use
    # the same form to find the content end.
    content_start = -1
    separator = None
    for m in re.finditer(re.escape(CONTENT_MARKER), payload):
        cand = m.start()
        pre_window = payload[max(0, cand - 80):cand]
        for path_tail, sep in PATH_VARIANTS:
            if pre_window.endswith(path_tail):
                content_start = cand
                separator = sep
                break
        if content_start >= 0:
            break

    if content_start < 0:
        raise SystemExit(
            "ERROR: cli.js content marker not found preceded by a known cli.js path. "
            "Upstream Bun SFA layout likely changed; inspect payload manually."
        )

    # Content end = next inter-module separator (start of the next module's name).
    content_end = payload.find(separator, content_start + len(CONTENT_MARKER))
    if content_end < 0:
        raise SystemExit(
            f"ERROR: no {separator!r} separator after cli.js content @ {content_start:,}; "
            "upstream layout likely changed."
        )

    content = payload[content_start:content_end]

    if not content.startswith(b"// @bun"):
        raise SystemExit(f"ERROR: content does not start with '// @bun' marker (got {content[:20]!r})")

    # cjs wrapper closes with `})` (with or without trailing newline).
    tail = content.rstrip(b"\n")
    if not tail.endswith(b"})"):
        raise SystemExit(f"ERROR: content does not end with cjs wrapper close (got {content[-40:]!r})")

    m = re.search(rb'VERSION:"([^"]+)"', content)
    version = m.group(1).decode("utf-8") if m else "unknown"
    print(f"          claude version: {version}")
    print(f"          cli.js @ payload[{content_start:,} .. {content_end:,}] = {len(content):,} bytes")

    Path(out_cli).write_bytes(content)
    print(f"          wrote {out_cli} ({len(content):,} bytes)")

    meta = {
        "binary_path": binary_path,
        "binary_size": len(data),
        "claude_version": version,
        "trailer_pos": trailer_pos,
        "byte_count": byte_count,
        "payload_start": payload_start,
        "content_offset": payload_start + content_start,
        "content_length": len(content),
        "cli_wrapper_prefix_len": len(b"// @bun @bytecode @bun-cjs\n(function(exports, require, module, __filename, __dirname) {"),
    }
    Path(out_meta).write_text(json.dumps(meta, indent=2))
    print(f"          wrote {out_meta}")

    return meta


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("usage: extract_cli.py <binary> <out-cli.js> <out-meta.json>")
        sys.exit(2)
    extract(sys.argv[1], sys.argv[2], sys.argv[3])

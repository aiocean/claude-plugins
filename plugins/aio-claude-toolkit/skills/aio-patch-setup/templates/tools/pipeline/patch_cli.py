#!/usr/bin/env python3
"""
Patch a cli.js extracted from a Bun SFA binary, then write a body-only file
ready for `bun build --compile`.

Steps:
  1. Read raw cli.js (as extracted by `extract_cli.py`).
  2. Strip Bun-cjs wrapper:  `// @bun ...\n(function(...){...})\n` -> just
     the body. This is required because feeding the wrapped file back into
     `bun build` would re-wrap it and the user code never runs.
  3. Apply any-length text patches from a JSON table (`bun build --compile`
     produces a fresh Bun SFA so cli.js byte length is free to change).
  4. Rewrite native-module require strings:
        require("/$bunfs/root/X.node")
            -> require(require("path").join(
                          require("path").dirname(process.execPath),
                          "X.node"))
     This makes the rebuilt binary load .node files from siblings of the
     binary at runtime — i.e., the unpacked tarball directory.
  5. Write the patched body to <output>.

Patches JSON format:

  {
    "patches": [
      { "id": "A1", "old": "...", "new": "..." },
      ...
    ]
  }

Special directives:
  - `id` starting with `INJECT@` = anchor injection. The value of `old` is
    used as a unique anchor; `new` is inserted BEFORE the anchor (anchor is
    preserved). Use this for H/I/J/K block injections that don't replace
    existing text.
  - `"resolve": true` = resolver-driven patch. Instead of static `old`/`new`,
    the entry uses `anchor_template`/`replacement_template` with `{{symbol}}`
    placeholders. At build time, `resolve_symbols.py` resolves minified names
    from stable anchors, and placeholders are substituted before applying.

Usage:
  patch_cli.py <input-cli.js> <patches.json> <output-cli-body.js>
               [--strict]
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# Ensure sibling modules (resolve_symbols.py) are importable even when
# build.sh invokes this script via absolute path from a different CWD.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from resolve_symbols import resolve_symbols

# cli.js wrapper format from Bun SFA. extract_cli.py confirms:
#   `// @bun @bytecode @bun-cjs\n(function(exports, require, module, __filename, __dirname) {`
# = 87 bytes prefix.
WRAPPER_PREFIX = b"// @bun @bytecode @bun-cjs\n(function(exports, require, module, __filename, __dirname) {"
# Trailing closer is `})\n` (3 bytes) or `})` (2 bytes if no trailing newline).
WRAPPER_SUFFIXES = (b"})\n", b"})")


def strip_wrapper(data: bytes) -> bytes:
    """Remove the Bun-cjs IIFE wrapper, returning just the function body."""
    if not data.startswith(WRAPPER_PREFIX):
        sys.exit(
            f"ERROR: cli.js doesn't start with expected wrapper.\n"
            f"  got first 100 bytes: {data[:100]!r}"
        )
    body = data[len(WRAPPER_PREFIX):]
    for suffix in WRAPPER_SUFFIXES:
        if body.endswith(suffix):
            body = body[: -len(suffix)]
            break
    else:
        sys.exit(f"ERROR: cli.js doesn't end with expected wrapper closer.\n"
                 f"  got last 30 bytes: {data[-30:]!r}")
    return body


# cli.js requires .node modules via either POSIX ("/$bunfs/root/X.node")
# or Windows ("B:/~BUN/root/X.node") virtual paths, depending on the
# upstream platform. Handle both — the rewritten require resolves at
# runtime against process.execPath, which is correct on all platforms.
_NATIVE_REQUIRE = re.compile(
    rb'require\("(?:/\$bunfs/root|B:[\\/]~BUN[\\/]root)[\\/]([a-zA-Z0-9_\-]+)\.node"\)'
)


def rewrite_native_requires(body: bytes) -> tuple[bytes, list[str]]:
    """Replace `require("/$bunfs/root/X.node")` with a runtime sibling-path
    lookup. Returns (new_body, list_of_replaced_names)."""
    names = []

    def repl(m: re.Match) -> bytes:
        name = m.group(1).decode()
        names.append(name)
        # Compose a path that resolves at runtime to <bin_dir>/<name>.node.
        # Inline path module to avoid relying on cli.js's import order.
        return (
            f'require(require("path").join('
            f'require("path").dirname(process.execPath),'
            f'"{name}.node"))'
        ).encode()

    new_body = _NATIVE_REQUIRE.sub(repl, body)
    return new_body, names


def _resolve_template(template: str, symbols: dict) -> str:
    """Replace {{key}} placeholders with resolved symbol values."""
    result = template
    for k, v in symbols.items():
        result = result.replace(f"{{{{{k}}}}}", v)
    # Check for unresolved placeholders
    leftover = re.findall(r'\{\{(\w+)\}\}', result)
    if leftover:
        raise ValueError(f"unresolved placeholders: {leftover}")
    return result


def apply_patches(body: bytes, patches: list, strict: bool) -> tuple[bytes, dict]:
    """Apply text patches. Returns (new_body, report_dict)."""
    applied = []
    missing = []
    injected = []
    resolved_syms = []

    # Lazy-resolve symbols only when a resolver-driven patch is encountered.
    # Runs once per build; cached for all resolver-driven entries.
    _symbols = None

    for p in patches:
        pid = p.get("id", "?")

        # Resolver-driven patch: resolve minified names from stable anchors,
        # substitute into anchor_template/replacement_template.
        if p.get("resolve"):
            if _symbols is None:
                print(f"  [resolve] running symbol resolver...")
                try:
                    _symbols = resolve_symbols(body.decode("utf-8", errors="replace"))
                    print(f"  [resolve] symbols: {json.dumps(_symbols)}")
                except SystemExit as e:
                    if strict:
                        raise
                    print(f"  [resolve] FAILED: {e}")
                    _symbols = {}
                    missing.append(pid)
                    continue

            if not _symbols:
                missing.append(pid)
                print(f"  [{pid}] SKIPPED (resolver failed)")
                continue

            try:
                old_str = _resolve_template(p["anchor_template"], _symbols)
                new_str = _resolve_template(p["replacement_template"], _symbols)
            except (KeyError, ValueError) as e:
                missing.append(pid)
                print(f"  [{pid}] template substitution FAILED: {e}")
                if strict:
                    sys.exit(f"ERROR: --strict: resolver template failed for {pid}: {e}")
                continue

            old = old_str.encode("utf-8")
            new = new_str.encode("utf-8")

            count = body.count(old)
            if count == 0:
                missing.append(pid)
                print(f"  [{pid}] resolved anchor NOT FOUND  ({old[:80]!r}...)")
                if strict:
                    sys.exit(f"ERROR: --strict: resolved anchor not found for {pid}")
                continue

            body = body.replace(old, new)
            applied.append((pid, count, len(new) - len(old)))
            delta_total = (len(new) - len(old)) * count
            resolved_syms.append({"id": pid, "symbols": _symbols})
            print(f"  [{pid}] (resolved) ×{count}  delta={delta_total:+} bytes")
            continue

        old = p["old"].encode("utf-8") if isinstance(p["old"], str) else p["old"]
        new = p["new"].encode("utf-8") if isinstance(p["new"], str) else p["new"]

        if pid.startswith("INJECT@"):
            # Anchor injection: insert `new` BEFORE `old` (anchor preserved).
            count = body.count(old)
            if count == 0:
                missing.append(pid)
                print(f"  [{pid}] anchor NOT FOUND  ({old[:60]!r}...)")
                continue
            if count > 1:
                print(f"  [{pid}] WARNING: anchor found {count} times — injecting before each")
            body = body.replace(old, new + old)
            injected.append((pid, count))
            print(f"  [{pid}] injected ×{count}  delta=+{len(new) * count} bytes")
            continue

        count = body.count(old)
        if count == 0:
            missing.append(pid)
            print(f"  [{pid}] NOT FOUND  ({old[:60]!r}...)")
            continue
        body = body.replace(old, new)
        applied.append((pid, count, len(new) - len(old)))
        delta_total = (len(new) - len(old)) * count
        print(f"  [{pid}] ×{count}  delta={delta_total:+} bytes")

    report = {
        "applied": [{"id": a[0], "count": a[1], "delta": a[2]} for a in applied],
        "injected": [{"id": j[0], "count": j[1]} for j in injected],
        "missing": missing,
        "resolved": resolved_syms,
    }

    if missing and strict:
        sys.exit(
            f"ERROR: --strict: {len(missing)} patches missing: {missing}"
        )
    return body, report


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("input_cli", help="Raw cli.js extracted from upstream binary")
    ap.add_argument("patches_json", help="JSON file with patches[] array")
    ap.add_argument("output_body", help="Output path for patched cli body (no wrapper)")
    ap.add_argument(
        "--strict",
        action="store_true",
        help="Fail if any patch's `old` text is not found in cli.js",
    )
    args = ap.parse_args()

    raw = Path(args.input_cli).read_bytes()
    print(f"[patch-cli] input: {args.input_cli} ({len(raw):,} bytes)")

    body = strip_wrapper(raw)
    print(f"[patch-cli] stripped wrapper: {len(body):,} bytes")

    patches = json.loads(Path(args.patches_json).read_text()).get("patches", [])
    print(f"[patch-cli] {len(patches)} patches to apply")

    body, report = apply_patches(body, patches, args.strict)
    print(f"[patch-cli] applied: {len(report['applied'])}  "
          f"injected: {len(report['injected'])}  "
          f"missing: {len(report['missing'])}")

    body, native_names = rewrite_native_requires(body)
    print(f"[patch-cli] rewrote {len(native_names)} native requires: "
          f"{sorted(set(native_names))}")

    Path(args.output_body).write_bytes(body)
    print(f"[patch-cli] wrote {args.output_body} ({len(body):,} bytes)")


if __name__ == "__main__":
    main()

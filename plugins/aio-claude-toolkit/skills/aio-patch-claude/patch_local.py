#!/usr/bin/env python3
"""
Patch a locally-installed Claude Code cli.js with quality improvements.

Applies text patches from a patches.json file to an npm-installed cli.js
(plain JavaScript text file). This is the LOCAL variant — it does NOT strip
the Bun-cjs wrapper or rewrite native requires (the godClaude compile
pipeline's patch_cli.py handles those for fleet binary builds).

Usage:
  patch_local.py <cli.js> <patches.json> [--no-backup] [--dry-run] [--strict]

  --no-backup  Skip creating cli.js.backup before patching
  --dry-run    Report what would change without writing
  --strict     Exit non-zero if any non-resolver patch is MISSING

patches.json format:
  {
    "patches": [
      {"id": "A1", "old": "search string", "new": "replacement"},
      {"id": "INJECT@name", "old": "anchor", "new": "content before anchor"},
      {"id": "X1", "resolve": true, ...}  // skipped — needs compile pipeline
    ]
  }

The script is idempotent: re-running on an already-patched file classifies
patches as ALREADY PATCHED instead of double-applying.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

# Verification banner injected near the top of cli.js.
# Skipped in -p/--print mode so piped output stays clean.
BANNER_CODE = (
    'if(!process.argv.includes("-p")&&!process.argv.includes("--print"))'
    'process.stderr.write("\\x1b[32m\\u2713 PATCHED cli.js (aio-patch-claude)\\x1b[0m\\n");'
)
BANNER_MARKER = "PATCHED cli.js (aio-patch-claude)"


def apply_patches(content: str, patches: list[dict]) -> tuple[str, dict]:
    """Apply patches to content string. Returns (patched_content, report).

    Idempotent: checks if the replacement text is already present BEFORE
    attempting to apply, so re-running on an already-patched file produces
    all-ALREADY-PATCHED instead of double-applying.
    """
    report = {"applied": [], "missing": [], "skipped": [], "already": []}

    for patch in patches:
        pid = patch.get("id", "unknown")

        # Skip metadata-only entries
        if pid.startswith("_"):
            continue

        # Skip resolver-driven patches (need compile pipeline + resolve_symbols.py)
        if patch.get("resolve"):
            report["skipped"].append((pid, "resolver-driven — needs godClaude compile pipeline"))
            continue

        old = patch.get("old", "")
        new = patch.get("new", "")

        if not old:
            report["skipped"].append((pid, "empty search string"))
            continue

        # No-op patch (old == new) — nothing to change
        if old == new:
            report["skipped"].append((pid, "no-op (old == new)"))
            continue

        is_inject = pid.startswith("INJECT@")

        # Idempotency check FIRST — is the patch already applied?
        # Must run before counting `old`, because for inject patches the
        # anchor (old) is preserved after injection and would still match,
        # and for patches where old is a substring of new, old would appear
        # within the replacement text.
        if is_inject:
            if (new + old) in content:
                report["already"].append((pid, "injection already present"))
                continue
        else:
            if new in content:
                report["already"].append((pid, "replacement present"))
                continue

        # Count occurrences of the search string
        count = content.count(old)

        if count == 0:
            report["missing"].append((pid, old[:80].replace("\n", "\\n")))
            continue

        # Apply the patch
        if is_inject:
            content = content.replace(old, new + old)
            report["applied"].append((pid, f"injected x{count}"))
        else:
            content = content.replace(old, new)
            report["applied"].append((pid, f"replaced x{count}"))

    return content, report


def inject_banner(content: str) -> tuple[str, str]:
    """Inject verification banner near top of cli.js. Returns (content, status)."""
    if BANNER_MARKER in content:
        return content, "already present"

    # Look for a version comment or the first statement after any shebang/comment block
    # Common pattern: `// Version: X.X.X` or first `var`/`let`/`const`/`"use strict"`
    import re
    m = re.search(r'^(// Version:.*\n)', content, re.MULTILINE)
    if m:
        insert_at = m.end()
        content = content[:insert_at] + BANNER_CODE + "\n" + content[insert_at:]
        return content, "added after version comment"

    # Fallback: insert after first line
    first_nl = content.find("\n")
    if first_nl > 0:
        content = content[:first_nl + 1] + BANNER_CODE + "\n" + content[first_nl + 1:]
        return content, "added after first line"

    return content, "version line not found — banner not added"


def format_report(report: dict) -> str:
    """Format patch report for display."""
    lines = []

    if report["applied"]:
        lines.append(f"\n  APPLIED ({len(report['applied'])}):")
        for pid, detail in report["applied"]:
            lines.append(f"    [{pid}] {detail}")

    if report["already"]:
        lines.append(f"\n  ALREADY PATCHED ({len(report['already'])}):")
        for pid, detail in report["already"]:
            lines.append(f"    [{pid}] {detail}")

    if report["skipped"]:
        lines.append(f"\n  SKIPPED ({len(report['skipped'])}):")
        for pid, detail in report["skipped"]:
            lines.append(f"    [{pid}] {detail}")

    if report["missing"]:
        lines.append(f"\n  MISSING ({len(report['missing'])}):")
        for pid, preview in report["missing"]:
            lines.append(f"    [{pid}] {preview}...")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Patch Claude Code cli.js locally for maximum quality"
    )
    parser.add_argument("cli_js", help="Path to cli.js")
    parser.add_argument("patches_json", help="Path to patches.json")
    parser.add_argument("--no-backup", action="store_true", help="Skip backup")
    parser.add_argument("--dry-run", action="store_true", help="Report only")
    parser.add_argument("--strict", action="store_true", help="Fail on MISSING")
    args = parser.parse_args()

    cli_path = Path(args.cli_js)
    patches_path = Path(args.patches_json)

    if not cli_path.exists():
        sys.exit(f"ERROR: {cli_path} not found")
    if not patches_path.exists():
        sys.exit(f"ERROR: {patches_path} not found")

    content = cli_path.read_text(encoding="utf-8")
    patches_data = json.loads(patches_path.read_text(encoding="utf-8"))
    patches = patches_data.get("patches", [])

    print(f"== Patching {cli_path}")
    print(f"   patches: {patches_path} ({len(patches)} entries)")
    print(f"   cli.js size: {len(content):,} bytes")

    # Backup
    if not args.no_backup and not args.dry_run:
        backup = cli_path.with_suffix(".js.backup")
        shutil.copy2(cli_path, backup)
        print(f"   backup: {backup}")

    # Apply patches
    patched, report = apply_patches(content, patches)

    # Inject verification banner
    patched, banner_status = inject_banner(patched)
    print(f"   banner: {banner_status}")

    # Report
    print(format_report(report))

    n_applied = len(report["applied"])
    n_already = len(report["already"])
    n_skipped = len(report["skipped"])
    n_missing = len(report["missing"])

    print(f"\n  Summary: {n_applied} applied, {n_already} already, "
          f"{n_skipped} skipped, {n_missing} missing")

    if args.dry_run:
        print("\n  [DRY RUN — no changes written]")
    else:
        cli_path.write_text(patched, encoding="utf-8")
        print(f"\n  Written: {cli_path} ({len(patched):,} bytes)")

    if args.strict and n_missing > 0:
        print(f"\n  STRICT: {n_missing} missing — exit 1")
        sys.exit(1)

    print("\nDone. Run `claude --version` to verify the green banner appears.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""
Find missing module documentation from CodeWiki's module_tree.json.

CodeWiki generates module_tree.json with all children (submodules), but may not
create .md files for all of them. This script:
1. Reads module_tree.json
2. Recursively finds all modules/submodules
3. Checks which ones don't have corresponding .md files
4. Outputs the list of missing modules with their components

Usage:
    uv run find-missing-modules.py [docs_path]

Output format (JSON):
    {
        "missing": [
            {
                "name": "Data Models",
                "full_path": ["Dependency Analyzer", "Data Models"],
                "components": ["core.py", "analysis.py"],
                "expected_file": "Dependency Analyzer_Data Models.md"
            }
        ],
        "existing": ["CLI Application.md", "Agent Backend.md", ...],
        "total_modules": 10,
        "missing_count": 3
    }
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any


def sanitize_filename(name: str) -> str:
    """Convert module name to safe filename."""
    # Replace path separators and problematic chars
    return name.replace("/", "_").replace("\\", "_").strip()


def get_module_filename(module_path: list[str]) -> str:
    """Get the expected .md filename for a module path."""
    # Join path parts with underscore, keep spaces in module names
    parts = [sanitize_filename(p) for p in module_path]
    return "_".join(parts) + ".md"


def traverse_modules(
    tree: dict,
    parent_path: list[str] = None,
    results: list[dict] = None
) -> list[dict]:
    """Recursively traverse module tree and collect all modules."""
    if results is None:
        results = []
    if parent_path is None:
        parent_path = []

    for module_name, module_info in tree.items():
        full_path = parent_path + [module_name]
        components = module_info.get("components", [])

        module_data = {
            "name": module_name,
            "full_path": full_path,
            "components": components,
            "expected_file": get_module_filename(full_path),
            "has_children": bool(module_info.get("children", {})),
        }
        results.append(module_data)

        # Recurse into children
        children = module_info.get("children", {})
        if isinstance(children, dict) and children:
            traverse_modules(children, full_path, results)

    return results


def find_missing_modules(docs_path: Path, module_tree_path: Path = None) -> dict:
    """Find all modules in tree and check which have .md files."""

    # Default module_tree.json location
    if module_tree_path is None:
        module_tree_path = docs_path / "module_tree.json"

    if not module_tree_path.exists():
        return {
            "error": f"module_tree.json not found at {module_tree_path}",
            "missing": [],
            "existing": [],
            "total_modules": 0,
            "missing_count": 0,
        }

    # Load module tree
    try:
        with open(module_tree_path, "r", encoding="utf-8") as f:
            module_tree = json.load(f)
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON in module_tree.json: {e}"}
    except Exception as e:
        return {"error": f"Failed to read module_tree.json: {e}"}

    # Traverse tree to get all modules
    all_modules = traverse_modules(module_tree)

    # Get all actual .md files in docs directory with normalized keys
    # Normalize: lowercase, replace space/underscore with space for matching
    def normalize_filename(name: str) -> str:
        return name.lower().replace("_", " ").replace("-", " ")

    actual_files = {}
    for f in docs_path.glob("*.md"):
        key = normalize_filename(f.name)
        actual_files[key] = f.name

    # Check which files exist
    missing = []
    existing = []

    for module in all_modules:
        expected_key = normalize_filename(module["expected_file"])
        expected_path = docs_path / module["expected_file"]

        if expected_path.exists():
            module["file_exists"] = True
            module["actual_file"] = module["expected_file"]
            existing.append(module["expected_file"])
        elif expected_key in actual_files:
            # Found normalized match (e.g., "web frontend.md" matches "web_frontend.md")
            module["file_exists"] = True
            module["actual_file"] = actual_files[expected_key]
            existing.append(actual_files[expected_key])
        else:
            module["file_exists"] = False
            module["actual_file"] = None
            missing.append(module)

    return {
        "missing": missing,
        "existing": existing,
        "total_modules": len(all_modules),
        "missing_count": len(missing),
        "docs_path": str(docs_path),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Find missing module documentation from CodeWiki's module_tree.json"
    )
    parser.add_argument(
        "docs_path",
        nargs="?",
        default="docs",
        help="Path to docs directory (default: docs)",
    )
    parser.add_argument(
        "--format",
        choices=["json", "compact", "names-only"],
        default="compact",
        help="Output format",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Exit with error code if missing modules found (for CI)",
    )

    args = parser.parse_args()

    docs_path = Path(args.docs_path).resolve()
    if not docs_path.exists():
        print(f"ERROR: Docs path does not exist: {docs_path}", file=sys.stderr)
        sys.exit(1)

    result = find_missing_modules(docs_path)

    if "error" in result:
        print(f"ERROR: {result['error']}", file=sys.stderr)
        sys.exit(1)

    # Output based on format
    if args.format == "json":
        print(json.dumps(result, indent=2))

    elif args.format == "names-only":
        for m in result["missing"]:
            print(m["expected_file"])

    else:  # compact
        print(f"Module Documentation Status")
        print(f"=" * 50)
        print(f"Docs path: {result['docs_path']}")
        print(f"Total modules in tree: {result['total_modules']}")
        print(f"Existing docs: {len(result['existing'])}")
        print(f"Missing docs: {result['missing_count']}")
        print()

        if result["missing"]:
            print("Missing module documentation:")
            print("-" * 50)
            for m in result["missing"]:
                path_str = " > ".join(m['full_path'])
                comp_count = len(m['components'])
                print(f"  {m['expected_file']}")
                print(f"    Path: {path_str}")
                print(f"    Components: {comp_count} files")
                if m["has_children"]:
                    print(f"    Note: Has child submodules")
                print()
        else:
            print("All modules have documentation!")

    # CI check mode
    if args.check_only and result["missing_count"] > 0:
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()

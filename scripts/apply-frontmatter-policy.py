#!/usr/bin/env python3
"""
Apply argument-hint and effort frontmatter policy to all SKILL.md files.

Inserts:
  - argument-hint  → only if mapping provides one
  - effort         → for every skill (low/medium/high heuristic)

Preserves: name, description, when_to_use, and any custom fields (context, agent, model).
"""

import re
import sys
from pathlib import Path

# Per-skill metadata. arg=None means "skill takes no argument".
SKILLS = {
    "aio-browser-cookie": {
        "arg": '"Domain or URL to extract cookies for"',
        "effort": "low",
    },
    "aio-bun-fullstack-setup": {
        "arg": '"Project name or path (e.g. my-app)"',
        "effort": "medium",
    },
    "aio-dream": {"arg": None, "effort": "medium"},
    "aio-patch-claude": {"arg": None, "effort": "high"},
    "aio-skillify": {
        "arg": '"[optional description of the process to capture]"',
        "effort": "medium",
    },
    "aio-feedback": {"arg": '"[bug | feature | plugin] description"', "effort": "low"},
    "aio-code-review": {
        "arg": '"PR ref or role (reviewer | author)"',
        "effort": "medium",
    },
    "aio-dashboard-design": {
        "arg": '"Dashboard URL, screenshot, or design brief"',
        "effort": "medium",
    },
    "aio-neobrutalism": {
        "arg": '"Project path or component to transform"',
        "effort": "medium",
    },
    "aio-uiux": {"arg": None, "effort": "low"},
    "aio-github": {"arg": '"Repo, PR number, issue, or action"', "effort": "low"},
    "aio-gitlab": {"arg": '"MR ID, pipeline ID, or action"', "effort": "low"},
    "aio-worktree": {"arg": "<branch-name>", "effort": "medium"},
    "aio-grafana-diagram": {
        "arg": '"Codebase path or diagram intent"',
        "effort": "high",
    },
    "aio-mermaid": {"arg": '"Mermaid code or diagram description"', "effort": "low"},
    "aio-epub-analyze": {"arg": "book ID or title", "effort": "medium"},
    "aio-epub-export": {"arg": "book ID", "effort": "low"},
    "aio-epub-manage": {"arg": "book ID (optional)", "effort": "low"},
    "aio-epub-quality": {"arg": "book ID", "effort": "low"},
    "aio-epub-review": {
        "arg": "book ID and optional chapter number",
        "effort": "medium",
    },
    "aio-epub-setup": {"arg": None, "effort": "low"},
    "aio-epub-translate": {
        "arg": "book ID and optional chapter range",
        "effort": "medium",
    },
    "aio-epub-upload": {"arg": "path to EPUB file", "effort": "low"},
    "aio-epub-vn-style": {"arg": None, "effort": "low"},
    "aio-gherkin-refine": {
        "arg": '"Requirement text or feature file to refine"',
        "effort": "medium",
    },
    "aio-golang-mastery": {
        "arg": '"[lint | review | reference] [optional path]"',
        "effort": "medium",
    },
    "aio-html-interactive": {
        "arg": "\"[slug for /tmp dir, e.g. 'picker' or 'review-queue']\"",
        "effort": "medium",
    },
    "aio-remove-background": {
        "arg": "<input-image> <output.png> [--no-despill] [--model ZhengPeng7/BiRefNet]",
        "effort": "low",
    },
    "aio-ios-device-debug": {
        "arg": '"[build | logs | crash | screenshot] [optional bundle id]"',
        "effort": "medium",
    },
    "aio-kanban": {"arg": '"init | status | add <title> | archive"', "effort": "low"},
    "aio-mental-models": {
        "arg": '"Decision or problem to think through"',
        "effort": "low",
    },
    "aio-monitoring-observability": {"arg": None, "effort": "low"},
    "aio-debug": {
        "arg": '"Error message, failing test name, or description of broken behavior"',
        "effort": "high",
    },
    "aio-discover": {
        "arg": '"Feature, component, or concept to discover in the codebase"',
        "effort": "medium",
    },
    "aio-doc-writer": {"arg": '"Codebase path or scope to document"', "effort": "high"},
    "aio-review-deep": {
        "arg": '"PR ref, branch, or diff to review (optional — auto-detects current branch)"',
        "effort": "high",
    },
    "aio-review-quick": {
        "arg": None,
        "effort": "medium",
    },
    "aio-gitnexus": {
        "arg": '"[status | analyze | rebuild | troubleshoot]"',
        "effort": "medium",
    },
    "aio-map": {
        "arg": '"File, function, or module to map dependencies for"',
        "effort": "medium",
    },
    "aio-plan": {
        "arg": '"Feature or refactor to plan implementation for"',
        "effort": "high",
    },
    "aio-review": {"arg": None, "effort": "medium"},
    "aio-rubber-duck": {
        "arg": '"Problem, bug, or piece of code you want to talk through"',
        "effort": "low",
    },
    "aio-snapshot": {"arg": None, "effort": "low"},
    "aio-rag-kit": {"arg": '"Collection name or operation"', "effort": "low"},
    "aio-research-kit": {"arg": "<topic>", "effort": "medium"},
    "aio-atlassian": {
        "arg": '"Jira issue key, JQL query, or Confluence page title"',
        "effort": "low",
    },
    "aio-google-workspace": {
        "arg": '"[gmail | drive | calendar | sheets | docs | tasks] [action]"',
        "effort": "low",
    },
    "aio-tanca": {
        "arg": '"[check-in | check-out | shift | employee] [optional id]"',
        "effort": "low",
    },
    "aio-x": {"arg": "<tweet-text or search-query>", "effort": "low"},
    "aio-architect-advisor": {
        "arg": '"Architecture decision or system to design"',
        "effort": "low",
    },
    "aio-architect-reference": {
        "arg": '"Pattern name or search query"',
        "effort": "low",
    },
    "aio-starrocks-best-practices": {
        "arg": '"Table DDL or design question"',
        "effort": "low",
    },
    "aio-starrocks-query-tuning": {
        "arg": '"Query, EXPLAIN output, or Query Profile to tune"',
        "effort": "low",
    },
    "aio-threat-models": {
        "arg": '"System, scope, or architecture to model"',
        "effort": "low",
    },
    "aio-tui": {"arg": None, "effort": "low"},
    "aio-visual-diff": {
        "arg": '"<dev-url> <selector> [--figma <node-url>]"',
        "effort": "medium",
    },
    "aio-watermill-kit": {"arg": None, "effort": "low"},
    "aio-xstate": {"arg": '"State machine name or description"', "effort": "medium"},
    "aio-youtube": {"arg": "<search-query or YouTube-URL>", "effort": "low"},
}

ROOT = Path(__file__).resolve().parent.parent
PLUGINS = ROOT / "plugins"

# Match frontmatter block at top of file: ---\n<body>\n---\n
FRONTMATTER_RE = re.compile(r"^(---\n)(.*?)(\n---\n)(.*)$", re.DOTALL)

# Match a top-level scalar field (key: value) — not indented
FIELD_RE = re.compile(r"^([a-zA-Z_-]+):", re.MULTILINE)


def find_field_end(fm: str, key: str) -> int | None:
    """Return char-offset right after the entire value block for `key`, or None if missing.

    Handles single-line (`key: value`) and block-scalar (`key: |` + indented lines).
    """
    # locate the line starting with `key:`
    pat = re.compile(rf"^{re.escape(key)}:", re.MULTILINE)
    m = pat.search(fm)
    if not m:
        return None
    line_start = m.start()
    # is this a block scalar? check if value after `key:` is `|` or `>`
    line_end = fm.find("\n", line_start)
    if line_end == -1:
        return len(fm)
    header = fm[line_start:line_end]
    after_colon = header.split(":", 1)[1].strip()
    if after_colon in ("|", ">", "|-", ">-", "|+", ">+"):
        # consume subsequent indented lines
        idx = line_end + 1
        while idx < len(fm):
            next_nl = fm.find("\n", idx)
            if next_nl == -1:
                next_nl = len(fm)
            line = fm[idx:next_nl]
            if line and not (line.startswith(" ") or line.startswith("\t")):
                # next top-level field starts here
                return (
                    idx - 1
                )  # right before this newline (so we sit right after prev newline)
            idx = next_nl + 1
        return len(fm)
    return line_end


def insert_after(fm: str, anchor_key: str, fields_to_add: list[tuple[str, str]]) -> str:
    """Insert `fields_to_add` (key, raw_value) lines right after `anchor_key`'s block."""
    end = find_field_end(fm, anchor_key)
    if end is None:
        # fall back: append at end of frontmatter
        end = len(fm)
    lines = "".join(f"\n{k}: {v}" for k, v in fields_to_add)
    return fm[:end] + lines + fm[end:]


def update_skill(path: Path) -> tuple[bool, str]:
    text = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        return False, "no frontmatter"
    open_, fm, close_, body = m.groups()

    # extract skill name from frontmatter
    name_m = re.search(r"^name:\s*(\S+)", fm, re.MULTILINE)
    if not name_m:
        return False, "no name field"
    skill_name = name_m.group(1)
    if skill_name not in SKILLS:
        return False, f"skill '{skill_name}' not in mapping"

    cfg = SKILLS[skill_name]
    existing_fields = set(FIELD_RE.findall(fm))

    to_add: list[tuple[str, str]] = []
    if cfg["arg"] is not None and "argument-hint" not in existing_fields:
        to_add.append(("argument-hint", cfg["arg"]))
    if "effort" not in existing_fields:
        to_add.append(("effort", cfg["effort"]))

    if not to_add:
        return False, "already has policy fields"

    # Insert after `when_to_use` (the universal anchor — all skills have it).
    # If skill is missing when_to_use, fall back to `description`.
    anchor = "when_to_use" if "when_to_use" in existing_fields else "description"
    new_fm = insert_after(fm, anchor, to_add)

    new_text = open_ + new_fm + close_ + body
    path.write_text(new_text, encoding="utf-8")
    added = ", ".join(k for k, _ in to_add)
    return True, f"added: {added}"


def main():
    skill_files = sorted(PLUGINS.rglob("SKILL.md"))
    updated = 0
    skipped = 0
    errors = 0
    for p in skill_files:
        try:
            changed, msg = update_skill(p)
            rel = p.relative_to(ROOT)
            if changed:
                print(f"✓ {rel}: {msg}")
                updated += 1
            else:
                print(f"  {rel}: {msg}")
                skipped += 1
        except Exception as e:
            print(f"✗ {p}: {e}")
            errors += 1
    print(
        f"\nupdated={updated}  skipped={skipped}  errors={errors}  total={len(skill_files)}"
    )
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

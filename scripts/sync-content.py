#!/usr/bin/env python3
"""
sync-content.py — generate site/content/plugins/*.md from the canonical plugin
source: .claude-plugin/marketplace.json + plugins/{name}/.claude-plugin/plugin.json
+ plugins/{name}/skills/{skill}/SKILL.md.

Output layout (matches Nuxt Content URL routing):
    site/content/plugins/index.md                          # landing
    site/content/plugins/{plugin}.md                       # plugin overview
    site/content/plugins/{plugin}/{skill}.md               # one per skill

Run from the repo root (or anywhere — paths are resolved relative to this file).
The site's package.json wires `bun run sync` → `python3 ../scripts/sync-content.py`,
so it fires automatically before `bun dev` / `bun build` / `bun generate`.

The generated tree is .gitignored — regenerate freely.
"""

import json
import os
import re
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MARKETPLACE_FILE = REPO_ROOT / ".claude-plugin" / "marketplace.json"
PLUGINS_DIR = REPO_ROOT / "plugins"
CONTENT_ROOT = REPO_ROOT / "site" / "content"
OUT_DIR = CONTENT_ROOT / "plugins"


def parse_frontmatter(text: str) -> dict | None:
    """Extract YAML-ish frontmatter from a SKILL.md file. Mirrors the shape
    used in generate-docs-data.py — handles inline + multi-line description
    blocks (with > or | indicator) and stops at the next top-level key."""
    match = re.search(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not match:
        return None
    fm_text = match.group(1)

    name_match = re.search(r"^name:\s*(.+)$", fm_text, re.MULTILINE)
    name = name_match.group(1).strip() if name_match else ""

    desc_match = re.search(
        r"^description:\s*(.*?)(?=\n^[a-zA-Z0-9_-]+:|\Z)",
        fm_text,
        re.MULTILINE | re.DOTALL,
    )
    desc = ""
    if desc_match:
        raw = desc_match.group(1).strip()
        if raw.startswith(">") or raw.startswith("|"):
            raw = raw[1:].strip()
        desc = re.sub(r"\s+", " ", raw)

    return {"name": name, "desc": desc}


def yaml_escape(value: str) -> str:
    """Quote a string for YAML frontmatter. Double-quote + escape inner quotes
    and backslashes; preserve UTF-8 as-is (PyYAML would folder/unicode-escape).
    Plain enough for our short, mostly-ASCII metadata."""
    if value is None:
        return '""'
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def write_root_index(plugins: list[dict]) -> None:
    """Site landing at /. Layer's ContentView auto-lists the /plugins folder
    as a child section, so this body is intentionally short — it sets the
    tone, the section listing does the discovery work."""
    out = CONTENT_ROOT / "index.md"
    total_skills = sum(len(p["skills"]) for p in plugins)
    body = f"""---
title: "Claude Plugins"
description: "{len(plugins)} plugins · {total_skills} skills for Claude Code — install with one command"
document_type: "listing"
weight: 0
---

# Claude Plugins

Reusable **skills, agents, and workflows** for Claude Code. {len(plugins)} plugins, {total_skills} skills total.

```
/plugin marketplace add aiocean/claude-plugins
/plugin install <plugin-name>@aiocean-plugins
```

Open [Plugins](/plugins) to browse the full catalog.
"""
    out.write_text(body, encoding="utf-8")


def write_plugin_index(plugins: list[dict]) -> None:
    """The /plugins listing page. Body is intentionally short — the layer's
    ContentView renders the children (each plugin) as a section automatically."""
    out = OUT_DIR / "index.md"
    total_skills = sum(len(p["skills"]) for p in plugins)
    body = f"""---
title: "Plugins"
description: "{len(plugins)} plugins · {total_skills} skills · install with one command"
document_type: "listing"
weight: 0
---

# Plugins for Claude Code

Reusable **skills, agents, and workflows** for Claude Code. Each plugin bundles
one or more skills that auto-trigger on relevant tasks.

```
/plugin marketplace add aiocean/claude-plugins
/plugin install <plugin-name>@aiocean-plugins
```

Browse the {len(plugins)} plugins below — click any to drill into its skills.
"""
    out.write_text(body, encoding="utf-8")


def write_plugin_page(plugin: dict) -> None:
    """One markdown file per plugin → site/content/plugins/{name}.md. The
    page body lists the bundled skills as a linked list so users can drill
    into each (stacked-column push) without scrolling a giant single page."""
    slug = plugin["name"]
    install_cmd = f"/plugin install {slug}@aiocean-plugins"

    skill_lines = []
    for skill in plugin["skills"]:
        skill_slug = skill["name"]
        # Use absolute path so links work from any column depth
        link = f"/plugins/{slug}/{skill_slug}"
        # Truncate skill desc for the listing — full text lives on the skill page
        desc_short = skill["desc"][:160].rstrip()
        if len(skill["desc"]) > 160:
            desc_short += "…"
        skill_lines.append(f"- [**{skill_slug}**]({link}) — {desc_short}")
    skill_md = (
        "\n".join(skill_lines) if skill_lines else "*This plugin ships no skills.*"
    )

    body = f"""---
title: {yaml_escape(slug)}
description: {yaml_escape(plugin["desc"])}
document_type: "plugin"
version: {yaml_escape(plugin.get("version", ""))}
install: {yaml_escape(install_cmd)}
skills_count: {len(plugin["skills"])}
---

# {slug}

`v{plugin.get("version", "?")}`

{plugin["desc"]}

## Install

```
{install_cmd}
```

## Skills ({len(plugin["skills"])})

{skill_md}
"""
    out = OUT_DIR / f"{slug}.md"
    out.write_text(body, encoding="utf-8")


def write_skill_page(plugin: dict, skill: dict) -> None:
    """One markdown file per skill → site/content/plugins/{plugin}/{skill}.md.
    Skill detail = description + how to install the parent plugin (skills can't
    be installed individually) + link back to plugin."""
    plugin_slug = plugin["name"]
    skill_slug = skill["name"]
    install_cmd = f"/plugin install {plugin_slug}@aiocean-plugins"

    body = f"""---
title: {yaml_escape(skill_slug)}
description: {yaml_escape(skill["desc"])}
document_type: "skill"
plugin: {yaml_escape(plugin_slug)}
install: {yaml_escape(install_cmd)}
---

# {skill_slug}

From plugin [**{plugin_slug}**](/plugins/{plugin_slug}) · `v{plugin.get("version", "?")}`

{skill["desc"]}

## Install

Install the parent plugin — this skill is bundled inside:

```
{install_cmd}
```
"""
    out_dir = OUT_DIR / plugin_slug
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{skill_slug}.md"
    out_path.write_text(body, encoding="utf-8")


def gather_plugins() -> list[dict]:
    """Walk marketplace.json + per-plugin SKILL.md files into a normalized list."""
    with MARKETPLACE_FILE.open() as f:
        marketplace = json.load(f)

    plugins_data = []
    for p in marketplace.get("plugins", []):
        plugin_name = p["name"]
        skills_dir = PLUGINS_DIR / plugin_name / "skills"

        skills_list = []
        if skills_dir.exists():
            for skill_folder in sorted(skills_dir.iterdir()):
                if not skill_folder.is_dir():
                    continue
                skill_md = skill_folder / "SKILL.md"
                if not skill_md.exists():
                    continue
                fm = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
                if fm and fm["name"]:
                    skills_list.append(fm)

        plugins_data.append(
            {
                "name": plugin_name,
                "version": p.get("version", ""),
                "desc": p.get("description", ""),
                "skills": skills_list,
            }
        )
    return plugins_data


def main() -> None:
    if not MARKETPLACE_FILE.exists():
        print(
            f"error: {MARKETPLACE_FILE} not found — run from repo root", file=sys.stderr
        )
        sys.exit(1)

    # Nuke + rebuild — generated content is .gitignored, full regen on every
    # run guarantees no stale files when a plugin/skill is renamed or removed.
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    plugins = gather_plugins()
    write_root_index(plugins)
    write_plugin_index(plugins)

    skill_count = 0
    for plugin in plugins:
        write_plugin_page(plugin)
        for skill in plugin["skills"]:
            write_skill_page(plugin, skill)
            skill_count += 1

    print(
        f"sync-content: wrote 1 index + {len(plugins)} plugins + {skill_count} skills to {OUT_DIR.relative_to(REPO_ROOT)}"
    )


if __name__ == "__main__":
    main()

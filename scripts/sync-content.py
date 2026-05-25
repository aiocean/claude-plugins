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

# i18n: EN is the default locale (unprefixed, at content/), VI lives under
# content/vi/. content.config.ts splits these into two collections (`content`
# excludes vi/**, `content_vi` includes vi/** with prefix:'').
#
# IMPORTANT: this script only emits EN. The VI namespace (content/vi/**) is
# AI-translated/hand-authored content that lives in git — sync MUST NOT touch
# it. The original strategy duplicated EN into VI on every sync, but that
# overwrote any translation work. Translation now flows from EN → VI via
# manual edits (or AI-assisted edits) directly inside site/content/vi/, and
# those files are committed and survive every subsequent sync. When a new
# plugin/skill is added in EN, a human (or AI) creates the matching VI page
# by hand — sync is intentionally not aware of the VI side at all.
LOCALES = ["en"]


def locale_root(locale: str) -> Path:
    """Root content dir for a given locale. EN sits at content/ (VI, content/vi/,
    is hand-authored — see LOCALES comment above)."""
    return CONTENT_ROOT if locale == "en" else CONTENT_ROOT / locale


def plugins_out_dir(locale: str) -> Path:
    return locale_root(locale) / "plugins"


def parse_frontmatter(text: str) -> dict | None:
    """Extract YAML-ish frontmatter + body from a SKILL.md file.

    Returns {"name": ..., "desc": ..., "body": ...} or None when no
    frontmatter delimiter is found. "body" is everything after the closing
    `---` line, with leading blank lines trimmed — ready to splice straight
    into Nuxt Content markdown.
    """
    match = re.search(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not match:
        return None
    fm_text = match.group(1)
    body = text[match.end() :].lstrip("\n")

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

    return {"name": name, "desc": desc, "body": body}


def read_plugin_readme(plugin_name: str) -> str | None:
    """Return the plugin's README.md body (frontmatter stripped if any) or
    None when no README exists. Path: plugins/{plugin}/README.md."""
    readme = PLUGINS_DIR / plugin_name / "README.md"
    if not readme.exists():
        return None
    text = readme.read_text(encoding="utf-8")
    fm_match = re.search(r"^---\s*\n.*?\n---\s*\n", text, re.DOTALL)
    if fm_match:
        text = text[fm_match.end() :]
    return text.lstrip("\n")


def yaml_escape(value: str) -> str:
    """Quote a string for YAML frontmatter. Double-quote + escape inner quotes
    and backslashes; preserve UTF-8 as-is (PyYAML would folder/unicode-escape).
    Plain enough for our short, mostly-ASCII metadata."""
    if value is None:
        return '""'
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def write_root_index(plugins: list[dict], locale: str) -> None:
    """Site landing at /. The /plugins folder auto-lists below as a section,
    so the body's job is to take a position — what this marketplace IS, what
    sets it apart from "AI tool stores", and the mental model someone needs
    to choose the right plugin. Plugin/skill counts are interpolated so the
    line stays accurate across releases.

    Locale-aware: EN writes to content/index.md (collection `content`); VI
    writes to content/vi/index.md (collection `content_vi`, stored as / after
    the prefix:'' strip). Body is identical — translation lands in-place via
    manual edits after sync."""
    out = locale_root(locale) / "index.md"
    n = len(plugins)
    total_skills = sum(len(p["skills"]) for p in plugins)
    body = f"""---
title: "Claude Plugins"
description: "Procedural memory for Claude Code: {n} plugins, {total_skills} skills covering translation, debugging, design systems, infra ops, and plugin authorship. Two-command install."
document_type: "listing"
weight: 0
---

# Claude Plugins

A Claude Code plugin is a folder of skills, agents, hooks, and slash
commands that Claude installs per project. {n} plugins, {total_skills}
skills here.

```
/plugin marketplace add aiocean/claude-plugins
/plugin install <plugin-name>@aiocean-plugins
```

Skills load when their description matches your message, hooks fire on
tool-call events, agents spawn on the `Agent` tool. Idle plugins cost
nothing — browse [plugins](/plugins) or read the [guides](/guides).
"""
    out.write_text(body, encoding="utf-8")


def write_plugin_index(plugins: list[dict], locale: str) -> None:
    """The /plugins listing page. Body is intentionally short — the layer's
    ContentView renders the children (each plugin) as a section automatically."""
    out = plugins_out_dir(locale) / "index.md"
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


def render_skill_list(plugin_slug: str, skills: list[dict]) -> str:
    """Render the per-plugin skill list as a markdown bullet list. Each link
    points at the absolute skill URL so it works from any stacked-column
    depth. Truncate descriptions to keep the parent page scannable."""
    if not skills:
        return "*This plugin ships no skills.*"
    lines = []
    for skill in skills:
        link = f"/plugins/{plugin_slug}/{skill['name']}"
        desc = skill["desc"][:160].rstrip()
        if len(skill["desc"]) > 160:
            desc += "…"
        lines.append(f"- [**{skill['name']}**]({link}) — {desc}")
    return "\n".join(lines)


def write_plugin_page(plugin: dict, locale: str) -> None:
    """One markdown file per plugin → site/content/{locale-root}/plugins/{name}.md.

    Source-of-truth strategy: use the plugin's own README.md body if it
    exists (16 of 28 plugins do — the well-crafted ones with rationale +
    installation + sections). Falls back to a slim synthetic template when
    no README is present.

    Marketplace adds: frontmatter for SEO/listing + a top-of-page install
    callout + a "Skills" section appended at the bottom (always present so
    users can drill into individual skills regardless of README content).
    """
    slug = plugin["name"]
    install_cmd = f"/plugin install {slug}@aiocean-plugins"
    readme_body = plugin.get("readme")  # set by gather_plugins
    skill_list_md = render_skill_list(slug, plugin["skills"])

    if readme_body:
        # README is the body. Prepend a 1-line marketplace install callout
        # (block quote so it visually separates from README's own content)
        # and append the Skills index so drill-down is always reachable.
        core = (
            f"> **Install:** `{install_cmd}` · `v{plugin.get('version', '?')}`\n\n"
            f"{readme_body.rstrip()}\n\n"
            f"## Skills ({len(plugin['skills'])})\n\n"
            f"{skill_list_md}\n"
        )
    else:
        # Slim synthetic fallback for plugins without a README.
        core = (
            f"# {slug}\n\n"
            f"`v{plugin.get('version', '?')}`\n\n"
            f"{plugin['desc']}\n\n"
            f"## Install\n\n"
            f"```\n{install_cmd}\n```\n\n"
            f"## Skills ({len(plugin['skills'])})\n\n"
            f"{skill_list_md}\n"
        )

    body = (
        f"---\n"
        f"title: {yaml_escape(slug)}\n"
        f"description: {yaml_escape(plugin['desc'])}\n"
        f'document_type: "plugin"\n'
        f"version: {yaml_escape(plugin.get('version', ''))}\n"
        f"install: {yaml_escape(install_cmd)}\n"
        f"skills_count: {len(plugin['skills'])}\n"
        f"---\n\n"
        f"{core}"
    )
    out = plugins_out_dir(locale) / f"{slug}.md"
    out.write_text(body, encoding="utf-8")


def write_skill_page(plugin: dict, skill: dict, locale: str) -> None:
    """One markdown file per skill → site/content/{locale-root}/plugins/{plugin}/{skill}.md.

    Source-of-truth strategy: embed the SKILL.md body verbatim — that's where
    the skill author already wrote the real documentation (median 176 lines).
    Marketplace adds: frontmatter for SEO/listing + a top-of-page callout
    with the parent-plugin link and install command (skills install via the
    parent plugin, not individually).
    """
    plugin_slug = plugin["name"]
    skill_slug = skill["name"]
    install_cmd = f"/plugin install {plugin_slug}@aiocean-plugins"
    skill_body = skill.get("body", "").rstrip()

    if skill_body:
        core = (
            f"> From plugin [**{plugin_slug}**](/plugins/{plugin_slug}) · "
            f"`v{plugin.get('version', '?')}` · "
            f"**Install:** `{install_cmd}`\n\n"
            f"{skill_body}\n"
        )
    else:
        # Fallback when SKILL.md has no body — should never happen but
        # render something rather than an empty page.
        core = (
            f"# {skill_slug}\n\n"
            f"From plugin [**{plugin_slug}**](/plugins/{plugin_slug}) · "
            f"`v{plugin.get('version', '?')}`\n\n"
            f"{skill['desc']}\n\n"
            f"## Install\n\nInstall the parent plugin — this skill is bundled inside:\n\n"
            f"```\n{install_cmd}\n```\n"
        )

    body = (
        f"---\n"
        f"title: {yaml_escape(skill_slug)}\n"
        f"description: {yaml_escape(skill['desc'])}\n"
        f'document_type: "skill"\n'
        f"plugin: {yaml_escape(plugin_slug)}\n"
        f"install: {yaml_escape(install_cmd)}\n"
        f"---\n\n"
        f"{core}"
    )
    out_dir = plugins_out_dir(locale) / plugin_slug
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
                # plugins/{name}/README.md — present for ~57% of plugins.
                # write_plugin_page falls back to a synthetic template when None.
                "readme": read_plugin_readme(plugin_name),
            }
        )
    return plugins_data


def main() -> None:
    if not MARKETPLACE_FILE.exists():
        print(
            f"error: {MARKETPLACE_FILE} not found — run from repo root", file=sys.stderr
        )
        sys.exit(1)

    plugins = gather_plugins()
    skill_count_per_run = 0

    for locale in LOCALES:
        out_dir = plugins_out_dir(locale)
        # Nuke + rebuild the plugins/ subtree only — generated content is
        # .gitignored, full regen on every run guarantees no stale files when
        # a plugin/skill is renamed or removed. Crucially we do NOT touch the
        # locale's other folders (e.g. content/vi/guides/) which are
        # hand-translated by humans and must survive sync.
        if out_dir.exists():
            shutil.rmtree(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        write_root_index(plugins, locale)
        write_plugin_index(plugins, locale)

        skill_count = 0
        for plugin in plugins:
            write_plugin_page(plugin, locale)
            for skill in plugin["skills"]:
                write_skill_page(plugin, skill, locale)
                skill_count += 1
        skill_count_per_run = skill_count  # same for every locale; remember the last

        rel = out_dir.relative_to(REPO_ROOT)
        print(
            f"sync-content[{locale}]: wrote 1 index + {len(plugins)} plugins + {skill_count} skills to {rel}"
        )


if __name__ == "__main__":
    main()

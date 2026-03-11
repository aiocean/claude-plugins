"""
CodeWiki Templates - Output-driven documentation templates.

These templates define the expected structure of generated documentation.
AI tools and CodeWiki's reporting engine use these as blueprints to produce
consistent, high-quality codebase documentation.

Template types:
- overview.md.tpl: Project-level overview and architecture
- module.md.tpl: Per-module/domain deep dive
- component.md.tpl: Per-component (class/function) documentation
- architecture.md.tpl: Architecture patterns and design decisions
- dependencies.md.tpl: Dependency graph and relationship analysis
- quality.md.tpl: Code quality, violations, and health metrics

Partials (_partials/):
- Reusable content blocks for diagrams, tables, callouts, etc.
"""

import os
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent


def get_template(name: str) -> str:
    """Load a template file by name (e.g. 'overview' or '_partials/mermaid_graph')."""
    path = TEMPLATES_DIR / f"{name}.md.tpl"
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {path}")
    return path.read_text(encoding="utf-8")


def list_templates() -> list[str]:
    """List all available template names."""
    templates = []
    for f in TEMPLATES_DIR.rglob("*.md.tpl"):
        rel = f.relative_to(TEMPLATES_DIR).with_suffix("").with_suffix("")
        templates.append(str(rel))
    return sorted(templates)

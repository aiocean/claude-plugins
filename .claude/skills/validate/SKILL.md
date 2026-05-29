---
name: validate
description: Run the marketplace validation script to check plugin integrity. Use when finishing plugin work, after adding or modifying plugins, or before committing plugin changes.
---

Run the marketplace validation script to verify all plugins are correctly structured:

```bash
bash scripts/validate-marketplace.sh
```

If validation fails, fix all reported issues before considering the work done. Common issues:
- plugin.json missing required fields (name, description, version, author)
- Folder name doesn't match plugin.json name
- SKILL.md missing YAML frontmatter (name, description)
- Plugin not registered in `.claude-plugin/marketplace.json`
- Version mismatch between marketplace.json and plugin.json
- Resolver block using wrong path pattern

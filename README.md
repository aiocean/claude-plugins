# Claude Code Plugin Marketplace

A collection of Claude Code plugins by aiocean.

## Installation

Add this marketplace:

```bash
/plugin marketplace add aiocean/claude-plugins
```

Then install plugins:

```bash
/plugin install <plugin-name>@aiocean-plugins
```

## Available Plugins

| Plugin           | Description                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **remove-bg**    | Remove background from images and trim transparent edges. Supports threshold-based (fast) and AI-based (rembg) methods. |
| **worktree**     | Manage git worktrees for parallel development. Create worktrees, sync changes (spotlight), merge branches, and cleanup. |
| **epub-packing** | Generate professional EPUB ebooks from Markdown files with auto-generated neo-brutalism covers.                         |

## Plugin Details

### remove-bg

Remove image backgrounds using:

- **Threshold method** (default): Fast, for mono/simple images
- **rembg method** (`--rembg`): AI-based, for complex images

```bash
python3 ~/.claude/skills/remove-bg/remove_bg.py image.png
python3 ~/.claude/skills/remove-bg/remove_bg.py image.jpg --rembg
```

### worktree

Git worktree management scripts:

- `worktree-create.sh` - Create new worktree with branch
- `worktree-list.sh` - List all worktrees
- `worktree-spotlight.sh` - Live sync changes to main repo
- `worktree-merge.sh` - Merge worktree branch
- `worktree-remove.sh` - Remove worktree and branch
- `worktree-cleanup.sh` - Emergency cleanup

### epub-packing

Generate EPUB ebooks from Markdown:

- Multi-chapter support
- Auto-generated neo-brutalism covers
- 7 color schemes
- YAML frontmatter metadata

```bash
python3 generate_epub.py --input doc.md --output book.epub --title "My Book" --author "Author"
```

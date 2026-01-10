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

### worktree

Manage git worktrees for parallel development. Perfect for running multiple AI agents simultaneously on separate branches.

**Features:**

- Create worktrees with `wtr-` prefix naming convention
- Sync commits between worktree and main using rebase + fast-forward (keeps same commit hash)
- Spotlight mode for hot reload preview (temporary file sync)
- Merge and cleanup utilities

**Scripts:**

- `worktree-create.sh` - Create new worktree with branch
- `worktree-sync.sh` - Sync worktree ↔ main (rebase + ff)
- `worktree-spotlight.sh` - Live file sync for hot reload
- `worktree-list.sh` - List all worktrees and status
- `worktree-merge.sh` - Merge worktree branch
- `worktree-remove.sh` - Remove worktree and branch
- `worktree-cleanup.sh` - Emergency cleanup

### mental-models

Comprehensive mental models framework from The Great Mental Models series. 50+ models for decision-making, problem-solving, and strategic thinking.

**Volumes:**

- Volume 1: General Thinking (first principles, inversion, second-order thinking, etc.)
- Volume 2: Physics, Chemistry & Biology (leverage, activation energy, natural selection, etc.)
- Volume 3: Systems & Mathematics (feedback loops, compounding, power laws, etc.)
- Volume 4: Economics & Art (scarcity, incentives, narrative, etc.)

### remove-bg

Remove background from images and trim transparent edges.

**Methods:**

- Threshold method (default) - Fast, for mono/simple images
- rembg method (`--rembg`) - AI-based, for complex images

```bash
python3 ~/.claude/skills/remove-bg/remove_bg.py image.png
python3 ~/.claude/skills/remove-bg/remove_bg.py image.jpg --rembg
```

### epub-packing

Generate professional EPUB ebooks from Markdown files with auto-generated neo-brutalism covers.

**Features:**

- Multi-chapter support
- Auto-generated neo-brutalism covers
- 7 color schemes
- YAML frontmatter metadata

```bash
python3 generate_epub.py --input doc.md --output book.epub --title "My Book" --author "Author"
```

### youtube

Search YouTube and extract video transcripts using yt-dlp.

**Features:**

- Search YouTube videos
- Extract transcripts/subtitles
- Support for multiple languages

### gherkin-refine

Refines ambiguous user requests into structured Gherkin format (Given/When/Then) before implementation.

**Use when:**

- User requests are unclear or have multiple interpretations
- Need to confirm understanding before coding
- Want structured acceptance criteria

### claude-manager

Enable/disable skills based on project context. Reduce skill clutter for specific project types.

**Use when:**

- Working on frontend-only projects (disable backend skills)
- Want to reduce token usage from irrelevant skills
- Need to focus Claude on specific domain

### neobrutalism

Apply neobrutalism design patterns to web UI.

**Style characteristics:**

- Bold black borders
- Hard drop shadows
- Vibrant colors
- Raw, bold typography

### bun-fullstack-setup

Setup Bun server serving both API and static frontend on single port with Vite proxy in dev.

**Features:**

- Single port for API + static files
- Vite dev server proxy configuration
- Production build setup

## License

MIT

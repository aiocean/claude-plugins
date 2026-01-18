# Claude Code Plugin Marketplace

A collection of Claude Code plugins by aiocean.

## Installation

Add this marketplace:

```bash
/plugin marketplace add aiocean/claude-plugins
```

## Available Plugins

### worktree

Manage git worktrees for parallel development. Perfect for running multiple AI agents simultaneously on separate branches.

```bash
/plugin install worktree@aiocean-plugins
```

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

```bash
/plugin install mental-models@aiocean-plugins
```

**Volumes:**

- Volume 1: General Thinking (first principles, inversion, second-order thinking, etc.)
- Volume 2: Physics, Chemistry & Biology (leverage, activation energy, natural selection, etc.)
- Volume 3: Systems & Mathematics (feedback loops, compounding, power laws, etc.)
- Volume 4: Economics & Art (scarcity, incentives, narrative, etc.)

### reflect

Turn transient learnings into permanent improvements. Analyze Claude Code sessions to extract reusable knowledge.

```bash
/plugin install reflect@aiocean-plugins
```

**Extracts:**

- Corrections → CLAUDE.md rules (behavioral patterns)
- Preferences → CLAUDE.md rules (how user likes to work)
- Technical discoveries → new skills (reusable knowledge)

**Principles:**

- AI-first analysis (not regex patterns)
- Strengthen violated rules before adding new ones
- Quality gates for skill extraction
- Processed tracking to avoid re-analysis

### remove-bg

Remove background from images and trim transparent edges.

```bash
/plugin install remove-bg@aiocean-plugins
```

**Methods:**

- Threshold method (default) - Fast, for mono/simple images
- rembg method (`--rembg`) - AI-based, for complex images

**Usage:**

```bash
python3 ~/.claude/skills/remove-bg/remove_bg.py image.png
python3 ~/.claude/skills/remove-bg/remove_bg.py image.jpg --rembg
```

### epub-packing

Generate professional EPUB ebooks from Markdown files with auto-generated neo-brutalism covers.

```bash
/plugin install epub-packing@aiocean-plugins
```

**Features:**

- Multi-chapter support
- Auto-generated neo-brutalism covers
- 7 color schemes
- YAML frontmatter metadata

**Usage:**

```bash
python3 generate_epub.py --input doc.md --output book.epub --title "My Book" --author "Author"
```

### youtube

Search YouTube and extract video transcripts using yt-dlp.

```bash
/plugin install youtube@aiocean-plugins
```

**Features:**

- Search YouTube videos
- Extract transcripts/subtitles
- Support for multiple languages

### gherkin-refine

Refines ambiguous user requests into structured Gherkin format (Given/When/Then) before implementation.

```bash
/plugin install gherkin-refine@aiocean-plugins
```

**Use when:**

- User requests are unclear or have multiple interpretations
- Need to confirm understanding before coding
- Want structured acceptance criteria

### claude-manager

Enable/disable skills based on project context. Reduce skill clutter for specific project types.

```bash
/plugin install claude-manager@aiocean-plugins
```

**Presets:**

- `minimal` - Core skills only
- `frontend` - Core + frontend-design, neobrutalism
- `backend` - Core + pm2-dev, bun-fullstack-setup, cloudflare
- `ai` - Core + agent-sdk, mental-models, triumvirate
- `all` - Everything enabled

### neobrutalism

Apply neobrutalism design patterns to web UI.

```bash
/plugin install neobrutalism@aiocean-plugins
```

**The 6 Rules:**

1. Thick black borders (2-4px solid #000)
2. Hard shadows (`4px 4px 0 #000`, never blur)
3. Sharp corners (0px border-radius)
4. Vibrant colors (2-3 accent colors max)
5. Bold typography (weights 700-900)
6. No gradients (solid colors only)

### bun-fullstack-setup

Setup Bun server serving both API and static frontend on single port with Vite proxy in dev.

```bash
/plugin install bun-fullstack-setup@aiocean-plugins
```

**Features:**

- Single port for API + static files in production
- Vite dev server proxy configuration
- PM2 ecosystem config for development
- Multi-stage Docker build

## License

MIT

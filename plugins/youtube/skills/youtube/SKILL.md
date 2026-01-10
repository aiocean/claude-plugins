---
name: youtube
description: Search YouTube and extract video transcripts using yt-dlp. Use when user mentions YouTube, video search, transcript, subtitles, captions, or provides youtube.com/youtu.be URLs.
---
# YouTube

Scripts location: `~/.claude/skills/youtube/scripts/`

Call scripts with full path: `~/.claude/skills/youtube/scripts/yt-search "query"`

## Scripts

| Script | Usage | Description |
|--------|-------|-------------|
| `yt-search` | `yt-search "query" [N] [--date]` | Search N videos (default 5), --date sorts by date |
| `yt-transcript` | `yt-transcript "URL" [lang] [output]` | Get clean transcript (default: en, /tmp/transcript-clean.txt) |
| `yt-meta` | `yt-meta "URL" [--full]` | Get metadata, --full includes description/chapters |
| `yt-channel` | `yt-channel "@Name" [N]` | Get N recent videos from channel |
| `yt-playlist` | `yt-playlist "URL" [--duration]` | List videos, --duration shows total time |
| `yt-chapters` | `yt-chapters "URL"` | Get video chapters/timestamps |
| `yt-links` | `yt-links "URL" [--github]` | Extract links from description |

## Quick Examples

```bash
# Search
yt-search "react hooks tutorial" 10
yt-search "typescript 2025" --date

# Get transcript
yt-transcript "https://youtube.com/watch?v=xxx"
# Then read /tmp/transcript-clean.txt

# Video info
yt-meta "URL" --full
yt-chapters "URL"

# Channel/Playlist
yt-channel "@ThePrimeagen" 5
yt-playlist "PLAYLIST_URL" --duration
```

## Use Cases

### Summarize Video Before Watching

```bash
yt-meta "URL"
yt-transcript "URL"
# Read /tmp/transcript-clean.txt, provide:
# - Main topic, Key points (3-5), Who should watch, Skip recommendation
```

### Research a Topic

```bash
yt-search "topic" 5
# Pick 2-3 relevant videos, get transcripts
yt-transcript "URL1"
yt-transcript "URL2"
# Synthesize: consensus points, different perspectives, recommended deep-dive
```

### Extract Tutorial Steps

```bash
yt-chapters "URL"
yt-transcript "URL"
# Extract: Prerequisites, Step-by-step instructions, Common mistakes, Tips
```

### Compare Multiple Videos

```bash
yt-search "controversial topic" 8
# Get transcripts from different viewpoints
# Present: Position A, Position B, Disagreements, Agreements
```

### Programming Tutorial

```bash
yt-meta "URL" --full
yt-links "URL" --github
yt-transcript "URL"
# Extract: Code blocks, Dependencies, Config steps
```

## Errors

| Error | Fix |
|-------|-----|
| No subtitles for language | Script shows available languages |
| Private video | Not accessible |
| Age-restricted | Sign-in required |

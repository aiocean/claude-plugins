---
name: aio-youtube
description: Search YouTube and extract video transcripts via yt-dlp. Triggers: "search YouTube", "get transcript", "summarize video", "extract subtitles", youtube.com URLs, yt-dlp.
---

# YouTube

## Environment
- yt-dlp: !`which yt-dlp 2>/dev/null || echo "NOT INSTALLED"`
- jq: !`which jq 2>/dev/null || echo "NOT INSTALLED"`
- curl: !`which curl 2>/dev/null || echo "NOT INSTALLED"`
- Scripts: !`ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-youtube/*/skills/aio-youtube/scripts 2>/dev/null | sort -V | tail -1 || echo "NOT FOUND"`

```bash
YT="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-youtube/*/skills/aio-youtube/scripts 2>/dev/null | sort -V | tail -1)"
```

Then call scripts as: `$YT/yt-search "query"`

## Scripts

| Script          | Usage                                 | Description                                                   |
| --------------- | ------------------------------------- | ------------------------------------------------------------- |
| `yt-search`     | `yt-search "query" [N] [--date]`      | Search N videos (default 5), --date sorts by date             |
| `yt-transcript` | `yt-transcript "URL" [lang] [output]` | Get clean transcript (default: en, /tmp/transcript-clean.txt) |
| `yt-meta`       | `yt-meta "URL" [--full]`              | Get metadata, --full includes description/chapters            |
| `yt-channel`    | `yt-channel "@Name" [N]`              | Get N recent videos from channel                              |
| `yt-playlist`   | `yt-playlist "URL" [--duration]`      | List videos, --duration shows total time                      |
| `yt-chapters`   | `yt-chapters "URL"`                   | Get video chapters/timestamps                                 |
| `yt-links`      | `yt-links "URL" [--github]`           | Extract links from description                                |

## Quick Examples

```bash
# Resolve scripts path first
YT="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-youtube/*/skills/aio-youtube/scripts | sort -V | tail -1)"

# Search
$YT/yt-search "react hooks tutorial" 10
$YT/yt-search "typescript 2025" --date

# Get transcript
$YT/yt-transcript "https://youtube.com/watch?v=xxx"
# Then read /tmp/transcript-clean.txt

# Video info
$YT/yt-meta "URL" --full
$YT/yt-chapters "URL"

# Channel/Playlist
$YT/yt-channel "@ThePrimeagen" 5
$YT/yt-playlist "PLAYLIST_URL" --duration
```

## Use Cases

### Summarize Video Before Watching

```bash
$YT/yt-meta "URL"
$YT/yt-transcript "URL"
# Read /tmp/transcript-clean.txt, provide:
# - Main topic, Key points (3-5), Who should watch, Skip recommendation
```

### Research a Topic

```bash
$YT/yt-search "topic" 5
# Pick 2-3 relevant videos, get transcripts
$YT/yt-transcript "URL1"
$YT/yt-transcript "URL2"
# Synthesize: consensus points, different perspectives, recommended deep-dive
```

### Extract Tutorial Steps

```bash
$YT/yt-chapters "URL"
$YT/yt-transcript "URL"
# Extract: Prerequisites, Step-by-step instructions, Common mistakes, Tips
```

### Compare Multiple Videos

```bash
$YT/yt-search "controversial topic" 8
# Get transcripts from different viewpoints
# Present: Position A, Position B, Disagreements, Agreements
```

### Programming Tutorial

```bash
$YT/yt-meta "URL" --full
$YT/yt-links "URL" --github
$YT/yt-transcript "URL"
# Extract: Code blocks, Dependencies, Config steps
```

## Errors

| Error                     | Fix                              |
| ------------------------- | -------------------------------- |
| No subtitles for language | Script shows available languages |
| Private video             | Not accessible                   |
| Age-restricted            | Sign-in required                 |

# aio-youtube

**YouTube as a research and knowledge source, not just a video platform.**

A video is an hour of someone's expertise compressed into a URL. This plugin gives Claude the tools to extract that expertise — transcripts, metadata, chapters, channel histories, playlist inventories — and turn it into structured, actionable knowledge without requiring you to watch anything.

## Why this plugin?

YouTube holds a disproportionate amount of expert knowledge: conference talks, technical tutorials, interview deep-dives, live coding sessions. Most of it is locked behind video runtime. Transcripts change that. A 60-minute talk becomes a 10,000-word document that can be summarized in 30 seconds, searched for specific claims, or compared against three other talks on the same topic.

The plugin wraps `yt-dlp` with purpose-built scripts for each retrieval pattern, so Claude doesn't have to assemble raw CLI commands. Search, extract, synthesize — in one conversation.

## Install

```bash
/plugin install aio-youtube@aiocean-plugins
```

## Skills

### aio-youtube

Seven scripts, each optimized for a specific retrieval task:

| Script | What it does |
|--------|--------------|
| `yt-search` | Search YouTube by keyword, return N results, optionally sorted by date |
| `yt-transcript` | Extract and clean the full transcript of any video (default: English) |
| `yt-meta` | Title, duration, view count, upload date — with `--full` for description and chapters |
| `yt-channel` | List the N most recent videos from a channel by handle |
| `yt-playlist` | List all videos in a playlist, optionally with total duration |
| `yt-chapters` | Extract chapter timestamps for navigating long-form content |
| `yt-links` | Extract URLs from the video description, with `--github` to filter for repos |

## What this enables

**Research synthesis.** Search a topic, pull transcripts from the top 3-5 results, identify consensus and disagreement. Faster and more reliable than skimming thumbnails and hoping the first result is accurate.

**Pre-watch triage.** Before investing an hour in a talk, get the metadata and a transcript summary. Decide in 60 seconds whether it covers what you need.

**Tutorial extraction.** Chapters give you the skeleton. The transcript gives you every step, dependency, and command the presenter mentioned — including the ones they glossed over in the video.

**Channel monitoring.** Pull the 10 most recent videos from a channel, scan titles and transcripts, surface anything relevant without manually checking for updates.

**Description mining.** Technical videos often link to repos, papers, slides, and tools in the description. `yt-links` extracts all of them, or just the GitHub links.

## Requirements

- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) — install via `brew install yt-dlp` or `pip install yt-dlp`
- `jq`
- `curl`

---
name: aio-browser-cookie
description: Extract cookies from local browsers (Chrome/Firefox/Safari) and export them as JSON or Netscape format for authenticated requests. Triggers: "extract browser cookies", "reuse browser session", "export cookies", "cookie jar", rookiepy.
---

# Browser Cookie

## Environment
- python3: !`which python3 2>/dev/null || echo "NOT INSTALLED"`
- rookiepy: !`python3 -c "import rookiepy" 2>/dev/null && echo "installed" || echo "NOT INSTALLED — pip3 install -U rookiepy"`
- Scripts: !`ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-browser-cookie/*/skills/aio-browser-cookie 2>/dev/null | sort -V | tail -1 || echo "NOT FOUND"`

Use this skill to extract cookies from local browsers with `rookiepy`, export them as JSON or Netscape, or replay an authenticated request with the extracted session.

```bash
BCOOKIE="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-browser-cookie/*/skills/aio-browser-cookie 2>/dev/null | sort -V | tail -1)"
```

Then run:

```bash
python3 "$BCOOKIE/scripts/rookie_tool.py" ...
```

## Quick Start

```bash
# Check environment and rookiepy availability
python3 "$BCOOKIE/scripts/rookie_tool.py" doctor

# Show supported browser loaders on this machine
python3 "$BCOOKIE/scripts/rookie_tool.py" list

# Extract cookies for one browser and one domain
python3 "$BCOOKIE/scripts/rookie_tool.py" extract --browser chrome --domain github.com

# Export Netscape cookies for curl / yt-dlp / wget style tooling
python3 "$BCOOKIE/scripts/rookie_tool.py" extract \
  --browser brave \
  --domain github.com \
  --format netscape \
  --output /tmp/github.cookies

# Replay a request using the browser session
python3 "$BCOOKIE/scripts/rookie_tool.py" request \
  --browser chrome \
  --domain github.com \
  --url https://github.com/settings/profile
```

## Commands

| Command | Purpose |
| --- | --- |
| `doctor` | Check Python, platform, `rookiepy`, and available browser loaders |
| `list` | Print supported browser loaders on the current platform |
| `extract` | Load cookies and print/export them as `json`, `netscape`, or `header` |
| `request` | Send an HTTP request with cookies loaded from a browser session |

## Source Selection

Use exactly one source per command:

- `--browser chrome`
- `--browser firefox`
- `--browser safari`
- `--path /path/to/Cookies --key-path /path/to/Local\ State`
- omit both `--browser` and `--path` to let `rookiepy.load()` scan all supported browsers

Supported browser names depend on platform, but commonly include:

- `arc`
- `brave`
- `chrome`
- `chromium`
- `edge`
- `firefox`
- `librewolf`
- `opera`
- `opera-gx`
- `vivaldi`
- `zen`
- `safari` on macOS
- `internet-explorer` and `octo-browser` on Windows

## Common Patterns

### Export cookie header for another tool

```bash
python3 "$BCOOKIE/scripts/rookie_tool.py" extract \
  --browser chrome \
  --domain example.com \
  --format header
```

### Save cookies for curl

```bash
python3 "$BCOOKIE/scripts/rookie_tool.py" extract \
  --browser chrome \
  --domain example.com \
  --format netscape \
  --output /tmp/example.cookies

curl --cookie /tmp/example.cookies https://example.com/account
```

### Replay an authenticated API call

```bash
python3 "$BCOOKIE/scripts/rookie_tool.py" request \
  --browser brave \
  --domain app.example.com \
  --url https://app.example.com/api/me \
  --header 'Accept: application/json'
```

## Install

If `doctor` reports that `rookiepy` is missing:

```bash
pip3 install -U rookiepy
```

## Gotchas

- Chromium-based browsers on Linux or macOS may trigger a keychain or wallet prompt when cookies are decrypted.
- Chrome session cookies can depend on a temporary browser restart done by rookie; they can expire again after the browser closes.
- Safari cookie access on macOS may require `Full Disk Access` for the terminal app.
- Newer Chrome versions on Windows may require admin rights for app-bound encrypted cookies.
- Treat exported cookies as secrets. Do not paste them into chat or commit them.

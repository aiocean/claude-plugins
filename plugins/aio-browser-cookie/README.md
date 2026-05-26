# aio-browser-cookie

Your browser already holds the session you need. This plugin extracts it.

When you need to make authenticated requests from Claude — scraping a page you're logged into, replaying an API call, feeding cookies to curl, yt-dlp, or wget — the usual path is tedious: open DevTools, copy cookies one by one, format them correctly, hope nothing expired. This plugin short-circuits that entirely. It reads the local cookie store of Chrome, Firefox, Safari, Brave, Arc, or a dozen other Chromium variants directly, then hands you the session in whatever format your tool expects.

The underlying library is [rookiepy](https://github.com/thewh1teagle/rookiepy), which handles the platform-specific decryption (keychain on macOS, libsecret on Linux, DPAPI on Windows). You point it at a browser and a domain; it returns the live session.

## Install

```bash
/plugin install aio-browser-cookie@aiocean-plugins
```

## What the skill does

**Extraction.** Pull cookies for any domain from any supported browser and print them as JSON, a `Cookie:` header string, or Netscape format (the format curl, wget, and yt-dlp understand).

**Request replay.** Send an HTTP request with the extracted session injected automatically — useful for testing what an authenticated page returns without leaving Claude.

**Doctor check.** Verify that Python, rookiepy, and the available browser loaders are all present before attempting extraction.

Trigger phrases: "extract browser cookies", "reuse browser session", "export cookies", "chrome cookies", "firefox cookies", "netscape cookie jar", "authenticated request".

## Quick example

```bash
# Save cookies for curl
python3 "$BCOOKIE/rookie_tool.py" extract \
  --browser chrome \
  --domain example.com \
  --format netscape \
  --output /tmp/example.cookies

curl --cookie /tmp/example.cookies https://example.com/account
```

## Requirements

- Python 3
- `pip3 install -U rookiepy`

On macOS, Safari may require Full Disk Access for the terminal. Chromium-based browsers may trigger a keychain prompt during decryption. Treat exported cookies as secrets — do not paste them into chat or commit them to version control.

# aio-boox

Push books and documents to an Onyx BOOX e-reader, and manage the account's push list, library, and notes, straight from the terminal. Talks to the BOOX cloud API directly through a zero-dependency Node CLI (`boox.mjs`). No web UI, no send2boox email, no BooxDrop Wi-Fi.

## What it does

`send-book` performs the same three steps the web app does: upload the file to Aliyun OSS, write a `digital_content` document into the device's sync channel, then call `saveAndPush` so the device downloads it. Other subcommands list or remove push-list items, list/remove/restore library books and notes, and show device online status.

## Requirements

- Node.js (the CLI uses built-ins only, no npm install)
- A BOOX cloud account. Authentication is a long-lived JWT read from the `BOOX_TOKEN` environment variable, or from the file named by `BOOX_TOKEN_FILE`.
- The target device must be online at push time for delivery to complete.

## Install

```bash
/plugin install aio-boox@aiocean-plugins
```

## Usage

```bash
B="${CLAUDE_PLUGIN_ROOT}/skills/aio-boox/scripts/boox.mjs"
node $B whoami                 # logged-in account + storage
node $B device                 # registered devices + online status
node $B send-book book.epub    # upload + push to the device
node $B list-push 20           # items in the device Push List
node $B get-notes 20           # synced notes
```

Example prompts:

- "Gửi cuốn `dune.epub` lên BOOX của tôi."
- "Is my BOOX online? Show the push list."
- "List the notes synced from my BOOX and remove the one named 'draft'."

Removal commands are permanent by default; pass `--soft` where supported to use the recycle bin.

## Layout

```
skills/aio-boox/
├── SKILL.md            # subcommands, auth, delivery caveats
└── scripts/boox.mjs    # self-contained CLI
```

---
title: "Send books to your BOOX from the terminal"
description: "Set up the aio-boox plugin: grab your push.boox.com token from the browser once, then push EPUBs/PDFs to your Onyx BOOX e-reader and read its notes straight from Claude Code — no web UI, no email, no BooxDrop."
document_type: "guide"
created: "2026-07-13"
updated: "2026-07-13"
weight: 25
tags: ["aio-boox", "boox", "onyx", "e-reader", "epub", "push", "e-ink"]
---

# Send books to your BOOX from the terminal

Onyx gives you three official ways to get a file onto a BOOX e-reader: the
push.boox.com web UI, the send2boox email bridge, and BooxDrop over local
WiFi. All three want you out of the terminal.

The [aio-boox](/plugins/aio-boox) plugin talks to the BOOX cloud API
directly — the exact three-step flow the web app performs (upload to
storage, register in the device's sync channel, wake the device) — wrapped
in a single zero-dependency Node CLI. Once it's set up, "push this epub to
my boox" is something you say to Claude mid-session, and the file lands in
the device's Push List seconds later.

One-time setup is the only part with any friction, and it's a browser
visit: the API authenticates with the same token your logged-in browser
session holds, and you need to copy it out once. This guide walks through
that, then the daily workflow, then the one delivery gotcha everyone hits.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) with the aiocean
  marketplace added ([two commands](/guides/install-claude-plugins))
- Node.js 18+ (`node --version`) — the CLI uses only Node built-ins
- A BOOX account that your device is signed into (check on the device
  under **Settings → Accounts**)

Install the plugin:

```
/plugin install aio-boox@aiocean-plugins
```

## Step 1 — log in on the browser and copy your token

The BOOX cloud has no API-key page and no OAuth flow for third parties.
The web app authenticates every request with a long-lived JWT it keeps in
`localStorage` — so you log in once in a browser and copy that token out.

1. Open [push.boox.com](https://push.boox.com) and sign in with the
   **same account your device uses** (Google, email, or phone — whatever
   you used on the device).
2. Open DevTools (`F12`, or `Cmd`+`Option`+`I` on macOS) and go to the
   **Console** tab.
3. Run:

   ```js
   copy(localStorage.token)
   ```

   The token is now in your clipboard. (No Console access? **Application**
   tab → **Local Storage** → `https://push.boox.com` → copy the value of
   the `token` key.)

4. Save it where the CLI looks by default:

   ```sh
   mkdir -p ~/.config/boox
   pbpaste > ~/.config/boox/token        # macOS; Linux: xclip -o > ~/.config/boox/token
   ```

   That's the whole setup — the CLI reads `~/.config/boox/token`
   (`$XDG_CONFIG_HOME/boox/token` if you set that) on its own. Prefer a
   different location? Point `BOOX_TOKEN_FILE` at it. Prefer no file at
   all? `export BOOX_TOKEN="eyJ..."` works too, just slightly easier to
   leak into shell history.

Treat the token like a password: it is full access to your BOOX cloud —
books, notes, device push. Don't commit it, don't paste it into issues.

The token lives ~6 months. When it expires the CLI starts getting auth
errors; fix is the same browser round-trip — log in, copy, overwrite the
file.

**Chinese-mainland accounts**: your cloud is a different deployment. Use
[send2boox.com](https://send2boox.com) for the login instead, and also add
`export BOOX_HOST=https://send2boox.com`.

## Step 2 — sanity check

In a Claude Code session:

> is my boox online?

Claude runs the plugin's `whoami` and `device` commands and shows your
account, storage quota, registered devices, and their last-login times.
If `whoami` returns your email, auth works — that's the whole setup done.

## Step 3 — push a book

> push ~/Downloads/thinking-in-systems.epub to my boox

Under the hood the CLI uploads the file to BOOX's cloud storage, registers
it in your device's sync channel, and fires the push notification. On the
device, the file appears in **Apps → Transfer (互传) → Push List** and
starts downloading.

Push the same filename twice and the cloud auto-renames the second copy
(`foo.epub` → `foo(1).epub`), same as the web app — no overwrites.

## The one gotcha: the device must be online *at push time*

The push is a wake-up call, not a mailbox. If the device is asleep or
offline when you send, the file still lands correctly in the cloud Push
List — but the wake never reaches the device, so nothing downloads. It
just sits there.

Two things to know:

- The `device` command's `online` flag is unreliable. Look at
  `latestLoginTime` instead — if it's hours old, the device is not
  actually connected, whatever the flag says.
- **Don't re-upload.** Wake the device (open the Transfer app so it
  reconnects), then tell Claude to *repush* — that re-fires only the
  notification for the file already in the cloud, and it drops onto the
  device immediately.

So the practical flow is: push whenever, and if the book doesn't appear,
pick up the device, open Transfer, and say "repush it".

## Beyond pushing: library and notes

The same token reads the rest of your BOOX cloud, so you can also ask
Claude to:

- **list the push list** — what's been sent, with sizes and dates
- **list books** — your cloud Library
- **get notes** — notebooks synced from the device (read-only; titles and
  structure, not handwriting strokes)
- **remove** a pushed file, book, or note

Deletion is deliberately guarded, because it hits your real account:

- Every remove is a **dry run by default** — it prints what would be
  deleted and stops until you confirm.
- Book/note removal is **permanent by default**; there's a `--soft` flag
  for the recycle bin (restorable later). Push-list items have no recycle
  bin at all.
- A deleted item can linger in list output for a few seconds — the cloud
  sync lags slightly behind writes. Re-run the list before assuming a
  delete failed.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Auth/401 errors on every command | Token expired (~6-month life) or copied incompletely | Re-copy `localStorage.token` from a logged-in push.boox.com tab |
| `whoami` works but the wrong library shows up | Logged into a different BOOX account in the browser than on the device | Re-login on push.boox.com with the device's account, re-copy token |
| Pushed file never appears on the device | Device was offline at push time | Wake the device, open the Transfer app, ask Claude to repush |
| Everything fails and your account is Chinese-mainland | Wrong deployment | `export BOOX_HOST=https://send2boox.com` and grab the token from send2boox.com |

## Using the CLI without Claude

The whole plugin is one self-contained script — `boox.mjs`, Node built-ins
only. If you want it in a cron job or plain shell, grab it from the
[repo](https://github.com/aiocean/claude-plugins/tree/main/plugins/aio-boox)
and run it directly:

```sh
node boox.mjs whoami
node boox.mjs send-book book.epub
node boox.mjs repush book
node boox.mjs list-push
```

Same token, same environment variables, no Claude required.

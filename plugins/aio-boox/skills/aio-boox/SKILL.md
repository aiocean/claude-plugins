---
name: aio-boox
description: "Push books/docs and read notes from an Onyx BOOX e-reader account (push.boox.com / send2boox.com) WITHOUT the web UI, via the self-contained `boox.mjs` CLI. Uploads a file to Aliyun OSS, writes a digital_content doc into the device's MESSAGE sync channel, and calls saveAndPush to notify the device — the exact 3-step flow the web app performs. Also lists the push list, lists synced notes, removes pushed items, and shows device online status. Auth = long-lived JWT via BOOX_TOKEN env or a token file."
when_to_use: 'Use khi user muốn gửi sách/tài liệu lên máy đọc BOOX hoặc thao tác với tài khoản BOOX cloud: "gửi sách lên boox", "push <file> lên boox", "send to boox", "send book to my boox", "đẩy epub/pdf sang máy đọc", "boox đang online không", "xem push list của boox", "list notes trên boox", "lấy note từ boox", "xoá file đã push", "/boox". KHÔNG dùng cho send2boox email-push (đây là API-direct, không qua email). KHÔNG dùng cho local-WiFi BooxDrop.'
argument-hint: "<file to push, or subcommand like list-push / get-notes / device>"
effort: medium
---

# boox — Onyx BOOX cloud CLI (API-direct)

Send a book/doc to your BOOX device, or read its synced notes, straight
from the terminal — no browser, no BooxDrop WiFi, no send2boox email. Wraps `boox.mjs`
(Node built-ins only, zero npm deps).

```bash
B="${CLAUDE_PLUGIN_ROOT}/skills/aio-boox/scripts/boox.mjs"
node $B whoami                    # logged-in account + storage
node $B device                    # registered devices + online status

node $B send-book <file>          # upload + push a book/doc to your device(s)
node $B repush <name-substr>      # re-fire the device-wake for a file already on the cloud (no re-upload)
node $B list-push [n]             # items in the device Push List
node $B remove <name-substr>      # delete push-list item(s) — permanent (no recycle bin)

node $B list-books [n]            # active books in the cloud Library
node $B remove-book <substr>      # delete book(s);  default HARD/permanent;  --soft = recycle
node $B restore-book <substr>     # restore book(s) from recycle bin

node $B get-notes [n]             # active notes
node $B remove-note <substr>      # delete note(s)/folder(s); default HARD; --soft = recycle
node $B restore-note <substr>     # restore note(s) from recycle bin
```

`send-book` lands the file in **BOOX device → Apps → Transfer (互传) → Push List**.
Name collisions auto-dedup (`foo.epub` → `foo(1).epub`), same as the web app.

### Delivery depends on the device being ONLINE at push time — not on any payload param

`saveAndPush` **auto-resolves the target device server-side** — its response echoes back the
account's `mac` + `deviceModel` (`pushNum:1`). So there is **no missing device/mac/imAccount
parameter** to add; the CLI payload is structurally complete and identical to the web app's.

The real failure mode is **timing**: if the device is offline/asleep when you send (the
`device` command's `online` flag is unreliable — check `latestLoginTime`; a stale login means it
is not actually connected), the file lands correctly in the cloud push list but the wake never
reaches the sleeping device, so it does **not** auto-download. It just sits in the list.

**Fix — don't re-upload, just `repush`:** once the device is on (open the Transfer app so it
logs into Onyx), run `repush <name-substr>` to re-fire only the `saveAndPush` wake for the file
already on the cloud. It pings the now-online device and the file drops in. (The server logs a
fresh push event and numbers the display name if one exists — harmless, same OSS object.)
So: `device` looks stale → `send-book` anyway → tell the user to wake the device → `repush`.

## Deleting (read the model — book & note status are inverse)

| Surface | Active | Soft-delete (recycle) | Hard / permanent |
|---|---|---|---|
| **Push list** (MESSAGE) | — | *(no recycle bin)* | `remove` → SG `DELETE` + `push/message/batchDelete` |
| **Book** (READER_LIBRARY, `modeType=4`) | `status=0` | `status=1` | `_deleted:true` on metadata + annotations/bookmarks/collections |
| **Note** (NOTE_TREE tree doc) | `status=1, enabled=true` | `status=0, enabled=false` | `_deleted:true` on tree doc + page-record (`commitId`) docs |

- **`remove-book` / `remove-note` default to HARD (permanent)**. Add `--soft` for the recycle bin (restorable via `restore-*`).
- **Both are dry-run by default** — they print what would be deleted; add `--yes` to execute. Hard delete is irreversible.
- `remove-note` expands a matched **folder** to its descendants (recursive). Hard note-delete tombstones the SG docs; the OSS handwriting resources under `<uid>/<noteId>` are left orphaned (harmless storage, not reclaimed).
- Books in Library carry a device path (`idString=/storage/...`), not an OSS object — there's **no `cloudFiles` DELETE endpoint** (`/api/1/cloudFiles` is GET-only); book deletion is the SG `removeMetadata` / `deleteMetadataAndRelated` path.
- **Sync Gateway `_changes` lags a few seconds** behind a write. Writes (`_bulk_docs`) are immediate, but a `list`/`restore` run *instantly* after a delete may read a stale view — wait a moment or re-run.

## Auth

- **JWT** read from `BOOX_TOKEN` env, else the file at `BOOX_TOKEN_FILE`
  (default `~/compass/supremor/secret/boox/token`). Long-lived (~6 months). It is the value of
  `localStorage.token` on push.boox.com — re-grab from a logged-in browser when it expires.
- **Sync Gateway** session cookie is fetched on demand from `/api/1/users/syncToken`
  (the script handles this; no separate secret).
- Region default = **US** (`https://push.boox.com`). For CN set `BOOX_HOST=https://send2boox.com`.

## How it works (verified end-to-end against the live system)

Onyx splits state across three backends, all under `push.boox.com`:

| Concern | Mechanism |
|---|---|
| Account / config / push-notify | REST `…/api/1/*`, header `Authorization: Bearer <JWT>` |
| Books, notes, push-list, screensavers | **Couchbase Sync Gateway** at `…/neocloud` (one shared bucket), cookie `SyncGatewaySession`. Per-user/per-type docs isolated by **channel**: `<uid>-MESSAGE` (push list), `<uid>-NOTE_TREE` (notes). Read via `_changes?filter=sync_gateway/bychannel&channels=<ch>` — never `_all_docs` (the bucket spans all users and times out). |
| File bytes | **Aliyun OSS** bucket `onyx-cloud-us` (`oss-us-west-1`). Temp STS creds from `/api/1/config/stss` (~30 min TTL). Object key = `<uid>/push/<id>.<ext>`. |

**send-book is dual-path** (both fire, mirrors the web app — confirmed by intercepting a real push):

1. `GET /api/1/config/stss` → STS creds → **PUT** file to OSS (`onyx-cloud-us.oss-us-west-1.aliyuncs.com/<uid>/push/<id>.<ext>`). Signed with OSS V1 (HMAC-SHA1) — implemented in pure Node `crypto`, no `ali-oss` dep.
2. **PUT** a `digital_content` doc into `/neocloud/<guid>` (channel `<uid>-MESSAGE`). The `content` field is a JSON string holding `storage.<ext>.oss.{key,url,size}`. This is what makes the file appear in the device Push List.
3. `POST /api/1/push/saveAndPush` `{data:{resourceKey,bucket:"onyx-cloud",resourceType,…}, cbMsg:{id,rev}}` — registers it cloud-side + wakes the device.

`remove` reverses 2+3: `DELETE /neocloud/<id>?rev=<rev>` + `POST /api/1/push/message/batchDelete {ids}`.

## Notes on scope

- **get-notes** reads the `NOTE_TREE` channel. Note pages are handwriting/record docs
  (`recordType`, `recordFilePath`); the human-named entries carry `title`. Read-only — this
  skill does not yet write notes back.
- **PushRead** in the web app is an RSS-subscription feature (`webpage_content` docs in the
  MESSAGE channel), not a one-shot URL push. Out of scope here.
- All write operations hit a real device. `send-book` and `remove` mutate the cloud + device;
  confirm intent before bulk `remove`.

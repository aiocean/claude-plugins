#!/usr/bin/env node
// boox.mjs — Onyx BOOX cloud CLI (push.boox.com / send2boox.com)
// Self-contained: Node built-ins only (no npm deps). OSS V1 signing via crypto.
//
// Reverse-engineered from push.boox.com SPA. Architecture:
//   - REST API:  https://push.boox.com/api/1/*        auth: Authorization: Bearer <JWT>
//   - Sync DB:   https://push.boox.com/neocloud        Couchbase Sync Gateway (one shared bucket)
//                auth: Cookie SyncGatewaySession=<id> from /api/1/users/syncToken
//                per-user/per-type docs filtered by channel: <uid>-MESSAGE, <uid>-NOTE_TREE, ...
//   - Files:     Aliyun OSS bucket onyx-cloud-us (oss-us-west-1), STS creds from /api/1/config/stss
//
// send-book = upload + DELIVER (mirrors the web app, verified via network capture 2026-06-12):
//   1. PUT file to OSS at key  <uid>/push/<id>.<ext>
//   2. write a digital_content doc into the <uid>-MESSAGE channel (shows in device Push List)
//   3. DELIVER: bump the doc to a NEW revision via Sync Gateway (check:false + fresh updatedAt).
//      The new channel change is what the device's live replication picks up and downloads —
//      THIS is the real "push" (it's what the web "Re-push" button does). saveAndPush alone does NOT.
//   4. POST /api/1/push/saveAndPush  (best-effort: registers the push event server-side; non-fatal)

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const HOST = process.env.BOOX_HOST || 'https://push.boox.com' // US region. CN: https://send2boox.com
const TOKEN_FILE =
  process.env.BOOX_TOKEN_FILE ||
  path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'boox', 'token')

function token() {
  if (process.env.BOOX_TOKEN) return process.env.BOOX_TOKEN.trim()
  try {
    return fs.readFileSync(TOKEN_FILE, 'utf8').trim()
  } catch {
    die(`No token. Set BOOX_TOKEN or write the JWT to ${TOKEN_FILE}`)
  }
}

function die(msg) {
  console.error('ERROR: ' + msg)
  process.exit(1)
}

const MIME = {
  epub: 'application/epub+zip', pdf: 'application/pdf', mobi: 'application/x-mobipocket-ebook',
  azw3: 'application/vnd.amazon.ebook', txt: 'text/plain', cbz: 'application/x-cbz',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
}
const hex32 = () => crypto.randomUUID().replace(/-/g, '')

// ---- REST ----
async function api(p, { method = 'GET', body, soft = false } = {}) {
  const r = await fetch(HOST + p, {
    method,
    headers: {
      Authorization: 'Bearer ' + token(),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await r.text()
  let j
  try { j = JSON.parse(txt) } catch { j = txt }
  if (!r.ok) {
    if (soft) { console.error(`warn: ${method} ${p} → ${r.status}: ${txt.slice(0, 200)}`); return null }
    die(`${method} ${p} → ${r.status}: ${txt.slice(0, 300)}`)
  }
  return j
}

let _me
async function me() {
  if (!_me) _me = (await api('/api/1/users/me')).data
  return _me
}

// ---- Sync Gateway ----
let _sgCookie
async function syncCookie() {
  if (_sgCookie) return _sgCookie
  const d = (await api('/api/1/users/syncToken')).data
  _sgCookie = `${d.cookie_name}=${d.session_id}`
  return _sgCookie
}
async function sg(p, { method = 'GET', body } = {}) {
  const r = await fetch(HOST + '/neocloud' + p, {
    method,
    headers: {
      Cookie: await syncCookie(),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await r.text()
  let j
  try { j = JSON.parse(txt) } catch { j = txt }
  if (!r.ok) die(`SG ${method} ${p} → ${r.status}: ${txt.slice(0, 300)}`)
  return j
}
// read docs in a channel via _changes (the shared bucket is too large for _all_docs)
async function channelDocs(channel, limit = 50) {
  const q = `/_changes?filter=sync_gateway/bychannel&channels=${encodeURIComponent(channel)}&include_docs=true&limit=${limit}&style=main_only`
  const j = await sg(q)
  return (j.results || []).map((r) => r.doc).filter(Boolean)
}
// bulk update/delete docs through the Sync Gateway (_bulk_docs). Each doc must
// carry its current _id + _rev; set _deleted:true to tombstone, or mutated fields to update.
async function sgBulk(docs) {
  if (!docs.length) return []
  const res = await sg('/_bulk_docs', { method: 'POST', body: { docs } })
  const bad = (Array.isArray(res) ? res : []).filter((r) => r.error)
  if (bad.length) die(`_bulk_docs: ${bad.length} failed e.g. ${JSON.stringify(bad[0])}`)
  return res
}

// ---- Aliyun OSS (V1 signature, STS) ----
const BUCKET = 'onyx-cloud-us'
const OSS_HOST = `${BUCKET}.oss-us-west-1.aliyuncs.com`
async function ossPut(key, buf, contentType, sts) {
  const date = new Date().toUTCString()
  const canonHeaders = `x-oss-security-token:${sts.SecurityToken}\n`
  const stringToSign = `PUT\n\n${contentType}\n${date}\n${canonHeaders}/${BUCKET}/${key}`
  const sig = crypto.createHmac('sha1', sts.AccessKeySecret).update(stringToSign).digest('base64')
  const r = await fetch(`https://${OSS_HOST}/${key}`, {
    method: 'PUT',
    headers: {
      Date: date,
      'Content-Type': contentType,
      Authorization: `OSS ${sts.AccessKeyId}:${sig}`,
      'x-oss-security-token': sts.SecurityToken,
    },
    body: buf,
  })
  if (!r.ok) die(`OSS PUT ${key} → ${r.status}: ${(await r.text()).slice(0, 400)}`)
}
// presigned GET url (what the device uses to download)
function ossSignedUrl(key, sts, expiresSec = 7 * 24 * 3600) {
  const expires = Math.floor(Date.now() / 1000) + expiresSec
  const resource = `/${BUCKET}/${key}?security-token=${sts.SecurityToken}`
  const stringToSign = `GET\n\n\n${expires}\n${resource}`
  const sig = crypto.createHmac('sha1', sts.AccessKeySecret).update(stringToSign).digest('base64')
  const qs = new URLSearchParams({
    OSSAccessKeyId: sts.AccessKeyId,
    Expires: String(expires),
    Signature: sig,
    'security-token': sts.SecurityToken,
  })
  return `https://${OSS_HOST}/${key}?${qs}`
}

// re-sign a fresh presigned OSS GET url into a content obj's storage. Presigned urls + STS creds
// expire, so re-delivering an older push needs a fresh url for the device to download.
async function refreshContentUrl(content) {
  const ext = content?.formats?.[0]
  const key = content?.storage?.[ext]?.oss?.key
  if (!key) return content
  const sts = (await api('/api/1/config/stss')).data
  content.storage[ext].oss.url = ossSignedUrl(key, sts)
  content.storage[ext].oss.expires = 0
  return content
}

// DELIVER — the step that actually reaches the device (verified: this is what the web "Re-push"
// button does, NOT saveAndPush). Bump the digital_content doc to a new revision (check:false +
// fresh updatedAt) through the Sync Gateway. The new revision emits a fresh change on the
// <uid>-MESSAGE channel, which the device's live replication picks up and downloads.
async function deliverDoc(doc, content) {
  const now = Date.now()
  const updated = {
    ...doc,
    content: content ? JSON.stringify({ ...content, updatedAt: now }) : doc.content,
    check: false,
    updatedAt: now,
  }
  delete updated._revisions
  const res = await sgBulk([updated]) // new_edits=true → SG assigns a new rev → new channel change
  return res[0]?.rev
}

// dedup name within the MESSAGE channel: foo.epub -> foo(1).epub
async function uniqueName(uid, name) {
  const docs = await channelDocs(`${uid}-MESSAGE`, 10000)
  const names = new Set(
    docs.map((d) => { try { return JSON.parse(d.content).name } catch { return null } }).filter(Boolean),
  )
  if (!names.has(name)) return name
  const ext = name.slice(name.lastIndexOf('.'))
  let base = name.slice(0, name.lastIndexOf('.'))
  base = base.replace(/\(\d+\)$/, '')
  let i = 1
  while (names.has(`${base}(${i})${ext}`)) i++
  return `${base}(${i})${ext}`
}

// ============ commands ============
async function cmdDevice() {
  const d = (await api('/api/1/users/getDevice')).data
  for (const dev of d)
    console.log(`${dev.model} (id ${dev.id}) — ${dev.loginStatus} — last login ${dev.latestLoginTime}`)
}

async function cmdSendBook(file) {
  if (!file || !fs.existsSync(file)) die(`file not found: ${file}`)
  const buf = fs.readFileSync(file)
  const orig = path.basename(file)
  const ext = orig.slice(orig.lastIndexOf('.') + 1).toLowerCase()
  const ct = MIME[ext] || 'application/octet-stream'
  const u = await me()
  const uid = u.uid
  const name = await uniqueName(uid, orig)
  const now = Date.now()
  const guid = hex32()
  const key = `${uid}/push/${hex32()}.${ext}`

  // 1. upload to OSS
  const sts = (await api('/api/1/config/stss')).data
  await ossPut(key, buf, ct, sts)
  const url = ossSignedUrl(key, sts)

  // 2. write digital_content doc into <uid>-MESSAGE channel
  const content = {
    _id: guid, guid, createdAt: now, updatedAt: now, distributeChannel: 'onyx',
    formats: [ext], name, ownerId: uid, size: buf.length, md5: '',
    storage: { [ext]: { oss: { displayName: name, expires: 0, key, provider: 'oss', size: buf.length, url } } },
  }
  const doc = {
    _id: guid, contentType: 'digital_content', content: JSON.stringify(content),
    msgType: 2, dbId: `${uid}-MESSAGE`, user: uid, name, size: buf.length,
    uniqueId: guid, createdAt: now, updatedAt: now, check: false,
  }
  const put = await sg(`/${guid}`, { method: 'PUT', body: doc })

  // 3. DELIVER — bump the doc to a new rev (what the web "Re-push" does + what reaches the device)
  const rev = await deliverDoc({ ...doc, _rev: put.rev }, content)

  // 4. best-effort: register the push event server-side (non-fatal — delivery already happened)
  await api('/api/1/push/saveAndPush', {
    method: 'POST',
    soft: true,
    body: {
      data: { name, resourceDisplayName: name, resourceKey: key, bucket: 'onyx-cloud', resourceType: ext, title: name, parent: null },
      cbMsg: { id: guid, rev: rev || put.rev },
    },
  })
  console.log(`✓ delivered "${name}" (${buf.length} bytes) → ${u.nickname}'s device(s)`)
  console.log(`  doc ${guid} rev ${rev || put.rev} | key ${key}`)
}

// re-DELIVER a file already on the cloud (no re-upload): re-sign a fresh OSS url and bump the
// digital_content doc to a new revision via Sync Gateway. The new <uid>-MESSAGE channel change
// is what the device's live replication picks up and downloads — the verified real deliver path
// (the web "Re-push" button does exactly this; saveAndPush alone does NOT reach the device).
async function cmdRepush(match) {
  if (!match) die('usage: repush <name-substring>')
  const uid = (await me()).uid
  const docs = await channelDocs(`${uid}-MESSAGE`, 10000)
  const hits = docs.filter((d) => {
    if (d.contentType !== 'digital_content') return false
    let c = {}; try { c = JSON.parse(d.content) } catch {}
    return (c.name || c.title || d.name || '').includes(match)
  })
  if (!hits.length) die(`no push item matching "${match}" — the file must already be on the cloud (run send-book first)`)
  for (const d of hits) {
    let c = {}; try { c = JSON.parse(d.content) } catch {}
    const name = c.name || c.title || d.name
    const ext = (c.formats && c.formats[0]) || name.slice(name.lastIndexOf('.') + 1).toLowerCase()
    const key = c.storage?.[ext]?.oss?.key
    if (!key) die(`"${name}" has no OSS key in its content doc — cannot repush`)
    await refreshContentUrl(c)          // re-sign a fresh OSS url (old presigned urls expire)
    const rev = await deliverDoc(d, c)  // bump the doc → new channel change → device pulls
    // best-effort: register the push event server-side (non-fatal)
    await api('/api/1/push/saveAndPush', {
      method: 'POST',
      soft: true,
      body: {
        data: { name, resourceDisplayName: name, resourceKey: key, bucket: 'onyx-cloud', resourceType: ext, title: name, parent: null },
        cbMsg: { id: d._id, rev: rev || d._rev },
      },
    })
    console.log(`✓ re-delivered "${name}" → device(s) — doc bumped + fresh url`)
  }
}

async function cmdListPush(limit = 30) {
  const uid = (await me()).uid
  const docs = await channelDocs(`${uid}-MESSAGE`, 10000)
  const rows = docs
    .map((d) => { let c = {}; try { c = JSON.parse(d.content) } catch {} ; return { type: d.contentType, name: c.name || c.title || d.name, ts: new Date(c.createdAt ?? d.createdAt ?? 0).getTime() || 0 } })
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
  for (const r of rows) console.log(`[${r.type}] ${r.name}`)
  console.log(`-- ${docs.length} total in push list --`)
}

// remove a pushed item by (sub)string match on its name. Mirrors removePushFile:
// delete the Sync Gateway doc + POST /api/1/push/message/batchDelete.
async function cmdRemove(match) {
  if (!match) die('usage: remove <name-substring>')
  const uid = (await me()).uid
  const docs = await channelDocs(`${uid}-MESSAGE`, 10000)
  const hits = docs.filter((d) => {
    let c = {}; try { c = JSON.parse(d.content) } catch {}
    return (c.name || c.title || d.name || '').includes(match)
  })
  if (!hits.length) die(`no push item matching "${match}"`)
  for (const d of hits) {
    await sg(`/${d._id}?rev=${d._rev}`, { method: 'DELETE' })
    console.log(`✓ removed "${(() => { try { return JSON.parse(d.content).name } catch { return d.name } })()}" (${d._id})`)
  }
  await api('/api/1/push/message/batchDelete', { method: 'POST', body: { ids: hits.map((d) => d._id) } })
}

// ---- Library books (channel READER_LIBRARY) ----
// modeType: ANNOTATION=1 BOOKMARK=2 LIBRARY=3 METADATA=4 METADATA_COLLECTION=5
// status: ENABLED=0 (active) | REMOVED=1 (recycle bin)   ← note: inverse of notes
async function cmdRemoveBook(match, { soft, yes }) {
  if (!match) die('usage: remove-book <name-substring> [--soft] [--yes]')
  const uid = (await me()).uid
  const docs = await channelDocs(`${uid}-READER_LIBRARY`, 5000)
  const books = docs.filter((d) => d.modeType === 4 && (d.name || d.title || d.idString || '').includes(match))
  if (!books.length) die(`no book matching "${match}"`)
  const ids = new Set(books.map((b) => b.uniqueId))
  // every doc that references the matched books (metadata + annotations + bookmarks + collections + progress)
  const related = docs.filter((d) => ids.has(d.uniqueId) || ids.has(d.documentId) || ids.has(d.documentUniqueId))
  console.log(`Matched ${books.length} book(s):`)
  books.forEach((b) => console.log(`  • ${b.name || b.title}  [${b.status === 1 ? 'in recycle' : 'active'}]`))
  if (soft) {
    const targets = related.filter((d) => d.modeType === 4 || d.modeType === 5)
    if (!yes) return console.log(`\nDRY-RUN (soft → recycle bin): would set status=REMOVED on ${targets.length} doc(s). Re-run with --yes.`)
    await sgBulk(targets.map((d) => ({ ...d, status: 1, updatedAt: Date.now() })))
    console.log(`✓ moved ${books.length} book(s) to recycle bin (${targets.length} docs). Restore: restore-book "${match}"`)
  } else {
    if (!yes) return console.log(`\nDRY-RUN (HARD delete, irreversible): would permanently delete ${related.length} doc(s) (metadata + annotations/bookmarks/collections). Re-run with --yes.`)
    await sgBulk(related.map((d) => ({ _id: d._id, _rev: d._rev, _deleted: true })))
    console.log(`✓ permanently deleted ${books.length} book(s) and ${related.length} related doc(s)`)
  }
}
async function cmdRestoreBook(match) {
  if (!match) die('usage: restore-book <name-substring>')
  const uid = (await me()).uid
  const docs = await channelDocs(`${uid}-READER_LIBRARY`, 5000)
  const books = docs.filter((d) => d.modeType === 4 && d.status === 1 && (d.name || d.title || d.idString || '').includes(match))
  if (!books.length) die(`no recycled book matching "${match}"`)
  const ids = new Set(books.map((b) => b.uniqueId))
  const targets = docs.filter((d) => (d.modeType === 4 || d.modeType === 5) && (ids.has(d.uniqueId) || ids.has(d.documentUniqueId)) && d.status === 1)
  await sgBulk(targets.map((d) => ({ ...d, status: 0, updatedAt: Date.now() })))
  console.log(`✓ restored ${books.length} book(s) from recycle bin`)
}

// ---- Notes (channel NOTE_TREE) ----
// tree docs: have title, no commitId, no modeType. type: NOTE=1 FOLDER=0
// status: ENABLE=1 (active) | DELETED=0 (recycle)  ← note: inverse of books
function isNoteTree(d) { return d.title && !d.commitId && d.modeType === undefined }
async function cmdRemoveNote(match, { soft, yes }) {
  if (!match) die('usage: remove-note <title-substring> [--soft] [--yes]')
  const uid = (await me()).uid
  const docs = await channelDocs(`${uid}-NOTE_TREE`, 8000)
  const tree = docs.filter(isNoteTree)
  let hits = tree.filter((d) => d.title.includes(match))
  if (!hits.length) die(`no note/folder matching "${match}"`)
  // expand folders (type 0) to their descendants
  const expand = (folderId) => tree.filter((d) => d.parentUniqueId === folderId)
    .flatMap((c) => [c, ...(c.type === 0 ? expand(c.uniqueId) : [])])
  const all = [...hits]
  hits.filter((d) => d.type === 0).forEach((f) => all.push(...expand(f.uniqueId)))
  const noteDocs = dedupeById(all)
  const noteIds = new Set(noteDocs.map((n) => n.uniqueId))
  console.log(`Matched ${hits.length} item(s) → ${noteDocs.length} note/folder doc(s):`)
  noteDocs.slice(0, 20).forEach((n) => console.log(`  • ${n.title}  [${n.type === 0 ? 'folder' : 'note'}, ${n.status === 1 ? 'active' : 'recycle'}]`))
  if (soft) {
    if (!yes) return console.log(`\nDRY-RUN (soft → recycle bin): would set status=DELETED on ${noteDocs.length} doc(s). Re-run with --yes.`)
    await sgBulk(noteDocs.map((d) => ({ ...d, status: 0, enabled: false, updatedAt: Date.now() })))
    console.log(`✓ moved ${noteDocs.length} note(s)/folder(s) to recycle bin. Restore: restore-note "${match}"`)
  } else {
    // hard: tombstone the tree docs + their page-commit records (documentUniqueId == note)
    const commits = docs.filter((d) => d.commitId && noteIds.has(d.documentUniqueId))
    const victims = [...noteDocs, ...commits]
    if (!yes) return console.log(`\nDRY-RUN (HARD delete, irreversible): would permanently delete ${noteDocs.length} note/folder doc(s) + ${commits.length} page-record(s). OSS handwriting resources are left orphaned (harmless). Re-run with --yes.`)
    await sgBulk(victims.map((d) => ({ _id: d._id, _rev: d._rev, _deleted: true })))
    console.log(`✓ permanently deleted ${noteDocs.length} note(s)/folder(s) + ${commits.length} page-record(s)`)
  }
}
async function cmdRestoreNote(match) {
  if (!match) die('usage: restore-note <title-substring>')
  const uid = (await me()).uid
  const tree = (await channelDocs(`${uid}-NOTE_TREE`, 8000)).filter(isNoteTree)
  const hits = tree.filter((d) => d.status === 0 && d.title.includes(match))
  if (!hits.length) die(`no recycled note matching "${match}"`)
  await sgBulk(hits.map((d) => ({ ...d, status: 1, enabled: true, updatedAt: Date.now() })))
  console.log(`✓ restored ${hits.length} note(s)/folder(s) from recycle bin`)
}
function dedupeById(arr) { const m = new Map(); for (const d of arr) m.set(d._id, d); return [...m.values()] }

async function cmdGetNotes(limit = 30) {
  const uid = (await me()).uid
  const tree = (await channelDocs(`${uid}-NOTE_TREE`, 8000)).filter(isNoteTree)
  const active = tree.filter((d) => d.status === 1).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  for (const n of active.slice(0, limit))
    console.log(`${n.type === 0 ? '📁' : '📝'} ${n.title} (${new Date(n.updatedAt).toISOString().slice(0, 10)})`)
  console.log(`-- ${active.length} active, ${tree.filter((d) => d.status === 0).length} in recycle bin --`)
}
async function cmdListBooks(limit = 50) {
  const uid = (await me()).uid
  const books = (await channelDocs(`${uid}-READER_LIBRARY`, 5000)).filter((d) => d.modeType === 4 && d.status === 0)
  books.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  for (const b of books.slice(0, limit)) console.log(`📖 ${b.name || b.title}`)
  console.log(`-- ${books.length} active books in cloud Library --`)
}

async function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  const flags = { soft: argv.includes('--soft'), yes: argv.includes('--yes') }
  const pos = argv.slice(1).filter((a) => !a.startsWith('--'))
  switch (cmd) {
    case 'device': return cmdDevice()
    case 'send-book': return cmdSendBook(pos[0])
    case 'repush': return cmdRepush(pos[0])
    case 'list-push': return cmdListPush(Number(pos[0]) || 30)
    case 'list-books': return cmdListBooks(Number(pos[0]) || 50)
    case 'remove': return cmdRemove(pos[0])
    case 'remove-book': return cmdRemoveBook(pos[0], flags)
    case 'remove-note': return cmdRemoveNote(pos[0], flags)
    case 'restore-book': return cmdRestoreBook(pos[0])
    case 'restore-note': return cmdRestoreNote(pos[0])
    case 'get-notes': return cmdGetNotes(Number(pos[0]) || 30)
    case 'whoami': { const u = await me(); console.log(`${u.nickname} <${u.email}> uid=${u.uid} storage ${(u.storage_used / 1e6).toFixed(0)}/${(u.storage_limit / 1e9).toFixed(0)}GB`); return }
    default:
      console.log(`boox.mjs — Onyx BOOX cloud CLI

  whoami                       logged-in account + storage
  device                       registered devices + online status

  send-book <file>             upload + push a book/doc to your device(s)
  repush <name-substr>         re-fire the device-wake for a file already on the cloud (no re-upload)
  list-push [n]                items in the device Push List
  remove <name-substr>         delete push-list item(s) — permanent (no recycle bin)

  list-books [n]               active books in the cloud Library
  remove-book <substr>         delete book(s).  default HARD/permanent.  --soft = recycle bin
  restore-book <substr>        restore book(s) from recycle bin

  get-notes [n]                active notes
  remove-note <substr>         delete note(s)/folder(s).  default HARD.  --soft = recycle bin
  restore-note <substr>        restore note(s) from recycle bin

  Destructive ops dry-run by default — add --yes to execute.
  Book/note deletes cascade (annotations, page records). Push = no recycle bin.`)
  }
}
main().catch((e) => die(String(e && e.stack || e)))

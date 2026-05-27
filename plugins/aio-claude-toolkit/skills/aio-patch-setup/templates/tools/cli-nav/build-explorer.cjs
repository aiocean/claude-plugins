#!/usr/bin/env node
// build-explorer.cjs — bundle cli.js facts into an interactive HTML explorer.
//
// Reads the bun-extracted cli.js, extracts INVARIANT semantic anchors
// (OTel events, prompt prose, tool descriptions, system reminders, directives),
// resolves each anchor's enclosing function + that function's callers/callees,
// and emits a single self-contained HTML file (data embedded as JSON inline)
// that lets you search/browse/expand to understand the surface area of cli.js
// without grepping a 15MB minified blob by hand.
//
// usage:
//   node tools/cli-nav/build-explorer.cjs <cli.js> [--out <html>]

const fs = require("fs");
const path = require("path");
const { load } = require("./lib.cjs");

const args = process.argv.slice(2);
const INPUT = args.find((a) => !a.startsWith("--"));
const OUT_FLAG = (() => {
  const i = args.indexOf("--out");
  return i >= 0 ? args[i + 1] : null;
})();
if (!INPUT) {
  console.error("usage: build-explorer.cjs <cli.js> [--out <html>]");
  process.exit(2);
}

const OUT = OUT_FLAG ||
  `reports/${new Date().toISOString().slice(0, 10)}-cli-explorer.html`;

const t0 = Date.now();
console.error(`[1/4] loading ${INPUT}…`);
const ctx = load(INPUT);
console.error(
  `      version=${ctx.version}  body=${(ctx.body.length / 1e6).toFixed(1)}MB  ` +
    `parse=${((Date.now() - t0) / 1000).toFixed(1)}s`,
);

// ──────────────────────────────────────────────────────────────────────────
// 1. OTel events — `claude_code.*` strings = telemetry contract Anthropic
//    cannot rename without breaking their dashboards. Stable across releases.
// ──────────────────────────────────────────────────────────────────────────
const otelEvents = new Map(); // name → [{ offset, enclosing_fn }, …]
{
  const re = /["'`]claude_code\.[a-z_.]+["'`]/g;
  let m;
  while ((m = re.exec(ctx.body))) {
    const name = m[0].slice(1, -1);
    const off = m.index + 1;
    const fn = ctx.nameOfFn(ctx.fnContaining(off));
    if (!otelEvents.has(name)) otelEvents.set(name, []);
    otelEvents.get(name).push({ offset: off, enclosing_fn: fn });
  }
}
console.error(`[2/4] otel events: ${otelEvents.size}`);

// ──────────────────────────────────────────────────────────────────────────
// 2. Semantic anchors — invariant English prose strings. Same logic as
//    find-anchors.cjs but inlined so we own the kind_hint classification.
// ──────────────────────────────────────────────────────────────────────────
function kindHint(s) {
  if (/^You are /.test(s)) return "prompt-opening";
  if (/^(Use this tool|This tool|Use when )/i.test(s)) return "tool-desc";
  if (/<system-reminder>/.test(s)) return "reminder-template";
  if (/\bIMPORTANT:|You (should|must|will)\b/.test(s)) return "directive-prose";
  if (/^(Error|Failed|Cannot|Could not|Invalid|Missing|Unknown|Unexpected)/.test(s))
    return "error-msg";
  return "prose";
}

function looksLikePrompt(s) {
  if (s.length < 60) return false;
  if (/^[A-Za-z0-9+/=]{200,}$/.test(s)) return false; // base64
  if (/^[0-9a-f]{200,}$/i.test(s)) return false; // hex
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters / s.length < 0.3) return false; // binary-ish
  const code =
    (s.match(/\b(if|else|return|function|const|let|var|=>|throw|typeof|require|import)\b/g) ||
      []).length;
  if (code / (s.length / 100) > 1.5 && /[;{}]/.test(s)) return false; // code chunk
  return true;
}

const anchors = [];
let anchorId = 0;
const seenText = new Set();
ctx.eachStringNode((text, node, kind) => {
  if (!looksLikePrompt(text)) return;
  const key = text.slice(0, 200);
  if (seenText.has(key)) return;
  seenText.add(key);
  anchors.push({
    id: anchorId++,
    offset: node.start,
    length: text.length,
    node_kind: kind,
    kind_hint: kindHint(text),
    enclosing_fn: ctx.nameOfFn(ctx.fnContaining(node.start)),
    preview: text.slice(0, 140).replace(/\n/g, " "),
    text: text.length <= 4000 ? text : text.slice(0, 4000) + "…",
  });
});
anchors.sort((a, b) => a.offset - b.offset);
console.error(`      anchors: ${anchors.length}`);

// ──────────────────────────────────────────────────────────────────────────
// 3. Call-graph — inverted index in ONE AST pass.
//    Old approach (per-fn callSitesOf) was O(F × R × N_nodes) because
//    ancestorsAt walks the full AST per reference → 37 min for 1660 fns.
//    New: walk the AST once, bucket every Identifier-callee CallExpression
//    by callee name, attach in_fn via fnContaining (a sorted-array probe).
// ──────────────────────────────────────────────────────────────────────────
console.error(`[3/4] resolving call-graph…`);
const fnNames = new Set();
for (const a of anchors) if (a.enclosing_fn) fnNames.add(a.enclosing_fn);
for (const arr of otelEvents.values())
  for (const o of arr) if (o.enclosing_fn) fnNames.add(o.enclosing_fn);

// Single pass over the AST to invert call edges.
const walk = require("acorn-walk");
const callSitesByName = new Map(); // callee_name → [{ offset, in_fn }, ...]
walk.full(ctx.ast, (node) => {
  if (node.type !== "CallExpression") return;
  if (node.callee.type !== "Identifier") return;
  const name = node.callee.name;
  if (!fnNames.has(name)) return; // only track edges we care about
  const off = node.callee.start;
  let arr = callSitesByName.get(name);
  if (!arr) { arr = []; callSitesByName.set(name, arr); }
  arr.push({ offset: off, in_fn: ctx.nameOfFn(ctx.fnContaining(off)) });
});

const functions = {};
for (const name of fnNames) {
  const v = ctx.bindingByName(name);
  let fnNode = null;
  if (v) {
    for (const d of v.defs) {
      if (/Function/.test(d.node.type)) { fnNode = d.node; break; }
      if (d.node.init && /Function/.test(d.node.init.type)) { fnNode = d.node.init; break; }
    }
  }
  // Callees: walk just this fn's body — cheap O(body_size).
  const callees = fnNode ? ctx.calleesOf(fnNode).slice(0, 50) : [];
  // Callers: pre-computed; cap to keep payload bounded.
  const callers = (callSitesByName.get(name) || []).slice(0, 30);
  functions[name] = {
    span: fnNode ? [fnNode.start, fnNode.end] : null,
    callers,
    callees,
  };
}
console.error(`      functions: ${Object.keys(functions).length}`);

// ──────────────────────────────────────────────────────────────────────────
// 4. Emit HTML
// ──────────────────────────────────────────────────────────────────────────
const data = {
  version: ctx.version,
  generated: new Date().toISOString(),
  cli_size_bytes: ctx.body.length,
  otel_events: Object.fromEntries(otelEvents),
  anchors,
  functions,
};

const dataJson = JSON.stringify(data);
console.error(
  `[4/4] writing HTML… json=${(dataJson.length / 1e6).toFixed(1)}MB`,
);

fs.mkdirSync(path.dirname(OUT) || ".", { recursive: true });
fs.writeFileSync(OUT, renderHtml(data, dataJson));
console.error(`      wrote ${OUT}  (${((Date.now() - t0) / 1000).toFixed(1)}s total)`);

function renderHtml(d, json) {
  // Embed JSON via a <script type="application/json"> to dodge </script>/HTML
  // escaping headaches inside template-literal prose anchors.
  // CRITICAL: every replace uses function-form — string-form replace expands
  // $&, $', $`, $n in the replacement (MDN), and JSON content WILL hit those:
  // e.g. a prose anchor with $' splices the rest of the template (with its
  // literal newlines) into the JSON, producing unparseable output.
  const safe = json.replace(/<\/script>/gi, () => "<\\/script>");
  const subs = {
    __VERSION__: d.version,
    __GENERATED__: d.generated,
    __CLI_MB__: (d.cli_size_bytes / 1e6).toFixed(1),
    __ANCHOR_COUNT__: String(d.anchors.length),
    __FN_COUNT__: String(Object.keys(d.functions).length),
    __OTEL_COUNT__: String(Object.keys(d.otel_events).length),
    __DATA_JSON__: safe,
  };
  let out = template();
  // replaceAll because __VERSION__ etc. appear in <title>, header, and footer.
  // Function-form replacement disables $&/$'/$` expansion (see note above).
  for (const [k, v] of Object.entries(subs)) out = out.replaceAll(k, () => v);
  return out;
}

// Function declaration → hoisted with body, so safe to reference above.
function template() { return String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>cli.js explorer · __VERSION__</title>
<style>
  :root {
    --bg: #fbfbfa; --fg: #1c1c1c; --muted: #6b6b6b; --subtle: #9a9a9a;
    --card: #ffffff; --border: #e5e5e5; --border-strong: #cbcbcb;
    --accent: #2563eb; --accent-soft: #dbeafe;
    --code-bg: #f4f4f5; --hover: #eef2ff;
    --tag-otel: #7c3aed; --tag-prompt: #db2777; --tag-tool: #059669;
    --tag-reminder: #ea580c; --tag-directive: #0891b2; --tag-error: #dc2626;
    --tag-prose: #475569;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f0f10; --fg: #ececed; --muted: #9a9a9d; --subtle: #6b6b6e;
      --card: #18181a; --border: #2a2a2d; --border-strong: #3a3a3d;
      --accent: #60a5fa; --accent-soft: #1e3a8a;
      --code-bg: #1c1c1f; --hover: #1d2540;
      --tag-otel: #a78bfa; --tag-prompt: #f472b6; --tag-tool: #34d399;
      --tag-reminder: #fb923c; --tag-directive: #22d3ee; --tag-error: #f87171;
      --tag-prose: #94a3b8;
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: var(--bg); color: var(--fg);
    font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    overflow: hidden;
  }
  .app {
    display: grid;
    grid-template-columns: 260px minmax(360px, 1fr) minmax(380px, 1.2fr);
    grid-template-rows: 56px 1fr;
    grid-template-areas: "header header header" "sidebar list detail";
    height: 100vh;
  }
  header.bar {
    grid-area: header;
    display: flex; align-items: center; gap: 16px;
    padding: 0 20px; border-bottom: 1px solid var(--border);
    background: var(--card);
  }
  header.bar h1 {
    font-size: 14px; margin: 0; font-weight: 600;
    letter-spacing: -0.01em;
  }
  header.bar .meta {
    color: var(--muted); font-size: 12px;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
  }
  header.bar input.q {
    flex: 1; max-width: 480px; padding: 7px 12px;
    border: 1px solid var(--border-strong); background: var(--bg);
    color: var(--fg); border-radius: 6px;
    font: 13px/1.4 -apple-system, sans-serif;
  }
  header.bar input.q:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
  header.bar .count { color: var(--muted); font-size: 12px; min-width: 90px; text-align: right; }

  aside.sidebar {
    grid-area: sidebar;
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 16px 0;
    background: var(--card);
  }
  aside.sidebar h2 {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--muted);
    padding: 12px 20px 6px; margin: 0;
  }
  aside.sidebar .cat {
    display: flex; align-items: center; justify-content: space-between;
    padding: 7px 20px; cursor: pointer; user-select: none;
    border-left: 3px solid transparent;
  }
  aside.sidebar .cat:hover { background: var(--hover); }
  aside.sidebar .cat.active {
    background: var(--accent-soft);
    border-left-color: var(--accent);
    color: var(--accent);
  }
  aside.sidebar .cat .tag {
    width: 8px; height: 8px; border-radius: 50%; margin-right: 8px;
    display: inline-block; vertical-align: middle;
  }
  aside.sidebar .cat .num {
    font-family: ui-monospace, monospace; font-size: 11px;
    color: var(--muted);
  }

  section.list {
    grid-area: list;
    overflow-y: auto;
    border-right: 1px solid var(--border);
  }
  section.list .row {
    padding: 10px 16px; border-bottom: 1px solid var(--border);
    cursor: pointer;
  }
  section.list .row:hover { background: var(--hover); }
  section.list .row.active { background: var(--accent-soft); }
  section.list .row .preview {
    font-size: 13px; line-height: 1.5;
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  section.list .row .row-meta {
    display: flex; align-items: center; gap: 8px;
    margin-top: 4px; font-size: 11px; color: var(--muted);
    font-family: ui-monospace, monospace;
  }
  section.list .row .kind {
    padding: 1px 6px; border-radius: 3px; font-size: 10px;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
    color: white;
  }
  .kind-otel { background: var(--tag-otel); }
  .kind-prompt-opening { background: var(--tag-prompt); }
  .kind-tool-desc { background: var(--tag-tool); }
  .kind-reminder-template { background: var(--tag-reminder); }
  .kind-directive-prose { background: var(--tag-directive); }
  .kind-error-msg { background: var(--tag-error); }
  .kind-prose { background: var(--tag-prose); }

  section.detail {
    grid-area: detail;
    overflow-y: auto;
    padding: 24px;
    background: var(--bg);
  }
  section.detail .empty {
    color: var(--muted); font-style: italic;
    text-align: center; margin-top: 40px;
  }
  section.detail .detail-head {
    display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
    flex-wrap: wrap;
  }
  section.detail .detail-head .offset {
    font-family: ui-monospace, monospace; color: var(--muted); font-size: 12px;
  }
  section.detail h2 {
    font-size: 18px; margin: 12px 0 4px; font-weight: 600;
    word-break: break-word;
  }
  section.detail .text-block {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 6px; padding: 14px 16px; margin: 12px 0;
    font: 13px/1.6 ui-serif, Georgia, serif;
    white-space: pre-wrap; word-break: break-word;
    max-height: 50vh; overflow-y: auto;
  }
  section.detail .text-block.code {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 12px; line-height: 1.5;
  }
  section.detail .fn-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 6px; padding: 12px 16px; margin: 12px 0;
  }
  section.detail .fn-card h3 {
    font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--muted); margin: 0 0 8px;
  }
  section.detail .chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
  section.detail .chip {
    padding: 3px 8px; border: 1px solid var(--border-strong);
    border-radius: 4px; background: var(--code-bg);
    font: 12px/1.3 ui-monospace, monospace; cursor: pointer;
    color: var(--fg);
  }
  section.detail .chip:hover { background: var(--accent-soft); border-color: var(--accent); }
  section.detail .chip.dim { color: var(--muted); cursor: default; }
  section.detail .chip.dim:hover { background: var(--code-bg); border-color: var(--border-strong); }
  section.detail .fn-name {
    font-family: ui-monospace, monospace;
    background: var(--code-bg); padding: 2px 6px; border-radius: 3px;
    font-size: 12px;
  }
  section.detail .otel-occurrences {
    list-style: none; padding: 0; margin: 0;
  }
  section.detail .otel-occurrences li {
    padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px;
    font-family: ui-monospace, monospace;
  }
  section.detail .otel-occurrences li:last-child { border-bottom: none; }
  section.detail .otel-occurrences a { color: var(--accent); cursor: pointer; }

  .breadcrumb {
    color: var(--muted); font-size: 12px;
    font-family: ui-monospace, monospace; margin-bottom: 8px;
  }
  .breadcrumb a { color: var(--accent); cursor: pointer; }
  .breadcrumb a:hover { text-decoration: underline; }

  @media (max-width: 1100px) {
    .app { grid-template-columns: 220px 1fr; grid-template-rows: 56px 1fr 1fr;
      grid-template-areas: "header header" "sidebar list" "detail detail"; }
    section.detail { border-top: 1px solid var(--border); }
  }
  @media (max-width: 700px) {
    .app { grid-template-columns: 1fr; grid-template-rows: 56px auto 1fr 1fr;
      grid-template-areas: "header" "sidebar" "list" "detail"; }
    aside.sidebar { border-right: none; border-bottom: 1px solid var(--border); }
    aside.sidebar { padding: 8px 0; }
  }
  @media print { .app { display: block; height: auto; } aside.sidebar, section.detail { display: none; } }
</style>
</head>
<body>
<div class="app">
  <header class="bar">
    <h1>cli.js explorer</h1>
    <span class="meta">v__VERSION__ · __CLI_MB__MB · __ANCHOR_COUNT__ anchors · __FN_COUNT__ fns · __OTEL_COUNT__ otel</span>
    <input class="q" id="q" placeholder="Search prompts, OTel events, fn names…  (focus: /)" autofocus>
    <span class="count" id="count">—</span>
  </header>
  <aside class="sidebar" id="sidebar"></aside>
  <section class="list" id="list"></section>
  <section class="detail" id="detail">
    <div class="empty">Pick a category on the left, or search above.</div>
  </section>
</div>

<script type="application/json" id="data">__DATA_JSON__</script>
<script>
const DATA = JSON.parse(document.getElementById("data").textContent);

// ── State ────────────────────────────────────────────────────────────────
const state = {
  category: "otel-events",
  query: "",
  selected: null, // { type: 'anchor' | 'otel' | 'fn', key }
};

// ── Categories (sidebar) ─────────────────────────────────────────────────
const KIND_LABEL = {
  "prompt-opening":    { label: "Prompt openings",    tag: "kind-prompt-opening"     },
  "tool-desc":         { label: "Tool descriptions",  tag: "kind-tool-desc"          },
  "reminder-template": { label: "System reminders",   tag: "kind-reminder-template"  },
  "directive-prose":   { label: "Directives",         tag: "kind-directive-prose"    },
  "error-msg":         { label: "Error messages",     tag: "kind-error-msg"          },
  "prose":             { label: "All prose",          tag: "kind-prose"              },
};

function buildCategories() {
  const counts = {};
  for (const a of DATA.anchors) counts[a.kind_hint] = (counts[a.kind_hint] || 0) + 1;
  const longProse = DATA.anchors.filter(a => a.length >= 300).length;
  const cats = [
    { key: "otel-events",       label: "OTel events",       count: Object.keys(DATA.otel_events).length, tag: "kind-otel" },
    { key: "prompt-opening",    label: KIND_LABEL["prompt-opening"].label,    count: counts["prompt-opening"]    || 0, tag: KIND_LABEL["prompt-opening"].tag    },
    { key: "tool-desc",         label: KIND_LABEL["tool-desc"].label,         count: counts["tool-desc"]         || 0, tag: KIND_LABEL["tool-desc"].tag         },
    { key: "reminder-template", label: KIND_LABEL["reminder-template"].label, count: counts["reminder-template"] || 0, tag: KIND_LABEL["reminder-template"].tag },
    { key: "directive-prose",   label: KIND_LABEL["directive-prose"].label,   count: counts["directive-prose"]   || 0, tag: KIND_LABEL["directive-prose"].tag   },
    { key: "long-prose",        label: "Long prose (≥300)", count: longProse, tag: "kind-prose" },
    { key: "error-msg",         label: KIND_LABEL["error-msg"].label,         count: counts["error-msg"]         || 0, tag: KIND_LABEL["error-msg"].tag         },
    { key: "prose",             label: "All prose",         count: DATA.anchors.length, tag: KIND_LABEL["prose"].tag },
  ];
  return cats;
}

function renderSidebar() {
  const el = document.getElementById("sidebar");
  const html = ["<h2>Categories</h2>"];
  for (const c of buildCategories()) {
    html.push(
      '<div class="cat ' + (state.category === c.key ? "active" : "") +
      '" data-cat="' + c.key + '">' +
      '<span><span class="tag ' + c.tag + '" style="background:var(--' +
      ({ "kind-otel":"tag-otel","kind-prompt-opening":"tag-prompt","kind-tool-desc":"tag-tool","kind-reminder-template":"tag-reminder","kind-directive-prose":"tag-directive","kind-error-msg":"tag-error","kind-prose":"tag-prose" }[c.tag]) +
      ')"></span>' + escapeHtml(c.label) + '</span>' +
      '<span class="num">' + c.count.toLocaleString() + '</span>' +
      '</div>'
    );
  }
  el.innerHTML = html.join("");
  el.querySelectorAll(".cat").forEach(d => {
    d.addEventListener("click", () => { state.category = d.dataset.cat; renderSidebar(); renderList(); });
  });
}

// ── Item list ────────────────────────────────────────────────────────────
function getItems() {
  if (state.category === "otel-events") {
    return Object.keys(DATA.otel_events).sort().map(name => ({
      kind: "otel", key: name,
      preview: name + "  ·  " + DATA.otel_events[name].length + " call site" + (DATA.otel_events[name].length === 1 ? "" : "s"),
      kind_hint: "otel",
      tag: "kind-otel",
      sort: name,
    }));
  }
  let pool = DATA.anchors;
  if (state.category === "long-prose") pool = pool.filter(a => a.length >= 300);
  else if (state.category !== "prose") pool = pool.filter(a => a.kind_hint === state.category);

  return pool.map(a => ({
    kind: "anchor", key: a.id, anchor: a,
    preview: a.preview,
    kind_hint: a.kind_hint,
    tag: "kind-" + a.kind_hint,
    sort: a.offset,
  }));
}

function applyQuery(items) {
  const q = state.query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(it => {
    if (it.kind === "otel") return it.key.toLowerCase().includes(q);
    const a = it.anchor;
    return (
      (a.preview && a.preview.toLowerCase().includes(q)) ||
      (a.text && a.text.toLowerCase().includes(q)) ||
      (a.enclosing_fn && a.enclosing_fn.toLowerCase().includes(q))
    );
  });
}

function renderList() {
  const items = applyQuery(getItems()).slice(0, 800);
  document.getElementById("count").textContent = items.length.toLocaleString() + " items";
  const el = document.getElementById("list");
  const html = [];
  for (const it of items) {
    const sel = state.selected && state.selected.type === it.kind && state.selected.key === it.key;
    html.push(
      '<div class="row ' + (sel ? "active" : "") + '" data-kind="' + it.kind + '" data-key="' + escapeAttr(it.key) + '">' +
      '<div class="preview">' + escapeHtml(it.preview) + '</div>' +
      '<div class="row-meta">' +
      '<span class="kind ' + it.tag + '">' + (it.kind === "otel" ? "otel" : it.kind_hint) + '</span>' +
      (it.kind === "anchor" && it.anchor.enclosing_fn ? '<span>fn=' + escapeHtml(it.anchor.enclosing_fn) + '</span>' : "") +
      (it.kind === "anchor" ? '<span>len=' + it.anchor.length + '</span><span>@' + it.anchor.offset + '</span>' : "") +
      '</div></div>'
    );
  }
  if (items.length === 0) html.push('<div style="padding:24px;color:var(--muted)">No matches.</div>');
  el.innerHTML = html.join("");
  el.querySelectorAll(".row").forEach(d => {
    d.addEventListener("click", () => {
      const kind = d.dataset.kind;
      const key = kind === "anchor" ? +d.dataset.key : d.dataset.key;
      state.selected = { type: kind, key };
      renderList(); renderDetail();
    });
  });
}

// ── Detail panel ─────────────────────────────────────────────────────────
function renderDetail() {
  const el = document.getElementById("detail");
  if (!state.selected) {
    el.innerHTML = '<div class="empty">Pick an item to see its full text + enclosing function.</div>';
    return;
  }
  if (state.selected.type === "anchor") renderAnchorDetail(state.selected.key);
  else if (state.selected.type === "otel") renderOtelDetail(state.selected.key);
  else if (state.selected.type === "fn") renderFnDetail(state.selected.key);
}

function renderAnchorDetail(id) {
  const a = DATA.anchors.find(x => x.id === id);
  if (!a) return;
  const fn = a.enclosing_fn ? DATA.functions[a.enclosing_fn] : null;
  const isCode = a.kind_hint === "reminder-template" || /^[\s<\[{]/.test(a.text);
  const html = [
    breadcrumb(["all", a.kind_hint]),
    '<div class="detail-head">',
    '<span class="kind kind-' + a.kind_hint + '">' + a.kind_hint + '</span>',
    '<span class="offset">@' + a.offset + ' · len=' + a.length + ' · ' + a.node_kind + '</span>',
    '</div>',
    '<h2>' + escapeHtml(a.preview.slice(0, 80)) + (a.preview.length > 80 ? '…' : '') + '</h2>',
    '<div class="text-block' + (isCode ? ' code' : '') + '">' + escapeHtml(a.text) + '</div>',
  ];
  if (a.enclosing_fn && fn) {
    html.push(fnCard(a.enclosing_fn, fn));
  } else if (a.enclosing_fn) {
    html.push('<div class="fn-card"><h3>Enclosing fn</h3><span class="fn-name">' + escapeHtml(a.enclosing_fn) + '</span> <span style="color:var(--muted)">(no call-graph)</span></div>');
  } else {
    html.push('<div class="fn-card"><h3>Enclosing fn</h3><span style="color:var(--muted)">— top-level / no enclosing function</span></div>');
  }
  document.getElementById("detail").innerHTML = html.join("");
  wireClicks();
}

function renderOtelDetail(name) {
  const occurrences = DATA.otel_events[name] || [];
  const html = [
    breadcrumb(["all", "otel-events"]),
    '<div class="detail-head"><span class="kind kind-otel">otel</span><span class="offset">' + occurrences.length + ' occurrence' + (occurrences.length === 1 ? '' : 's') + '</span></div>',
    '<h2>' + escapeHtml(name) + '</h2>',
    '<div class="fn-card"><h3>Emitted at</h3><ul class="otel-occurrences">',
  ];
  for (const o of occurrences) {
    html.push(
      '<li>@' + o.offset + ' · fn=' +
      (o.enclosing_fn
        ? '<a data-fn="' + escapeAttr(o.enclosing_fn) + '" class="fn-link">' + escapeHtml(o.enclosing_fn) + '</a>'
        : '<span style="color:var(--muted)">—</span>') +
      '</li>'
    );
  }
  html.push('</ul></div>');
  document.getElementById("detail").innerHTML = html.join("");
  wireClicks();
}

function renderFnDetail(name) {
  const fn = DATA.functions[name];
  if (!fn) return;
  const html = [
    breadcrumb(["all", "fn"]),
    '<div class="detail-head"><span class="kind" style="background:var(--muted)">fn</span></div>',
    '<h2><span class="fn-name">' + escapeHtml(name) + '</span></h2>',
    fn.span ? '<div class="offset" style="font-family:ui-monospace,monospace;color:var(--muted);font-size:12px">span=[' + fn.span[0] + ',' + fn.span[1] + '] · ' + (fn.span[1] - fn.span[0]) + ' bytes</div>' : "",
    fnCard(name, fn, /* skipHead */ true),
  ];
  // also list anchors that live in this fn
  const anchorsInFn = DATA.anchors.filter(a => a.enclosing_fn === name);
  if (anchorsInFn.length) {
    html.push('<div class="fn-card"><h3>Anchors in this fn (' + anchorsInFn.length + ')</h3><div class="chip-list">');
    for (const a of anchorsInFn.slice(0, 40)) {
      html.push('<span class="chip anchor-link" data-aid="' + a.id + '" title="' + escapeAttr(a.preview) + '">@' + a.offset + ' · ' + a.kind_hint + '</span>');
    }
    html.push('</div></div>');
  }
  document.getElementById("detail").innerHTML = html.join("");
  wireClicks();
}

function fnCard(name, fn, skipHead) {
  const out = ['<div class="fn-card">'];
  if (!skipHead) {
    out.push('<h3>Enclosing fn: <span class="fn-name">' + escapeHtml(name) + '</span>' +
      (fn.span ? ' <span style="color:var(--muted);font-weight:normal">· ' + (fn.span[1] - fn.span[0]) + ' bytes</span>' : '') +
      '</h3>');
  }
  out.push('<div style="margin:8px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Callers (' + fn.callers.length + ')</div>');
  out.push('<div class="chip-list">');
  if (!fn.callers.length) out.push('<span class="chip dim">— none / unresolved</span>');
  for (const c of fn.callers) {
    if (c.in_fn) out.push('<span class="chip fn-link" data-fn="' + escapeAttr(c.in_fn) + '">' + escapeHtml(c.in_fn) + '<span style="color:var(--muted)"> @' + c.offset + '</span></span>');
    else out.push('<span class="chip dim">@' + c.offset + ' (top-level)</span>');
  }
  out.push('</div>');
  out.push('<div style="margin:12px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Callees (' + fn.callees.length + ')</div>');
  out.push('<div class="chip-list">');
  if (!fn.callees.length) out.push('<span class="chip dim">— none / unresolved</span>');
  for (const c of fn.callees) {
    const known = DATA.functions[c];
    if (known) out.push('<span class="chip fn-link" data-fn="' + escapeAttr(c) + '">' + escapeHtml(c) + '</span>');
    else out.push('<span class="chip dim">' + escapeHtml(c) + '</span>');
  }
  out.push('</div>');
  out.push('</div>');
  return out.join("");
}

function breadcrumb(parts) {
  return '<div class="breadcrumb">' + parts.map(escapeHtml).join(" / ") + '</div>';
}

function wireClicks() {
  document.querySelectorAll(".fn-link").forEach(el => {
    el.addEventListener("click", () => {
      state.selected = { type: "fn", key: el.dataset.fn };
      renderDetail();
    });
  });
  document.querySelectorAll(".anchor-link").forEach(el => {
    el.addEventListener("click", () => {
      state.selected = { type: "anchor", key: +el.dataset.aid };
      renderDetail();
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(s) { return escapeHtml(s); }

// ── Wire input ───────────────────────────────────────────────────────────
let debounce = null;
document.getElementById("q").addEventListener("input", e => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { state.query = e.target.value; renderList(); }, 120);
});
document.addEventListener("keydown", e => {
  if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
    e.preventDefault(); document.getElementById("q").focus();
  } else if (e.key === "Escape" && document.activeElement.tagName === "INPUT") {
    document.activeElement.blur();
  }
});

// ── Boot ─────────────────────────────────────────────────────────────────
renderSidebar();
renderList();
</script>
</body>
</html>
`; }

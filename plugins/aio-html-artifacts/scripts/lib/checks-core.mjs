// doc · head · sc · a11y · mo · pr · rf · js
// Every check reads ctx.root (the tree) or ctx.rules (parsed CSS), never ctx.html,
// except where the row's own algorithm is a literal source grep.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { all, attr, has, textOf, wordCount, declOf, inAt } from './tokenizer.mjs';

// One V8 parser for the syntax gate, whichever runtime launched the validator.
const NODE = (() => {
  if (!process.versions.bun) return process.execPath;
  try { execFileSync('node', ['--version'], { stdio: 'ignore' }); return 'node'; } catch { return null; }
})();
const VM_CHECK = 'new (require("vm").Script)(require("fs").readFileSync(process.argv[1],"utf8"),{filename:process.argv[1]})';

// The word ceiling on tier= brief, in body words as ev.density counts them — one definition of
// "word" for the whole validator. 600 sits under every shipped full-tier artifact (index 649,
// deck 734, editor 834, report 1368, explorer 1432), so nothing in this corpus could have
// declared brief, and a 300-word weekly status has room to double. The number is OUR OWN n=6
// calibration on this plugin's examples, not a published one.
const BRIEF_WORDS = 600;
// The two spines brief tier refuses whatever the length. Their ceremony is what a reader acts
// on: the falsifier is the check someone re-runs at 3am, and the confidence band is what they
// weigh a rollback against. A 400-word incident note carries the same stakes as a 4,000-word one.
const FULL_TIER_SPINE = /\b(incident|outage|postmortem|post-mortem|root cause|decision record|decision-record|adr)\b/i;
// The rules brief tier stands down, printed in the output so the trade is visible. The
// early-evidence placement rule is guarded by `kind === 'report'` in checks-genre.mjs, so it
// is named on a report run and nowhere else — a deck, explorer, editor or gallery stands down
// three rules, which is the count the deck, explorer and editor SKILL.md each print. Naming a
// rule that never applied to the genre misreports the trade in the one line that exists to
// make the trade visible.
const briefRelaxes = (kind) => 'doc.contract (5 of 12 keys) · ev.basis confidence leg · ev.falsifier'
  + (kind === 'report' ? ' · k.report early-evidence' : '');

const LANG = /^(en|vi|fr|de|es|ja|zh|ko|pt|ru)(-[A-Za-z0-9]+)*$/;
const FOCUSABLE = new Set(['a', 'button', 'input', 'select', 'textarea', 'summary', 'details', 'audio', 'video', 'iframe', 'area']);
const INTERACTIVE = new Set(['a', 'button', 'input', 'select', 'textarea', 'summary', 'label']);
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const hiddenSelf = (n) => attr(n, 'aria-hidden') === 'true' || has(n, 'hidden') ||
  /display\s*:\s*none|visibility\s*:\s*hidden/i.test(attr(n, 'style') || '');
export const visible = (n) => { for (let p = n; p; p = p.parent) if (p.type === 'element' && hiddenSelf(p)) return false; return true; };

// Mini selector matcher: the last compound of each comma-separated selector.
// Broad selectors (*, bare pseudo) match nothing so a rule never over-claims.
export function matchEls(selector, els) {
  const out = new Set();
  for (const partRaw of selector.split(',')) {
    const compound = partRaw.trim().split(/[\s>+~]+/).filter(Boolean).pop();
    if (!compound) continue;
    const bare = compound.replace(/::?[a-z-]+(\([^)]*\))?/gi, '');
    if (!bare || bare === '*') continue;
    const tag = (/^[a-zA-Z][\w-]*/.exec(bare) || [''])[0].toLowerCase();
    const ids = [...bare.matchAll(/#([\w-]+)/g)].map((m) => m[1]);
    const cls = [...bare.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
    const att = [...bare.matchAll(/\[([\w:-]+)(?:([~^$*|]?=)"?([^\]"]*)"?)?\]/g)];
    for (const el of els) {
      if (tag && el.tag !== tag) continue;
      if (ids.some((i) => attr(el, 'id') !== i)) continue;
      const list = (attr(el, 'class') || '').split(/\s+/);
      if (cls.some((c) => !list.includes(c))) continue;
      if (att.some(([, a, op, v]) => (op ? !(attr(el, a) || '').includes(v) : !has(el, a)))) continue;
      out.add(el);
    }
  }
  return [...out];
}

const px = (v) => {
  const m = /(-?[\d.]+)(px|rem|em|pt|%)?/.exec(String(v || ''));
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  return m[2] === 'rem' || m[2] === 'em' ? n * 16 : m[2] === 'pt' ? n * (96 / 72) : m[2] === '%' ? NaN : n;
};

export function coreChecks(ctx, F) {
  const { root, doc, els, rules, kind } = ctx;
  const E = (id, msg, line) => F(id, 'E', msg, line);
  const W = (id, msg, line) => F(id, 'W', msg, line);

  // ---- doc ----------------------------------------------------------------
  for (const e of doc.errors) E('parse', e);
  const before = doc.doctype ? ctx.html.slice(0, doc.doctype.index).trim() : 'x';
  if (!doc.doctype || before !== '' || !/^<!doctype\s+html\s*>$/i.test(doc.doctype.raw.trim())) {
    E('doc.doctype', 'first token of the file is `<!doctype html>` — quirks mode changes box sizing and line layout');
  }
  const htmlEl = all(root, 'html')[0];
  const lang = htmlEl ? attr(htmlEl, 'lang') || '' : '';
  if (!LANG.test(lang)) E('doc.lang', `<html lang> carries a real BCP-47 tag (en, vi, fr, de, es, ja, zh, ko, pt, ru + subtags); found ${JSON.stringify(lang)} — a screen reader picks its voice from this`);
  const vp = all(root, (n) => n.tag === 'meta' && (attr(n, 'name') || '').toLowerCase() === 'viewport')[0];
  const vpc = vp ? attr(vp, 'content') || '' : '';
  if (!/width\s*=\s*device-width/i.test(vpc)) E('doc.viewport', '<meta name="viewport" content="width=device-width, initial-scale=1"> — without it a phone renders at 980px and shrinks every glyph');
  else if (/user-scalable\s*=\s*no/i.test(vpc) || (/maximum-scale\s*=\s*([\d.]+)/i.exec(vpc) || [, '5'])[1] < 2) E('doc.viewport', 'the viewport allows zoom to at least 2x (drop user-scalable=no and maximum-scale below 2) — WCAG 1.4.4');
  const title = all(root, 'title')[0];
  const titleText = title ? textOf(title).trim() : '';
  if (!/[A-Za-z]{3,}\s+[A-Za-z]/.test(titleText)) E('doc.title', `<title> reads as at least two real words; found ${JSON.stringify(titleText)} — it is the tab label, the bookmark, and the print header`);
  const mains = all(root, 'main');
  if (mains.length !== 1) E('doc.main', `exactly one <main> wraps the artifact; found ${mains.length} — it is the skip target and the print root`);
  const desc = all(root, (n) => n.tag === 'meta' && (attr(n, 'name') || '').toLowerCase() === 'description')[0];
  if ((desc ? attr(desc, 'content') || '' : '').trim().length < 20) W('doc.description', '<meta name="description"> carries one sentence naming the verdict (20+ chars) — it is what a link preview shows');

  // ---- tier ---------------------------------------------------------------
  // tier= brief makes the ceremony proportionate to a short artifact: five contract keys,
  // no falsifier block, no confidence band, no early-evidence placement rule. Everything a
  // correct artifact owes a reader at any size stays — self-containment, accessibility,
  // print, the motion fallback, one h1, and the rule that a claim carries its basis.
  // Two guards bound the trade, and both run before the tier is read anywhere else.
  const c = ctx.contract;
  const bodyWords = wordCount(ctx.body);
  const declared = c.declaredTier;
  if (declared && declared !== 'brief' && declared !== 'full') {
    E('doc.tier', `ARTIFACT CONTRACT tier=${declared} — the two values are \`brief\` and \`full\`, and anything else reads as full, so the twelve-key contract applies below`);
  }
  let tier = declared === 'brief' ? 'brief' : 'full';
  const demote = [];
  if (tier === 'brief' && bodyWords > BRIEF_WORDS) {
    tier = 'full';
    demote.push(`${bodyWords} body words against the ${BRIEF_WORDS} ceiling`);
    E('doc.tier', `tier= brief on an artifact of ${bodyWords} body words against the ceiling of ${BRIEF_WORDS}, so the full twelve-key contract applies and the keys named below are what is missing. The five shipped full-tier artifacts run 649, 734, 834, 1368 and 1432 body words, so ${BRIEF_WORDS} sits under all five — that number is OUR OWN n=6 calibration on this plugin's examples, not a published one. Read the count: split the artifact into the brief one a reader wanted, or fill the twelve keys`);
  }
  const spineText = `${c.keys.get('structure') || ''} ${c.keys.get('spine') || ''}`;
  const spineHit = FULL_TIER_SPINE.exec(spineText);
  if (tier === 'brief' && spineHit) {
    tier = 'full';
    demote.push(`structure= / spine= names "${spineHit[0]}"`);
    E('doc.tier', `tier= brief with "${spineHit[0]}" in structure= or spine= — the incident and decision-record spines keep the full contract at every length, because their ceremony is the part a reader acts on: the falsifier is the check someone re-runs at 3am and the confidence band is what a rollback gets weighed against. This guard reads the two declared keys, so it catches the declared case; the ${BRIEF_WORDS}-word ceiling is the guard that needs no declaration`);
  }
  ctx.tier = tier;
  ctx.tierLine = tier === 'brief'
    ? `tier: brief — ${bodyWords} body words against the ${BRIEF_WORDS} ceiling (our own n=6 calibration); stood down: ${briefRelaxes(kind)}`
    : `tier: full — ${ctx.contractKeys.length} contract keys, falsifier and confidence bands in force` +
      (demote.length ? `; tier= brief refused: ${demote.join(' and ')}` : '');

  const required = tier === 'brief' ? ctx.briefKeys : ctx.contractKeys;
  const missing = c.present ? required.filter((k) => !(c.keys.get(k) || '').trim()) : required.slice();
  const briefHint = `A short artifact declares \`tier= brief\` and fills ${ctx.briefKeys.length}: ${ctx.briefKeys.join(', ')} — under ${BRIEF_WORDS} body words, and outside the incident and decision-record spines`;
  if (!c.present) E('doc.contract', `the head carries the ARTIFACT CONTRACT comment with all ${ctx.contractKeys.length} keys filled — see references/base-layer.html; a plan written after the HTML is a description, not a plan. ${briefHint}`);
  else if (missing.length) {
    E('doc.contract', `ARTIFACT CONTRACT keys still empty: ${missing.join(', ')} — ` + (tier === 'brief'
      ? 'these five are what tier= brief asks for, and each one is a decision the artifact makes'
      : `an empty challenge= means the material is not understood yet, an empty generic-check= means the default was never named. ${briefHint}`));
  } else {
    // "Non-empty" is one character, and one character is the cheapest edit that clears
    // the error. voice= is a token matched against <html data-voice>, so it is exempt, and
    // tier= is an enum; the other eleven run 57-290 characters across the shipped corpus,
    // so 24 is a floor. It holds at brief tier too: five one-word answers decide nothing,
    // and the whole point of dropping seven keys is that the five left carry weight.
    const thin = [...c.keys.keys()].filter((k) => !/^(voice|allow|tier)$/.test(k) && (c.keys.get(k) || '').trim().length < 24);
    if (thin.length) E('doc.contract', `ARTIFACT CONTRACT keys answered in under 24 characters: ${thin.join(', ')} — the shipped corpus runs 57-290 characters a key; a one-word answer clears the gate without deciding anything`);
    // At brief tier the voice is declared once, on <html data-voice>, where q.voice reads it.
    // Writing voice= as well is legal and then it is answered in full, same as at full tier.
    const voiceKey = (c.keys.get('voice') || '').trim();
    if (voiceKey.length < 3 && (tier === 'full' || c.keys.has('voice'))) {
      E('doc.contract', 'ARTIFACT CONTRACT voice= names the voice in full — it is the key q.voice reads back against <html data-voice>');
    }
  }

  // ---- head ---------------------------------------------------------------
  const heads = all(root, (n) => HEADINGS.has(n.tag) || (attr(n, 'role') === 'heading' && has(n, 'aria-level'))).filter(visible);
  const level = (n) => (HEADINGS.has(n.tag) ? +n.tag[1] : +(attr(n, 'aria-level') || 2));
  const h1s = heads.filter((n) => level(n) === 1);
  if (h1s.length !== 1) E('head.h1', `exactly one level-1 heading; found ${h1s.length} — it names the document, and a deck puts it on the title slide`);
  if (heads.length && level(heads[0]) !== 1) E('head.first', `the first visible heading is level 1; found h${level(heads[0])} at line ${heads[0].line}`, heads[0].line);
  for (let i = 1; i < heads.length; i++) {
    const d = level(heads[i]) - level(heads[i - 1]);
    if (d > 1) W('head.order', `heading jumps h${level(heads[i - 1])} -> h${level(heads[i])} at line ${heads[i].line} — each step down goes one level (axe rates heading-order a moderate best-practice)`, heads[i].line);
  }
  for (const h of heads) if (!textOf(h).trim() && !(attr(h, 'aria-label') || '').trim()) E('head.empty', `heading at line ${h.line} carries text or an aria-label`, h.line);

  // ---- sc (self-containment) ---------------------------------------------
  const REMOTE = /^(https?:|\/\/)/i;
  // Anything that is not already inside this file: a bare relative path is a second
  // file that has to travel with the artifact, and it is invisible to REMOTE.
  const INLINE = /^(data:|blob:|#)/i;
  // script[src] is handled on its own below, whatever the scheme.
  const SUB = { img: ['src', 'srcset'], source: ['src', 'srcset'], video: ['src', 'poster'],
    audio: ['src'], iframe: ['src'], embed: ['src'], object: ['data'], track: ['src'], input: ['src'],
    use: ['href', 'xlink:href'], image: ['href', 'xlink:href'] };
  const LINK_OK = /^(canonical|alternate|author|license|me|help|dns-prefetch|preconnect|profile)$/i;
  // One candidate per srcset descriptor: "a.png 1x, https://cdn/b.png 2x" never starts
  // with the remote URL, so testing the whole attribute value sees nothing. A data:
  // candidate is lifted out first, commas and all — base64 is full of them.
  const urls = (a, v) => (a === 'srcset'
    ? v.replace(/data:\S*(\s+[\d.]+[wx])?/gi, '').split(',').map((p) => p.trim().split(/\s+/)[0])
    : [v]).filter(Boolean);
  for (const el of els) {
    // A <script src> is a second file, or a data: URL whose code js.classic and sc.js
    // both skip as "not JavaScript" — either way the gate cannot read what runs.
    if (el.tag === 'script' && (attr(el, 'src') || '').trim()) {
      E('sc.subresource', `script[src] at line ${el.line} loads ${(attr(el, 'src') || '').trim().slice(0, 60)} — the artifact is one file, and a src script is skipped by the syntax gate and by sc.js; paste the code into an inline <script>`, el.line);
    }
    for (const a of SUB[el.tag] || []) {
      for (const v of urls(a, (attr(el, a) || '').trim())) {
        if (!v || INLINE.test(v)) continue;
        const how = REMOTE.test(v)
          ? 'the artifact opens from a file:// path with no network'
          : 'that is a second file the artifact has to travel with';
        E('sc.subresource', `${el.tag}[${a}] at line ${el.line} points at ${v.slice(0, 60)} — ${how}; inline the bytes as a data: URL instead`, el.line);
      }
    }
    if (el.tag === 'link') {
      const rel = (attr(el, 'rel') || '').trim();
      const href = (attr(el, 'href') || '').trim();
      if (href && REMOTE.test(href) && !LINK_OK.test(rel)) E('sc.subresource', `link[rel=${rel || 'stylesheet'}] at line ${el.line} loads ${href.slice(0, 60)} — styles live in the one inline <style>`, el.line);
    }
  }
  for (const r of rules) {
    for (const d of r.decls) {
      const m = /url\(\s*["']?(https?:\/\/|\/\/)[^"')\s]+/i.exec(d.value);
      if (m) E('sc.css', `${d.prop} at line ${r.line} fetches ${m[0].slice(0, 60)} — remote fonts and images are blank on an offline read`, r.line);
    }
  }
  for (const s of ctx.styles) {
    const im = /@import\s+(url\(\s*)?["']?(https?:\/\/|\/\/)[^"')\s]+/i.exec(s.raw || '');
    if (im) E('sc.css', `@import of ${im[0].slice(8, 60)} — paste the rules into this file`, s.line);
  }
  for (const el of els) {
    const m = /url\(\s*["']?(https?:\/\/|\/\/)[^"')\s]+/i.exec(attr(el, 'style') || '');
    if (m) E('sc.css', `${el.tag} at line ${el.line} fetches ${m[0].slice(0, 60)} from a style attribute — a style attribute is CSS that never reaches <style>, so it is the one place a remote url() survives review`, el.line);
  }
  for (const s of ctx.scripts) {
    if (s.nonJs) continue;
    const code = s.code.replace(/\/\*[\s\S]*?\*\//g, (m) => (/validator:allow-remote-doc/.test(m) ? ' ' : m))
      .replace(/\/\/[^\n]*validator:allow-remote-doc[^\n]*/g, ' ');
    const rx = /(fetch\s*\(|import\s*\(|\.src\s*=|new\s+(WebSocket|EventSource|XMLHttpRequest)\s*\()\s*[^;\n]{0,80}?["'`](https?:\/\/[^"'`]+)/g;
    const adjacent = [...code.matchAll(rx)];
    for (const m of adjacent) E('sc.js', `${m[1].trim()} reaches ${m[3].slice(0, 50)} at line ${s.line} — file:// gives the document an opaque origin and the call rejects with a TypeError; inline the data as a <script type="application/json"> island. A URL that is only documentation goes inside a /* validator:allow-remote-doc */ comment`, s.line);
    // Adjacency is one assignment away from useless: `const U='https://…'; fetch(U)`
    // matches nothing above. Tracking the value needs data flow, so the pair is what
    // is checked — a remote literal and a network call in the same script.
    const NET = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|sendBeacon|setAttribute|appendChild)\s*\(|\bimport\s*\(|\.(src|href)\s*=/;
    const lit = /["'`](https?:\/\/[^"'`\s]+)/.exec(code);
    if (lit && NET.test(code) && !adjacent.length) {
      E('sc.js', `the script at line ${s.line} holds the remote literal ${lit[1].slice(0, 50)} and calls a network or DOM-injection API, with the URL reaching the call through a variable — inline the bytes as a <script type="application/json"> island, or put a documentation-only URL inside a /* validator:allow-remote-doc */ comment`, s.line);
    }
    if (s.isModule) {
      for (const m of code.matchAll(/^[ \t]*import\s+(?:[^;'"]*from\s*)?["']([^"']+)["']/gm)) {
        E('sc.import', `static import of "${m[1]}" inside an inline module at line ${s.line} — it voids the entire script silently on file://, with no console error; write the function inline in the same module`, s.line);
      }
    }
  }

  // ---- a11y ---------------------------------------------------------------
  const ids = new Map();
  for (const el of els) { const id = attr(el, 'id'); if (id) ids.set(id, (ids.get(id) || 0) + 1); }
  const named = (el) => {
    const lab = (attr(el, 'aria-label') || '').trim();
    if (/[A-Za-z]{3,}/.test(lab)) return true;
    const by = (attr(el, 'aria-labelledby') || '').split(/\s+/).filter(Boolean);
    if (by.length && by.every((i) => ids.has(i))) return true;
    return false;
  };
  for (const b of all(root, (n) => n.tag === 'button' || (n.tag === 'input' && /^(button|submit|reset)$/i.test(attr(n, 'type') || '')))) {
    const t = b.tag === 'input' ? (attr(b, 'value') || '') : textOf(b);
    if (/[A-Za-z]{3,}/.test(t) || named(b)) continue;
    if (all(b, (n) => n.tag === 'svg' && attr(n, 'role') === 'img' && named(n)).length) continue;
    E('a11y.btn', `button at line ${b.line} has no text and no aria-label of 3+ letters — the name is what a screen reader announces and what voice control types`, b.line);
  }
  for (const img of all(root, 'img')) if (!has(img, 'alt')) E('a11y.img', `<img> at line ${img.line} carries an alt attribute (alt="" when decorative)`, img.line);
  for (const svg of all(root, 'svg')) {
    if (attr(svg, 'aria-hidden') === 'true') continue;
    const titled = all(svg, 'title').some((t) => textOf(t).trim());
    if (attr(svg, 'role') === 'img' && (named(svg) || titled)) continue;
    E('a11y.svg', `<svg> at line ${svg.line} is either aria-hidden="true" (decoration) or role="img" with a <title> or aria-label (the diagram carries the argument)`, svg.line);
  }
  for (const el of els) {
    for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'headers', 'for']) {
      if (a === 'for' && el.tag !== 'label') continue;
      for (const ref of (attr(el, a) || '').split(/\s+/).filter(Boolean)) {
        const n = ids.get(ref) || 0;
        if (n !== 1) E('a11y.idref', `${el.tag}[${a}="${ref}"] at line ${el.line} resolves to ${n} elements — copy-pasted blocks share ids and the reference silently points at the wrong one`, el.line);
      }
    }
    if (attr(el, 'aria-hidden') === 'true' && (FOCUSABLE.has(el.tag) || +(attr(el, 'tabindex') || -1) >= 0)) {
      E('a11y.hidden', `aria-hidden="true" on focusable ${el.tag} at line ${el.line} — keyboard lands on an element the screen reader cannot announce`, el.line);
    }
    if (INTERACTIVE.has(el.tag) && el.tag !== 'label') {
      const inner = all(el, (n) => INTERACTIVE.has(n.tag) && n.tag !== 'label' && (n.tag !== 'a' || has(n, 'href')));
      if (inner.length) E('a11y.nested', `${el.tag} at line ${el.line} contains an interactive ${inner[0].tag} — one control per control`, el.line);
    }
  }
  for (const r of rules) {
    const ov = declOf(r, 'overflow-x') || declOf(r, 'overflow');
    if (ov && /\b(auto|scroll)\b/.test(ov)) {
      for (const el of matchEls(r.selector, els)) {
        if (attr(el, 'tabindex') === '0' && attr(el, 'role') && named(el)) continue;
        // ACT 0ssw9k exempts a scroller whose content is already focusable: the
        // links inside a nav carry the keyboard there without a tabindex.
        if (all(el, (n) => (FOCUSABLE.has(n.tag) && (n.tag !== 'a' || has(n, 'href'))) || +(attr(n, 'tabindex') || -1) >= 0).length) continue;
        E('a11y.scroll', `${r.selector} scrolls (line ${r.line}) so ${el.tag} at line ${el.line} takes tabindex="0", role="region" and a label — WCAG 2.1.1 / ACT 0ssw9k: a mouse-only scroller strands a keyboard`, el.line);
      }
    }
  }
  const FV = rules.filter((r) => /:focus-visible/.test(r.selector));
  // "Declares a visual property" is not "paints": outline-color with no width and no
  // style paints nothing, and background:none / border-color:transparent paint less.
  const BLANK = /^(none|0|0px|transparent|inherit|initial|unset|revert|currentcolor)$/i;
  const paints = (r) => {
    const o = declOf(r, 'outline');
    if (o && !BLANK.test(o.trim())) {
      const w = px(o);
      if (/\b(solid|dashed|dotted|double|groove|ridge|inset|outset|auto)\b/.test(o) || Number.isFinite(w)) {
        return !Number.isFinite(w) || w >= 2 - 0.001;
      }
    }
    const ow = declOf(r, 'outline-width'), os = declOf(r, 'outline-style');
    if (ow && os && !BLANK.test(os.trim())) { const w = px(ow); return !Number.isFinite(w) || w >= 2 - 0.001; }
    for (const p of ['box-shadow', 'border', 'border-color', 'background', 'background-color']) {
      const v = declOf(r, p);
      if (v && !BLANK.test(v.trim())) return true;
    }
    return false;
  };
  const visualFV = FV.filter(paints);
  if (!visualFV.length) E('a11y.focus', ':focus-visible paints a visible ring — `outline: 2px solid var(--accent); outline-offset: 2px;` from references/base-layer.html. An empty :focus{} passes a grep; so does outline-color with no width, background:none and border-color:transparent, and all four show a keyboard user nothing');
  const killers = rules.filter((r) => /^(none|0)\b/.test((declOf(r, 'outline') || '').trim()) && !/:focus-visible/.test(r.selector));
  if (killers.length && !visualFV.length) E('a11y.focus', `outline:none at line ${killers[0].line} with no :focus-visible replacement`, killers[0].line);
  const sticky = rules.filter((r) => /sticky|fixed/.test(declOf(r, 'position') || '') && /header|nav|\.toolbar|\.topbar/i.test(r.selector));
  if (sticky.length && !rules.some((r) => r.decls.some((d) => /^scroll-(padding|margin)/.test(d.prop)))) {
    W('a11y.sticky', `${sticky[0].selector} is pinned (line ${sticky[0].line}) so anchors land under it — add scroll-padding-block-start on :root (SC 2.4.11)`, sticky[0].line);
  }
  const SPACE = { 'line-height': 1.5, 'letter-spacing': 0.12, 'word-spacing': 0.16 };
  for (const el of els) {
    for (const part of (attr(el, 'style') || '').split(';')) {
      const [p, v] = part.split(':').map((x) => (x || '').trim().toLowerCase());
      if (!(p in SPACE) || !/!important/.test(v)) continue;
      const n = parseFloat(v);
      if (Number.isFinite(n) && n < SPACE[p]) E('a11y.spacing', `inline ${p}:${v} at line ${el.line} locks below the WCAG 1.4.12 floor (${SPACE[p]}) and a reader stylesheet cannot override !important`, el.line);
    }
  }
  for (const r of rules) {
    if (!/(^|[\s,>])(body|p|main|article|\.prose|\.body)\b/i.test(' ' + r.selector)) continue;
    const lh = declOf(r, 'line-height');
    const n = lh && !/px|rem|em/.test(lh) ? parseFloat(lh) : lh && /%/.test(lh) ? parseFloat(lh) / 100 : NaN;
    if (Number.isFinite(n) && n < 1.5) W('a11y.lineheight', `line-height ${lh} on ${r.selector} (line ${r.line}) sits under the WCAG 1.4.12 floor of 1.5`, r.line);
  }
  for (const r of rules) {
    const w = px(declOf(r, 'width') || declOf(r, 'min-width') || ''), h = px(declOf(r, 'height') || declOf(r, 'min-height') || '');
    if (!(Number.isFinite(w) && w > 0 && w < 24 - 0.05) && !(Number.isFinite(h) && h > 0 && h < 24 - 0.05)) continue;
    if (matchEls(r.selector, els).some((el) => INTERACTIVE.has(el.tag))) {
      W('a11y.target', `${r.selector} sizes an interactive box under 24x24 CSS px (line ${r.line}) — low confidence: parent transforms and padding are not resolved here, confirm in a browser (SC 2.5.8)`, r.line);
    }
  }

  // ---- mo (motion) --------------------------------------------------------
  const cssText = ctx.cssText;
  // A style attribute is motion the rule walker never sees, and animation-name /
  // animation-duration are the longhands `\banimation\s*:` misses by one character.
  const motionText = `${cssText}\n${ctx.styleAttrText}`;
  const MOTION = /@keyframes|\banimation(-name|-duration)?\s*:(?!\s*(none|0s|0ms|initial))|\btransition(-duration|-property)?\s*:(?!\s*(none|0s|0ms))|scroll-behavior\s*:\s*smooth|\bview-transition/i;
  const JS_MOTION = /\.animate\s*\(|behavior\s*:\s*["']smooth["']/i;
  const motion = MOTION.test(motionText) || JS_MOTION.test(ctx.jsCode);
  const reduce = rules.filter((r) => inAt(r, /prefers-reduced-motion\s*:\s*reduce/i));
  // A reduce block that sets an unrelated property is the empty block with one line
  // of camouflage: the gate asks for the declarations that actually cancel movement.
  const CANCELS = /^(animation|transition|scroll-behavior)(-[a-z-]+)?$/;
  const cancels = reduce.some((r) => r.decls.some((d) => CANCELS.test(d.prop)));
  if (motion && !cancels) {
    E('mo.fallback', `motion is declared, so a \`@media (prefers-reduced-motion: reduce)\` block cancels it with animation-*, transition-* or scroll-behavior declarations${reduce.length ? ' — the reduce block present here sets none of them' : ''}; paste the four-declaration block from references/base-layer.html. Vestibular disorders make unrequested movement a physical symptom`);
  }
  if (/scroll-behavior\s*:\s*smooth/i.test(cssText) && !reduce.some((r) => /auto/.test(declOf(r, 'scroll-behavior') || ''))) {
    W('mo.scroll', 'scroll-behavior:smooth is set, so the reduce block sets scroll-behavior:auto');
  }

  // ---- pr (print) ---------------------------------------------------------
  const printRules = rules.filter((r) => inAt(r, /^@media\b/) && r.at.some((a) => /\bprint\b/.test(a) && !/not\s+print/.test(a)));
  const printDecls = printRules.reduce((a, r) => a + r.decls.length, 0);
  if (!printRules.length || printDecls === 0) {
    E('pr.print', 'a `@media print` block with real declarations — an empty one satisfies a grep and prints a dark flood; paste the print block from references/base-layer.html');
  } else {
    const missing = [];
    if (printDecls < 3) missing.push('at least 3 declarations');
    if (!printRules.some((r) => r.decls.some((d) => /^(break-inside|break-after|page-break-inside|page-break-after)$/.test(d.prop) && /avoid/.test(d.value)))) missing.push('break-inside/break-after:avoid so a figure is not split across pages');
    if (!printRules.some((r) => /nav|\.toc|\.no-print|button/i.test(r.selector) && /none/.test(declOf(r, 'display') || ''))) missing.push('display:none for nav, .toc, .no-print and buttons');
    if (!printRules.some((r) => /a\[href[^\]]*\]::?after/i.test(r.selector) && /attr\(\s*href/i.test(declOf(r, 'content') || ''))) missing.push('a[href^="http"]::after { content: " (" attr(href) ")" } so a link survives paper');
    if (missing.length) W('pr.print', `the print block is missing: ${missing.join('; ')}`, printRules[0].line);
  }
  const details = all(root, 'details');
  if (details.length && !/beforeprint/.test(ctx.jsCode) && !/::details-content/.test(cssText)) {
    E('pr.details', `${details.length} <details> in the file and no beforeprint handler — a closed <details> is never printed and CSS cannot override it (measured: 120 paragraphs print as 1 page without the listener, 5 pages with it); paste the listener from references/base-layer.html`, details[0].line);
  }

  // ---- rf (reflow) --------------------------------------------------------
  const bps = [];
  for (const r of rules) for (const a of (r.isAt ? [r.selector, ...r.at] : r.at)) {
    for (const m of a.matchAll(/(?:max-width|min-width|width\s*[<>]=?)\s*:?\s*([\d.]+)(px|rem|em)/gi)) {
      bps.push(/r?em/i.test(m[2]) ? parseFloat(m[1]) * 16 : parseFloat(m[1]));
    }
  }
  if (!bps.some((v) => v >= 320 && v <= 1400)) {
    E('rf.breakpoint', `a width media query between 320px and 1400px, where the layout actually reflows${bps.length ? ` (found ${bps.map((v) => v + 'px').join(', ')})` : ''} — @media (max-width:1px) satisfies a grep and reflows nothing`);
  }
  for (const r of rules) {
    const w = declOf(r, 'width');
    if (!w || !/px/.test(w)) continue;
    const v = px(w);
    if (v > 320 && /(^|[\s,>])(body|main|\.wrap|\.container|\.page|\.shell|article|section)/i.test(' ' + r.selector)) {
      W('rf.fixed', `${r.selector} fixes width:${w} (line ${r.line}) — max-inline-size lets the layout reflow at 320px (SC 1.4.10)`, r.line);
    }
  }

  // ---- js -----------------------------------------------------------------
  // The gate is V8's parser on both runtimes. Bun's vm.Script accepts top-level
  // `return` (measured on bun 1.3.11), so under bun the classic check runs in a
  // node child when node is on PATH, and says so in the output when it cannot.
  const why = (err) => {
    const out = String(err.stderr || err.message).split('\n');
    return (out.find((l) => /SyntaxError|Error:/.test(l)) || out.find((l) => l.trim()) || 'unknown').trim();
  };
  let bytes = 0, tmp = null;
  const temp = (name, code) => {
    tmp = tmp || mkdtempSync(join(tmpdir(), 'aio-html-'));
    const f = join(tmp, name);
    writeFileSync(f, code);
    return f;
  };
  for (const s of ctx.scripts) {
    if (s.nonJs) continue;
    bytes += Buffer.byteLength(s.code, 'utf8');
    if (s.isModule && NODE) {
      // vm.SourceTextModule is Stability 1 behind a flag; `node --check` needs none.
      // `bun --check` executes the file (measured on bun 1.3.11), so it is never the tool here.
      try { execFileSync(NODE, ['--check', temp(`m${s.line}.mjs`, s.code)], { stdio: ['ignore', 'ignore', 'pipe'] }); }
      catch (err) { E('js.module', `module script at line ${s.line} does not parse: ${why(err)}`, s.line); }
    } else if (s.isModule) {
      W('js.module', `the module script at line ${s.line} went unchecked because node is not on PATH — install node and re-run; this artifact is UNVALIDATED for module syntax`, s.line);
    } else if (NODE) {
      // new vm.Script compiles without running and rejects top-level return,
      // which new Function and vm.compileFunction both accept.
      try { execFileSync(NODE, ['-e', VM_CHECK, temp(`c${s.line}.js`, s.code)], { stdio: ['ignore', 'ignore', 'pipe'] }); }
      catch (err) { E('js.classic', `classic script at line ${s.line} does not parse: ${why(err)}`, s.line); }
    } else {
      try { new vm.Script(s.code, { filename: `inline-${s.line}.js` }); }
      catch (err) { E('js.classic', `classic script at line ${s.line} does not parse: ${err.message}`, s.line); }
      W('js.classic', 'the classic-script gate ran on this runtime\'s parser because node is not on PATH — install node for the same result the CI gate produces');
    }
  }
  if (tmp) { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* temp dir */ } }
  const BUDGET = { report: 2048, explorer: 2048, deck: 3072, editor: 14336, gallery: 3072, diagram: 4608 };
  if (bytes > BUDGET[kind]) W('js.budget', `${bytes} B of inline JS against the ${BUDGET[kind]} B budget for ${kind} — the reference corpus runs 492 B for a static report and 10,332 B for the most complex editor`);
  ctx.jsBytes = bytes;
}

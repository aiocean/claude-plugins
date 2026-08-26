#!/usr/bin/env node
// Structural gate for a self-contained HTML artifact.
//
// Runs on node and on bun from the same file: plain ESM, zero dependencies, no
// Bun-only API. Node ships no HTML parser, so lib/tokenizer.mjs is the parser and
// every check reads the tree. v1 tested strings against the raw source, so one CSS
// comment holding `evidence source citation ... ArrowRight ArrowLeft` cleared all
// eleven semantic checks in an 883-byte file.
//
//   node scripts/validate-html-artifact.mjs --kind report artifacts/x.html
//   bun  scripts/validate-html-artifact.mjs --kind report artifacts/x.html
//
// Exit 0 = no errors (warnings may print). Exit 1 = errors. Exit 2 = usage/read failure.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse, all, attr, textOf, parseCss, inAt, stripCode } from './lib/tokenizer.mjs';
import { coreChecks } from './lib/checks-core.mjs';
import { qualityChecks } from './lib/checks-quality.mjs';
import { genreChecks } from './lib/checks-genre.mjs';
import { copyChecks } from './lib/checks-copy.mjs';

const KINDS = ['report', 'deck', 'explorer', 'editor', 'gallery', 'diagram'];
const CONTRACT_KEYS = ['audience', 'question', 'verdict', 'consequence', 'challenge', 'structure',
  'spine', 'transition-type', 'evidence', 'visuals', 'voice', 'generic-check'];
// tier= brief fills these five. They are the keys that carry a decision — who reads it, what it
// answers, what the answer is, how it is cut, what backs it. The other seven are planning
// apparatus sized for an artifact a stranger audits line by line, and a 300-word weekly status
// pays for them at the same rate as a 1,400-word incident review. checks-core.mjs holds the two
// guards that bound the tier: a word ceiling and a refusal for the incident and decision-record
// spines, because a hatch every artifact can declare gates nothing.
const BRIEF_KEYS = ['audience', 'question', 'verdict', 'spine', 'evidence'];
const ALIAS = { reader: 'audience', transition: 'transition-type', 'transition-type': 'transition-type' };
// js.classic and js.module skip these script types — they are data, not JavaScript.
const NON_JS = new Set(['application/json', 'application/ld+json', 'importmap', 'speculationrules',
  'text/template', 'text/x-template', 'text/html', 'text/markdown']);
const PROSE_SKIP = new Set(['script', 'style', 'template', 'pre', 'code', 'blockquote', 'samp', 'kbd']);

const NOT_CHECKED = [
  'NOT CHECKED: layout overflow, clipped text, collisions, contrast after the cascade,',
  'whether any text fits its box, whether the JS works (only that it parses), keyboard',
  'behaviour, print fidelity beyond block presence, WCAG conformance as a whole.',
  'Structural checks only. This does not judge hierarchy, evidence quality, or truth.',
  'An annotation is counted, never read: whether a reference line sits at the number it',
  'names, whether a callout label matches the datum under it, and whether the mark',
  'overstates what the data supports are all reader questions. q.annot sees six attribute',
  'values on drawn elements and nothing about what they assert.',
  'STILL GAMEABLE, known and unclosed: a URL assembled at runtime ("htt"+"ps://"), a print',
  'or reduced-motion block whose one declaration cancels nothing, a contract key padded to',
  'length, a data-src resolving to an element that does not hold the claim, a data-annot on',
  'a mark the data does not support, and up to three slop rules waived from inside the file.',
  'Closing these needs execution, or a reader.'
];

// ---- args -----------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = { kind: 'report', json: false, quiet: false, file: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--kind') opt.kind = argv[++i] || '';
  else if (a.startsWith('--kind=')) opt.kind = a.slice(7);
  else if (a === '--json') opt.json = true;
  else if (a === '--quiet' || a === '-q') opt.quiet = true;
  else if (a === '--help' || a === '-h') opt.help = true;
  else opt.file = a;
}
if (opt.help || !opt.file || !KINDS.includes(opt.kind)) {
  console.error(`Usage: validate-html-artifact.mjs --kind <${KINDS.join('|')}> [--json] [--quiet] <file.html>`);
  process.exit(2);
}
// Registered before anything can throw: the scope statement is the half of the
// output that keeps a verdict from over-claiming, so no path exits without it.
let emitted = false;
process.on('exit', () => { if (!emitted) for (const l of NOT_CHECKED) console.error(`  ${l}`); });

let html;
try { html = readFileSync(resolve(opt.file), 'utf8'); }
catch (e) { console.error(`ERROR cannot read ${opt.file}: ${e.message}`); emitted = true; process.exit(2); }

// ---- context: parsed once, shared by every check --------------------------
const doc = parse(html);
const root = doc.root;
const els = all(root, (n) => n.type === 'element');
const styles = all(root, 'style');
const cssText = styles.map((s) => s.raw || '').join('\n');
const rules = styles.flatMap((s) => parseCss(s.raw || '', s.line));
const scripts = all(root, 'script').map((n) => {
  const type = (attr(n, 'type') || '').trim().toLowerCase();
  return { node: n, line: n.line, code: n.raw || '', type, nonJs: NON_JS.has(type) || !!attr(n, 'src'), isModule: type === 'module' };
});
const jsText = scripts.filter((s) => !s.nonJs).map((s) => s.code).join('\n');
// jsText is the raw source and is what sc.js reads, because a remote URL hides in a
// string on purpose. Every check that asks whether the script DOES something reads
// jsCode instead: comments blanked, call punctuation inside strings neutralised.
const jsCode = scripts.filter((s) => !s.nonJs).map((s) => stripCode(s.code)).join('\n');
// A style attribute is CSS that never reaches <style>, so url() and transition: hide
// there from every rule-based check unless it is collected here.
const styleAttrText = els.map((n) => attr(n, 'style') || '').filter(Boolean).join(';\n');

// Dark tokens are a separate context, not a flattening: judging a dark-mode pair
// against light tokens grades a colour combination that never renders.
//
// The active voice block counts as a token source. references/voices/*.css declares every
// colour under [data-voice="name"], which is the architecture the four SKILL.md require, so
// a :root-only harvest reported "var(--ink) is not defined in :root" for a file that defines
// it — and the contrast check then graded nothing on exactly the artifacts that followed the
// documented shape. Only the voice named on <html data-voice> is read: the blocks are
// alternatives, and merging two of them grades a pair that never renders together.
const activeVoice = attr(all(root, 'html')[0] || {}, 'data-voice') || '';
const voiceSel = activeVoice
  ? new RegExp(`^\\[data-voice\\s*=\\s*["']?${activeVoice.replace(/[^\w-]/g, '')}["']?\\]\\s*$`)
  : null;
const rootVars = (dark) => {
  const m = new Map();
  for (const r of rules) {
    const sel = r.selector.trim();
    if (!/^(:root|html)\b/.test(sel) && !(voiceSel && voiceSel.test(sel))) continue;
    if (!dark && inAt(r, /prefers-color-scheme\s*:\s*dark/i)) continue;
    for (const d of r.decls) if (d.prop.startsWith('--')) m.set(d.prop, d.value);
  }
  return m;
};
const vars = rootVars(false);
const varsDark = rootVars(true);

const comments = [];
(function collect(n) { for (const c of n.children) { if (c.type === 'comment') comments.push(c); collect(c); } })(root);
const contract = (() => {
  const c = comments.find((x) => /ARTIFACT CONTRACT/i.test(x.text));
  const keys = new Map(); const allow = new Set();
  if (!c) return { present: false, keys, allow, declaredTier: '' };
  let cur = null;
  for (const raw of c.text.split('\n')) {
    const line = raw.trim();
    const m = /^([a-z][a-z-]{2,20})=\s*(.*)$/i.exec(line);
    const key = m ? (ALIAS[m[1].toLowerCase()] || m[1].toLowerCase()) : null;
    if (m && (CONTRACT_KEYS.includes(key) || key === 'allow' || key === 'tier')) { cur = key; keys.set(key, m[2].trim()); }
    else if (cur && line && !/^ARTIFACT CONTRACT/i.test(line)) keys.set(cur, (keys.get(cur) + ' ' + line).trim());
  }
  for (const m of c.text.matchAll(/allow:\s*([\w.]+)/g)) allow.add(m[1]);
  // Which keys are required is a tier decision, and the tier is settled in checks-core.mjs
  // after the guards run — so the missing list is computed there, against the settled tier.
  return { present: true, keys, allow, declaredTier: (keys.get('tier') || '').trim().toLowerCase() };
})();

const body = all(root, 'body')[0] || root;
const ctx = {
  file: opt.file, html, kind: opt.kind, doc, root, els, styles, cssText, rules, scripts, jsText, jsCode,
  styleAttrText, vars, varsDark, comments, contract, body, contractKeys: CONTRACT_KEYS, briefKeys: BRIEF_KEYS,
  prose: textOf(body, PROSE_SKIP).replace(/\s+/g, ' '),
  voice: attr(all(root, 'html')[0] || {}, 'data-voice') || ''
};

// ---- run ------------------------------------------------------------------
const findings = [];
const seen = new Set();
const F = (id, sev, msg, line) => {
  const k = `${id}|${msg}`;
  if (seen.has(k)) return;
  seen.add(k);
  findings.push({ id, sev, msg, line: line ?? null });
};
try {
  coreChecks(ctx, F);
  qualityChecks(ctx, F);
  genreChecks(ctx, F);
  copyChecks(ctx, F);
} catch (e) {
  F('parse', 'E', `the validator could not finish: ${e.message} — treat this artifact as UNVALIDATED`);
}

// Optional escalation. Detect, use, skip silently; never auto-install.
(function vnu() {
  let cmd = null, args = null;
  try { execFileSync('command', ['-v', 'vnu'], { shell: '/bin/sh', stdio: 'ignore' }); cmd = 'vnu'; args = ['--format', 'json', resolve(opt.file)]; }
  catch { /* no vnu on PATH */ }
  if (!cmd && process.env.VNU_JAR) { cmd = 'java'; args = ['-jar', process.env.VNU_JAR, '--format', 'json', resolve(opt.file)]; }
  if (!cmd) return;
  let out = '';
  try { out = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { out = String(e.stdout || e.stderr || ''); }
  try {
    for (const m of (JSON.parse(out).messages || [])) F(`vnu.${m.type || 'info'}`, 'W', `${m.message} (line ${m.lastLine || '?'})`, m.lastLine || null);
  } catch { /* vnu produced no JSON */ }
})();

// ---- output: the scope block is not optional ------------------------------
const errors = findings.filter((f) => f.sev === 'E');
const warns = findings.filter((f) => f.sev === 'W');
const ev = ctx.evidence || { total: 0, cited: 0, pct: 0, uncited: [] };
const cs = ctx.contrastScope || { evaluated: 0, unknown: 0, failing: 0, dual: false, reasons: [] };
// The tier prints on every run, whatever it resolved to. A relaxation nobody can see in the
// output is a gate switched off quietly, which is the shape of every bypass this file guards.
const tierLine = ctx.tierLine || 'tier: full';
const coverageLine = `evidence coverage: ${ev.cited}/${ev.total} claims carry a basis (${ev.pct}%)` +
  (ev.uncited.length ? ` — uncited: ${ev.uncited.slice(0, 8).join(' ')}` : '');
// "across light and dark" prints whenever the document has two renderings — a
// prefers-color-scheme block or a light-dark() token — so the count reads as what it is:
// distinct colour pairs, one per rule per context, with an identical repeat graded once.
const contrastLine = `contrast: ${cs.evaluated} declared pairs evaluated${cs.dual ? ' across light and dark' : ''}, ${cs.unknown} UNKNOWN` +
  // 34 cut "light-dark() is not a single colour" one character short of its last letter, which
  // reads as a broken message rather than a truncated one. Wider, and a cut says it was cut.
  (cs.reasons.length ? ` (${cs.reasons.map((r) => (String(r).length > 60 ? String(r).slice(0, 59) + '…' : String(r))).join('; ')})` : '') + `, ${cs.failing} failing`;
const soupLine = ctx.soup ? `card-soup ratio: ${ctx.soup.ratio.toFixed(2)} (largest repeated group: ${ctx.soup.worst ? ctx.soup.worst.count : 0} members) — warn threshold 5 members and 0.50, our own n=6 calibration` : null;
// The copy numbers print whether or not a copy check fired. That is the difference between a
// gate and a measurement, and the measurement is what lets a human calibrate the two
// thresholds we invented (the CV floor and the three-item-list share).
const cp = ctx.copy;
const copyLines = cp ? [
  `copy: em-dash ${cp.dashRate.toFixed(1)}/1k (budget 4) · paragraph CV ${cp.cv == null ? 'n/a' : cp.cv.toFixed(2)} (floor 0.45, our n=6) · 3-item lists ${cp.three}/${cp.lists}`,
  `      · tier-1 slop ${cp.t1} (${cp.cluster} distinct tier-1+2, cluster threshold 6) · hedges outside data-confidence ${cp.hedges}/${cp.hedgeWords} words` +
  (cp.sentences ? ` · sentences n=${cp.sentences} mean ${cp.mean.toFixed(1)} p90 ${cp.p90}` : '')
] : [];

function emit() {
  if (emitted) return;
  emitted = true;
  const verdict = errors.length ? 'FAIL' : 'PASS';
  if (opt.json) {
    process.stdout.write(JSON.stringify({
      verdict, file: opt.file, kind: opt.kind, tier: ctx.tier || 'full',
      errors: errors.length, warnings: warns.length,
      findings, evidence: ev, contrast: cs,
      cardSoup: ctx.soup ? { ratio: ctx.soup.ratio, members: ctx.soup.worst ? ctx.soup.worst.count : 0, warn: ctx.soup.soup } : null,
      jsBytes: ctx.jsBytes ?? 0, copy: ctx.copy ?? null, notChecked: NOT_CHECKED
    }, null, 2) + '\n');
    return;
  }
  if (!opt.quiet) {
    const byId = new Map();
    for (const f of [...errors, ...warns]) byId.set(f.id, (byId.get(f.id) || []).concat(f));
    for (const [id, list] of byId) {
      for (const f of list.slice(0, 5)) {
        const w = f.sev === 'E' ? console.error : console.log;
        w(`${f.sev === 'E' ? 'ERROR' : 'WARN '} ${id.padEnd(15)} ${f.msg}`);
      }
      if (list.length > 5) console.log(`${'      '} ${id.padEnd(15)} ... ${list.length - 5} more of the same`);
    }
    if (byId.size) console.log('');
  }
  const w = errors.length ? console.error : console.log;
  w(`${verdict} ${opt.file} as ${opt.kind} (${errors.length} error, ${warns.length} warn)`);
  w(`  ${tierLine}`);
  w(`  ${coverageLine}`);
  w(`  ${contrastLine}`);
  if (soupLine) w(`  ${soupLine}`);
  for (const l of copyLines) w(`  ${l}`);
  for (const l of NOT_CHECKED) w(`  ${l}`);
}
emit();
process.exit(errors.length ? 1 : 0);

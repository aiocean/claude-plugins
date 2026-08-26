// ev (evidence) · q (quality, token coherence, contrast, card soup, the annotation layer,
// the 18 slop tells)
//
// Three rules here are measurements with a threshold attached rather than gates, and each
// prints its number so a human can move it: q.cardsoup (n=6 calibration), q.fontsizes and
// friends (token counts), and q.annot (no calibration at all — one chart in the corpus, a
// known false positive on a chart whose finding is its overall shape). All three are WARN.

import { all, attr, has, textOf, wordCount, declOf, inAt } from './tokenizer.mjs';
import { parseColor, contrast, report as axeReport, isLargeText, outOfGamut, oklchToSrgb, toHex } from './color.mjs';

// The seven ICD 203 terms are the only permitted confidence words, with their bands.
export const BANDS = new Map([
  ['almost no chance', [1, 5]], ['very unlikely', [5, 20]], ['unlikely', [20, 45]],
  ['roughly even chance', [45, 55]], ['likely', [55, 80]], ['very likely', [80, 95]],
  ['almost certain', [95, 99]]
]);
const CONF_RX = /\b(almost no chance|very unlikely|roughly even chance|almost certain|very likely|unlikely|likely)\b/gi;
const COUNTERFACTUAL = /\b(should have|shouldn't have|could have|would have|failed to|neglected to|forgot to|obviously|clearly|simply|just needed to|everyone knows|it was known that)\b/gi;

// ---- card soup ------------------------------------------------------------
// MDR (Liu, Grossman, Zhai, KDD'03): ND(s1,s2) = editdistance / mean length; trained threshold 0.3.
// The ND formula and the 0.3 threshold are from the paper. The monotony ratio, the >=5 / >=50%
// gate, and the calibration numbers below are OUR OWN measurements on n=6 — label them as such.
function editDist(a, b) {
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const nd = (a, b) => editDist(a, b) / ((a.length + b.length) / 2);

export function cardSoup(root) {
  const CHARS = new Map();
  const ch = t => { if (!CHARS.has(t)) CHARS.set(t, String.fromCharCode(0x21 + CHARS.size)); return CHARS.get(t); };
  const kids = n => n.children.filter(c => c.type === 'element');
  const sig = (n, d = 0) => d > 5 ? "" : ch(n.tag) + kids(n).map(c => sig(c, d + 1)).join("");  // depth cap 5

  const body = all(root, 'body')[0] || root;
  const total = wordCount(body);
  const groups = [];
  const visit = (x) => {
    const k = kids(x);
    const s = k.map(c => sig(c));
    let run = [0]; const runs = [];
    for (let i = 1; i < s.length; i++) {
      // Floor 3, not 4: a card is routinely <div><h3><p> — a 3-character signature —
      // and at length 3 a one-tag difference already scores 0.33 and splits the run,
      // so the shortest shape the detector can see is also the commonest card.
      const same = s[i].length >= 3 && s[i - 1].length >= 3 && nd(s[i - 1], s[i]) <= 0.3;
      if (same) run.push(i); else { runs.push(run); run = [i]; }
    }
    runs.push(run);
    for (const r of runs) if (r.length >= 3) {
      groups.push({ count: r.length, words: r.reduce((a, i) => a + wordCount(k[i]), 0), line: x.line, parent: x, members: r.map(i => k[i]) });
    }
    for (const c of k) visit(c);
  };
  visit(body);
  const worst = groups.sort((a, b) => b.words - a.words)[0];
  const ratio = worst && total ? worst.words / total : 0;
  return { ratio, worst, groups, total, soup: !!worst && worst.count >= 5 && ratio >= 0.5 };
}
// Calibrated on the plugin's own examples: 0.00, 0.08, 0.22, 0.34, 0.59 (index.html, group_size 4)
// vs a synthetic 6-identical-card grid at 1.00 (group_size 6). The >=5-members AND >=50%-words gate
// fires on the synthetic soup and stays silent on all five real artifacts including the legitimate
// 4-item index. WARN only, never ERROR — n=6.

export function qualityChecks(ctx, F) {
  const { root, els, rules } = ctx;
  const E = (id, msg, line) => F(id, 'E', msg, line);
  const W = (id, msg, line) => F(id, 'W', msg, line);
  const declared = new Set(rules.flatMap(r => r.decls.map(d => d.prop)));

  // ---- ev -----------------------------------------------------------------
  const legend = (el) => { for (let p = el; p; p = p.parent) if ((attr(p, 'class') || '').split(/\s+/).includes('evidence-legend')) return true; return false; };
  const claims = all(root, n => has(n, 'data-claim')).filter(n => !legend(n));
  const label = (el, i) => (attr(el, 'id') ? '#' + attr(el, 'id') : `line ${el.line}`) || `#${i}`;
  if (!claims.length) {
    E('ev.markup', 'every claim carries data-claim="observed|inferred|assumed|recommended" — the attribute is what the coverage line counts, and it replaces the keyword grep that a CSS comment used to satisfy');
  }
  const ENUM = new Set(['observed', 'inferred', 'assumed', 'recommended']);
  const srcIds = new Map();
  for (const el of els) { const id = attr(el, 'id'); if (id) srcIds.set(id, (srcIds.get(id) || 0) + 1); }
  let cited = 0, obs = 0, obsCited = 0;
  const uncited = [];
  claims.forEach((el, i) => {
    const t = (attr(el, 'data-claim') || '').trim();
    if (!ENUM.has(t)) { E('ev.enum', `data-claim="${t}" at line ${el.line} is outside {observed, inferred, assumed, recommended}`, el.line); return; }
    const src = (attr(el, 'data-src') || '').trim(), basis = (attr(el, 'data-basis') || '').trim();
    const conf = (attr(el, 'data-confidence') || '').trim();
    let ok = true;
    if (t === 'observed') { obs++; if (!src) { ok = false; E('ev.basis', `observed claim at line ${el.line} carries data-src pointing at the figure that holds the bytes`, el.line); } else obsCited++; }
    if (t === 'inferred') {
      if (!basis) { ok = false; E('ev.basis', `inferred claim at line ${el.line} carries data-basis (the observations it rests on)`, el.line); }
      // The basis is what a claim owes its reader at any size, so it holds at both tiers. The
      // ICD 203 word and its printed band are analytic tradecraft sized for an artifact someone
      // weighs a decision against, and tier= brief stands them down. A confidence word written
      // anyway still prints its band — ev.band below runs at both tiers, because a word chosen
      // without its numbers is read 32% of the time the way the writer meant it.
      if (!conf && ctx.tier !== 'brief') { ok = false; E('ev.basis', `inferred claim at line ${el.line} carries data-confidence, one of the seven ICD 203 terms`, el.line); }
    }
    if (t === 'recommended' && !basis) { ok = false; W('ev.basis', `recommended claim at line ${el.line} carries data-basis naming the claim it follows from`, el.line); }
    if (t === 'assumed') ok = true;
    for (const ref of [...src.split(/\s+/), ...basis.split(/\s+/)].filter(Boolean)) {
      if ((srcIds.get(ref) || 0) !== 1) E('ev.dangling', `data-src/data-basis "${ref}" at line ${el.line} resolves to ${srcIds.get(ref) || 0} elements`, el.line);
    }
    if (conf) {
      if (!BANDS.has(conf.toLowerCase())) E('ev.conf', `data-confidence="${conf}" at line ${el.line} is outside the seven ICD 203 terms: ${[...BANDS.keys()].join(', ')}`, el.line);
      if (has(el, 'data-likelihood')) E('ev.conf', `line ${el.line} mixes data-confidence and data-likelihood — ICD 203 states terms from different rows are not mixed`, el.line);
      const band = BANDS.get(conf.toLowerCase());
      if (band && !new RegExp(`${band[0]}\\s*[-–—]\\s*${band[1]}`).test(textOf(el))) {
        E('ev.band', `"${conf}" at line ${el.line} prints its band as literal text — "${conf} (${band[0]}-${band[1]}%)". CSS ::after content is absent from the DOM, from the accessibility tree, and from the clipboard, which destroys the 32% -> 66% reader-intent overlap the band exists for`, el.line);
      }
    }
    if (ok && (t === 'assumed' || src || basis)) cited++; else if (!ok) uncited.push(label(el, i));
  });
  for (const m of ctx.prose.matchAll(CONF_RX)) {
    const band = BANDS.get(m[0].toLowerCase());
    const after = ctx.prose.slice(m.index + m[0].length, m.index + m[0].length + 24);
    // The separator is not always a parenthesis. "very likely, 20-45%" and
    // "unlikely: 80-95%" are the same defect and the paren-only matcher saw neither.
    const printed = /^[\s(,:;—–-]{0,3}(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*%?\)?/.exec(after);
    if (printed && band && (+printed[1] !== band[0] || +printed[2] !== band[1])) {
      E('ev.band', `"${m[0]} ${printed[0].trim()}" in prose — the ICD 203 band for "${m[0].toLowerCase()}" is ${band[0]}-${band[1]}%`);
    }
    if (!printed) W('ev.band', `"${m[0]}" in prose with no band beside it — an ICD 203 term carries its numbers as literal text ("${m[0].toLowerCase()} (${band[0]}-${band[1]}%)"); the word alone overlaps a reader's intent 32% of the time against 66% with the band`);
  }
  // A moving ref is a moving ref wherever it is written. The anchor-only walker missed
  // a bare URL in prose, a capitalised host, /raw/ and /tree/, and every data-* slot.
  const REF_RX = /github\.com\/[^/\s"']+\/[^/\s"']+\/(blob|raw|tree)\/([^/\s"'#?]+)/gi;
  const refSites = [['prose', ctx.prose, null]];
  for (const el of els) for (const [a, v] of Object.entries(el.attrs || {})) if (v) refSites.push([`${el.tag}[${a}]`, v, el.line]);
  for (const [where, textv, line] of refSites) {
    for (const m of String(textv).matchAll(REF_RX)) {
      if (!/^[0-9a-f]{40}$/i.test(m[2])) {
        E('ev.sha', `github /${m[1]}/${m[2]}/ ref in ${where}${line ? ` at line ${line}` : ''} — a 40-hex SHA keeps the lines pointing at the same bytes; a branch head moves under the claim`, line);
      }
    }
  }
  for (const f of all(root, n => has(n, 'data-url'))) {
    if (!attr(f, 'data-retrieved')) W('ev.retrieved', `web source at line ${f.line} carries data-retrieved — 8% of pages die within their first year and 38% of 2013 pages were gone by 2023`, f.line);
  }
  // The falsifier is what makes an artifact auditable by someone who was not in the session, and
  // that is worth its cost when the artifact is the record. tier= brief stands it down, bounded
  // by the word ceiling and by the refusal of the incident and decision-record spines in
  // checks-core.mjs — the two shapes whose falsifier a reader actually re-runs.
  const needsFalsifier = ctx.tier !== 'brief' && claims.some(c => /^(inferred|recommended)$/.test(attr(c, 'data-claim') || ''));
  if (needsFalsifier && !all(root, n => has(n, 'data-falsifier')).length) {
    E('ev.falsifier', 'inferred or recommended claims are present, so a [data-falsifier] block names what would show them wrong — each entry is a runnable check or a specific observation with the direction that refutes');
  }
  const cf = [...ctx.prose.matchAll(COUNTERFACTUAL)].map(m => m[0]);
  if (cf.length) W('ev.counterfactual', `${cf.length} counterfactual phrase(s) in prose (${[...new Set(cf)].slice(0, 3).join(', ')}) — describe what the person saw and worked from, not what they did not do`);
  // The hedge-density check lives in checks-copy.mjs as copy.hedge.unbanded, which counts
  // hedges OUTSIDE [data-confidence] against a per-150-word floor. The version that stood here
  // counted every hedge in prose, so it fired on the ones the author had already calibrated
  // with an ICD 203 term and a printed band — the exact form this file asks for.
  const total = claims.length;
  ctx.evidence = { total, cited, uncited, pct: total ? Math.round((cited / total) * 100) : 0, obs, obsCited };
  if (total) {
    if (obs && obsCited < obs) E('ev.coverage', `${obsCited}/${obs} observed claims carry data-src — an observed claim is one you can paste the bytes for, so all of them cite`);
    if (cited / total < 0.8) E('ev.coverage', `${cited}/${total} claims carry a basis (${ctx.evidence.pct}%) against the 80% floor — uncited: ${uncited.slice(0, 8).join(' ')}`);
  }
  // Coverage is a ratio, so one data-claim="assumed" on a throwaway <span> reads 100%
  // over a two-thousand-word argument. The denominator has to answer to the prose:
  // the shipped corpus runs 100-205 words per claim, so 300 is a floor with room.
  const bodyWords = wordCount(ctx.body);
  const need = bodyWords >= 150 ? Math.min(10, Math.ceil(bodyWords / 300)) : 0;
  ctx.evidence.need = need;
  ctx.evidence.words = bodyWords;
  if (need && total < need) {
    E('ev.density', `${total} claim(s) marked across ${bodyWords} body words — at least ${need} carry data-claim (the shipped corpus runs one per 100-205 words). Coverage is a ratio, so a single marked span reports 100% over an unmarked argument`);
  }
  if (need && total && !claims.some(c => /^(observed|inferred)$/.test((attr(c, 'data-claim') || '').trim()))) {
    E('ev.density', 'no claim is marked observed or inferred — an artifact whose every claim is assumed or recommended rests on nothing the reader can check, and assumed carries no basis requirement, so it scores full coverage for free');
  }

  // ---- q: token coherence -------------------------------------------------
  const outsideRoot = rules.filter(r => !/^:root|^html\b/.test(r.selector.trim()));
  const distinct = (prop, list = outsideRoot) => new Set(list.flatMap(r => r.decls.filter(d => d.prop === prop).map(d => d.value.replace(/\s+/g, ' ').trim().toLowerCase())));
  const sizes = new Set([...distinct('font-size')].map(v => (/clamp\(/.test(v) ? 'clamp()' : v)));
  if (sizes.size > 12) W('q.fontsizes', `${sizes.size} distinct font-size values outside :root — body plus at most three other steps, each a var(--step-*); clamp() counts once`);
  const radii = distinct('border-radius');
  if (radii.size > 4) W('q.radii', `${radii.size} distinct border-radius values — one var(--radius) per voice`);
  const shadows = distinct('box-shadow');
  if (shadows.size > 6) W('q.shadows', `${shadows.size} distinct box-shadow values — three elevations, one light source; a fourth is a failure`);
  const fams = distinct('font-family');
  if (fams.size > 3) W('q.families', `${fams.size} distinct font-family stacks — a display face, a text face, a mono face`);
  const customProps = new Set(rules.flatMap(r => r.decls.filter(d => d.prop.startsWith('--')).map(d => d.prop)));
  const literals = new Set();
  for (const r of outsideRoot) for (const d of r.decls) {
    for (const m of d.value.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\([^)]*\)/gi)) literals.add(m[0].toLowerCase());
  }
  if (customProps.size < 6 && literals.size > 20) W('q.colors', `${literals.size} raw colour literals with only ${customProps.size} custom properties — every colour traces to a token`);
  if (!rules.some(r => r.decls.some(d => /^max-(inline-size|width)$/.test(d.prop) && /(var\(--measure|[\d.]+(em|ch))/.test(d.value)))) {
    W('q.measure', 'prose carries a measure cap — max-inline-size: var(--measure) at 34em (~68 characters); 1 character is about 0.5em, so 65ch renders about 85 characters');
  }
  for (const r of rules) for (const d of r.decls) {
    for (const m of d.value.matchAll(/oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.-]+)/gi)) {
      const L = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
      const C = m[2].endsWith('%') ? (parseFloat(m[2]) / 100) * 0.4 : parseFloat(m[2]);
      if (outOfGamut(oklchToSrgb(L, C, parseFloat(m[3])))) W('q.gamut', `${m[0]}) on ${r.selector} (line ${r.line}) falls outside sRGB — the browser gamut-maps it, so the rendered contrast differs from the computed one`, r.line);
    }
  }
  const htmlEl = all(root, 'html')[0];
  if (!htmlEl || !attr(htmlEl, 'data-voice')) E('q.voice', 'the <html> element declares data-voice="..." and the contract repeats it in voice= — a declared voice is what makes "original to the subject" checkable');
  else if (ctx.contract.keys.get('voice') && ctx.contract.keys.get('voice').split(/\s+/)[0] !== attr(htmlEl, 'data-voice')) {
    E('q.voice', `<html data-voice="${attr(htmlEl, 'data-voice')}"> and contract voice=${ctx.contract.keys.get('voice')} name different voices`);
  }

  // ---- q.contrast ---------------------------------------------------------
  // Scope, stated in the output: only rules declaring BOTH color and
  // background-color, with var() resolved from :root. A dark block is its own
  // context — flattening judges dark pairs against light tokens.
  //
  // Two constructions give a document a dark rendering, and both resolve the same way. A
  // `prefers-color-scheme: dark` block redefines the tokens; `light-dark(a, b)` carries both
  // renderings inside one declaration, and it is the form references/voices/*.css and the four
  // SKILL.md ask for, so a checker blind to it grades nothing on the artifacts that follow the
  // documented shape. Each rule is graded once per context against that context's tokens, and a
  // rule whose two contexts resolve to the same two colours renders once and is graded once.
  let evaluated = 0, unknown = 0, failing = 0;
  const reasons = new Set();
  // Read from the parsed declarations, never the raw CSS text: a comment naming light-dark()
  // is prose, and the report exemplar carries exactly such a comment above its token block.
  const hasLightDark = rules.some((r) => r.decls.some((d) => /\blight-dark\s*\(/i.test(d.value)));
  const hasDark = hasLightDark || [...ctx.varsDark].some(([k, v]) => ctx.vars.get(k) !== v);
  const swatch = (c) => (c.unknown ? `?${c.unknown}` : `${c.rgb.map((x) => x.toFixed(4)).join(',')}@${c.alpha}`);
  for (const r of rules) {
    const fgD = declOf(r, 'color'), bgD = declOf(r, 'background-color') || (/^(#|rgb|hsl|oklch|var\(|[a-z]+$)/i.test((declOf(r, 'background') || '').trim()) ? declOf(r, 'background') : undefined);
    if (!fgD || !bgD) continue;
    const inDark = inAt(r, /prefers-color-scheme\s*:\s*dark/i);
    const contexts = inDark ? [['dark', ctx.varsDark]] : hasDark ? [['light', ctx.vars], ['dark', ctx.varsDark]] : [['light', ctx.vars]];
    const graded = new Set();
    for (const [name, vars] of contexts) {
      const fg = parseColor(fgD, vars, name), bg = parseColor(bgD, vars, name);
      const pair = `${swatch(fg)}|${swatch(bg)}`;
      if (graded.has(pair)) continue;
      graded.add(pair);
      if (fg.unknown || bg.unknown || (bg.alpha != null && bg.alpha < 1)) {
        unknown++; reasons.add(fg.unknown || bg.unknown || 'translucent background'); continue;
      }
      evaluated++;
      const front = fg.alpha < 1 ? fg.rgb.map((c, i) => c * fg.alpha + bg.rgb[i] * (1 - fg.alpha)) : fg.rgb;
      const ratio = axeReport(contrast(front, bg.rgb));
      const size = parseFloat(declOf(r, 'font-size') || '16');
      const sizePx = /rem|em/.test(declOf(r, 'font-size') || '') ? size * 16 : size;
      const need = isLargeText(sizePx, declOf(r, 'font-weight') || '400') ? 3.0 : 4.5;
      if (ratio < need) { failing++; E('q.contrast', `${r.selector} (line ${r.line}) renders ${fg.src || fgD} on ${bg.src || bgD} at ${ratio.toFixed(2)}:1 in ${name} mode against the ${need}:1 floor — WCAG 1.4.3`, r.line); }
    }
  }
  ctx.contrastScope = { evaluated, unknown, failing, dual: hasDark, reasons: [...reasons].slice(0, 3) };

  // ---- q.cardsoup ---------------------------------------------------------
  const soup = cardSoup(root);
  ctx.soup = soup;
  if (soup.soup) {
    W('q.cardsoup', `${soup.worst.count} sibling blocks of the same shape at line ${soup.worst.line} carry ${Math.round(soup.ratio * 100)}% of the body words — sections vary in width, density and form according to what they encode: sequence gets a timeline, comparison gets aligned columns, magnitude gets a bar with a baseline. Threshold is our own n=6 calibration, so read the ratio and judge`, soup.worst.line);
  }

  // ---- q.annot: a chart that draws no annotation --------------------------
  // Scope, deliberately narrow: the mandatory chart shape only — a <figure> holding an
  // <svg> AND a <script type="application/json"> island. A sparkline, a CSS diagram and a
  // decorative svg never reach here. The hook is data-annot on the drawn element rather
  // than a class name, because "slo" is one chart's word for a reference line and a
  // class-name grep is the v1 failure this file replaced.
  //
  // WARN, never ERROR, and the false positive is real: a chart whose finding IS the overall
  // shape carries that finding in the figcaption, which is where a trend annotation belongs
  // (Stokes et al., Guideline 3 — perceptual content goes in the title), and this rule fires
  // on it anyway. It is shipped because the base rate runs the other way: a chart of bars
  // plus axis labels is the default output, and the annotation layer is what turns it from
  // data into a finding. There is no calibration behind the threshold — the shipped corpus
  // holds ONE chart — so the message prints what it looked for and hands the judgement back.
  const ANNOT_KINDS = new Set(['reference', 'band', 'event', 'callout', 'direct-label', 'highlight']);
  for (const fig of all(root, 'figure')) {
    const svgs = all(fig, 'svg');
    if (!svgs.length) continue;
    if (!all(fig, n => n.tag === 'script' && /application\/json/i.test(attr(n, 'type') || '')).length) continue;
    const marks = svgs.flatMap(s => all(s, n => has(n, 'data-annot')));
    const named = marks.map(m => (attr(m, 'data-annot') || '').trim().toLowerCase());
    if (named.some(k => ANNOT_KINDS.has(k))) continue;
    const off = named.length ? ` (${named.length} data-annot value(s) outside that set: ${[...new Set(named)].slice(0, 3).join(', ')})` : '';
    W('q.annot', `the chart at line ${fig.line} draws no annotation${off} — I looked inside its <svg> for data-annot="reference|band|event|callout|direct-label|highlight" and found none. The threshold the series is judged against, the window it happened in, the event that moved it, and the one series the caption is about are marks on the chart, and each one also takes a row in the annotation ledger and a kind in the JSON island (references/data-story.md). When the finding IS the overall shape, the figcaption already carries it and this warning is noise — read it and judge`, fig.line);
  }

  // ---- q.slop: the 18 literal tells ---------------------------------------
  // Literal-value greps catch unreflective output, which is the actual failure mode.
  // A model that deliberately picks #6366f2 has already made a decision.
  const css = ctx.cssText.toLowerCase();
  const ruleHas = (fn) => rules.find(fn);
  // One level of var() indirection, so a token cannot launder a literal past a grep:
  // --ui-face: Inter; font-family: var(--ui-face) reads as `inter` here.
  const deref = (v) => String(v || '').replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g, (m, n) => (ctx.vars.get(n) || m).toLowerCase());
  const val = (r, p) => deref((declOf(r, p) || '').toLowerCase());
  // Colour identity, not colour spelling: rgb(99,102,241) and #6366F1 are one colour.
  const AI_HEX = new Set(['#6366f1', '#818cf8', '#4f46e5', '#a855f7', '#8b5cf6']);
  const swatches = new Set();
  for (const r of rules) for (const d of r.decls) {
    for (const m of deref(d.value).matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\([^)]*\)/gi)) swatches.add(m[0].toLowerCase());
  }
  const aiHits = [...swatches].filter((v) => { const p = parseColor(v, ctx.vars); return p.rgb && AI_HEX.has(toHex(p.rgb)); });
  const tells = [
    ['q.slop.1', () => aiHits.length > 0,
      `the indigo/violet AI gradient (#6366f1 #818cf8 #4f46e5 #a855f7 #8b5cf6${aiHits.length ? `, written here as ${aiHits.slice(0, 3).join(' ')}` : ''}) — a flat var(--accent); gradients elsewhere run 2 stops, 30 degrees of hue apart, over at most 240px`],
    ['q.slop.2', () => ruleHas(r => /^(inter|roboto|arial|open sans|lato|system-ui|space grotesk)\b/.test(val(r, 'font-family').replace(/^["']/, ''))),
      'Inter/Roboto/Arial/Open Sans/Lato/system-ui/Space Grotesk as the primary family — a named face from the chosen voice (Anthropic flags Space Grotesk by name as a converged escape hatch)'],
    ['q.slop.3', () => /#f4f1ea|#faf8f5|#fdf6ec/.test(css) && /font-family[^;]*\bserif\b/.test(css.replace(/sans-serif/g, '')) && /font-style\s*:\s*italic/.test(css),
      'the 2026 cluster: cream canvas + serif display + italic headline accent (terracotta accent completes it) — legal as a set only with a one-sentence declared editorial reason in the contract'],
    ['q.slop.4', () => ruleHas(r => val(r, 'border-radius') && /1px solid/.test(val(r, 'border')) && /0 1px 3px/.test(val(r, 'box-shadow'))),
      'radius + 1px border + 0 1px 3px shadow on one element — three separators doing one job; keep one'],
    ['q.slop.5', () => ruleHas(r => /12px/.test(val(r, 'border-radius')) && /4px solid/.test(val(r, 'border-left'))),
      'border-radius:12px + border-left:4px solid as the default card — border-inline-start: 3px solid is reserved for semantic callouts'],
    ['q.slop.6', () => /grid-template-columns\s*:\s*repeat\(\s*3\s*,\s*1fr\s*\)/.test(css) && soup.groups.some(g => g.count >= 3),
      'repeat(3,1fr) filled with three same-shaped cards — run the card-grid ladder: a comparison row, a table, or a chart with a baseline'],
    ['q.slop.7', () => ctx.voice !== 'brutalist-doc' && ruleHas(r => !r.at.some(a => /\bprint\b/.test(a)) && /^#(fff|ffffff)$/.test(val(r, 'background-color') || val(r, 'background')) && /^#(000|000000)$/.test(val(r, 'color'))),
      'untoned #ffffff on #000000 — tone both: neutral #FAFAFA/#1A1A1A, cool #F5F7FA/#1F2937, warm #FFFAF0/#2D2118 (the brutalist-doc voice is the one exception)'],
    ['q.slop.8', () => /padding\s*:\s*7px\s+15px|gap\s*:\s*13px|margin\s*:\s*18px/.test(css),
      'off-scale spacing (padding:7px 15px, gap:13px, margin:18px) — snap to the --sp-* scale'],
    ['q.slop.9', () => { const blues = new Set([...literals].filter(v => { const p = parseColor(v); if (!p.rgb) return false; const [r, g, b] = p.rgb; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 0.12 || b < mx - 0.001) return false; const h = ((4 + (r - g) / (mx - mn)) * 60) % 360; return h > 190 && h < 260; })); return blues.size >= 5; },
      'five or more near-identical blues as raw literals — colours were invented inline; every colour traces to a token'],
    ['q.slop.10', () => outsideRoot.some(r => /^(0\.5rem|\.5rem|0\.75rem|8px|10px|12px)$/.test(val(r, 'border-radius'))),
      'border-radius 0.5rem/0.75rem/8px/10px/12px as a raw literal — 8/10/12px are the training-data defaults; use the voice\'s single var(--radius)'],
    ['q.slop.11', () => all(root, n => /^(h[1-6]|button)$/.test(n.tag)).some(n => /^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(textOf(n))),
      'an emoji prefixing a heading or a button — delete it, or use a mono kicker in caps at letter-spacing .12em'],
    ['q.slop.12', () => /transition\s*:\s*all\b/.test(css) && (/translatey\(\s*-\s*[\d.]/.test(css) || /\btranslate\s*:\s*[^;]*(^|\s)-[\d.]/.test(css)),
      'transition:all + hover translateY lift — name the properties: transition: background-color 150ms ease, border-color 150ms ease, on state changes only'],
    ['q.slop.13', () => /backdrop-filter\s*:\s*blur\(/.test(css),
      'backdrop-filter blur — depth from surface-lightness steps on dark, a hairline plus a background step on light'],
    ['q.slop.14', () => rules.some(r => /(^|[\s,>])h[1-6]\b/.test(' ' + r.selector) && /^(600|semibold)$/.test(val(r, 'font-weight'))),
      'font-weight:600 headings — weight contrast is 100/200 against 800/900, with a 3x jump at the display end'],
    ['q.slop.15', () => /max-width\s*:\s*1280px/.test(css) && !declared.has('max-inline-size'),
      'max-width:1280px with no measure cap on prose — max-inline-size: var(--measure)'],
    ['q.slop.16', () => rules.filter(r => /center/.test(val(r, 'text-align'))).reduce((a, r) => a + r.selector.split(',').filter(s => s.trim()).length, 0) >= 3,
      'centred text across three or more rules — flush left, ragged right, with at most one deliberately centred element'],
    ['q.slop.17', () => soup.groups.some(g => g.count >= 3 && g.members.every(m => (m.children.find(c => c.type === 'element') || {}).tag === 'svg')),
      'a thin-line icon atop every card — replace it with the actual datum: a large numeral, a status glyph, a sparkline'],
    ['q.slop.18', () => all(root, n => /\b(blob|illustration|hero-graphic|undraw)\b/i.test(attr(n, 'class') || '')).length > 0,
      'blob/people illustration — an honest placeholder: striped background plus a monospace label like `product shot (1200x800)`']
  ];
  for (const [id, test, msg] of tells) {
    if (!test()) continue;
    if (ctx.contract.allow.has(id)) { W(id, `allowed by the contract comment: ${msg}`); continue; }
    E(id, `${msg} — a deliberate exception goes in the contract comment as \`allow: ${id}\``);
  }
  // The waiver is for the deliberate exception, singular. Eighteen allow: lines is the
  // gate switched off from inside the file it gates, which is the shape of every
  // exploit above; a voice that needs a fourth exception is not a voice yet.
  if (ctx.contract.allow.size > 3) {
    E('q.slop', `${ctx.contract.allow.size} slop rules waived in the contract (${[...ctx.contract.allow].slice(0, 6).join(', ')}) — at most 3. Past that the tells are not exceptions to a voice, they are the voice`);
  }
}

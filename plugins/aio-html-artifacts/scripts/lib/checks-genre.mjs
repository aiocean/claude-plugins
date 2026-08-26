// k.report · k.deck · k.explorer · k.editor · k.gallery · k.diagram
// Structural checks on the tree. Each one replaces a v1 keyword grep that a CSS
// comment could satisfy: `option|alternative|approach|direction` matched
// `flex-direction`, and `JSON.stringify(0)` passed for an export.

import { all, attr, has, textOf, declOf, inAt } from './tokenizer.mjs';
import { matchEls, visible } from './checks-core.mjs';

const numeric = (s) => /^[\s$€£]*-?[\d][\d,._]*\s*(ms|s|%|kb|mb|gb|b|px|req\/s|x)?\s*$/i.test(s.trim());

export function genreChecks(ctx, F) {
  // jsCode, never jsText: every question below is "does the script DO this", and a
  // comment or one long string answers the raw source for free — that is v1's CSS
  // comment relocated. jsCode has comments blanked and call punctuation inside string
  // literals neutralised, so only code that runs can satisfy these.
  const { root, rules, kind, jsCode: jsText } = ctx;
  const E = (id, msg, line) => F(id, 'E', msg, line);
  const W = (id, msg, line) => F(id, 'W', msg, line);
  const cls = (n, c) => (attr(n, 'class') || '').split(/\s+/).includes(c);

  if (kind === 'report') {
    const sections = all(root, 'section').filter(visible);
    if (sections.length < 2) E('k.report', `${sections.length} <section> in the body — a report is a spine of 3-6 sections, each titled with a claim`);
    // A placement rule, and placement is a question a scrolling document has. Under the brief
    // tier's word ceiling the whole artifact is roughly the first screen, so "before scrolling"
    // names no position. Evidence itself stays required at both tiers: ev.density asks for a
    // marked claim, ev.basis asks for its data-src, and ev.dangling asks that the id resolve to
    // an element that exists — so a brief artifact still ships the thing it points at.
    const early = sections.slice(0, 2);
    if (ctx.tier !== 'brief' && !early.some((s) => all(s, (n) => /^(pre|code|table|figure)$/.test(n.tag)).length)) {
      E('k.report', 'the first two sections carry the artifact itself — a <pre>, <code>, <table> or <figure>, so the reader meets evidence before scrolling');
    }
    const rows = all(root, 'tr').filter((tr) => all(tr, (n) => /^(td|th)$/.test(n.tag)).filter((c) => numeric(textOf(c))).length);
    // A series does not stop being a series because it was typed as a list. Six <li>
    // reading "build 830: 505 ms" is the same magnitude comparison, unplotted.
    const items = all(root, (n) => /^(li|dd)$/.test(n.tag)).filter((n) => /[\d][\d,._]*\s*(ms|s|%|kb|mb|gb|px|req\/s|x)\b/i.test(textOf(n)));
    const series = rows.length >= 4 || items.length >= 4 || all(root, (n) => has(n, 'data-values')).length > 0;
    if (series) {
      const chart = all(root, 'figure').some((f) => all(f, 'svg').length && all(f, (n) => n.tag === 'script' && /application\/json/i.test(attr(n, 'type') || '')).length);
      const shippedTable = all(root, 'table').some((t) => all(t, 'caption').length && all(t, 'tr').length >= 4);
      if (!chart && !shippedTable) {
        E('k.report', `a numeric series is present (${rows.length} numeric rows, ${items.length} numeric list items), so it appears either as a <figure> holding an <svg> plus a <script type="application/json"> data island, or as a captioned <table>. When the only task is Retrieve Value, the table beats every chart — ship the table and say so`);
      }
    }
  }

  if (kind === 'deck') {
    const slides = all(root, (n) => (n.tag === 'section' || n.tag === 'article') && (cls(n, 'slide') || has(n, 'data-slide')));
    const full = slides.filter((s) => all(s, (n) => /^h[1-6]$/.test(n.tag)).length || textOf(s).trim().length >= 40);
    if (full.length < 3) E('k.deck', `${full.length} of ${slides.length} slide sections carry a heading or 40+ characters — a scene runs 25-90 words; below 25 it is a billboard, above 90 it splits`);
    // The other end of the same 25-90 budget. The floor is the error above; the ceiling is a
    // warning, because a quote scene and a dense appendix scene are both legitimately long.
    // Body means prose the audience reads off the screen: the skip set is the one the
    // validator uses for ctx.prose, plus the scene heading and the speaker notes.
    const SCENE_SKIP = new Set(['script', 'style', 'template', 'pre', 'code', 'blockquote', 'samp', 'kbd']);
    const sceneWords = (s) => {
      let n = 0;
      (function walk(node) {
        for (const c of node.children) {
          if (c.type === 'text') { const t = c.text.trim(); if (t) n += t.split(/\s+/).length; continue; }
          if (c.type !== 'element' || /^h[1-6]$/.test(c.tag) || SCENE_SKIP.has(c.tag) || cls(c, 'notes')) continue;
          walk(c);
        }
      })(s);
      return n;
    };
    const long = slides.map((s) => ({ s, n: sceneWords(s) })).filter((x) => x.n > 90).sort((a, b) => b.n - a.n);
    if (long.length) {
      const worst = long[0];
      W('k.deck.words', `${long.length} of ${slides.length} scenes carry more than 90 words of body prose, the worst ${worst.n} words at line ${worst.s.line} — a learner-paced segment runs about 75 seconds, which is 90-130 words of on-screen text before it stops being one idea (Rey et al. meta-analysis), and a presenter at 100-160 wpm moves on while the audience is still reading. The 90 is OUR OWN n=6 calibration on this plugin's examples, not a published number, so read the count and judge: a quote scene and an appendix scene are long on purpose, and a scene holding two claims splits into two`, worst.s.line);
    }
    if (!/addEventListener\s*\(\s*['"]keydown['"]/.test(jsText)) E('k.deck', "a keydown listener drives the deck — addEventListener('keydown', ...)");
    else {
      if (!/Arrow/.test(jsText)) E('k.deck', 'the keydown handler reads ArrowRight and ArrowLeft');
      if (!/classList|scrollIntoView|index|current/.test(jsText)) E('k.deck', 'the keydown handler moves state — classList, scrollIntoView, or an index');
      if (!/ArrowRight|PageDown/.test(jsText)) E('k.deck', 'forward keys: ArrowRight and PageDown');
      if (!/ArrowLeft|PageUp/.test(jsText)) E('k.deck', 'backward keys: ArrowLeft and PageUp');
      if (!/\bHome\b/.test(jsText) || !/\bEnd\b/.test(jsText)) E('k.deck', 'Home jumps to the first scene and End to the last — a reader who lands mid-deck needs both');
    }
    if (!/location\.hash|hashchange/.test(jsText)) E('k.deck', 'the current scene syncs to location.hash so a slide is linkable and reload keeps your place');
    for (const r of rules) {
      if (!/none/.test(declOf(r, 'display') || '')) continue;
      if (!matchEls(r.selector, slides).length) continue;
      const escape = /\bjs-|\[data-js|:target/.test(r.selector) || inAt(r, /@media/) ||
        rules.some((o) => /:target/.test(o.selector) && /block|flex|grid/.test(declOf(o, 'display') || ''));
      if (!escape) E('k.deck', `${r.selector} hides slides with display:none at line ${r.line} — with JavaScript off, five of six scenes are gone. Scope the hiding to a class the script adds (.js-deck .slide), or drive it from :target`, r.line);
    }
    for (const r of rules) {
      if (r.at.some((a) => /\bprint\b/.test(a))) continue;
      const fs = declOf(r, 'font-size');
      if (!fs) continue;
      // clamp() is the form deck-grammar.md tells the author to write, so the floor is read
      // from its first argument — the value that renders at 390px. Skipping every clamp let
      // clamp(0.4rem, 0.5vw, 0.6rem) through the one check the type floor has.
      const cl = /^\s*clamp\(\s*(-?[\d.]+)(px|rem|em|pt)\s*,/i.exec(fs);
      if (!cl && /clamp|var\(|%/.test(fs)) continue;
      const raw = cl ? cl[1] + cl[2] : fs;
      const v = parseFloat(raw);
      const pxv = /rem|em/.test(raw) ? v * 16 : /pt/.test(raw) ? v * (96 / 72) : v;
      if (Number.isFinite(pxv) && pxv < 16) E('k.deck', `${r.selector} sets font-size:${fs} (line ${r.line})${cl ? `, whose clamp() floor ${raw} is what renders at 390px` : ''} — a deck reads from the back of a room: body at 20px on a 1440 screen, 16px at 390, titles at 32px and up`, r.line);
    }
  }

  if (kind === 'explorer') {
    const options = all(root, (n) => has(n, 'data-option'));
    if (options.length < 2) E('k.explorer', `${options.length} elements carry data-option — an explorer places at least two genuinely different options side by side, aligned on shared criteria`);
    const rec = all(root, (n) => has(n, 'data-recommendation'));
    if (rec.length !== 1) E('k.explorer', `${rec.length} elements carry data-recommendation — exactly one, so the page ends with a decision rather than a shrug`);
    const axes = all(root, (n) => n.tag === 'th' && attr(n, 'scope') === 'row');
    if (axes.length < 3) E('k.explorer', `${axes.length} <th scope="row"> criteria rows — options compare on at least three shared criteria, or the comparison is not aligned`);
    // The blank cell is the defect, and the rule reads the cell. A matrix where every criterion
    // was measured is correct work and passes here. Reading the page for the word "unknown"
    // instead of reading the cell errors on exactly that matrix, and a gate that fires on
    // correct work teaches the model to waive the gate.
    //
    // Scope is a criterion row: the <td> cells sharing a <tr> with one of the <th scope="row">
    // criteria counted above. Each of those cells is one option measured against one criterion,
    // which is the thing the rule has an opinion about. It leaves alone every <td> that measures
    // nothing — the empty corner cell a cross-tab header row carries, a spacer, a footnote row.
    //
    // A blank cell hides which criterion went unmeasured, and a dash reads as "measured, and the
    // answer is nothing". Either the cell says what is missing, or it carries data-gap naming the
    // observation that would fill it — 12 characters, because the evidence that settles a
    // criterion does not fit in "tbd" spelled one layer down.
    const PLACEHOLDER = /^(-{1,3}|[–—]{1,3}|n\.?\/?a\.?|tbd|tba|todo|\?{1,3}|\.{2,3}|null|none|pending)$/i;
    for (const th of axes) {
      const row = th.parent;
      if (!row || row.tag !== 'tr') continue;
      for (const td of row.children.filter((c) => c.type === 'element' && c.tag === 'td')) {
        const t = textOf(td).replace(/\s+/g, ' ').trim();
        if (t && !PLACEHOLDER.test(t)) continue;
        if ((attr(td, 'data-gap') || '').trim().length >= 12) continue;
        E('k.explorer', `the comparison cell at line ${td.line} is ${t ? `filled with the placeholder "${t}"` : 'empty'} — a visible gap is a finding and a filled-in guess is a defect, so a criterion nobody measured says so and names what would settle it. Write it in the cell ("not measured — the November soak run settles it") or carry it as data-gap="no load test above 4k msg/s yet; the November soak run settles it", 12 characters or more`, td.line);
      }
    }
  }

  if (kind === 'editor') {
    const controls = all(root, (n) => /^(input|select|textarea)$/.test(n.tag) || has(n, 'contenteditable'));
    if (!controls.length) E('k.editor', 'editable controls — <input>, <select>, <textarea>; the form renders once and state lives in the controls');
    if (!/addEventListener\s*\(\s*['"]click['"]/.test(jsText)) E('k.editor', "a click listener on the actions — addEventListener('click', ...) with event delegation from one root");
    const ser = /JSON\.stringify\(\s*([A-Za-z_$][\w$]*)/.exec(jsText);
    if (!ser) E('k.editor', 'the export serialises live state — JSON.stringify(state), reading from the controls; JSON.stringify(0) satisfied the v1 grep and exported nothing');
    else {
      const names = new Set(controls.flatMap((c) => [attr(c, 'name'), attr(c, 'id')].filter(Boolean)));
      const referenced = [...jsText.matchAll(/[A-Za-z_$][\w$]*\s*[=.[]|['"]([\w-]+)['"]/g)].map((m) => m[1]).filter(Boolean);
      if (names.size && ![...names].some((n) => referenced.includes(n) || new RegExp(`\\b${n.replace(/[^\w]/g, '')}\\b`).test(jsText))) {
        E('k.editor', `the serialiser never mentions any control name or id (${[...names].slice(0, 4).join(', ')}) — the export reads the same identifiers the reader edits`);
      }
    }
    const live = all(root, (n) => /^(polite|assertive)$/.test(attr(n, 'aria-live') || ''));
    if (!live.length) E('k.editor', 'an aria-live="polite" region reports what happened after an action');
    else if (!live.some((n) => (attr(n, 'id') && jsText.includes(attr(n, 'id'))) || /aria-live/.test(jsText))) {
      E('k.editor', `the aria-live region at line ${live[0].line} is written to by the script — an empty live region announces nothing`, live[0].line);
    }
    const GROUP = new Set(['fieldset', 'form', 'li', 'tr', 'section', 'article']);
    const groups = new Map();
    for (const c of controls) {
      let g = c.parent;
      while (g && g.parent && !GROUP.has(g.tag)) g = g.parent;
      const name = (attr(c, 'aria-label') || '').trim() ||
        (all(root, (n) => n.tag === 'label' && attr(n, 'for') === attr(c, 'id')).map((l) => textOf(l).trim())[0]) ||
        (c.parent && c.parent.tag === 'label' ? textOf(c.parent).trim() : '') || '';
      if (!name) continue;
      const key = g;
      if (!groups.has(key)) groups.set(key, new Map());
      const seen = groups.get(key);
      if (seen.has(name)) E('a11y.dupname', `two controls in the same group share the accessible name "${name}" (lines ${seen.get(name)} and ${c.line}) — voice control and a screen-reader list cannot tell them apart; qualify each with its row`, c.line);
      else seen.set(name, c.line);
    }
  }

  if (kind === 'gallery') {
    const toggle = all(root, (n) => (n.tag === 'button' || has(n, 'data-motion-toggle')) && /play|pause|stop|animate/i.test(textOf(n) + ' ' + (attr(n, 'aria-label') || '')));
    if (!toggle.length) E('k.gallery', 'an explicit play/pause control — a gallery is the one genre where motion is the content, and it stays under the reader\'s hand');
    const gated = rules.some((r) => inAt(r, /prefers-reduced-motion\s*:\s*no-preference/i)) ||
      rules.some((r) => /\[data-motion|\.motion-on|\.playing/.test(r.selector) && (declOf(r, 'animation') || declOf(r, 'animation-play-state')));
    if (!gated) E('k.gallery', 'animation starts off and turns on — either wrap the animated rules in @media (prefers-reduced-motion: no-preference) or gate them behind [data-motion="on"] that the play control sets');
  }

  if (kind === 'diagram') {
    const figures = all(root, 'figure').filter((f) => all(f, 'figcaption').length && (all(f, (n) => n.tag === 'svg' && attr(n, 'role') === 'img').length || all(f, (n) => n.tag === 'pre' && attr(n, 'role') === 'img').length || all(f, (n) => /^(ul|ol|table|div)$/.test(n.tag) && (attr(n, 'class') || '').match(/flow|diagram|timeline|grid/)).length));
    if (!figures.length) {
      E('k.diagram', 'the diagram sits in a <figure> with a <figcaption> stating its claim in prose, and its medium is one of: HTML+CSS grid for labelled boxes, <pre role="img" aria-label> for trees and packet layouts, inline <svg role="img"> for geometry');
    }
    const fo = all(root, (n) => n.tag === 'foreignobject');
    if (fo.length) E('k.diagram', `<foreignObject> at line ${fo[0].line} — Safari needs fixed px width and height, ignores percentages, drops external CSS and fails silently; put the text in CSS grid boxes that size themselves`, fo[0].line);
    for (const t of all(root, 'text')) {
      if (!has(t, 'textlength')) W('k.diagram', `<text> at line ${t.line} has no textLength — there is no getBBox() at authoring time, so clamp it: textLength = ceil(chars * 0.6 * fontSize) with lengthAdjust="spacingAndGlyphs"`, t.line);
    }
  }
}

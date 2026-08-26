// copy — the prose lane: headings, link and control labels, captions, the opening and
// closing sentences, the measured AI-vocabulary tells, and the shape of paragraphs and lists.
//
// DESIGN RULE, and it is why this file is shaped the way it is: the copy lane contributes at
// most six ERROR ids, all exact-string or structural. Everything statistical is WARN. A
// false-positive-heavy copy linter trains the model to `allow:` the whole gate, which is the
// exact failure this lane exists to fix.
//
// EXPLICITLY REFUSED — four checks that belong in no version of this file:
//   copy.passive. Ferreira (American Psychologist 2020, doi:10.1037/amp0000620) demonstrates
//     the `to be` + participle + `by` heuristic is neither necessary nor jointly sufficient:
//     it misfires on locatives, on `to be` as a main verb, on active perfect progressives, and
//     misses get-passives. Shipping it would push the model to de-passivise sentences whose
//     passive is correct — and in incident writing that fabricates an agent.
//   copy.sentence-length as a finding. The operative rule is structural (stress positions
//     available against stress-worthy items) and is not computable from a token stream. The
//     distribution prints in the summary block as `sentences: n=214 mean 19.3 p90 31`, and
//     nothing fires on it.
//   Any readability formula. Flesch-Kincaid and Gunning Fog take word length as a proxy for
//     semantic difficulty and sentence length as a proxy for syntactic complexity, so the two
//     inputs are exactly the two things a writer can trivially game. Simplifying word choice in
//     human essays raised AI-misclassification from 5.19% to 56.65% (arxiv 2304.02819v3).
//   A finite-verb heading test. It misfires on imperative headings ("Rotate the key before
//     Friday"), on numeric headings ("47 minutes, 12,400 users"), and on every non-English
//     heading. The stock-list check covers the real failure without the noise.
//
// MEASURED against CALIBRATED, carried into every message that fires:
//   MEASURED — the Tier-1/Tier-2 ratios (recomputed, 2022 baseline, from berenslab
//     llm-excess-vocab), the em-dash human baseline (mean 3.23/1k, median 3.83/1k, n=57,232
//     words), the tricolon counts (3.73 human expert / 7.13 LLM, d=0.95), the hedge density
//     (0.114 vs 0.057, d=0.72), and the device-distribution entropy (0.666 / 0.753, d=0.74).
//   OURS, n=6 calibration on this plugin's own examples, not from any publication — the
//     paragraph-CV floor of 0.45 and the three-item-list share of 0.5. Both say so in the
//     message text, exactly as q.cardsoup already does.

import { all, attr, has, textOf, wordCount, decode, ancestors } from './tokenizer.mjs';

// Mirrors PROSE_SKIP in validate-html-artifact.mjs — the prose surface excludes code,
// samples and quotations, because a quoted em dash is the quoted author's.
const PROSE_SKIP = new Set(['script', 'style', 'template', 'pre', 'code', 'blockquote', 'samp', 'kbd']);
// Widened for the em-dash budget: a cell and a caption are not narrative prose (§3.9 Part C).
const DASH_SKIP = new Set([...PROSE_SKIP, 'td', 'th', 'figcaption', 'caption']);
// The two position-anchored checks read the first words of the prose, and a section's text
// starts with its own heading — so an opener regex anchored at ^ would sit behind the <h2>
// and match nothing on any real document.
const HEADLESS = new Set([...PROSE_SKIP, 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const STOP = new Set(('a an and any are as at be been being but by can could did do does for from had has have '
  + 'he her his how i if in into is it its me my no nor not of off on once one only or other our out over own '
  + 'same she should so some such than that the their them then there these they this those to too us was we '
  + 'were what when where which while who whom why will with would you your').split(' '));

// STOCK LIST, §3.2 verbatim. The spec heads it "54 terms" and enumerates 62; the enumeration
// ships, and the message prints STOCK.size so the number in the output is the number checked.
const STOCK = new Set(['overview', 'introduction', 'intro', 'background', 'context', 'motivation', 'summary',
  'conclusion', 'conclusions', 'analysis', 'details', 'detail', 'discussion', 'results', 'findings',
  'methodology', 'methods', 'method', 'approach', 'architecture', 'implementation', 'considerations',
  'consideration', 'next steps', 'recommendations', 'recommendation', 'appendix', 'scope', 'goals',
  'objectives', 'takeaways', 'key takeaways', 'notes', 'misc', 'miscellaneous', 'other', 'about', 'purpose',
  'problem', 'solution', 'design', 'testing', 'performance', 'security', 'risks', 'tradeoffs', 'trade-offs',
  'options', 'data', 'metrics', 'timeline', 'status', 'q&a', 'questions', 'learnings', 'lessons learned',
  'future work', 'related work', 'deep dive', 'highlights', 'the bottom line', 'tl;dr']);

// WCAG F84 names "click here" and "more" as documented failures of SC 2.4.9.
const BANNED_LINK = new Set(['click here', 'here', 'more', 'read more', 'learn more', 'more info',
  'more information', 'details', 'show more', 'see more', 'view', 'link', 'this', 'download', 'go']);

// §3.8 BANNED MICROCOPY, as whole labels. The rows that are substring guidance rather than a
// whole string — please, sorry, above, below, on the right — stay in references/microcopy.md
// and out of this set, because an exact-string error tier is what keeps the false-positive
// rate at zero.
const BANNED_MICRO = new Set(['click here', 'here', 'more', 'learn more', 'read more', 'submit', 'ok', 'okay',
  'yes', 'no', 'oops', 'whoops', 'uh oh', 'something went wrong', 'an error occurred', 'this field is required',
  'invalid', 'valid', 'toggle', 'loading', 'no data', 'details', 'show', 'show more', 'show less',
  'click to expand', 'additional information', 'halt', 'terminate', 'execute', 'obtain', 'utilize', 'locate',
  'modify', 'perform', 'purchase', 'refer to', 'you forgot', 'you failed', 'illegal', 'forbidden', 'prohibited']);

// TIER 1 — MEASURED >=5x, recomputed against a 2022 baseline over the 407 style-annotated
// words. Family members below 5x ride with their family, exactly as §3.9 lists them.
// Each row ships its replacement; a bare blocklist backfires (pink-elephant, arxiv 2510.15061).
const T1 = new Map([
  ['delves', [47.8, 'name the action: examines, measures, traces — or delete and state the finding']],
  ['delved', [18.5, 'name the action: examines, measures, traces — or delete and state the finding']],
  ['delving', [10.3, 'name the action: examines, measures, traces — or delete and state the finding']],
  ['delve', [9.7, 'name the action: examines, measures, traces — or delete and state the finding']],
  ['underscores', [13.8, 'delete; if it carried meaning, state the consequence: "X breaks Y", "this costs 40 ms"']],
  ['underscoring', [8.7, 'delete; if it carried meaning, state the consequence: "X breaks Y", "this costs 40 ms"']],
  ['underscore', [6.8, 'delete; if it carried meaning, state the consequence: "X breaks Y", "this costs 40 ms"']],
  ['underscored', [5.8, 'delete; if it carried meaning, state the consequence: "X breaks Y", "this costs 40 ms"']],
  ['showcasing', [13.8, 'shows, contains, or delete']],
  ['showcases', [4.8, 'shows, contains, or delete']],
  ['showcased', [4.4, 'shows, contains, or delete']],
  ['meticulously', [10.5, 'delete, or give the actual procedure']],
  ['surpassing', [8.4, 'beats, is faster than — with the number']],
  ['surpasses', [4.6, 'beats, is faster than — with the number']],
  ['commendable', [8.3, 'delete; say what is good and why']],
  ['excels', [7.7, 'is faster at, handles X correctly']],
  ['intricacies', [7.6, '"complex" only if you then say complex in what way']],
  ['intricate', [7.4, '"complex" only if you then say complex in what way']],
  ['intricately', [5.7, '"complex" only if you then say complex in what way']],
  ['garnered', [6.1, 'got, received, has']],
  ['comprehending', [5.7, 'understanding']],
  ['groundbreaking', [5.7, 'delete']],
  ['encompassed', [5.5, 'includes, covers']],
  ['encompassing', [4.4, 'includes, covers']],
  ['emphasizing', [5.4, 'delete the participle tail entirely']],
  ['realm', [5.0, 'area, part of the system, or name it']],
  ['renowned', [4.9, 'delete']],
  ['grappling', [4.9, 'struggling with']],
  ['necessitating', [4.9, 'so we had to']]
]);
// TIER 2 — MEASURED 2x-5x where a ratio was published; the tail carries no per-word ratio and
// says so. At most one occurrence per document, never two in a paragraph.
const T2 = new Map([
  ['crucial', 2.4], ['insights', 2.4], ['notably', 2.9], ['additionally', 2.1], ['comprehensive', 2.0],
  ['exhibited', 2.0], ['enhance', 2.0], ['offering', 4.7], ['bolstering', 4.6], ['advancements', 4.1],
  ['endeavors', 4.1], ['aligning', 4.0], ['aligns', 4.0], ['fostering', 3.9], ['leveraging', 3.9],
  ['formidable', 3.9], ['aiding', 3.9],
  ['pivotal', 0], ['robust', 0], ['seamless', 0], ['nuanced', 0], ['multifaceted', 0], ['tapestry', 0],
  ['testament', 0], ['landscape', 0], ['interplay', 0], ['streamline', 0], ['harness', 0], ['elucidate', 0],
  ['unveil', 0]
]);
const T2_STEM = [[/\brevolutioniz\w*/gi, 'revolutioniz*', 4.2]];

// The hedge list this lane inherits from ev.hedge, which it replaces. Restricting it to text
// outside [data-confidence] is the whole improvement: the seven ICD 203 terms with printed
// bands are the calibrated form, and the old check fired on them too.
const HEDGE = /\b(probably|possibly|may|might|could|seems|appears|I think|arguably|fairly confident|(high|medium|low) confidence)\b/gi;

// Position-anchored, multi-word, at character 0 of the document. The AI-likeness shift is
// measured to concentrate in the first and fifth quintiles (arxiv 2606.22735).
const OPENER_RX = /^(In (today|an era|the (ever-)?evolving)|As (organizations|businesses|developers) increasingly|With the (rise|advent)|This (document|report) (provides|aims)|Let'?s (dive|break|unpack))/i;
const CLOSER_RX = /^\s*(in conclusion|to sum up|overall|ultimately|taken together|despite these challenges|the path forward|i hope this helps)\b/i;
// §3.1 VERDICT VERBS, with their common inflections. A miss here makes the warning rarer,
// never wronger, which is the direction a judgement-adjacent check errs in.
const VERDICT_VERB = /\b(do not ship|ships?|shipped|blocks?|blocked|merges?|merged|reverts?|reverted|adopts?|adopted|rejects?|rejected|migrates?|migrated|keeps?|kept|deletes?|deleted|raises?|raised|lowers?|lowered|approves?|approved|request changes|root cause is|we will|choose|chooses|chose)\b/i;
// §3.4 pattern 1: the hidden verb sitting between the words "the" and "of".
const NOMINAL_RX = /\bthe\s+\w+(tion|sion|ment|ance|ence|ity)\s+of\b/gi;
// A weak, deliberately suppressive proxy for "the caption states something". It only ever
// makes copy.caption.axis quieter — §5 refuses a finite-verb test as a finding of its own.
const COPULA = /\b(is|are|was|were|be|been|has|have|had|does|do|did|will|would|can|could|shows?|showed)\b/i;

const clean = (s) => decode(String(s || '')).replace(/\s+/g, ' ').trim();
const norm = (s) => clean(s).replace(/:$/, '').trim().toLowerCase();
const label = (s) => clean(s).toLowerCase()
  .replace(/[\s→➔›»▸➜>.,;:!?…"'”’)\]]+$/, '')
  .replace(/^[\s"'“‘([]+/, '').trim();
const tokens = (s) => (clean(s).toLowerCase().match(/[a-z0-9][a-z0-9._/@-]*/g) || [])
  .filter((t) => t.length > 1 && !STOP.has(t));
// Whitespace has to follow the terminator, which is what keeps "1.4 GB" and "v4.2" whole; a
// word character has to precede it, which keeps "…ADR-042. Bars run…" splitting where it does.
const SENT_SPLIT = /(?<=[\w)\]"'][.!?])["'”’)\]]*\s+(?=[A-Z(“"'[0-9])/;
const sentences = (s) => clean(s).split(SENT_SPLIT).map((x) => x.trim()).filter(Boolean);
const nwords = (s) => (clean(s).match(/\S+/g) || []).length;
// Text under a node with a caller-supplied skip set and an optional subtree veto.
const textIn = (node, skip, veto) => {
  let out = '';
  const rec = (n) => {
    if (n.type === 'text') { out += n.text; return; }
    if (n.type === 'element' && (skip.has(n.tag) || (veto && veto(n)))) return;
    for (const c of n.children) rec(c);
  };
  rec(node);
  return clean(out);
};
const overlap = (a, b) => {
  const set = new Set(b);
  const hit = [...new Set(a)].filter((t) => set.has(t));
  return { hit, share: a.length ? hit.length / new Set(a).size : 0 };
};

export function copyChecks(ctx, F) {
  const { root, body } = ctx;
  const W = (id, msg, line) => F(id, 'W', msg, line);
  // The hatch is the one the rest of the gate already uses: `allow: copy.<id>` inside the
  // ARTIFACT CONTRACT comment. An allowed error prints as a warning with the waiver named, so
  // the file never looks clean on a rule it switched off. The cap of 3 in q.slop is global,
  // and these ids share that budget.
  const gate = (id, msg, line) => {
    if (ctx.contract.allow.has(id)) F(id, 'W', `allowed by the contract comment: ${msg}`, line);
    else F(id, 'E', `${msg} — a deliberate exception goes in the contract comment as \`allow: ${id}\``, line);
  };
  const warn = (id, msg, line) => {
    if (ctx.contract.allow.has(id)) W(id, `allowed by the contract comment: ${msg}`, line);
    else W(id, msg, line);
  };
  // Defaults first: the summary line prints its numbers whether or not a check fired, which is
  // the difference between a gate and a measurement, and the measurement is what lets a human
  // calibrate the two thresholds we invented.
  ctx.copy = { emdash: 0, dashWords: 0, dashRate: 0, cv: null, paras: 0, lists: 0, three: 0,
    t1: 0, cluster: 0, sentences: 0, mean: 0, p90: 0, hedges: 0, hedgeWords: 0 };

  try {
    // ---- copy.heading.stock (E) --------------------------------------------
    // Two declared exemptions, both opt-in and never guessed: a fixed-format spine
    // (DECISION RECORD, RFC) and a Diátaxis REFERENCE block, marked data-heading="reference".
    //
    // The hatch reaches one block, and the walk is what bounds it: a heading that carries the
    // attribute itself, or a heading whose nearest sectioning ancestor carries it. The walk
    // stops at the first <section>, <article>, <aside> or <nav> and answers from that one
    // element, so a sectioning element nested inside a marked block declares its own. <main>,
    // <body> and <div> are not sectioning content, so an attribute placed on any of them
    // exempts nothing — a hatch that reaches the whole document is the gate switched off from
    // inside the file it gates, which is the shape of every bypass this validator guards.
    const SECTIONING = new Set(['section', 'article', 'aside', 'nav']);
    const exempt = (n) => {
      if (attr(n, 'data-heading') === 'reference') return true;
      for (const p of ancestors(n)) if (SECTIONING.has(p.tag)) return attr(p, 'data-heading') === 'reference';
      return false;
    };
    for (const h of all(root, (n) => /^h[1-6]$/.test(n.tag))) {
      const t = norm(textOf(h));
      if (!STOCK.has(t) || exempt(h)) continue;
      gate('copy.heading.stock', `<${h.tag}> at line ${h.line} reads "${clean(textOf(h))}" — one of the ${STOCK.size} stock container labels, so it names a box rather than making a claim a colleague could answer "that's false" to. Write the finding: "Background" becomes "The retry loop was added in 2023 to absorb an upstream that no longer exists". A fixed-format spine or a Diátaxis reference block carries data-heading="reference" on the heading itself, or on the <section>, <article>, <aside> or <nav> that holds it. The nearest of those four answers for the heading, so a nested section declares its own and the attribute on <main> or a wrapper <div> exempts nothing`, h.line);
    }
    // Second pass over the contract's spine=, so a spine of Overview / Background / Analysis
    // fails at plan time rather than after 400 lines of HTML. The slash separator carries its
    // spaces, which keeps a path like src/data/loader.ts one segment instead of three.
    for (const seg of (ctx.contract.keys.get('spine') || '').split(/[;·|→]|\s+\/\s+|\s+then\s+/)) {
      const t = norm(seg);
      if (t && STOCK.has(t)) {
        gate('copy.heading.stock', `the contract spine names "${clean(seg)}" — a stock container label. A spine entry is the heading it becomes, so it states its claim before the HTML exists`);
      }
    }

    // ---- copy.linktext (E) --------------------------------------------------
    for (const a of all(root, (n) => (n.tag === 'a' && has(n, 'href')) || attr(n, 'role') === 'link')) {
      const text = label(textOf(a));
      const name = text || label(attr(a, 'aria-label'));
      if (!name || !BANNED_LINK.has(name)) continue;
      gate('copy.linktext', `link at line ${a.line} reads "${clean(textOf(a)) || clean(attr(a, 'aria-label'))}" — WCAG F84 names "click here" and "more" as documented failures of SC 2.4.9, and readers mostly look at the first two words of a link. Put the destination in the words: "auth.ts:142", "Postgres advisory-lock docs", "Learn more about rate limits". An aria-label does not exempt the visible words, which is what a sighted reader scans`, a.line);
    }

    // ---- copy.microcopy.banned (E) -----------------------------------------
    const LIVE = (n) => attr(n, 'role') === 'alert' || has(n, 'aria-live');
    for (const el of all(root, (n) => n.type === 'element' && (n.tag === 'button' || n.tag === 'summary' || attr(n, 'role') === 'button' || LIVE(n)))) {
      const t = label(textOf(el));
      if (!t) continue;                      // an initially empty live region is not a defect
      if (!BANNED_MICRO.has(t)) continue;
      const what = el.tag === 'summary'
        ? 'the contents of <summary> are the disclosure widget\'s label, so it is announced as isolated as WCAG assumes for link text — "Full stack trace (42 lines)", "Why we rejected the Redis approach"'
        : 'a control label is {verb} {noun} in sentence case — "Export findings", "Delete 3 rules", "Send review"; a destructive confirmation names the two outcomes instead of OK/Cancel or Yes/No';
      gate('copy.microcopy.banned', `<${el.tag}> at line ${el.line} reads "${clean(textOf(el))}" — ${what}`, el.line);
    }

    // ---- copy.caption.missing (E) ------------------------------------------
    for (const f of all(root, 'figure')) {
      // A <figure> wrapping one <table> is captioned by that table's <caption>. Demanding a
      // <figcaption> as well would print the same sentence twice, which is the duplication
      // copy.dup.alt exists to catch.
      if (all(f, 'figcaption').length || all(f, 'caption').length) continue;
      gate('copy.caption.missing', `<figure> at line ${f.line} carries no <figcaption> and wraps no captioned <table> — the caption is where the finding lives ("p99 latency tripled within 4 minutes of the 14:02 deploy"), and a purely decorative block is not a <figure>`, f.line);
    }
    for (const t of all(root, 'table')) {
      const rows = all(t, 'tr').length;
      if (rows < 2 || all(t, 'caption').length) continue;
      // The exemption above, read in the other direction. A <table> inside a <figure> that
      // already carries a <figcaption> is captioned, and demanding a <caption> as well prints
      // the same sentence twice — the duplication copy.dup.alt exists to catch. Without this
      // the error tier fires on <figure><figcaption>…</figcaption><table>…</table></figure>,
      // which is a correct and accessible construction.
      if (ancestors(t).some((p) => p.tag === 'figure' && all(p, 'figcaption').length)) continue;
      gate('copy.caption.missing', `<table> at line ${t.line} holds ${rows} rows and no <caption> — the caption is the table's findable heading, at most 12 words ("Endpoints changed in this PR"); how it is organised goes in a second sentence`, t.line);
    }

    // ---- copy.dup.alt (E) ---------------------------------------------------
    const flat = (s) => clean(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const f of all(root, 'figure')) {
      const cap = all(f, 'figcaption')[0];
      if (!cap) continue;
      const c = flat(textOf(cap));
      if (!c) continue;
      const alts = [
        ...all(f, 'img').map((i) => [`img alt="${clean(attr(i, 'alt'))}"`, attr(i, 'alt'), i.line]),
        ...all(f, 'title').map((t) => [`<svg><title>${clean(textOf(t))}</title>`, textOf(t), t.line])
      ];
      for (const [where, value, line] of alts) {
        if (!value || flat(value) !== c) continue;
        gate('copy.dup.alt', `${where} at line ${line} repeats its <figcaption> word for word — W3C's decision tree sends redundant text to alt="" and puts the long description elsewhere on the page; the caption states the finding, the alt describes what is drawn, and a screen-reader user hears both`, line);
      }
    }

    // ---- copy.opener (E) ----------------------------------------------------
    // The opening block is every child of <main> up to and including the first <section>. The
    // report exemplar carries its verdict in a lede above the first section, so a scope drawn
    // at the section boundary reads straight past the sentence these two checks look for.
    const firstSection = all(root, 'section')[0] || body;
    const mainEl = all(root, 'main')[0] || body;
    // A body-level <header> before <main> is the banner, and the lede lives there as often as it
    // lives inside <main> — the gallery exemplar carries its whole verdict sentence in one. A
    // scope rooted at <main> reads straight past it, which is the same miss one level up: it
    // costs copy.verdict a false warning and costs copy.opener, an ERROR, a false negative,
    // because "In today's evolving landscape" inside a <header> is then never tested.
    const bodyKids = body.children.filter((c) => c.type === 'element');
    const chain = new Set([mainEl, ...ancestors(mainEl)]);
    const mainIdx = bodyKids.findIndex((c) => chain.has(c));
    const banner = mainIdx > 0 ? bodyKids.slice(0, mainIdx).filter((c) => c.tag === 'header') : [];
    // Document order, stopping when the first <section> closes — wherever that section sits in
    // the subtree. Slicing <main>'s own children instead swallows the whole document the moment
    // the sections are wrapped in a layout <div> or an <article>, and then the "opening block"
    // is the document: copy.closer sees a final paragraph overlapping its opening by ~100% and
    // copy.verdict finds a verdict verb anywhere in the body. Both verdicts flipped on markup
    // the prose never saw.
    const openTextIn = (skip) => {
      let out = '', done = false;
      const rec = (n) => {
        if (done) return;
        if (n.type === 'text') { out += n.text; return; }
        if (n.type === 'element' && skip.has(n.tag)) return;
        for (const c of n.children) { rec(c); if (done) return; }
        if (n === firstSection) done = true;
      };
      for (const b of banner) rec(b);
      rec(mainEl);
      return clean(out);
    };
    const openText = openTextIn(PROSE_SKIP);
    const opening = openTextIn(HEADLESS).slice(0, 120);
    const openLine = (banner[0] || mainEl.children.find((c) => c.type === 'element') || mainEl).line;
    // Containment, not array identity: a <section> nested inside the opening one is still the
    // opening, and the overlap of a document with itself carries no information.
    const inOpening = (n) => n === firstSection || ancestors(n).includes(firstSection);
    if (OPENER_RX.test(opening)) {
      gate('copy.opener', `the document opens "${opening.slice(0, 60)}…" — the opening sentence is the verdict, with a number or a location: "Do not merge #482: the session token comparison at auth/session.go:141 uses == instead of subtle.ConstantTimeCompare". The banned openers are folklore as strings and measured as a zone: the AI-likeness shift concentrates in the first and fifth quintiles of a document`, firstSection.line);
    }

    // ---- copy.slop.t1 / cluster / repeat (W) -------------------------------
    const prose = decode(ctx.prose).toLowerCase();
    const counts = new Map();
    for (const w of [...T1.keys(), ...T2.keys()]) {
      const n = (prose.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
      if (n) counts.set(w, n);
    }
    for (const [rx, name] of T2_STEM) {
      const n = (prose.match(rx) || []).length;
      if (n) counts.set(name, n);
    }
    const t1Hits = [...counts.keys()].filter((w) => T1.has(w));
    ctx.copy.t1 = t1Hits.length;
    ctx.copy.cluster = counts.size;
    for (const w of t1Hits) {
      const [ratio, instead] = T1.get(w);
      warn('copy.slop.t1', `"${w}" appears ${counts.get(w)}x — measured at ${ratio}x its 2022 rate in 15M PubMed abstracts (recomputed, 2022 baseline, style-annotated words only). Write instead: ${instead}. Domain meaning outranks the list — "delve" in a database context, "realm" in Kerberos, "robust" about error tolerance are the words for the job, and that case goes in the contract as \`allow: copy.slop.t1\``);
    }
    if (counts.size >= 6) {
      warn('copy.slop.cluster', `${counts.size} distinct Tier-1/Tier-2 words in one document (${[...counts.keys()].slice(0, 8).join(', ')}) against the 6-distinct threshold — the cluster is the measured signature, not any single word: co-occurrence of "underscore" with "pivotal" rose from r=0.032 (2022) to r=0.449 (2024), and with "delve" 0.018 to 0.311. At 6+ distinct, rewrite the opening and closing paragraphs from scratch`);
    }
    const fam = (stem) => [...counts.keys()].some((w) => w.startsWith(stem));
    for (const pair of [['underscore', 'pivotal'], ['underscore', 'delve']]) {
      if (!fam(pair[0]) || !fam(pair[1])) continue;
      warn('copy.slop.cluster', `"${pair[0]}" and "${pair[1]}" both appear — this is one of the two pairs whose co-occurrence was measured to jump between 2022 and 2024 (${pair[1] === 'pivotal' ? 'r=0.032 to r=0.449' : 'r=0.018 to r=0.311'}). One of them is a coin flip; the pair is a signature`);
    }
    const repeated = [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
    if (repeated.length) {
      warn('copy.slop.repeat', `"${repeated[0][0]}" appears ${repeated[0][1]}x against the cap of 1 per document${repeated.length > 1 ? ` (also ${repeated.slice(1, 4).map(([w, n]) => `${w} ${n}x`).join(', ')})` : ''} — the proportion of papers using "underscore" six or more times rose by over 10,000% between 2022 and 2025, so repetition is a stronger measured signal than presence and a cheaper edit than a ban`);
    }

    // ---- copy.emdash (W) ----------------------------------------------------
    // Narrative prose only: p and li, minus cells, code and captions, minus any dash sitting
    // between two digits, which is a range.
    const dashNodes = all(root, (n) => /^(p|li)$/.test(n.tag) && !ancestors(n).some((a) => /^(p|li)$/.test(a.tag)));
    let dashText = '';
    for (const n of dashNodes) dashText += ' ' + textIn(n, DASH_SKIP);
    // A range keeps its endpoints and loses its dash: replacing the whole match with a space
    // deleted the numerals too, which shrank the denominator and inflated the very rate the
    // exclusion exists to correct. Currency and percent endpoints are ranges as well ($12—$14,
    // 12%—14%); a letter endpoint (p50—p99) is not matched, because widening to letters would
    // swallow the parenthetical dash this budget is about.
    const dashProse = dashText.replace(/([\d%$€£])\s*—\s*([\d$€£])/g, '$1$2');
    const dashes = (dashProse.match(/—/g) || []).length;
    const dashWords = nwords(dashProse);
    const rate = dashWords ? (dashes / dashWords) * 1000 : 0;
    Object.assign(ctx.copy, { emdash: dashes, dashWords, dashRate: rate });
    // One dash is not a rate. At the 4.0/1k budget a single em dash is over budget in any
    // document under 250 narrative words, which is most deck scenes, explorer columns and
    // editor panels — so the finding would report document length, not writing. The source
    // this budget comes from says the same thing about itself: "a population-level indicator,
    // not a per-paper detector". Two occurrences are the floor at which a pattern exists.
    // The measured rate still prints in the summary block at every length.
    if (dashes >= 2 && rate > 4.0) {
      warn('copy.emdash', `${dashes} em dashes across ${dashWords} words of narrative prose = ${rate.toFixed(2)} per 1,000 against the budget of 4.0 — a budget, never a ban: human published essays run mean 3.23/1k and median 3.83/1k (n=57,232 words, 8 essays, single-author preprint, no peer review) and Twain sits at 10.13/1k, above GPT-4.1 under suppression at 9.10/1k. The pre-registered n=69,632 analysis that measured the 4.23%→11.58% rise states plainly that it "is a population-level indicator, not a per-paper detector". Read the rate and judge`);
    }

    // ---- copy.hedge.unbanded (W) — replaces ev.hedge ------------------------
    const unbanded = textIn(body, PROSE_SKIP, (n) => has(n, 'data-confidence'));
    const hedges = [...unbanded.matchAll(HEDGE)].map((m) => m[0]);
    const bodyWords = wordCount(body);
    Object.assign(ctx.copy, { hedges: hedges.length, hedgeWords: bodyWords });
    if (bodyWords && hedges.length > bodyWords / 150) {
      const per = Math.round(bodyWords / hedges.length);
      warn('copy.hedge.unbanded', `${hedges.length} hedges outside [data-confidence] across ${bodyWords} words = one per ${per} words against the floor of one per 150 (${[...new Set(hedges)].slice(0, 4).join(', ')}) — LLM output carries performed-hesitancy markers at about twice human density (0.114 vs 0.057, d=0.72). A genuine hedge names what was not checked and what would settle it, and in this file it already has a home: the seven ICD 203 terms with their bands printed as literal text. "may" inside a conditional is not a hedge, which is why this is a warning`);
    }

    // ---- copy.caption.axis (W), with copy.caption.len folded in ------------
    for (const f of all(root, 'figure')) {
      const cap = all(f, 'figcaption')[0];
      if (!cap) continue;
      const raw = clean(textOf(cap)).replace(/^(figure|fig\.?|table|chart|listing|diagram|example)\s*\d+\s*[.:—-]\s*/i, '');
      const first = sentences(raw)[0] || raw;
      const capTok = tokens(first);
      const labels = new Set([...all(f, 'text'), ...all(f, 'th')].flatMap((n) => tokens(textOf(n))));
      const ov = overlap(capTok, labels);
      if (capTok.length >= 3 && ov.share >= 0.8 && !COPULA.test(first)) {
        warn('copy.caption.axis', `<figcaption> at line ${cap.line} opens "${first.slice(0, 70)}" — ${Math.round(ov.share * 100)}% of its content words are already printed as axis or header labels inside the figure. The opening statement "should not simply repeat the labels on figure axes"; it is a summary statement that names the key finding. In a study of 2,168 participants across 43 line charts, basic axis-naming captions were statistically indistinguishable from no caption at all (χ²(4)=1.564, p=.815 synthetic; 7.168, p=.127 real-world), so this caption is measurably worth nothing. Adding external context raised uptake (Z=2.273, p=.011). The verb test used here is a deliberately weak proxy — it can only make this warning rarer`, cap.line);
      }
      if (nwords(first) > 20) {
        warn('copy.caption.axis', `<figcaption> at line ${cap.line} opens with a ${nwords(first)}-word sentence against 20 — the first sentence is the finding, one complete sentence ("p99 latency tripled within 4 minutes of the 14:02 deploy and did not recover"); the reading key, the method and the source follow it as separate sentences`, cap.line);
      }
    }
    for (const cap of all(root, 'caption')) {
      const first = sentences(clean(textOf(cap)))[0] || clean(textOf(cap));
      if (nwords(first) <= 12) continue;
      warn('copy.caption.axis', `<caption> at line ${cap.line} opens with a ${nwords(first)}-word sentence against 12 — the caption is WHAT this table is, a findable heading ("Endpoints changed in this PR"). HOW it is organised is a summary and goes in a following sentence, and W3C states the summary "should not duplicate information present in the caption". The takeaway goes above the table as prose, because a heading that argues stops being a findable heading`, cap.line);
    }

    // ---- copy.verdict (W) ---------------------------------------------------
    const contractVerdict = (ctx.contract.keys.get('verdict') || '').trim();
    if (contractVerdict) {
      const verb = VERDICT_VERB.test(openText);
      const ov = overlap(tokens(contractVerdict), tokens(openText));
      if (!verb || ov.hit.length < 3) {
        const which = !verb && ov.hit.length < 3
          ? `it carries none of the verdict verbs and shares ${ov.hit.length} content words with the contract's verdict= (3 expected)`
          : !verb
            ? 'it shares its wording with the contract but carries none of the verdict verbs'
            : `it carries a verdict verb but shares ${ov.hit.length} content words with the contract's verdict= (3 expected: ${ov.hit.slice(0, 3).join(', ') || 'none'})`;
        warn('copy.verdict', `the opening block at line ${openLine} — ${which}. The verdict sentence is <specific subject> <verdict verb: ship · do not ship · block · merge · revert · adopt · reject · migrate · keep · delete · raise · lower · approve · request changes · the root cause is · we will · choose> <specific object> <because|so> <consequence>, one clause plus at most one because-clause, at most 30 words. The verb half is the real signal; paraphrase between contract and prose is legitimate, which is why this is a warning and not an error`, firstSection.line);
      }
    }

    // ---- copy.uniform (W) ---------------------------------------------------
    const paras = all(body, 'p').map((p) => wordCount(p)).filter((n) => n > 0);
    ctx.copy.paras = paras.length;
    if (paras.length >= 2) {
      const mean = paras.reduce((a, b) => a + b, 0) / paras.length;
      const sd = Math.sqrt(paras.reduce((a, b) => a + (b - mean) ** 2, 0) / paras.length);
      ctx.copy.cv = mean ? sd / mean : 0;
    }
    if (paras.length >= 6 && ctx.copy.cv < 0.45) {
      warn('copy.uniform', `paragraph length varies by CV ${ctx.copy.cv.toFixed(2)} across ${paras.length} paragraphs, under the floor of 0.45 — that floor is OUR OWN n=6 calibration on this plugin's examples, not a published number, so read the CV and judge. What is measured is the finding underneath it: rhetorical devices are distributed significantly MORE uniformly in LLM documents (normalized entropy 0.753 against 0.666 for human experts, d=0.74). The fix is one paragraph under 25 words and one over 90, placed where the argument wants them`);
    }

    // ---- copy.tricolon (W) --------------------------------------------------
    const lists = all(root, (n) => n.tag === 'ul' || n.tag === 'ol');
    const three = lists.filter((l) => l.children.filter((c) => c.type === 'element' && c.tag === 'li').length === 3);
    ctx.copy.lists = lists.length;
    ctx.copy.three = three.length;
    if (lists.length >= 4 && three.length / lists.length > 0.5) {
      warn('copy.tricolon', `${three.length} of ${lists.length} lists hold exactly three items (${Math.round((three.length / lists.length) * 100)}%) against a 50% share — the 50% is OURS, uncalibrated, derived from a measured finding: LLM documents average 7.13 tricolons against 3.73 for human experts (d=0.95). Three is often the right number, so the fix is not four items everywhere; it is that the list length follows the material. Ban only the equal-length, identically-punctuated stack`);
    }

    // ---- copy.nominalization (W) -------------------------------------------
    const noms = [...decode(ctx.prose).matchAll(NOMINAL_RX)].map((m) => m[0]);
    if (noms.length >= 3) {
      warn('copy.nominalization', `${noms.length} hidden verbs between "the" and "of" (${noms.slice(0, 3).join('; ')}) — the verb is buried in a noun. "Verification of the token occurs prior to the invalidation of the session cache" becomes "The middleware verifies the token before it invalidates the session cache". The government worked example cuts a 54-word sentence to 22 with no loss of meaning. Some are legitimate ("the resolution of the display"), so the count is reported and the hits are not itemized`);
    }

    // ---- copy.closer (W) ----------------------------------------------------
    const sections = all(root, 'section');
    const lastSection = sections.length ? sections[sections.length - 1] : null;
    if (lastSection && lastSection !== firstSection) {
      const m = CLOSER_RX.exec(textIn(lastSection, HEADLESS));
      if (m) {
        warn('copy.closer', `the last section at line ${lastSection.line} opens "${m[1]}" — delete the closing paragraph by default, then re-read. A closing block earns its place by carrying a decision with an owner, an ordered action list with names, a risk not discussed above, or an explicit open question`, lastSection.line);
      }
    }
    // The final paragraph of the argument, which is the last <p> of the last section — a HUD
    // counter and a keyboard legend sit in <nav> at the end of the body and are chrome, and
    // their three content words would clear any overlap ratio by accident.
    const scope = lastSection || all(root, 'main')[0] || body;
    const ps = all(scope, 'p').filter((p) => wordCount(p) > 0);
    const lastP = ps[ps.length - 1];
    // Two distinct sections are what makes a closing block a closing block.
    if (lastP && lastSection && !inOpening(lastSection)) {
      const lp = tokens(textIn(lastP, PROSE_SKIP));
      const ov = overlap(lp, tokens(openText));
      if (lp.length && ov.share >= 0.6) {
        warn('copy.closer', `the final paragraph at line ${lastP.line} reuses ${ov.hit.length} of its ${new Set(lp).size} content words from the opening block (${Math.round(ov.share * 100)}%, threshold 60%) — that is the fractal summary: a summary at the top, per section, and again at the bottom. Pick one level; in this plugin that level is the first screen, and sections end on their last piece of evidence`, lastP.line);
      }
    }

    // ---- sentence distribution: informational, nothing fires on it ---------
    const sent = sentences(decode(ctx.prose)).map(nwords).filter((n) => n > 0);
    if (sent.length) {
      const sorted = [...sent].sort((a, b) => a - b);
      ctx.copy.sentences = sent.length;
      ctx.copy.mean = sent.reduce((a, b) => a + b, 0) / sent.length;
      ctx.copy.p90 = sorted[Math.max(0, Math.ceil(0.9 * sorted.length) - 1)];
    }
  } catch (e) {
    // A copy linter that marks the artifact UNVALIDATED is a disproportionate consequence, so
    // this lane fails as one warning and leaves the structural verdict standing.
    W('copy.internal', `the copy lane stopped early: ${e.message} — the structural checks above are unaffected and their verdict stands; the copy findings for this file are incomplete`);
  }
}

// Zero-dependency HTML tokenizer -> tree, plus a CSS rule reader.
//
// Node ships no HTML parser (probed: 'DOMParser' in globalThis -> false on v25.9.0)
// and Bun's HTMLRewriter would make this validator Bun-only, so the tokenizer is
// shipped and one code path serves both runtimes. Every downstream check consumes
// this tree, never the raw string: v1's eleven semantic checks all ran
// pattern.test(html) and collapsed into a single CSS comment.

export const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);
const RAWTEXT = new Set(['script', 'style']);
const RCDATA = new Set(['textarea', 'title']);

const BLOCK = ['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr',
  'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'];

// An open key closes when any tag in its set opens.
const IMPLIED = {
  p: new Set(BLOCK),
  li: new Set(['li']),
  dt: new Set(['dt', 'dd']),
  dd: new Set(['dt', 'dd']),
  tr: new Set(['tr', 'tbody', 'tfoot', 'thead']),
  td: new Set(['td', 'th', 'tr', 'tbody', 'tfoot', 'thead']),
  th: new Set(['td', 'th', 'tr', 'tbody', 'tfoot', 'thead']),
  option: new Set(['option', 'optgroup']),
  tbody: new Set(['tbody', 'tfoot', 'thead'])
};

const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", hellip: '…', mdash: '—', ndash: '–' };
export const decode = (s) => s.replace(/&(#?\w+);/g, (m, e) => ENTITIES[e.toLowerCase()] ?? ENTITIES[e] ?? m);

function readAttrs(src, from) {
  const attrs = {};
  let j = from, selfClose = false;
  while (j < src.length) {
    while (j < src.length && /\s/.test(src[j])) j++;
    if (src[j] === '/' && src[j + 1] === '>') { selfClose = true; j += 2; break; }
    if (src[j] === '>') { j++; break; }
    if (j >= src.length) break;
    const nameAt = j;
    while (j < src.length && !/[\s=/>]/.test(src[j])) j++;
    const name = src.slice(nameAt, j).toLowerCase();
    if (!name) { j++; continue; }
    let value = '';
    let k = j;
    while (k < src.length && /\s/.test(src[k])) k++;
    if (src[k] === '=') {
      j = k + 1;
      while (j < src.length && /\s/.test(src[j])) j++;
      const q = src[j];
      if (q === '"' || q === "'") {
        const e = src.indexOf(q, j + 1);
        value = decode(src.slice(j + 1, e === -1 ? src.length : e));
        j = e === -1 ? src.length : e + 1;
      } else {
        const v = j;
        while (j < src.length && !/[\s>]/.test(src[j])) j++;
        value = decode(src.slice(v, j));
      }
    }
    attrs[name] = value;
  }
  return { attrs, end: j, selfClose };
}

export function parse(html) {
  const nl = [];
  for (let i = 0; i < html.length; i++) if (html.charCodeAt(i) === 10) nl.push(i);
  const lineAt = (i) => { let lo = 0, hi = nl.length; while (lo < hi) { const m = (lo + hi) >> 1; if (nl[m] < i) lo = m + 1; else hi = m; } return lo + 1; };

  const root = { type: 'root', tag: '#root', attrs: {}, children: [], parent: null, line: 1 };
  const stack = [root];
  const errors = [];
  let doctype = null, elements = 0, maxDepth = 1, i = 0;
  const open = () => stack[stack.length - 1];
  const add = (n) => { n.parent = open(); open().children.push(n); return n; };
  const text = (s, at) => { if (s) add({ type: 'text', tag: '#text', text: s, attrs: {}, children: [], line: lineAt(at) }); };

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { text(html.slice(i), i); break; }
    if (lt > i) text(html.slice(i, lt), i);

    if (html.startsWith('<!--', lt)) {
      const e = html.indexOf('-->', lt + 4);
      add({ type: 'comment', tag: '#comment', attrs: {}, children: [], text: html.slice(lt + 4, e === -1 ? html.length : e), line: lineAt(lt) });
      i = e === -1 ? html.length : e + 3; continue;
    }
    if (/^<!doctype/i.test(html.slice(lt, lt + 9))) {
      const e = html.indexOf('>', lt);
      doctype = { raw: html.slice(lt, e === -1 ? html.length : e + 1), index: lt, line: lineAt(lt) };
      i = e === -1 ? html.length : e + 1; continue;
    }
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      const e = html.indexOf('>', lt);
      i = e === -1 ? html.length : e + 1; continue;
    }
    if (html.startsWith('</', lt)) {
      const e = html.indexOf('>', lt);
      const name = html.slice(lt + 2, e === -1 ? html.length : e).trim().toLowerCase();
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].tag === name) { stack.length = s; break; }
      }
      i = e === -1 ? html.length : e + 1; continue;
    }
    const m = /^<([a-zA-Z][^\s/>]*)/.exec(html.slice(lt, lt + 96));
    if (!m) { text('<', lt); i = lt + 1; continue; }
    const tag = m[1].toLowerCase();
    const { attrs, end, selfClose } = readAttrs(html, lt + m[0].length);

    for (;;) {
      const cur = open();
      if (cur.type === 'root') break;
      const set = IMPLIED[cur.tag];
      if (set && set.has(tag)) stack.pop(); else break;
    }
    const node = add({ type: 'element', tag, attrs, children: [], line: lineAt(lt) });
    elements++;

    if (RAWTEXT.has(tag) || RCDATA.has(tag)) {
      const re = new RegExp(`</${tag}\\s*>`, 'i');
      const rest = html.slice(end);
      const mm = re.exec(rest);
      node.raw = mm ? rest.slice(0, mm.index) : rest;
      node.children.push({ type: 'text', tag: '#text', text: node.raw, attrs: {}, children: [], parent: node, line: lineAt(end) });
      i = mm ? end + mm.index + mm[0].length : html.length;
      continue;
    }
    if (!VOID.has(tag) && !selfClose) {
      stack.push(node);
      maxDepth = Math.max(maxDepth, stack.length);
      if (stack.length > 400) { errors.push(`runaway nesting past 400 levels at line ${node.line}`); break; }
    }
    i = end;
  }
  if (!elements) errors.push('no HTML elements found');
  return { root, doctype, errors, elements, maxDepth, lineAt };
}

export function walk(node, fn) {
  for (const c of node.children) { fn(c); walk(c, fn); }
}
export function all(root, pred) {
  const out = [];
  const test = typeof pred === 'string' ? (n) => n.type === 'element' && n.tag === pred : pred;
  walk(root, (n) => { if (test(n)) out.push(n); });
  return out;
}
export const first = (root, pred) => all(root, pred)[0] || null;
export const attr = (n, name) => (n.attrs ? n.attrs[name] : undefined);
export const has = (n, name) => !!n.attrs && name in n.attrs;
export const classes = (n) => (attr(n, 'class') || '').split(/\s+/).filter(Boolean);
export const hasClass = (n, c) => classes(n).includes(c);
export const ancestors = (n) => { const out = []; for (let p = n.parent; p; p = p.parent) out.push(p); return out; };

const SKIP_TEXT = new Set(['script', 'style', 'template']);
export function textOf(node, skip = SKIP_TEXT) {
  if (node.type === 'text') return node.text;
  if (node.type !== 'element' && node.type !== 'root') return '';
  if (node.type === 'element' && skip.has(node.tag)) return '';
  return node.children.map((c) => textOf(c, skip)).join('');
}
export const words = (node) => textOf(node).trim().split(/\s+/).filter(Boolean);
export const wordCount = (node) => words(node).length;

// ---- JS -------------------------------------------------------------------
// Returns the script with comments blanked and the punctuation that forms a call
// shape neutralised inside string literals, so a grep asking "does this script DO
// x" cannot be answered by prose. v1 was gamed by a CSS comment carrying the whole
// vocabulary; the same trick moves one line over into a JS comment or a single long
// string, so every jsCode grep reads this and never the raw source.
//
// A string literal keeps its value only while that value is a single token:
// 'keydown', 'ArrowRight', '#status' and 'beforeprint' all survive, because that is
// how the working code writes them. The moment a literal holds whitespace it is prose
// — no listener needs "ArrowRight ArrowLeft Home End location.hash" in one string —
// and it is blanked whole. A single-token literal still loses its quotes, parens and
// braces, which is what a fake "addEventListener('keydown')" needs to read as real.
// Template `${...}` holes are code and are stepped back into, not blanked.
const CALL_PUNCT = /[`'"(){}]/g;
const REGEX_AFTER = /^(return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/;
const inert = (s) => (/\s/.test(s) ? s.replace(/[^\n]/g, ' ') : s.replace(CALL_PUNCT, ' '));

export function stripCode(js) {
  const n = js.length;
  let out = '', i = 0, sig = '', word = '';
  const stack = [{ tmpl: false, depth: 0 }];
  const code = (c) => { out += c; if (!/\s/.test(c)) sig = c; word = /[\w$]/.test(c) ? word + c : ''; };
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  const regexOk = () => !sig || '([{,;:!&|?+-*%~^=<>'.includes(sig) || REGEX_AFTER.test(word);

  while (i < n) {
    const top = stack[stack.length - 1];
    const c = js[i], d = js[i + 1];

    if (top.tmpl) {                                   // static text between ${ } holes
      if (c === '`') { stack.pop(); code('`'); i++; continue; }
      if (c === '$' && d === '{') { stack.push({ tmpl: false, depth: 0 }); out += '${'; sig = '{'; word = ''; i += 2; continue; }
      let j = i, seg = '';
      while (j < n && js[j] !== '`' && !(js[j] === '$' && js[j + 1] === '{')) {
        if (js[j] === '\\') { seg += '  '; j += 2; continue; }
        seg += js[j]; j++;
      }
      out += inert(seg); i = j; continue;
    }
    if (c === '}' && stack.length > 1 && top.depth === 0) { stack.pop(); out += '}'; sig = '}'; word = ''; i++; continue; }
    if (c === '{') top.depth++;
    else if (c === '}') top.depth--;

    if (c === '/' && d === '/') { const e = js.indexOf('\n', i); const s = js.slice(i, e === -1 ? n : e); out += blank(s); i += s.length; continue; }
    if (c === '/' && d === '*') { const e = js.indexOf('*/', i + 2); const s = js.slice(i, e === -1 ? n : e + 2); out += blank(s); i += s.length; continue; }
    if (c === '`') { stack.push({ tmpl: true, depth: 0 }); code('`'); i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && js[j] !== c && js[j] !== '\n') j += js[j] === '\\' ? 2 : 1;
      const body = js.slice(i + 1, Math.min(j, n));
      code(c); out += inert(body); code(js[j] === c ? c : ' ');
      i = j + 1; continue;
    }
    if (c === '/' && regexOk()) {                     // a regex may hold // or /* verbatim
      let j = i + 1, cls = false, ok = false;
      for (; j < n && js[j] !== '\n'; j++) {
        if (js[j] === '\\') { j++; continue; }
        if (js[j] === '[') cls = true;
        else if (js[j] === ']') cls = false;
        else if (js[j] === '/' && !cls) { ok = true; break; }
      }
      if (ok) { out += js.slice(i, j + 1); sig = '/'; word = ''; i = j + 1; continue; }
    }
    code(c); i++;
  }
  return out;
}

// ---- CSS ------------------------------------------------------------------
// Comments become equal-length whitespace so line numbers stay true.
export function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// Returns flat rules: { selector, decls:[{prop,value}], at:[prelude...], line }.
export function parseCss(css, startLine = 1) {
  const src = stripCssComments(css);
  const rules = [];
  const at = [];
  let buf = '', line = startLine, i = 0;
  const countNl = (s) => { for (let k = 0; k < s.length; k++) if (s.charCodeAt(k) === 10) line++; };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '{') {
      const prelude = buf.trim();
      buf = ''; i++;
      if (prelude.startsWith('@') && /^@(media|supports|layer|container|scope|document)\b/i.test(prelude)) {
        // A marker rule so an empty conditional block is still visible: `@media
        // (max-width:1px){}` has to be inspectable to be rejected.
        rules.push({ selector: prelude, decls: [], at: at.slice(), line, isAt: true, raw: '' });
        at.push(prelude);
      } else if (prelude.startsWith('@')) {
        // @keyframes / @font-face / @page: record and swallow the block whole.
        let depth = 1, from = i;
        while (i < src.length && depth > 0) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++; }
        const body = src.slice(from, Math.max(from, i - 1));
        rules.push({ selector: prelude, decls: readDecls(body), at: at.slice(), line, raw: body });
        countNl(body);
      } else {
        let depth = 1, from = i;
        while (i < src.length && depth > 0) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++; }
        const body = src.slice(from, Math.max(from, i - 1));
        rules.push({ selector: prelude, decls: readDecls(body), at: at.slice(), line, raw: body });
        countNl(body);
      }
      continue;
    }
    if (ch === '}') { at.pop(); buf = ''; i++; continue; }
    if (ch === '\n') line++;
    buf += ch; i++;
  }
  return rules;
}

function readDecls(body) {
  const decls = [];
  // Nested blocks inside a rule body are not declarations; drop them.
  const flat = body.replace(/\{[^{}]*\}/g, '');
  for (const part of flat.split(';')) {
    const c = part.indexOf(':');
    if (c === -1) continue;
    const prop = part.slice(0, c).trim().toLowerCase();
    const value = part.slice(c + 1).trim();
    if (prop && value && !/\s/.test(prop.replace(/^--/, 'x'))) decls.push({ prop, value });
  }
  return decls;
}

export const declOf = (rule, prop) => {
  let out;
  for (const d of rule.decls) if (d.prop === prop) out = d.value;
  return out;
};
export const inAt = (rule, re) => rule.at.some((a) => re.test(a));

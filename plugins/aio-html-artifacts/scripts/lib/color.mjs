// Colour parsing and WCAG 2.2 contrast. sRGB channels are 0..1 throughout.
// APCA is not implemented and never gates: it was marked exploratory and removed
// from the WCAG 3 working draft in July 2023, and WCAG 2.2 AA is what is legally
// operative. If APCA is ever surfaced it prints alongside, never instead.

// WCAG 2.2 relative luminance. Threshold is 0.04045 (changed from 0.03928 in May 2021).
const lin = v => { const s = v < 0 ? -1 : 1, x = Math.abs(v);
  return x <= 0.04045 ? v / 12.92 : s * Math.pow((x + 0.055) / 1.055, 2.4); };
export const luminance = ([r,g,b]) => 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
export const contrast  = (a,b) => { const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05); };

// Alpha is flattened BEFORE luminance (CSS Compositing 1):
//   Rrgb x Ra = Srgb x Sa + Drgb x Da x (1 - Sa);  Co = co / ao
export function flatten(src, srcA, dst, dstA = 1) {
  const ao = srcA + dstA * (1 - srcA);
  if (ao === 0) return { rgb: dst, alpha: 0 };
  const co = src.map((c, i) => (c * srcA + dst[i] * dstA * (1 - srcA)) / ao);
  return { rgb: co, alpha: ao };
}

// Large-text classification, matching axe exactly:
export const isLargeText = (px, weight) => {
  const bold = parseFloat(weight) >= 700 || weight === 'bold';
  const pt = Math.ceil(px * 72) / 96;            // note: ceil on px*72, then /96
  return bold ? pt >= 14 : pt >= 18;             // 18pt = 24px, 14pt bold = 18.66px
};
// Report the way axe does: Math.floor(ratio * 100) / 100.
// Thresholds: 4.5 normal text (1.4.3) · 3.0 large text · 3.0 non-text UI (1.4.11) · 7.0 AAA.
export const report = (ratio) => Math.floor(ratio * 100) / 100;
export const THRESHOLD = { normal: 4.5, large: 3.0, nonText: 3.0, aaa: 7.0 };

// OKLCH -> sRGB (CSS Color 4 sample matrices). Verified:
//   oklch(0.628 0.2577 29.23) -> #ff0000 | oklch(1 0 0) -> #ffffff
//   contrast(white,black) = 21.00 | #767676 on white = 4.542 (AA boundary) | #777777 = 4.478 (fails)
const mul = (M,v) => M.map(r => r[0]*v[0] + r[1]*v[1] + r[2]*v[2]);
const OKLAB_TO_LMS = [[1, 0.3963377773761749, 0.2158037573099136],
                      [1,-0.1055613458156586,-0.0638541728258133],
                      [1,-0.0894841775298119,-1.2914855480194092]];
const LMS_TO_XYZ   = [[ 1.2268798758459243,-0.5578149944602171, 0.2813910456659647],
                      [-0.0405757452148008, 1.1122868032803170,-0.0717110580655164],
                      [-0.0763729366746601,-0.4214933324022432, 1.5869240198367816]];
const XYZ_TO_LRGB  = [[ 12831/3959,     -329/214,      -1974/3959],
                      [-851781/878810, 1648619/878810, 36519/878810],
                      [ 705/12673,     -2585/12673,    705/667]];
const gam = v => { const s = v < 0 ? -1 : 1, x = Math.abs(v);
  return x > 0.0031308 ? s * (1.055 * Math.pow(x, 1/2.4) - 0.055) : 12.92 * v; };
export function oklchToSrgb(L, C, H) {           // L: 100% = 1 · C: 100% = 0.4 · H in deg
  const h = H * Math.PI / 180;
  const lms = mul(OKLAB_TO_LMS, [L, C*Math.cos(h), C*Math.sin(h)]).map(c => c ** 3);
  return mul(XYZ_TO_LRGB, mul(LMS_TO_XYZ, lms)).map(gam);
}
// Browser gamut-maps out-of-range channels, so rendered contrast differs from the maths.
export const outOfGamut = (rgb) => rgb.some(c => c < -0.001 || c > 1.001);

const NAMED = {
  white: [1, 1, 1], black: [0, 0, 0], red: [1, 0, 0], lime: [0, 1, 0], blue: [0, 0, 1],
  yellow: [1, 1, 0], cyan: [0, 1, 1], aqua: [0, 1, 1], magenta: [1, 0, 1], fuchsia: [1, 0, 1],
  silver: [0.7529, 0.7529, 0.7529], gray: [0.5020, 0.5020, 0.5020], grey: [0.5020, 0.5020, 0.5020],
  maroon: [0.5020, 0, 0], olive: [0.5020, 0.5020, 0], green: [0, 0.5020, 0], purple: [0.5020, 0, 0.5020],
  teal: [0, 0.5020, 0.5020], navy: [0, 0, 0.5020], orange: [1, 0.6471, 0]
};

const num = (t, scale = 1) => {
  const s = String(t).trim();
  if (s.endsWith('%')) return parseFloat(s) / 100;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v / scale : NaN;
};
const argsOf = (s) => s.split(/[,/]|\s+/).map(x => x.trim()).filter(Boolean);

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
          : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return t.map(v => v + m);
}

// Top-level commas only, so light-dark(rgb(1,2,3), #fff) splits into two arms and not four.
const splitTop = (s) => {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
};

// -> { rgb:[0..1 x3], alpha, src } | { unknown: '<reason>' }
// `scheme` is 'light' or 'dark' and names which rendering the caller is grading. It is what
// resolves light-dark(a, b): a renders under light, b under dark, and the caller runs the pair
// once per context the way it already runs a prefers-color-scheme block. A caller that names no
// scheme reads light-dark() as two colours and reports UNKNOWN, because collapsing the two arms
// into one number grades a dark-mode pair against light tokens.
export function parseColor(input, vars = new Map(), scheme = null, depth = 0) {
  if (input == null) return { unknown: 'empty' };
  let s = String(input).trim().replace(/\s*!important$/i, '');
  if (!s) return { unknown: 'empty' };
  const low = s.toLowerCase();

  if (depth < 8) {
    const v = /^var\(\s*(--[^,)\s]+)\s*(?:,([\s\S]*))?\)$/.exec(s);
    if (v) {
      const token = vars.get(v[1]);
      if (token != null) return parseColor(token, vars, scheme, depth + 1);
      if (v[2]) return parseColor(v[2], vars, scheme, depth + 1);
      return { unknown: `var(${v[1]}) is not defined in :root` };
    }
  }
  // Anchored, so a light-dark() nested inside a gradient or a color-mix() falls to the
  // multi-colour branch below and stays UNKNOWN — there the two arms are one input among
  // several and the rendering is not either arm.
  const ld = /^light-dark\(([\s\S]*)\)$/i.exec(s);
  if (ld) {
    if (scheme !== 'light' && scheme !== 'dark') return { unknown: 'light-dark() holds two colours and the caller named no colour scheme' };
    const arms = splitTop(ld[1]);
    if (arms.length !== 2 || !arms[0] || !arms[1]) return { unknown: `light-dark() takes two colours; found ${arms.filter(Boolean).length}` };
    if (depth >= 8) return { unknown: 'light-dark() nests deeper than 8 levels' };
    return parseColor(arms[scheme === 'light' ? 0 : 1], vars, scheme, depth + 1);
  }
  if (low === 'transparent') return { rgb: [0, 0, 0], alpha: 0, src: s };
  if (low === 'currentcolor') return { unknown: 'currentColor depends on the cascade' };
  if (low === 'inherit' || low === 'initial' || low === 'unset' || low === 'revert') return { unknown: `${low} depends on the cascade` };
  if (/^(canvas|canvastext|linktext|buttonface|buttontext|highlight|field|fieldtext|graytext|accentcolor)/i.test(low)) return { unknown: 'system colour keyword' };
  if (/gradient\(|color-mix\(|url\(|image-set\(|light-dark\(|env\(|calc\(/i.test(low)) return { unknown: low.replace(/\(.*/s, '()') + ' is not a single colour' };
  if (NAMED[low]) return { rgb: NAMED[low], alpha: 1, src: s };

  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    const h = m[1];
    const ex = h.length <= 4 ? h.split('').map(c => c + c).join('') : h;
    if (ex.length !== 6 && ex.length !== 8) return { unknown: `malformed hex ${s}` };
    const b = ex.match(/../g).map(x => parseInt(x, 16) / 255);
    return { rgb: b.slice(0, 3), alpha: b.length === 4 ? b[3] : 1, src: s };
  }
  m = /^rgba?\(([^)]*)\)$/i.exec(s);
  if (m) {
    const a = argsOf(m[1]);
    if (a.length < 3) return { unknown: `malformed ${s}` };
    const rgb = a.slice(0, 3).map(t => (t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t) / 255));
    if (rgb.some(v => !Number.isFinite(v))) return { unknown: `non-numeric channel in ${s}` };
    return { rgb, alpha: a[3] != null ? num(a[3]) : 1, src: s };
  }
  m = /^hsla?\(([^)]*)\)$/i.exec(s);
  if (m) {
    const a = argsOf(m[1]);
    if (a.length < 3) return { unknown: `malformed ${s}` };
    const h = parseFloat(a[0]) * (/turn$/i.test(a[0]) ? 360 : /rad$/i.test(a[0]) ? 180 / Math.PI : 1);
    const rgb = hslToRgb(h, num(a[1]), num(a[2]));
    if (rgb.some(v => !Number.isFinite(v))) return { unknown: `non-numeric channel in ${s}` };
    return { rgb, alpha: a[3] != null ? num(a[3]) : 1, src: s };
  }
  m = /^oklch\(([^)]*)\)$/i.exec(s);
  if (m) {
    const a = argsOf(m[1]);
    if (a.length < 3) return { unknown: `malformed ${s}` };
    const L = a[0].endsWith('%') ? parseFloat(a[0]) / 100 : parseFloat(a[0]);
    const C = a[1].endsWith('%') ? (parseFloat(a[1]) / 100) * 0.4 : parseFloat(a[1]);
    const H = parseFloat(a[2]) || 0;
    if (![L, C].every(Number.isFinite)) return { unknown: `non-numeric channel in ${s}` };
    const raw = oklchToSrgb(L, C, H);
    return { rgb: raw.map(c => Math.min(1, Math.max(0, c))), alpha: a[3] != null ? num(a[3]) : 1, src: s, raw, gamut: !outOfGamut(raw) };
  }
  if (/^(oklab|lab|lch|color)\(/i.test(low)) return { unknown: low.replace(/\(.*/s, '()') + ' is not converted' };
  return { unknown: `unrecognised colour ${s}` };
}

export const toHex = (rgb) => '#' + rgb.map(c => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('');

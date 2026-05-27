#!/usr/bin/env node
// STRING LAYER — index invariant content-anchors in cli.js. These are the
// strings Anthropic cannot change without breaking their own contracts (OTel
// event names, API field names) or their own product (agent role prose). They
// are the "ground truth" the agent reads to decide WHAT a region is.
//
// This script does NOT assign a semantic role. `kind_hint` is a surface pattern
// (the string opens with "You are", contains "claude_code.", etc.) — a clue,
// not a conclusion. The agent reads `preview` and decides the actual role.
//
// usage: node find-anchors.cjs <cli.js> [--min N] [--kind K] [--json]

const fs = require("fs");
const path = require("path");
const { load } = require("./lib.cjs");

const args = process.argv.slice(2);
const INPUT = args.find((a) => !a.startsWith("--"));
if (!INPUT) { console.error("usage: find-anchors.cjs <cli.js> [--min N] [--kind K] [--json]"); process.exit(2); }
const MIN = +(args.find((a) => a.startsWith("--min="))?.slice(6) || 80);
const KIND = args.find((a) => a.startsWith("--kind="))?.slice(7);
const JSON_OUT = args.includes("--json");

// Surface pattern → kind_hint. Order = most specific first. NOT a semantic role.
function kindHint(s) {
  if (s.includes("body:`claude_code.${") || /claude_code\.[a-z_]+/.test(s)) return "otel-contract";
  if (/anthropic-ratelimit|unifiedRateLimitFallbackAvailable|five_hour|seven_day/.test(s)) return "ratelimit-contract";
  if (/^You are /.test(s)) return "prompt-opening";
  if (/^(Use this tool|This tool|Use when )/i.test(s)) return "tool-desc";
  if (/<system-reminder>/.test(s)) return "reminder-template";
  if (/\bIMPORTANT:|You (should|must|will)\b/.test(s)) return "directive-prose";
  return "prose";
}

function looksLikePrompt(s) {
  if (s.length < MIN) return false;
  if (/^[A-Za-z0-9+/=]{200,}$/.test(s)) return false;       // base64
  if (/^[0-9a-f]{200,}$/i.test(s)) return false;            // hex
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters / s.length < 0.3) return false;               // binary-ish
  const code = (s.match(/\b(if|else|return|function|const|let|var|=>|throw|typeof|require|import)\b/g) || []).length;
  if (code / (s.length / 100) > 1.5 && /[;{}]/.test(s)) return false; // code chunk
  return true;
}

const ctx = load(INPUT);
const anchors = [];
const seen = new Set();
ctx.eachStringNode((text, node, kind) => {
  if (!looksLikePrompt(text)) return;
  const hint = kindHint(text);
  if (KIND && hint !== KIND) return;
  const key = text.slice(0, 200);
  if (seen.has(key)) return;
  seen.add(key);
  anchors.push({
    offset: node.start,
    node_kind: kind,
    kind_hint: hint,
    enclosing_fn: ctx.nameOfFn(ctx.fnContaining(node.start)),
    length: text.length,
    preview: text.slice(0, 140).replace(/\n/g, " "),
  });
});
anchors.sort((a, b) => a.offset - b.offset);

if (JSON_OUT) {
  fs.writeFileSync(path.join(path.dirname(INPUT), "anchors.json"),
    JSON.stringify({ version: ctx.version, count: anchors.length, anchors }, null, 2));
  console.log(`wrote anchors.json (${anchors.length})`);
} else {
  const byKind = {};
  for (const a of anchors) (byKind[a.kind_hint] ||= []).push(a);
  console.log(`# content-anchors in ${ctx.version} — ${anchors.length} (min ${MIN} chars)\n`);
  for (const [k, list] of Object.entries(byKind).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`## ${k}  (${list.length})`);
    for (const a of list.slice(0, 20))
      console.log(`  @${a.offset} fn=${a.enclosing_fn || "-"} | ${a.preview}`);
    console.log("");
  }
}

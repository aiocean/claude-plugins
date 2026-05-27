#!/usr/bin/env node
// verify-explorer.cjs — extract embedded JSON from the HTML and sanity-check
// its shape. Same JS engine as the browser, so a green check here means the
// browser will parse it too.
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const m = html.match(/<script type="application\/json" id="data">([\s\S]+?)<\/script>/);
if (!m) { console.error("FAIL: data script tag not found"); process.exit(1); }
const raw = m[1].replace(/<\\\/script>/gi, "</script>");
let d;
try { d = JSON.parse(raw); } catch (e) { console.error("FAIL JSON.parse:", e.message); process.exit(1); }

const dist = {};
for (const a of d.anchors) dist[a.kind_hint] = (dist[a.kind_hint] || 0) + 1;

const lines = [
  `OK  version       : ${d.version}`,
  `OK  generated     : ${d.generated}`,
  `OK  cli_size      : ${(d.cli_size_bytes / 1e6).toFixed(1)} MB`,
  `OK  anchors       : ${d.anchors.length}`,
  `OK  functions     : ${Object.keys(d.functions).length}`,
  `OK  otel events   : ${Object.keys(d.otel_events).length}`,
  ``,
  `anchor kind_hint distribution:`,
];
for (const [k, v] of Object.entries(dist).sort((a, b) => b[1] - a[1]))
  lines.push(`  ${k.padEnd(20)} ${v}`);

lines.push(``, `OTel events (all):`);
for (const [name, occ] of Object.entries(d.otel_events))
  lines.push(`  ${name.padEnd(40)} ${occ.length} sites  first fn=${occ[0]?.enclosing_fn || "-"}`);

// pick a fn with anchors AND a call graph
const fnSample = Object.entries(d.functions).find(
  ([n, f]) => f.callees.length > 0 && f.callers.length > 0 && d.anchors.some(a => a.enclosing_fn === n),
);
if (fnSample) {
  const [name, fn] = fnSample;
  lines.push(``, `Sample fn with full graph: ${name}`);
  lines.push(`  span=${fn.span?.[0]}..${fn.span?.[1]} (${fn.span ? fn.span[1] - fn.span[0] : "?"} bytes)`);
  lines.push(`  callers (${fn.callers.length}): ${fn.callers.slice(0, 5).map(c => c.in_fn || "(top)").join(", ")}`);
  lines.push(`  callees (${fn.callees.length}): ${fn.callees.slice(0, 8).join(", ")}`);
  const anchorsHere = d.anchors.filter(a => a.enclosing_fn === name);
  lines.push(`  anchors in this fn: ${anchorsHere.length}`);
}

// confirm no obvious bad data
const orphans = d.anchors.filter(a => a.enclosing_fn && !d.functions[a.enclosing_fn]).length;
const badIds = d.anchors.filter(a => typeof a.id !== "number" || typeof a.offset !== "number").length;
lines.push(``, `Integrity:`);
lines.push(`  anchors with enclosing_fn missing from functions{}: ${orphans} (should be 0)`);
lines.push(`  anchors with malformed id/offset: ${badIds} (should be 0)`);

console.log(lines.join("\n"));

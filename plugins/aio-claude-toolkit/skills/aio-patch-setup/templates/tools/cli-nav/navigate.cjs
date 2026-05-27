#!/usr/bin/env node
// AST LAYER — navigate the call-graph + provenance around a known point. Pure
// facts: where a string lives, which function encloses it, who calls that
// function, what it calls. Use this to spread a role from a content-anchor
// (found via find-anchors.cjs) out to the code regions around it.
//
// This script does NOT assign a semantic role. It answers "where / connected to
// what". The agent combines these facts with the anchor content to conclude.
//
// usage:
//   node navigate.cjs <cli.js> --find "<string>"   facts about a string anchor
//   node navigate.cjs <cli.js> --fn <name>         callers + callees of a function
//   node navigate.cjs <cli.js> --at <offset>       enclosing fn + provenance

const { load } = require("./lib.cjs");

const args = process.argv.slice(2);
const INPUT = args.find((a) => !a.startsWith("--") && !isQueryValue(a));
function isQueryValue() { return false; }
const findVal = valOf("--find");
const fnVal = valOf("--fn");
const atVal = valOf("--at");
function valOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

if (!INPUT || (!findVal && !fnVal && atVal == null)) {
  console.error('usage: navigate.cjs <cli.js> (--find "<string>" | --fn <name> | --at <offset>)');
  process.exit(2);
}

const ctx = load(INPUT);
const out = { version: ctx.version };

function fnFacts(name) {
  const fn = (() => {
    const v = ctx.bindingByName(name);
    if (!v) return null;
    // declarator/function def node
    for (const d of v.defs) if (/Function/.test(d.node.type)) return d.node;
    for (const d of v.defs) if (d.node.init && /Function/.test(d.node.init.type)) return d.node.init;
    return null;
  })();
  return {
    name,
    found: !!fn,
    span: fn ? [fn.start, fn.end] : null,
    callers: ctx.callSitesOf(name),
    callees: fn ? ctx.calleesOf(fn) : [],
  };
}

if (findVal != null) {
  const offs = [];
  let pos = 0;
  while (true) { const i = ctx.body.indexOf(findVal, pos); if (i === -1) break; offs.push(i); pos = i + 1; }
  out.find = findVal.slice(0, 60);
  out.occurrences = offs.map((o) => {
    const fn = ctx.fnContaining(o);
    return { offset: o, enclosing_fn: ctx.nameOfFn(fn), provenance: ctx.provenanceAt(o) };
  });
  // also surface callers of the enclosing function(s) so a role can spread
  const fns = [...new Set(out.occurrences.map((x) => x.enclosing_fn).filter(Boolean))];
  out.enclosing_fn_facts = fns.map(fnFacts);
} else if (fnVal != null) {
  out.fn = fnFacts(fnVal);
} else if (atVal != null) {
  const o = +atVal;
  const fn = ctx.fnContaining(o);
  out.at = { offset: o, enclosing_fn: ctx.nameOfFn(fn), provenance: ctx.provenanceAt(o) };
  if (out.at.enclosing_fn) out.enclosing_fn_facts = fnFacts(out.at.enclosing_fn);
}

console.log(JSON.stringify(out, null, 2));

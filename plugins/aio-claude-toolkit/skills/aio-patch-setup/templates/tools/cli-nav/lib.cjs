// Shared AST/scope helpers for the cli analysis fact scripts.
//
// These produce DETERMINISTIC FACTS only — function boundaries, call edges,
// string locations, provenance. They never assign a semantic role; that is the
// agent's job (read content + facts → conclude). See SKILL.md.

const fs = require("fs");
const acorn = require("acorn");
const walk = require("acorn-walk");
const eslintScope = require("eslint-scope");

const WRAPPER_PREFIX =
  "// @bun @bytecode @bun-cjs\n(function(exports, require, module, __filename, __dirname) {";

function stripWrapper(src) {
  if (!src.startsWith(WRAPPER_PREFIX)) return src; // already a body
  return src.slice(WRAPPER_PREFIX.length).replace(/\}\)\n?$/, "");
}

// Parse a cli.js (raw or body) into a reusable context with fact helpers.
function load(cliPath) {
  const src = fs.readFileSync(cliPath, "utf8");
  const body = stripWrapper(src);
  const version = (src.match(/"(\d+\.\d+\.\d+)"/) || [])[1] || "unknown";

  const ast = acorn.parse(body, {
    ecmaVersion: "latest", sourceType: "module", ranges: true,
    allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true, allowHashBang: true,
  });
  const scopeManager = eslintScope.analyze(ast, {
    ecmaVersion: 2022, sourceType: "module", ignoreEval: true,
  });

  // ONE pass: collect every function with its span + a name derived from the
  // immediate ancestor (id / declarator / assignment / property). fnContaining
  // then queries this array — no per-call tree walk.
  const fns = [];
  walk.fullAncestor(ast, (node, _s, anc) => {
    if (!/Function/.test(node.type)) return;
    let name = node.id?.name ?? null;
    if (!name) {
      const p = anc[anc.length - 2];
      if (p?.type === "VariableDeclarator") name = p.id?.name ?? null;
      else if (p?.type === "AssignmentExpression" && p.left.type === "Identifier") name = p.left.name;
      else if (p?.type === "Property" && p.key) name = p.key.name ?? p.key.value ?? null;
    }
    fns.push({ start: node.start, end: node.end, node, name });
  });
  fns.sort((a, b) => a.start - b.start);

  // Innermost function containing off. fns sorted by start asc → the prefix with
  // start <= off holds all candidates; pick the smallest span among those whose
  // end > off.
  function fnContaining(off) {
    let best = null;
    for (const f of fns) {
      if (f.start > off) break;
      if (off < f.end && (!best || f.end - f.start < best.end - best.start)) best = f;
    }
    return best;
  }
  function nameOfFn(fn) { return fn?.name ?? null; }
  function ancestorsAt(off) {
    let best = null;
    walk.fullAncestor(ast, (node, _s, anc) => {
      if (node.start <= off && off < node.end &&
          (!best || node.end - node.start < best.node.end - best.node.start))
        best = { node, anc: anc.slice() };
    });
    return best;
  }
  // Describe the immediate syntactic role of the node at `off` (provenance).
  function provenanceAt(off) {
    const a = ancestorsAt(off);
    if (!a) return null;
    const chain = a.anc.slice().reverse(); // innermost → outermost
    const roles = [];
    for (const n of chain.slice(1, 7)) {
      switch (n.type) {
        case "Property": roles.push(`property ${n.key.name ?? n.key.value ?? "?"}`); break;
        case "CallExpression": roles.push(`arg of ${n.callee.name ?? n.callee.property?.name ?? "?"}()`); break;
        case "VariableDeclarator": roles.push(`init of var ${n.id.name ?? "?"}`); break;
        case "AssignmentExpression": roles.push(`assigned to ${n.left.name ?? n.left.property?.name ?? "?"}`); break;
        case "ReturnStatement": roles.push("return value"); break;
        case "ArrayExpression": roles.push("array element"); break;
        case "TemplateLiteral": roles.push("template quasi"); break;
      }
    }
    return roles;
  }
  function bindingByName(name) {
    for (const scope of scopeManager.scopes)
      for (const v of scope.variables)
        if (v.name === name && v.defs.some((d) => /Function/.test(d.node.type) || d.node.type === "VariableDeclarator"))
          return v;
    return null;
  }
  // Call sites of a named function: where it is referenced as a callee.
  function callSitesOf(name) {
    const v = bindingByName(name);
    if (!v) return [];
    const sites = [];
    for (const r of v.references) {
      const a = ancestorsAt(r.identifier.start);
      const parent = a?.anc[a.anc.length - 2];
      if (parent?.type === "CallExpression" && parent.callee === a.node)
        sites.push({ offset: r.identifier.start, in_fn: nameOfFn(fnContaining(r.identifier.start)) });
    }
    return sites;
  }
  // Functions called inside fnNode (resolvable by name).
  function calleesOf(fnNode) {
    if (!fnNode) return [];
    const out = new Set();
    walk.simple(fnNode, {
      CallExpression(n) {
        if (n.callee.type === "Identifier") out.add(n.callee.name);
        else if (n.callee.type === "MemberExpression" && n.callee.property?.name) out.add("." + n.callee.property.name);
      },
    });
    return [...out];
  }
  function eachStringNode(cb) {
    walk.full(ast, (node) => {
      if (node.type === "Literal" && typeof node.value === "string") cb(node.value, node, "string");
      else if (node.type === "TemplateLiteral")
        cb(node.quasis.map((q) => q.value.cooked ?? "").join("${}"), node, "template");
    });
  }

  return {
    body, ast, scopeManager, version,
    fnContaining, nameOfFn, ancestorsAt, provenanceAt,
    bindingByName, callSitesOf, calleesOf, eachStringNode,
  };
}

module.exports = { load, stripWrapper };

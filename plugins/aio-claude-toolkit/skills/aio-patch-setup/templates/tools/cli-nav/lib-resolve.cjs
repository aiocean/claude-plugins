// Resolve a cli.js prompt node to the text the model actually sees: follow each
// `${ident}` reference (VariableDeclarator init OR `name = expr` write) and inline
// it, recursing through `a + b` concatenation and nested templates. Static — never
// runs cli.js. Depth-capped + cycle-guarded.
//
// Dynamic expressions that have no static string value are left as markers so the
// caller can tell assembled prose from runtime holes:
//   ${ident}   binding unresolved / depth exhausted / cycle
//   ⟦fn:name⟧  binding is a function
//   ⟦call⟧     call result
//   ${m}       member expression (e.g. ${H.taskId})
//
// usage: const { resolveNode } = require("../lib-resolve.cjs");
//        const { text, resolved, dangling } = resolveNode(ctx, node, 5);
// where ctx is the object returned by lib.cjs `load` (needs ctx.bindingByName).

function resolveNode(ctx, node, depth = 5) {
  const counts = { resolved: 0, dangling: 0 };
  const text = reconstruct(ctx, node, depth, new Set(), counts);
  return { text, resolved: counts.resolved, dangling: counts.dangling };
}

function reconstruct(ctx, node, depth, seen, counts) {
  if (!node) return "";
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral") {
    let out = "";
    for (let i = 0; i < node.quasis.length; i++) {
      out += node.quasis[i].value.cooked ?? node.quasis[i].value.raw ?? "";
      if (i < node.expressions.length) out += resolveExpr(ctx, node.expressions[i], depth, seen, counts);
    }
    return out;
  }
  if (node.type === "BinaryExpression" && node.operator === "+")
    return reconstruct(ctx, node.left, depth, seen, counts) + reconstruct(ctx, node.right, depth, seen, counts);
  return resolveExpr(ctx, node, depth, seen, counts);
}

function resolveExpr(ctx, e, depth, seen, counts) {
  if (!e) return "";
  if (e.type === "Literal") return String(e.value);
  if (e.type === "TemplateLiteral" || e.type === "BinaryExpression") return reconstruct(ctx, e, depth, seen, counts);
  // Conditional `a ? b : c` — pick the consequent (the model only ever sees one
  // concrete branch). Lossy by design.
  if (e.type === "ConditionalExpression") return reconstruct(ctx, e.consequent, depth, seen, counts);
  if (e.type === "Identifier") {
    if (depth <= 0 || seen.has(e.name)) { counts.dangling++; return "${" + e.name + "}"; }
    const b = ctx.bindingByName(e.name);
    if (!b || !b.defs.length) { counts.dangling++; return "${" + e.name + "}"; }
    const def = b.defs.find((d) => d.node && d.node.init);
    let init = def && def.node.init;
    // fallback: `name = <expr>` assignment (write reference), not a declarator init
    if (!init) { const w = b.references.find((r) => r.writeExpr); init = w && w.writeExpr; }
    if (!init) { counts.dangling++; return "${" + e.name + "}"; }
    if (["Literal", "TemplateLiteral", "BinaryExpression"].includes(init.type)) {
      seen.add(e.name);
      const r = reconstruct(ctx, init, depth - 1, seen, counts);
      seen.delete(e.name);
      counts.resolved++;
      return r;
    }
    if (/Function/.test(init.type)) { counts.dangling++; return "⟦fn:" + e.name + "⟧"; }
    counts.dangling++;
    return "${" + e.name + "}";
  }
  if (e.type === "CallExpression") { counts.dangling++; return "⟦call⟧"; }
  if (e.type === "MemberExpression") { counts.dangling++; return "${m}"; }
  counts.dangling++;
  return "";
}

module.exports = { resolveNode };

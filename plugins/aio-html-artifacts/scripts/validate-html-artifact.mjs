#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
let kind = "report";
const kindAt = args.indexOf("--kind");
if (kindAt !== -1) {
  kind = args[kindAt + 1] || "";
  args.splice(kindAt, 2);
}

const file = args[0];
const kinds = new Set(["report", "deck", "explorer", "editor"]);
if (!file || !kinds.has(kind)) {
  console.error("Usage: validate-html-artifact.mjs --kind <report|deck|explorer|editor> <file.html>");
  process.exit(2);
}

let html;
try {
  html = readFileSync(resolve(file), "utf8");
} catch (error) {
  console.error(`ERROR cannot read ${file}: ${error.message}`);
  process.exit(2);
}

const errors = [];
const warnings = [];
const requireMatch = (pattern, message) => {
  if (!pattern.test(html)) errors.push(message);
};
const warnUnless = (pattern, message) => {
  if (!pattern.test(html)) warnings.push(message);
};
const count = (pattern) => (html.match(pattern) || []).length;

requireMatch(/^\s*<!doctype html>/i, "missing <!doctype html>");
requireMatch(/<html\b[^>]*\blang=["'][^"']+["']/i, "<html> needs a lang attribute");
requireMatch(/<meta\b[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i, "missing responsive viewport meta");
requireMatch(/<title>\s*[^<]{3,}\s*<\/title>/i, "missing a meaningful <title>");
requireMatch(/<main\b/i, "missing semantic <main> landmark");
requireMatch(/<style\b/i, "artifact should contain inline CSS");
requireMatch(/@media\s+print/i, "missing print stylesheet");
requireMatch(/@media[^\{]*(max-width|min-width|width\s*<)/i, "missing responsive reflow breakpoint");
requireMatch(/:focus-visible|:focus\b/i, "missing visible focus styling");

const h1Count = count(/<h1\b/gi);
if (h1Count !== 1) errors.push(`expected exactly one <h1>, found ${h1Count}`);

const remoteRefs = [
  ...html.matchAll(/<(?:script|img|source|video|audio|iframe)\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["']/gi),
  ...html.matchAll(/<link\b[^>]*\bhref=["'](https?:\/\/[^"']+)["']/gi),
  ...html.matchAll(/url\(\s*["']?(https?:\/\/[^"')\s]+)["']?\s*\)/gi)
].map((match) => match[1]);
if (remoteRefs.length) {
  errors.push(`not self-contained; remote assets/links in src or stylesheet href: ${remoteRefs.join(", ")}`);
}

for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
  const attributes = match[1];
  const text = match[2].replace(/<[^>]+>/g, "").replace(/&\w+;/g, " ").trim();
  if (!text && !/aria-label=["'][^"']+["']/i.test(attributes)) {
    errors.push("button without visible text or aria-label");
  }
}

for (const match of html.matchAll(/<svg\b([^>]*)>/gi)) {
  const attributes = match[1];
  if (!/(aria-label|aria-labelledby|aria-hidden|role)=["'][^"']+["']/i.test(attributes)) {
    warnings.push("SVG lacks an accessible label, role, or aria-hidden marker");
  }
}

const hasMotion = /@keyframes|\banimation\s*:|scroll-behavior\s*:\s*smooth/i.test(html);
if (hasMotion && !/prefers-reduced-motion/i.test(html)) {
  errors.push("motion is present without a prefers-reduced-motion fallback");
}

warnUnless(/<meta\b[^>]*name=["']description["']/i, "add a concise meta description for sharing");
warnUnless(/<header\b|<article\b/i, "consider a semantic header or article landmark");
warnUnless(/data-evidence|evidence|source|citation|assumption/i, "no visible evidence/source/assumption language detected");

if (kind === "report") {
  if (count(/<section\b/gi) < 2) errors.push("report needs at least two semantic sections");
  warnUnless(/verdict|recommend|conclusion|status|answer|finding/i, "report should expose a verdict, answer, status, finding, or recommendation");
}

if (kind === "deck") {
  if (count(/<section\b[^>]*class=["'][^"']*\bslide\b/gi) < 3) errors.push("deck needs at least three <section class=\"slide\"> scenes");
  requireMatch(/addEventListener\s*\(\s*["']keydown["']/i, "deck needs keyboard navigation");
  requireMatch(/ArrowRight|PageDown/i, "deck needs forward keyboard controls");
  requireMatch(/ArrowLeft|PageUp/i, "deck needs backward keyboard controls");
}

if (kind === "explorer") {
  requireMatch(/option|alternative|approach|direction/i, "explorer needs identifiable alternatives");
  requireMatch(/constraint|criterion|criteria|tradeoff|trade-off/i, "explorer needs shared constraints or criteria");
  requireMatch(/recommend|decision|choose/i, "explorer needs a recommendation or decision point");
}

if (kind === "editor") {
  requireMatch(/<(?:input|select|textarea)\b/i, "editor needs editable controls");
  requireMatch(/<button\b/i, "editor needs explicit actions");
  requireMatch(/export|copy|download/i, "editor needs an export action");
  requireMatch(/aria-live=["'](?:polite|assertive)["']/i, "editor needs an aria-live feedback region");
  requireMatch(/JSON\.stringify|Blob\s*\(|clipboard|execCommand\s*\(/i, "editor needs implemented export logic");
}

for (const warning of [...new Set(warnings)]) console.log(`WARN  ${warning}`);
for (const error of [...new Set(errors)]) console.error(`ERROR ${error}`);

if (errors.length) {
  console.error(`\nFAIL ${file} (${new Set(errors).size} error(s), ${new Set(warnings).size} warning(s))`);
  process.exit(1);
}

console.log(`PASS ${file} as ${kind} (${new Set(warnings).size} warning(s))`);

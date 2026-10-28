#!/usr/bin/env bun
// UserPromptSubmit hook template: classify the user's prompt against a
// declared hint catalog (.jev-hint) via Jev (typesafe/jev-1.14, a decision
// model on the OpenRouter Decisions API), inject the matched entries'
// `context` as additionalContext when confidence clears a threshold.
// Catalog entries are arbitrary — skills, MCP servers, project rules, or any
// other reminder worth surfacing on-topic.
// Fail-open on any error: emit nothing, exit 0. Never block the user's prompt.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const GLOBAL_HINT_FILE = join(process.env.HOME, '.claude', '.jev-hint');
// https://openrouter.ai/docs/guides/community/jev-tutorial.md
const DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions';
// Pin a release: the threshold below is calibrated against one model version.
const MODEL = 'typesafe/jev-1.14';
const REQUEST_TIMEOUT_MS = 8000;
const CONFIDENCE_THRESHOLD = 0.8;

// Each entry: { name, useWhen, context }. `useWhen` is what gets classified
// against the prompt; `context` is what gets injected verbatim when matched
// (a skill slash-command, an MCP server blurb, or any other reminder text).
function loadHintFile(path) {
  if (!existsSync(path)) return [];
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { name, useWhen, context } = entry;
    if (typeof name !== 'string' || typeof useWhen !== 'string' || typeof context !== 'string') continue;
    out.push({ name, useWhen, context });
  }
  return out;
}

// Real sessions run several directories below the project root, so checking
// only the exact cwd would never find a .jev-hint placed at the repo root.
// Walk up to the filesystem root looking for the nearest one — same
// resolution rule as .git / .editorconfig.
function findNearestHintFile(cwd) {
  let dir = cwd;
  for (;;) {
    const candidate = join(dir, '.jev-hint');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

function buildCatalog(cwd) {
  // Project entries win name collisions — most authoritative for the
  // current work, same priority rule a SKILL.md project-vs-global scan uses.
  const projectFile = cwd ? findNearestHintFile(cwd) : null;
  const projectEntries = projectFile ? loadHintFile(projectFile) : [];
  const globalEntries = loadHintFile(GLOBAL_HINT_FILE);

  const catalog = new Map();
  for (const e of projectEntries) catalog.set(e.name, e);
  for (const e of globalEntries) if (!catalog.has(e.name)) catalog.set(e.name, e);
  return catalog;
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    return;
  }

  const state = payload.user_input || payload.prompt || payload.message;
  const cwd = payload.cwd || process.cwd();
  if (!state || typeof state !== 'string' || state.trim().length < 3) return;

  // Background-task completions are delivered as a synthetic "user" turn
  // whose entire text is a <task-notification> block (queued by the harness,
  // not typed by the human). Classifying that block as a hint request
  // produces noise — measured in production: 13/38 real skill-hint emissions
  // in one day fired on this pattern instead of an actual user prompt.
  if (state.trimStart().startsWith('<task-notification>')) return;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return;

  const catalog = buildCatalog(cwd);
  if (catalog.size === 0) return;

  // One yes/no (`noul`) question per catalog entry, sent as ONE Decisions
  // request — cheap compared to N sequential calls. A 16-entry catalog
  // answers in ~0.6s (p50) for ~$0.00006.
  const questions = {};
  let i = 0;
  for (const [name, entry] of catalog) {
    // Prefix with an index: names alone aren't guaranteed unique-as-keys
    // once split back out, and the index keeps ordering stable for debugging.
    questions[`q${i++}__${name}`] = {
      type: 'noul',
      instructions: `Does this apply to the user's request? "${name}": ${entry.useWhen}`,
    };
  }

  let answers;
  try {
    const res = await fetch(DECISIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, state, questions }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return;
    ({ answers } = await res.json());
  } catch {
    return;
  }
  if (!answers) return;

  // Each answer is { type: 'noul', noul: <probability of yes, 0..1> }.
  const scored = Object.entries(answers)
    .map(([key, ans]) => ({ name: key.split('__').slice(1).join('__'), prob: ans?.noul ?? 0 }))
    .filter((s) => s.prob > CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.prob - a.prob);

  if (scored.length === 0) return;

  const list = scored.map((s) => `${catalog.get(s.name).context} (${(s.prob * 100).toFixed(0)}%)`).join(', ');

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `Context Hint: ${list}`,
      },
    })
  );
}

main().catch(() => {});

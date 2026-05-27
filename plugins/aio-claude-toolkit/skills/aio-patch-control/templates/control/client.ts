#!/usr/bin/env bun
// control/client.ts — minimal TUI for the patched claude HTTP API.
//
// Usage:
//   bun control/client.ts              # connect to localhost:47291
//   DC_PORT=8080 bun control/client.ts # custom port
//
// REPL commands (beyond raw prompts):
//   :state    dump current /v1/state
//   :raw      toggle raw JSON rendering of next response
//   :wait     poll until claude state stabilizes (after dialog answer)
//   :quit     exit (or Ctrl+D)
//
// When a response carries `pending` (dialog open), the TUI asks which
// callback to invoke + JSON args, POSTs /v1/answer, and continues.

import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const PORT = process.env.DC_PORT ?? "47291";
const BASE = `http://127.0.0.1:${PORT}`;

// ── ANSI ─────────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function colour(s: string, col: keyof typeof c): string {
  return `${c[col]}${s}${c.reset}`;
}

// ── Spinner ──────────────────────────────────────────────────────────────
function spinner(label: string): () => void {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const tty = stdout.isTTY;
  if (!tty) {
    return () => {};
  }
  stdout.write(`\r${colour(frames[0], "cyan")} ${label}`);
  const t = setInterval(() => {
    i = (i + 1) % frames.length;
    stdout.write(`\r${colour(frames[i], "cyan")} ${label}`);
  }, 80);
  return () => {
    clearInterval(t);
    stdout.write("\r" + " ".repeat(label.length + 4) + "\r");
  };
}

// ── HTTP helpers ─────────────────────────────────────────────────────────
async function getState(): Promise<any> {
  const r = await fetch(`${BASE}/v1/state`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function submit(prompt: string, opts: Record<string, any> = {}): Promise<any> {
  const r = await fetch(`${BASE}/v1/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, ...opts }),
  });
  return r.json();
}

async function answer(callback: string, args: any[] = [], dialog_id?: string | null): Promise<any> {
  const body: Record<string, any> = { callback, args };
  // The patched server caches callbacks keyed by dialog_id when a dialog opens, so passing
  // it makes /v1/answer race-free: even if toolJSX has churned (e.g. another POST caused
  // kCH to dismiss the dialog), the cached fn still fires.
  if (dialog_id) body.dialog_id = dialog_id;
  const r = await fetch(`${BASE}/v1/answer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ── Render ───────────────────────────────────────────────────────────────
function truncate(s: string, n: number): string {
  if (typeof s !== "string") s = JSON.stringify(s);
  return s.length > n ? s.slice(0, n) + colour("…", "gray") : s;
}

function renderMessages(msgs: any[]): void {
  for (const m of msgs) {
    if (!m) continue;

    // Initial user prompt — skip, already echoed at "❯".
    if (m.type === "user" && typeof m.content === "string") continue;

    if (m.type === "assistant" && Array.isArray(m.content)) {
      for (const b of m.content) {
        if (!b) continue;
        if (b.type === "text" && b.text) {
          console.log(colour("●", "green") + " " + b.text);
        } else if (b.type === "thinking" && b.thinking) {
          console.log(colour("  ⋯ thinking: " + truncate(b.thinking, 200), "gray"));
        } else if (b.type === "tool_use") {
          const args = truncate(JSON.stringify(b.input ?? {}), 140);
          console.log(colour("→ ", "yellow") + colour(b.name, "bold") + " " + colour(args, "yellow"));
        }
      }
      continue;
    }

    // tool_result is carried inside a user message with content blocks
    if (m.type === "user" && Array.isArray(m.content)) {
      for (const b of m.content) {
        if (b?.type === "tool_result" || b?.tool_use_id) {
          const text = typeof b.content === "string" ? b.content : JSON.stringify(b.content);
          console.log(colour("← tool_result: ", "blue") + truncate(text, 300));
        }
      }
      continue;
    }

    // progress / attachment / system — quiet by default
  }
}

function renderPending(p: any): void {
  console.log("");
  console.log(colour("⚠ DIALOG ", "yellow") + colour(p.jsx?.component ?? "?", "bold"));
  if (p.shouldHidePromptInput) console.log(colour("  (prompt input hidden in REPL)", "gray"));
  const keys: string[] = p.jsx?.propKeys ?? [];
  const summary: Record<string, any> = p.jsx?.propsSummary ?? {};
  const callbacks = keys.filter((k) => typeof summary[k] === "string" && summary[k].startsWith("[fn:"));
  if (callbacks.length === 0) {
    console.log(colour("  no callable props — dismiss via Esc in terminal", "red"));
    return;
  }
  console.log(colour("  callbacks:", "gray"));
  callbacks.forEach((k, i) => console.log("    [" + colour(String(i), "cyan") + "] " + k));
  console.log("    [" + colour("-", "cyan") + "] skip (leave open)");
}

// ── REPL ─────────────────────────────────────────────────────────────────
// Parse user-typed args input.
// "" / "[]" → []   (empty arg list)
// "[1,\"x\"]" → JSON-parsed array
// "abc"     → ["abc"]   (bare value = single string arg — matches user intuition)
// Returns null on unrecoverable parse error so caller can re-prompt.
function parseArgsInput(raw: string): { ok: true; args: any[] } | { ok: false; err: string } {
  const t = raw.trim();
  if (t === "" || t === "[]") return { ok: true, args: [] };
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t);
      if (!Array.isArray(parsed)) return { ok: false, err: "JSON must be an array" };
      return { ok: true, args: parsed };
    } catch (e: any) {
      return { ok: false, err: "bad JSON: " + e.message };
    }
  }
  // Bare value → treat as single string arg. Most dialog callbacks (onExit, onAllow)
  // either take 0 args or a single primitive, so this matches the common case.
  return { ok: true, args: [t] };
}

// Wrap rl.question so EOF (Ctrl+D / piped stdin closure) becomes ":abort" instead of
// throwing — otherwise an EOF mid-dialog crashes the whole client with an unhandled
// 'readline was closed' error.
async function ask(rl: readline.Interface, prompt: string): Promise<string | null> {
  try {
    return await rl.question(prompt);
  } catch {
    return null;
  }
}

async function pickCallback(rl: readline.Interface, pending: any): Promise<void> {
  const keys: string[] = pending.jsx?.propKeys ?? [];
  const summary: Record<string, any> = pending.jsx?.propsSummary ?? {};
  const callbacks = keys.filter((k) => typeof summary[k] === "string" && summary[k].startsWith("[fn:"));
  if (callbacks.length === 0) return;

  const rawIn = await ask(rl, colour("answer> ", "cyan"));
  if (rawIn === null) {
    console.log(colour("  ⊘ aborted (EOF)", "gray"));
    return;
  }
  const raw = rawIn.trim();
  if (raw === "" || raw === "-" || raw === ":abort") return;

  let cb: string | undefined;
  const idx = Number.parseInt(raw, 10);
  if (!Number.isNaN(idx) && idx >= 0 && idx < callbacks.length) cb = callbacks[idx];
  else if (callbacks.includes(raw)) cb = raw;

  if (!cb) {
    console.log(colour("  ✗ unknown callback", "red"));
    return;
  }

  // Loop until args parse ok, or user explicitly aborts. The previous behaviour silently
  // swallowed bad JSON into [] then submitted — that hid the user's intent and led to
  // confusing 'no dialog open' errors when the silent submit fired against a stale dialog.
  let args: any[] = [];
  while (true) {
    const argRaw = await ask(
      rl,
      colour("  args (JSON array, bare=single string, '' for [], :abort to cancel): ", "gray"),
    );
    if (argRaw === null) {
      console.log(colour("  ⊘ aborted (EOF)", "gray"));
      return;
    }
    if (argRaw.trim() === ":abort") {
      console.log(colour("  ⊘ aborted", "gray"));
      return;
    }
    const r = parseArgsInput(argRaw);
    if (r.ok) {
      args = r.args;
      break;
    }
    console.log(colour("  ✗ " + r.err + " — try again or ':abort' to cancel", "red"));
  }

  // dialog_id is guaranteed by the patched server's __dc_dump — every pending carries it.
  // The server invokes from its callback cache keyed by this id, so the call is race-free
  // even if toolJSX has churned (kCH dispatch dismisses dialogs as a side effect).
  const dialogId: string = pending.dialog_id;
  if (!dialogId) {
    console.log(colour("  ✗ pending has no dialog_id — binary is out of date, rebuild via tools/build.sh", "red"));
    return;
  }

  const stop = spinner(`invoking ${cb}(${truncate(JSON.stringify(args).slice(1, -1), 80)})...`);
  let result: any;
  try {
    result = await answer(cb, args, dialogId);
  } finally {
    stop();
  }
  if (result?.error) {
    console.log(colour("  ✗ " + result.error, "red"));
    if (result.available) console.log(colour("    available: " + result.available.join(", "), "gray"));
  } else {
    console.log(colour("  ✓ " + cb + " → " + truncate(JSON.stringify(result.returned), 120), "green"));
  }
}

async function waitStable(stableMs = 1500, maxMs = 30000): Promise<void> {
  const stop = spinner("waiting for state to settle...");
  let lastDialog: any = "init";
  let lastChange = Date.now();
  const started = Date.now();
  try {
    while (Date.now() - started < maxMs) {
      await new Promise((r) => setTimeout(r, 200));
      const s = await getState();
      const cur = s.hasDialog ? JSON.stringify(s.dialog?.jsx?.component) : "null";
      if (cur !== lastDialog) {
        lastDialog = cur;
        lastChange = Date.now();
        continue;
      }
      if (Date.now() - lastChange >= stableMs) return;
    }
  } finally {
    stop();
  }
}

async function main(): Promise<void> {
  // Health check
  try {
    const s = await getState();
    console.log(colour(`[dc] connected to ${BASE}  hasDialog=${s.hasDialog}  mode=${s.appState?.toolPermissionContext?.mode ?? "?"}`, "gray"));
  } catch (e: any) {
    console.log(colour(`[dc] cannot reach ${BASE}: ${e.message}`, "red"));
    console.log(colour(`[dc] start claude first: ./tools/run.sh   (then re-run this client)`, "gray"));
    process.exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  let rawNext = false;

  while (true) {
    let line: string;
    try {
      line = await rl.question("\n" + colour("❯", "bold") + " ");
    } catch {
      break; // EOF
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === ":quit" || trimmed === ":q" || trimmed === "exit") break;

    if (trimmed === ":state") {
      const s = await getState();
      console.log(JSON.stringify(s, null, 2));
      continue;
    }
    if (trimmed === ":raw") {
      rawNext = !rawNext;
      console.log(colour(`raw rendering for next response: ${rawNext}`, "gray"));
      continue;
    }
    if (trimmed === ":wait") {
      await waitStable();
      const s = await getState();
      console.log(colour(`  hasDialog=${s.hasDialog}`, "gray"));
      continue;
    }
    if (trimmed === ":dialog") {
      const s = await getState();
      if (!s.hasDialog) {
        console.log(colour("no dialog open", "gray"));
      } else {
        renderPending(s.dialog);
        await pickCallback(rl, s.dialog);
      }
      continue;
    }
    if (trimmed === ":help" || trimmed === ":?") {
      console.log(colour("commands:", "bold"));
      console.log(colour("  :state    dump GET /v1/state", "gray"));
      console.log(colour("  :dialog   inspect + answer current dialog (no submit)", "gray"));
      console.log(colour("  :raw      toggle raw JSON for NEXT response", "gray"));
      console.log(colour("  :wait     poll until claude state settles", "gray"));
      console.log(colour("  :quit     exit (or Ctrl+D)", "gray"));
      console.log(colour("any other text → POST /v1/prompt", "gray"));
      continue;
    }

    // Pre-submit guard: if a dialog is already open, posting a prompt now creates a
    // race — the prompt gets queued but the response carries a stale snapshot of the
    // dialog that closes mid-flow. Force the user to handle the dialog first.
    let preState: any;
    try {
      preState = await getState();
    } catch (e: any) {
      console.log(colour("✗ cannot reach server: " + e.message, "red"));
      continue;
    }
    if (preState.hasDialog) {
      console.log(colour("⚠ a dialog is already open — answer it before submitting a new prompt", "yellow"));
      renderPending(preState.dialog);
      await pickCallback(rl, preState.dialog);
      const after = await getState();
      if (after.hasDialog) {
        console.log(colour("dialog still open — submit of '" + truncate(trimmed, 40) + "' aborted", "gray"));
        continue;
      }
      console.log(colour("dialog cleared, submitting your prompt now...", "gray"));
    }

    const stop = spinner("submitting...");
    let res: any;
    try {
      res = await submit(trimmed);
    } catch (e: any) {
      stop();
      console.log(colour("✗ " + e.message, "red"));
      continue;
    }
    stop();

    if (res?.error) {
      console.log(colour("✗ " + res.error, "red"));
      continue;
    }

    if (rawNext) {
      console.log(JSON.stringify(res, null, 2));
      rawNext = false;
    } else {
      renderMessages(res.messages ?? []);
    }
    console.log(colour(`[+${res.added ?? 0} msgs · ${res.waitedMs ?? "?"}ms]`, "gray"));

    if (res.pending) {
      renderPending(res.pending);
      await pickCallback(rl, res.pending);
    }
  }

  rl.close();
  console.log("\n" + colour("[dc] bye.", "gray"));
}

main().catch((e) => {
  console.error(colour("[dc] fatal: " + (e?.stack ?? e), "red"));
  process.exit(1);
});

#!/usr/bin/env bun
/**
 * interactive/scaffold/server.js — generic local transport server (DUMB RELAY).
 *
 * FROZEN. This file is part of the `/interactive` scaffold. It is copied
 * wholesale (`cp -r`) into /tmp/interactive-<slug>/ and run from there:
 *
 *   bun server.js
 *
 * It is a GENERIC, app-agnostic transport — nothing here knows about any
 * particular UI. Do NOT hand-edit it per app; the app lives entirely in
 * app.html's APP REGION. The server only does two things:
 *
 *   1. Browser → AI: the browser POSTs /api/event; the server prints one
 *      `MSG::{json}` line to stdout. The Monitor tool that spawned this
 *      process turns each stdout line into a notification to the AI.
 *   2. AI → browser: the AI POSTs /api/push; the server broadcasts the body
 *      VERBATIM to every connected browser over a Bun-native WebSocket
 *      (pub/sub topic "events"). It NEVER interprets the message `type`.
 *
 * NON-responsibilities: the server has ZERO DOM / markdown / eval logic. It
 * does not read or write any project files. It is a pure relay — keep it dumb.
 *
 * Everything (app.html, vendor/) sits NEXT TO this file; all paths resolve
 * from `import.meta.dir` so the scaffold runs from ANY directory it is copied
 * into. Same-machine only (localhost). Session-scoped: the server lives only
 * while the Monitor task that spawned it keeps running.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

// ──────────────────────────────────────────────────────────────────────
// Files — all relative to this file's own directory (import.meta.dir).
// The scaffold is copied wholesale, so never walk up to a "project root".
// ──────────────────────────────────────────────────────────────────────

const DIR = import.meta.dir;
const HTML_PATH = join(DIR, "app.html");
const VENDOR = {
  "/vendor/vue.global.js": join(DIR, "vendor", "vue.global.js"),
  "/vendor/tailwind.js": join(DIR, "vendor", "tailwind.js"),
};

// A short random instance id, generated once at startup. It is stamped on
// every `MSG::` line so two `/interactive` apps in one session never merge
// in the AI's head.
const INSTANCE = Math.random().toString(16).slice(2, 8);

// ──────────────────────────────────────────────────────────────────────
// HTTP helpers
// ──────────────────────────────────────────────────────────────────────

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readJsonBody(req) {
  try {
    return await req.json();
  } catch (_) {
    return undefined;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Request router
// ──────────────────────────────────────────────────────────────────────

async function handle(req, server) {
  const url = new URL(req.url);
  const path = url.pathname;

  // GET /ws → upgrade to a WebSocket. `server.upgrade` returns true on a
  // successful handshake; the response is then already written, so return
  // undefined. Anything else is a failed upgrade.
  if (path === "/ws") {
    if (server.upgrade(req)) return undefined;
    return new Response("WebSocket upgrade failed", { status: 400 });
  }

  // GET / → serve the single-file app.
  if (req.method === "GET" && path === "/") {
    try {
      return new Response(readFileSync(HTML_PATH, "utf-8"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (_) {
      return new Response("app.html not found next to server.js", { status: 500 });
    }
  }

  // GET /vendor/... → serve the two vendored libraries. Matched by EXACT
  // path against a fixed map — no path-join from user input, no traversal.
  if (req.method === "GET" && Object.prototype.hasOwnProperty.call(VENDOR, path)) {
    try {
      return new Response(readFileSync(VENDOR[path], "utf-8"), {
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    } catch (_) {
      return new Response("vendor file missing", { status: 500 });
    }
  }

  // POST /api/push → AI → browser. Body is `{ type, payload }`. The server
  // broadcasts it VERBATIM to every connected browser over the WS "events"
  // topic — it never interprets `type`. Pure relay.
  if (req.method === "POST" && path === "/api/push") {
    const body = await readJsonBody(req);
    if (!body || typeof body !== "object" || typeof body.type !== "string") {
      return json({ error: "body must be an object with a string `type`" }, 400);
    }
    server.publish("events", JSON.stringify({ type: body.type, payload: body.payload }));
    return json({ ok: true });
  }

  // POST /api/event → browser → AI. Body is `{ type, payload }`. The server
  // prints ONE `MSG::` line to stdout; the Monitor tool surfaces it as a
  // notification. The `instance` id is stamped so concurrent apps stay distinct.
  if (req.method === "POST" && path === "/api/event") {
    const body = await readJsonBody(req);
    if (!body || typeof body !== "object" || typeof body.type !== "string") {
      return json({ error: "body must be an object with a string `type`" }, 400);
    }
    console.log(
      "MSG::" +
        JSON.stringify({ instance: INSTANCE, type: body.type, payload: body.payload }),
    );
    return json({ ok: true }, 202);
  }

  return new Response("Not found", { status: 404 });
}

// ──────────────────────────────────────────────────────────────────────
// WebSocket handler — AI → browser push channel
// ──────────────────────────────────────────────────────────────────────
// Every connected browser subscribes to the "events" pub/sub topic on
// `open`. `/api/push` broadcasts to that topic. The browser never sends
// over the socket in this design, so `message` is a no-op; Bun
// auto-unsubscribes a closed socket, so `close` is a no-op too.

const websocket = {
  open(ws) {
    ws.subscribe("events");
  },
  message(_ws, _msg) {
    // Browser → server over WS is unused; ignore any inbound frame.
  },
  close(_ws) {
    // Bun auto-unsubscribes a closed socket — nothing to do here.
  },
};

// ──────────────────────────────────────────────────────────────────────
// Startup — pick a free port, serve, open the browser
// ──────────────────────────────────────────────────────────────────────
// Port range 7800..7810 (kanban uses 7700.. — keep them disjoint).

function startServer() {
  const FIRST_PORT = 7800;
  const LAST_PORT = 7810;
  for (let port = FIRST_PORT; port <= LAST_PORT; port++) {
    try {
      return Bun.serve({
        port,
        fetch: handle,
        websocket,
        error: (err) => {
          console.error(`[interactive] request error: ${err}`);
          return new Response("Internal error", { status: 500 });
        },
      });
    } catch (err) {
      if (String(err).includes("EADDRINUSE") || String(err.code) === "EADDRINUSE") {
        continue; // port taken — try the next one
      }
      throw err;
    }
  }
  console.error(`[interactive] FATAL: no free port in ${FIRST_PORT}..${LAST_PORT}`);
  process.exit(1);
}

const server = startServer();
const URL_STR = `http://localhost:${server.port}`;

// One startup line — the Monitor surfaces this so the AI sees the URL + the
// instance id (it is stamped on every later `MSG::` line).
console.log(`[interactive] ready at ${URL_STR} (instance: ${INSTANCE})`);

// Auto-open the browser (macOS `open`). Best-effort — failure is non-fatal.
try {
  Bun.spawn(["open", URL_STR]);
} catch (err) {
  console.error(`[interactive] could not auto-open browser: ${err}`);
}

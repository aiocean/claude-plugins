#!/usr/bin/env bun
/**
 * bridge-server.js — a generic, app-agnostic message bridge (DUMB RELAY).
 *
 * This is the transport core that gives Claude Code an event loop. Copy it
 * somewhere writable and run it under the Monitor tool:
 *
 *   bun bridge-server.js
 *
 * It knows NOTHING about any particular UI or message `type`. It only moves
 * bytes in two directions:
 *
 *   1. EXTERNAL -> Claude (inbound). A client POSTs /api/event. The relay
 *      prints ONE `MSG::{json}` line to stdout. The Monitor tool that spawned
 *      this process turns each stdout line into a notification — that is how a
 *      turn-based agent receives an event without an event loop of its own.
 *
 *   2. Claude -> EXTERNAL (outbound). Claude POSTs /api/push (from any shell
 *      step, e.g. `curl`). The relay broadcasts the body VERBATIM to every
 *      connected client over a WebSocket (pub/sub topic "events"). The relay
 *      NEVER interprets `type` — the client decides what each frame means.
 *
 * The asymmetry is the whole point: WebSocket carries server->client pushes
 * (Claude cannot hold a socket open across turns), while client->Claude rides
 * HTTP POST -> stdout line -> Monitor notification.
 *
 * NON-responsibilities: zero DOM / template / eval logic, reads/writes no
 * project files except the client page next to it. Localhost only. The relay
 * lives only while the Monitor task that spawned it keeps running.
 *
 * Config via env (all optional):
 *   BRIDGE_PREFIX  stdout sentinel for inbound events   (default "MSG::")
 *   BRIDGE_PORT    fixed port; otherwise scan the range  (default scan)
 *   BRIDGE_CLIENT  client page served at GET /           (default "client.html")
 *   BRIDGE_HOST    bind address                          (default 127.0.0.1)
 *   BRIDGE_TOKEN   shared secret; when set, EVERY route  (default none)
 *                  (/, /ws, /api/*) requires it via an
 *                  `Authorization: Bearer <t>` header or
 *                  a `?token=<t>` query param.
 *
 * SECURITY: the relay binds to 127.0.0.1 with no auth by default — same-machine
 * only. The moment you expose it over a network (Cloudflare Tunnel, Tailscale,
 * LAN bind), set BRIDGE_TOKEN. Inbound events then arrive as Monitor
 * notifications in Claude's context, so they are UNTRUSTED input — a remote
 * caller posting /api/event is a prompt-injection vector. Gate it, and treat
 * every payload as data, never as instructions.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { timingSafeEqual } from "node:crypto";

const DIR = import.meta.dir;
const PREFIX = process.env.BRIDGE_PREFIX || "MSG::";
const CLIENT_FILE = process.env.BRIDGE_CLIENT || "client.html";
const CLIENT_PATH = join(DIR, CLIENT_FILE);
const HOST = process.env.BRIDGE_HOST || "127.0.0.1";
const TOKEN = process.env.BRIDGE_TOKEN || "";

// A short random id, generated once at startup and stamped on every `MSG::`
// line. It lets Claude tell two concurrent bridges apart in one session.
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

// When BRIDGE_TOKEN is set, every route requires the secret via an
// `Authorization: Bearer <t>` header (curl, webhooks, native apps) or a
// `?token=<t>` query param (browsers can't set WS headers). Constant-time
// compare. When unset, the relay is open — keep it on 127.0.0.1.
function authed(req, url) {
  if (!TOKEN) return true;
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const provided = bearer || url.searchParams.get("token") || "";
  if (provided.length !== TOKEN.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(TOKEN));
}

// ──────────────────────────────────────────────────────────────────────
// Request router
// ──────────────────────────────────────────────────────────────────────

async function handle(req, server) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Auth gate — no-op when BRIDGE_TOKEN is unset (open, localhost-only mode).
  if (!authed(req, url)) {
    if (path === "/ws") return new Response("unauthorized", { status: 401 });
    return json({ error: "unauthorized" }, 401);
  }

  // GET /ws → upgrade to a WebSocket. On a successful handshake the response
  // is already written, so return undefined.
  if (path === "/ws") {
    if (server.upgrade(req)) return undefined;
    return new Response("WebSocket upgrade failed", { status: 400 });
  }

  // GET / → serve the bundled client page (same-origin, so its fetch() to
  // /api/event needs no CORS). Optional: a non-browser client ignores this.
  if (req.method === "GET" && path === "/") {
    try {
      return new Response(readFileSync(CLIENT_PATH, "utf-8"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (_) {
      return new Response(`${CLIENT_FILE} not found next to bridge-server.js`, {
        status: 500,
      });
    }
  }

  // POST /api/push → Claude → external. Body `{ type, payload }`, broadcast
  // VERBATIM to every connected client over the WS "events" topic.
  if (req.method === "POST" && path === "/api/push") {
    const body = await readJsonBody(req);
    if (!body || typeof body !== "object" || typeof body.type !== "string") {
      return json({ error: "body must be an object with a string `type`" }, 400);
    }
    server.publish("events", JSON.stringify({ type: body.type, payload: body.payload }));
    return json({ ok: true });
  }

  // POST /api/event → external → Claude. Body `{ type, payload }`. Print ONE
  // `MSG::` line to stdout; Monitor surfaces it as a notification. The
  // instance id keeps concurrent bridges distinct.
  if (req.method === "POST" && path === "/api/event") {
    const body = await readJsonBody(req);
    if (!body || typeof body !== "object" || typeof body.type !== "string") {
      return json({ error: "body must be an object with a string `type`" }, 400);
    }
    console.log(
      PREFIX +
        JSON.stringify({ instance: INSTANCE, type: body.type, payload: body.payload }),
    );
    return json({ ok: true }, 202);
  }

  return new Response("Not found", { status: 404 });
}

// ──────────────────────────────────────────────────────────────────────
// WebSocket handler — Claude → external push channel
// ──────────────────────────────────────────────────────────────────────
// Every connected client subscribes to "events" on open. /api/push publishes
// there. Clients push back over HTTP (/api/event), not the socket, so inbound
// frames are ignored. Bun auto-unsubscribes a closed socket.

const websocket = {
  open(ws) {
    ws.subscribe("events");
  },
  message(_ws, _msg) {
    // Client → server over WS is unused in this design; ignore.
  },
  close(_ws) {
    // Bun auto-unsubscribes a closed socket — nothing to do.
  },
};

// ──────────────────────────────────────────────────────────────────────
// Startup — bind a port, serve, announce
// ──────────────────────────────────────────────────────────────────────

function serveOpts(port) {
  return {
    hostname: HOST,
    port,
    fetch: handle,
    websocket,
    error: (err) => {
      console.error(`[bridge] request error: ${err}`);
      return new Response("Internal error", { status: 500 });
    },
  };
}

function startServer() {
  if (process.env.BRIDGE_PORT) {
    return Bun.serve(serveOpts(Number(process.env.BRIDGE_PORT)));
  }
  const FIRST_PORT = 7820;
  const LAST_PORT = 7840;
  for (let port = FIRST_PORT; port <= LAST_PORT; port++) {
    try {
      return Bun.serve(serveOpts(port));
    } catch (err) {
      if (String(err).includes("EADDRINUSE") || String(err.code) === "EADDRINUSE") {
        continue; // port taken — try the next one
      }
      throw err;
    }
  }
  console.error(`[bridge] FATAL: no free port in ${FIRST_PORT}..${LAST_PORT}`);
  process.exit(1);
}

const server = startServer();
const URL_STR = `http://${HOST}:${server.port}`;

// One startup line — Monitor surfaces this, so Claude learns BOTH the port
// (where to curl pushes) and the instance id (stamped on every later event).
// `auth` tells Claude whether requests must carry the token.
console.log(
  `[bridge] ready at ${URL_STR} (instance: ${INSTANCE}, auth: ${TOKEN ? "token" : "none"})`,
);

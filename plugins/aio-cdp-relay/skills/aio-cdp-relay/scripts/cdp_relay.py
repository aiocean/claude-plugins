#!/usr/bin/env python3
"""
CDP Relay — persistent Chrome DevTools Protocol proxy.

Maintains a single WebSocket connection to Chrome CDP. Scripts connect
via HTTP instead of opening new WebSocket connections each time.

Auto-terminates after idle timeout (default 5 minutes).

Usage:
    python3 cdp_relay.py                    # Start with defaults
    python3 cdp_relay.py --port 9223        # Custom port
    python3 cdp_relay.py --idle-timeout 600 # 10 min idle timeout

API:
    POST /cdp     — Send CDP command: {"method": "...", "params": {...}, "sessionId": "..."}
    GET  /targets  — List all page targets
    GET  /events   — Drain buffered events: ?sessionId=xxx
    GET  /health   — Relay status
    POST /stop     — Gracefully stop
"""

import argparse
import json
import os
import signal
import sys
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

DEFAULT_PORT = 9223
DEFAULT_IDLE_TIMEOUT = 300  # 5 minutes
PID_FILE = "/tmp/cdp_relay.pid"

CHROME_USER_DATA_DIRS = [
    os.environ.get("CHROME_USER_DATA_DIR", ""),
    os.path.expanduser("~/.chrome-debug-profile"),
    os.path.expanduser("~/Library/Application Support/Google/Chrome"),
]


def _read_cdp_endpoint():
    """Read Chrome's DevToolsActivePort to get WebSocket endpoint."""
    for data_dir in CHROME_USER_DATA_DIRS:
        if not data_dir:
            continue
        port_file = os.path.join(data_dir, "DevToolsActivePort")
        try:
            with open(port_file) as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]
            if len(lines) < 2:
                continue
            return int(lines[0]), lines[1]
        except (FileNotFoundError, ValueError, IndexError):
            continue
    return None, None


class CDPConnection:
    """Manages a single persistent WebSocket connection to Chrome CDP."""

    def __init__(self):
        self.ws = None
        self.lock = threading.Lock()
        self.msg_id = 0
        self._pending = {}
        self._events = {}
        self._events_lock = threading.Lock()

    def ensure_connected(self):
        if self.ws and self.ws.connected:
            return True

        try:
            import websocket as ws_lib
        except ImportError:
            return False

        port, ws_path = _read_cdp_endpoint()
        if not port:
            return False

        browser_ws = f"ws://127.0.0.1:{port}{ws_path}"
        try:
            self.ws = ws_lib.create_connection(browser_ws, timeout=15, suppress_origin=True)
            t = threading.Thread(target=self._recv_loop, daemon=True)
            t.start()
            return True
        except Exception as e:
            print(f"[relay] Connection failed: {e}", file=sys.stderr)
            return False

    def _recv_loop(self):
        while self.ws and self.ws.connected:
            try:
                raw = self.ws.recv()
                data = json.loads(raw)
                msg_id = data.get("id")
                if msg_id and msg_id in self._pending:
                    evt, _ = self._pending[msg_id]
                    self._pending[msg_id] = (evt, data)
                    evt.set()
                elif "method" in data:
                    sid = data.get("sessionId", "__global__")
                    with self._events_lock:
                        if sid not in self._events:
                            self._events[sid] = []
                        self._events[sid].append(data)
            except Exception:
                break
        # WS died — mark disconnected so ensure_connected() will reconnect
        print("[relay] WebSocket recv loop ended, marking disconnected.", file=sys.stderr)
        self.close()
        # Wake up any pending requests so they don't hang forever
        for mid, (evt, _) in list(self._pending.items()):
            self._pending[mid] = (evt, {"error": "WebSocket disconnected"})
            evt.set()

    def drain_events(self, session_id=None):
        key = session_id or "__global__"
        with self._events_lock:
            return self._events.pop(key, [])

    def send(self, method, params=None, session_id=None, timeout=15):
        with self.lock:
            if not self.ensure_connected():
                return {"error": "Not connected to Chrome"}

            self.msg_id += 1
            mid = self.msg_id

            msg = {"id": mid, "method": method}
            if params:
                msg["params"] = params
            if session_id:
                msg["sessionId"] = session_id

            evt = threading.Event()
            self._pending[mid] = (evt, None)

            try:
                self.ws.send(json.dumps(msg))
            except Exception as e:
                del self._pending[mid]
                return {"error": f"Send failed: {e}"}

        evt.wait(timeout=timeout)
        _, result = self._pending.pop(mid, (None, None))
        return result or {"error": "Timeout"}

    def close(self):
        if self.ws:
            try:
                self.ws.close()
            except Exception:
                pass
            self.ws = None


class RelayState:
    def __init__(self, idle_timeout):
        self.cdp = CDPConnection()
        self.idle_timeout = idle_timeout
        self.last_activity = time.time()
        self.should_stop = False

    def touch(self):
        self.last_activity = time.time()

    def is_idle(self):
        return (time.time() - self.last_activity) > self.idle_timeout


_state = None


class RelayHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        _state.touch()

        if self.path == "/health":
            connected = _state.cdp.ws is not None and _state.cdp.ws.connected
            self._send_json({
                "status": "ok",
                "connected": connected,
                "idle_timeout": _state.idle_timeout,
                "idle_seconds": int(time.time() - _state.last_activity),
                "pid": os.getpid(),
            })

        elif self.path == "/targets":
            if not _state.cdp.ensure_connected():
                self._send_json({"error": "Cannot connect to Chrome"}, 502)
                return
            resp = _state.cdp.send("Target.getTargets")
            if resp and "result" in resp:
                self._send_json(resp["result"].get("targetInfos", []))
            else:
                self._send_json({"error": resp.get("error", "Unknown")}, 502)

        elif self.path.startswith("/events"):
            qs = parse_qs(urlparse(self.path).query)
            sid = qs.get("sessionId", [None])[0]
            events = _state.cdp.drain_events(session_id=sid)
            self._send_json(events)

        else:
            self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        _state.touch()

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else b"{}"

        if self.path == "/stop":
            self._send_json({"status": "stopping"})
            _state.should_stop = True
            return

        if self.path == "/cdp":
            try:
                req = json.loads(body)
            except json.JSONDecodeError:
                self._send_json({"error": "Invalid JSON"}, 400)
                return

            method = req.get("method")
            if not method:
                self._send_json({"error": "Missing 'method'"}, 400)
                return

            if not _state.cdp.ensure_connected():
                self._send_json({"error": "Cannot connect to Chrome"}, 502)
                return

            timeout = req.get("timeout", 15)
            resp = _state.cdp.send(
                method,
                params=req.get("params"),
                session_id=req.get("sessionId"),
                timeout=timeout,
            )
            self._send_json(resp or {"error": "No response"})

        else:
            self._send_json({"error": "Not found"}, 404)


def _idle_watchdog(server):
    while not _state.should_stop:
        time.sleep(10)
        if _state.is_idle():
            print(f"[relay] Idle for {_state.idle_timeout}s, shutting down.", file=sys.stderr)
            _state.should_stop = True
            server.shutdown()
            return
    server.shutdown()


def main():
    global _state

    parser = argparse.ArgumentParser(description="CDP Relay — persistent Chrome CDP proxy")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT,
                        help=f"Listen port (default: {DEFAULT_PORT})")
    parser.add_argument("--idle-timeout", type=int, default=DEFAULT_IDLE_TIMEOUT,
                        help=f"Shutdown after N seconds idle (default: {DEFAULT_IDLE_TIMEOUT})")
    args = parser.parse_args()

    _state = RelayState(args.idle_timeout)

    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))

    def cleanup(*_):
        _state.cdp.close()
        try:
            os.remove(PID_FILE)
        except OSError:
            pass
        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
        daemon_threads = True

    server = ThreadingHTTPServer(("127.0.0.1", args.port), RelayHandler)
    print(f"[relay] Listening on 127.0.0.1:{args.port} (idle timeout: {args.idle_timeout}s)", file=sys.stderr)

    watchdog = threading.Thread(target=_idle_watchdog, args=(server,), daemon=True)
    watchdog.start()

    try:
        server.serve_forever()
    finally:
        cleanup()


if __name__ == "__main__":
    main()

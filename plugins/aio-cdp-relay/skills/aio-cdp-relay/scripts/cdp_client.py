#!/usr/bin/env python3
"""
CDP Relay Client — Python library for interacting with Chrome via the CDP relay.

Usage:
    from cdp_client import CDPClient

    with CDPClient() as cdp:
        # List tabs
        tabs = cdp.targets(type="page")

        # Attach to a tab
        sid = cdp.attach(tabs[0]["targetId"])

        # Navigate
        cdp.navigate("https://example.com")

        # Get cookies
        cookies = cdp.cookies(["https://example.com"])

        # Evaluate JavaScript
        result = cdp.evaluate("document.title")

        # Capture network requests
        cdp.network_enable()
        cdp.reload()
        events = cdp.wait_events(timeout=5)
        requests = cdp.network_requests(events)

        # Take screenshot
        cdp.screenshot("/tmp/page.png")
"""

import json
import time
import urllib.request

DEFAULT_PORT = 9223


class CDPClient:
    """High-level client for Chrome interaction via the CDP relay."""

    def __init__(self, port=DEFAULT_PORT):
        self.port = port
        self.base = f"http://127.0.0.1:{port}"
        self.session_id = None
        if not self._health():
            raise ConnectionError(
                "CDP relay is not running. Start it with:\n"
                "  nohup /tmp/cdp-relay > /tmp/cdp_relay.log 2>&1 &"
            )

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.detach()

    # -- Relay lifecycle --

    def _health(self):
        try:
            data = self._get("/health")
            return data.get("status") == "ok"
        except Exception:
            return False

    def stop_relay(self):
        """Gracefully stop the relay."""
        try:
            self._post("/stop", {})
        except Exception:
            pass

    # -- Target management --

    def targets(self, type=None):
        """List Chrome targets. Optionally filter by type ('page', 'service_worker', etc.)."""
        all_targets = self._get("/targets")
        if type:
            return [t for t in all_targets if t.get("type") == type]
        return all_targets

    def find_tab(self, url_contains=None, title_contains=None):
        """Find a page tab by URL or title substring."""
        for t in self.targets(type="page"):
            if url_contains and url_contains in t.get("url", ""):
                return t
            if title_contains and title_contains in t.get("title", ""):
                return t
        return None

    def attach(self, target_id):
        """Attach to a target. Returns session ID."""
        resp = self.send("Target.attachToTarget",
                         {"targetId": target_id, "flatten": True})
        self.session_id = resp.get("result", {}).get("sessionId")
        return self.session_id

    def detach(self):
        """Detach from current session."""
        if self.session_id:
            try:
                self.send("Target.detachFromTarget",
                          {"sessionId": self.session_id})
            except Exception:
                pass
            self.session_id = None

    # -- CDP commands --

    def send(self, method, params=None, timeout=15):
        """Send a raw CDP command."""
        body = {"method": method, "timeout": timeout}
        if params:
            body["params"] = params
        if self.session_id:
            body["sessionId"] = self.session_id
        return self._post("/cdp", body)

    def navigate(self, url, wait=3):
        """Navigate to URL and wait for load."""
        resp = self.send("Page.navigate", {"url": url})
        if wait:
            time.sleep(wait)
        return resp

    def reload(self, ignore_cache=True, wait=3):
        """Reload current page."""
        resp = self.send("Page.reload", {"ignoreCache": ignore_cache})
        if wait:
            time.sleep(wait)
        return resp

    def evaluate(self, expression, await_promise=False):
        """Evaluate JavaScript and return the result value."""
        params = {"expression": expression, "returnByValue": True}
        if await_promise:
            params["awaitPromise"] = True
        resp = self.send("Runtime.evaluate", params, timeout=30)
        result = resp.get("result", {}).get("result", {})
        if result.get("type") == "undefined":
            return None
        return result.get("value")

    def evaluate_async(self, async_expression):
        """Evaluate an async JS expression (auto-awaits)."""
        return self.evaluate(async_expression, await_promise=True)

    # -- Network --

    def network_enable(self):
        """Enable network event capture."""
        return self.send("Network.enable")

    def network_disable(self):
        """Disable network event capture."""
        return self.send("Network.disable")

    def wait_events(self, timeout=5):
        """Wait for events to accumulate, then drain them."""
        time.sleep(timeout)
        return self.drain_events()

    def drain_events(self):
        """Fetch all buffered events for current session."""
        sid_param = f"?sessionId={self.session_id}" if self.session_id else ""
        return self._get(f"/events{sid_param}")

    def network_requests(self, events=None):
        """Extract network requests from events."""
        if events is None:
            events = self.drain_events()
        return [
            e["params"]["request"]
            for e in events
            if e.get("method") == "Network.requestWillBeSent"
        ]

    def find_request(self, events, url_contains):
        """Find a specific network request by URL substring."""
        for e in events:
            if e.get("method") == "Network.requestWillBeSent":
                req = e["params"]["request"]
                if url_contains in req.get("url", ""):
                    return req
        return None

    # -- Cookies --

    def cookies(self, urls=None):
        """Get cookies, optionally filtered by URLs."""
        params = {"urls": urls} if urls else {}
        resp = self.send("Network.getCookies", params)
        return resp.get("result", {}).get("cookies", [])

    def set_cookie(self, name, value, domain, path="/", secure=True):
        """Set a cookie."""
        return self.send("Network.setCookie", {
            "name": name, "value": value,
            "domain": domain, "path": path, "secure": secure,
        })

    def clear_cookies(self):
        """Clear all cookies."""
        return self.send("Network.clearBrowserCookies")

    # -- Screenshots --

    def screenshot(self, path=None, format="png", quality=80, full_page=False):
        """Take a screenshot. Returns base64 data or saves to path."""
        import base64
        params = {"format": format}
        if format == "jpeg":
            params["quality"] = quality
        if full_page:
            # Get full page dimensions
            metrics = self.send("Page.getLayoutMetrics")
            content = metrics.get("result", {}).get("contentSize", {})
            if content:
                params["clip"] = {
                    "x": 0, "y": 0,
                    "width": content.get("width", 1920),
                    "height": content.get("height", 1080),
                    "scale": 1,
                }
        resp = self.send("Page.captureScreenshot", params, timeout=30)
        data = resp.get("result", {}).get("data", "")
        if path and data:
            with open(path, "wb") as f:
                f.write(base64.b64decode(data))
        return data

    # -- DOM --

    def get_document(self):
        """Get the root DOM node."""
        resp = self.send("DOM.getDocument")
        return resp.get("result", {}).get("root", {})

    def query_selector(self, selector, node_id=None):
        """Find element by CSS selector."""
        if node_id is None:
            doc = self.get_document()
            node_id = doc.get("nodeId", 1)
        resp = self.send("DOM.querySelector",
                         {"nodeId": node_id, "selector": selector})
        return resp.get("result", {}).get("nodeId")

    def get_outer_html(self, node_id):
        """Get outerHTML of a node."""
        resp = self.send("DOM.getOuterHTML", {"nodeId": node_id})
        return resp.get("result", {}).get("outerHTML", "")

    # -- Emulation --

    def set_viewport(self, width=1920, height=1080, device_scale_factor=1, mobile=False):
        """Set viewport size."""
        return self.send("Emulation.setDeviceMetricsOverride", {
            "width": width, "height": height,
            "deviceScaleFactor": device_scale_factor,
            "mobile": mobile,
        })

    # -- HTTP helpers --

    def _get(self, path):
        req = urllib.request.Request(f"{self.base}{path}")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _post(self, path, data):
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base}{path}",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

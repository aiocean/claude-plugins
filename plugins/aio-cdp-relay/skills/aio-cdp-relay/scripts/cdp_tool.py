#!/usr/bin/env python3
"""
CDP Tool — CLI for quick Chrome browser interactions via the CDP relay.

Usage:
    python3 cdp_tool.py status              # Relay & Chrome status
    python3 cdp_tool.py targets             # List browser tabs
    python3 cdp_tool.py cookies <url>       # Get cookies for URL
    python3 cdp_tool.py eval <js>           # Evaluate JS in active tab
    python3 cdp_tool.py screenshot <path>   # Take screenshot
    python3 cdp_tool.py navigate <url>      # Navigate active tab
    python3 cdp_tool.py network <seconds>   # Capture network requests
    python3 cdp_tool.py stop                # Stop the relay
"""

import json
import sys

from cdp_client import CDPClient


def cmd_status(cdp, args):
    try:
        data = cdp._get("/health")
        print(f"Relay:     running (pid={data.get('pid', '?')}, idle={data.get('idle_seconds', 0)}s)")
        print(f"Chrome:    {'connected' if data.get('connected') else 'not connected'}")
        print(f"Timeout:   {data.get('idle_timeout', '?')}s")
        tabs = cdp.targets(type="page")
        print(f"Tabs:      {len(tabs)} pages")
    except Exception as e:
        print(f"Relay:     not running ({e})")


def cmd_targets(cdp, args):
    type_filter = args[0] if args else None
    targets = cdp.targets(type=type_filter)
    for t in targets:
        typ = t.get("type", "?")
        url = t.get("url", "")[:100]
        title = t.get("title", "")[:50]
        tid = t["targetId"][:16]
        print(f"  [{typ:15}] {tid}  {title or url}")


def cmd_cookies(cdp, args):
    if not args:
        print("Usage: cdp_tool.py cookies <url>")
        return
    url = args[0]
    # Attach to any page tab first
    tabs = cdp.targets(type="page")
    if not tabs:
        print("ERROR: No page tabs found")
        return
    cdp.attach(tabs[0]["targetId"])
    cookies = cdp.cookies([url])
    for c in cookies:
        secure = "S" if c.get("secure") else " "
        http = "H" if c.get("httpOnly") else " "
        print(f"  {secure}{http} {c['name']:<40} = {c['value'][:60]}{'...' if len(c['value']) > 60 else ''}")
    print(f"\n  Total: {len(cookies)} cookies")
    cdp.detach()


def cmd_eval(cdp, args):
    if not args:
        print("Usage: cdp_tool.py eval <javascript>")
        return
    js = " ".join(args)
    tabs = cdp.targets(type="page")
    if not tabs:
        print("ERROR: No page tabs found")
        return
    cdp.attach(tabs[0]["targetId"])
    result = cdp.evaluate(js)
    if isinstance(result, (dict, list)):
        print(json.dumps(result, indent=2))
    else:
        print(result)
    cdp.detach()


def cmd_screenshot(cdp, args):
    path = args[0] if args else "/tmp/cdp_screenshot.png"
    full = "--full" in args
    tabs = cdp.targets(type="page")
    if not tabs:
        print("ERROR: No page tabs found")
        return
    cdp.attach(tabs[0]["targetId"])
    cdp.screenshot(path, full_page=full)
    print(f"Saved: {path}")
    cdp.detach()


def cmd_navigate(cdp, args):
    if not args:
        print("Usage: cdp_tool.py navigate <url>")
        return
    url = args[0]
    tabs = cdp.targets(type="page")
    if not tabs:
        print("ERROR: No page tabs found")
        return
    # Prefer tab matching URL prefix, else first tab
    tab = None
    for t in tabs:
        if url.split("/")[2] in t.get("url", ""):
            tab = t
            break
    tab = tab or tabs[0]
    cdp.attach(tab["targetId"])
    cdp.navigate(url)
    title = cdp.evaluate("document.title")
    print(f"Navigated to: {title}")
    cdp.detach()


def cmd_network(cdp, args):
    seconds = int(args[0]) if args else 5
    tabs = cdp.targets(type="page")
    if not tabs:
        print("ERROR: No page tabs found")
        return
    cdp.attach(tabs[0]["targetId"])
    cdp.network_enable()
    print(f"Capturing network for {seconds}s...")
    events = cdp.wait_events(timeout=seconds)
    requests = cdp.network_requests(events)
    for r in requests:
        method = r.get("method", "?")
        url = r.get("url", "")[:120]
        print(f"  {method:6} {url}")
    print(f"\n  Total: {len(requests)} requests ({len(events)} events)")
    cdp.detach()


def cmd_stop(cdp, args):
    cdp.stop_relay()
    print("Relay stopping.")


COMMANDS = {
    "status": cmd_status,
    "targets": cmd_targets,
    "cookies": cmd_cookies,
    "eval": cmd_eval,
    "screenshot": cmd_screenshot,
    "navigate": cmd_navigate,
    "network": cmd_network,
    "stop": cmd_stop,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "help"):
        print(__doc__)
        print("Commands:", ", ".join(COMMANDS.keys()))
        return

    cmd = sys.argv[1]
    if cmd not in COMMANDS:
        print(f"Unknown command: {cmd}")
        print("Commands:", ", ".join(COMMANDS.keys()))
        sys.exit(1)

    cdp = CDPClient()
    COMMANDS[cmd](cdp, sys.argv[2:])


if __name__ == "__main__":
    main()

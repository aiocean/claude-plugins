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
    python3 cdp_tool.py restart             # Rebuild, kill, and restart relay
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


def cmd_restart(cdp, args):
    """Kill the running relay and start a new one."""
    import os
    import subprocess
    import time

    # 1. Try graceful stop via API
    try:
        cdp.stop_relay()
        print("Sent stop signal to relay.")
    except Exception:
        pass

    # 2. Wait for process to die, then force kill via PID file
    pid_file = "/tmp/cdp_relay.pid"
    for _ in range(10):
        time.sleep(0.3)
        try:
            cdp._get("/health")
        except Exception:
            break
    else:
        # Still running — force kill
        try:
            pid = int(open(pid_file).read().strip())
            os.kill(pid, 9)
            print(f"Force killed pid {pid}.")
            time.sleep(0.5)
        except Exception:
            pass

    # 3. Rebuild binary
    relay_go_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "relay-go")
    print("Building cdp-relay...")
    result = subprocess.run(["go", "install", "."], cwd=relay_go_dir, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Build failed: {result.stderr}")
        return

    # 4. Find the binary
    binary = None
    for candidate in ["cdp-relay", os.path.expanduser("~/go/bin/cdp-relay"), "/tmp/cdp-relay"]:
        if os.path.isfile(candidate) or subprocess.run(["which", candidate], capture_output=True).returncode == 0:
            binary = candidate
            break
    if not binary:
        print("ERROR: cdp-relay binary not found after build.")
        return

    # 5. Start new relay
    log_file = open("/tmp/cdp_relay.log", "a")
    subprocess.Popen([binary], stdout=log_file, stderr=log_file, start_new_session=True)
    time.sleep(1)

    # 6. Verify
    try:
        new_cdp = CDPClient()
        data = new_cdp._get("/health")
        print(f"Relay restarted (pid={data.get('pid', '?')}).")
    except Exception as e:
        print(f"WARNING: Relay may not have started: {e}")
        print("Check: tail -f /tmp/cdp_relay.log")


COMMANDS = {
    "status": cmd_status,
    "targets": cmd_targets,
    "cookies": cmd_cookies,
    "eval": cmd_eval,
    "screenshot": cmd_screenshot,
    "navigate": cmd_navigate,
    "network": cmd_network,
    "stop": cmd_stop,
    "restart": cmd_restart,
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

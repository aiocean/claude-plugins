#!/bin/bash
# Analyze an .ips crash report and produce human-readable summary
# Usage: analyze-crash.sh <path_to_ips_file>
# Example: analyze-crash.sh /tmp/crashes/MyApp-2026-02-09-173322.ips

IPS_FILE="$1"

if [ -z "$IPS_FILE" ] || [ ! -f "$IPS_FILE" ]; then
    echo "Usage: analyze-crash.sh <path_to_ips_file>"
    exit 1
fi

python3 << 'PYEOF'
import json, sys

ips_file = sys.argv[1]

with open(ips_file) as f:
    header = json.loads(f.readline())
    body = json.load(f)

print("=" * 60)
print("CRASH REPORT ANALYSIS")
print("=" * 60)

print(f"\nApp:       {header.get('app_name', 'N/A')} {header.get('app_version', '')} ({header.get('build_version', '')})")
print(f"Bundle:    {header.get('bundleID', 'N/A')}")
print(f"Timestamp: {header.get('timestamp', 'N/A')}")
print(f"OS:        {header.get('os_version', 'N/A')}")
print(f"Device:    {body.get('modelCode', 'N/A')}")
print(f"CPU:       {body.get('cpuType', 'N/A')}")

exc = body.get('exception', {})
term = body.get('termination', {})

print(f"\n--- Exception ---")
print(f"Type:      {exc.get('type', 'N/A')}")
print(f"Signal:    {exc.get('signal', 'N/A')}")
print(f"Codes:     {exc.get('codes', 'N/A')}")

print(f"\n--- Termination ---")
print(f"Indicator: {term.get('indicator', 'N/A')}")
print(f"Namespace: {term.get('namespace', 'N/A')}")
print(f"Code:      {term.get('code', 'N/A')}")

# Common signal interpretations
signal = exc.get('signal', '')
exc_type = exc.get('type', '')
if signal == 'SIGTRAP' and exc_type == 'EXC_BREAKPOINT':
    print(f"\n>>> DIAGNOSIS: Swift runtime trap (precondition failure, fatalError,")
    print(f"    force unwrap nil, actor isolation violation, or dispatch_assert_queue_fail)")
elif signal == 'SIGABRT':
    print(f"\n>>> DIAGNOSIS: Abort signal — likely uncaught exception, assertion failure,")
    print(f"    or fatalError()")
elif signal == 'SIGSEGV' or exc_type == 'EXC_BAD_ACCESS':
    print(f"\n>>> DIAGNOSIS: Bad memory access — use-after-free, null pointer dereference,")
    print(f"    or dangling pointer")
elif signal == 'SIGBUS':
    print(f"\n>>> DIAGNOSIS: Bus error — misaligned memory access or memory-mapped I/O error")
elif signal == 'SIGKILL':
    print(f"\n>>> DIAGNOSIS: Process killed by system — likely watchdog timeout, jetsam (OOM),")
    print(f"    or background task exceeded time limit")

# Build image lookup
images = body.get('usedImages', [])
image_map = {}
for i, img in enumerate(images):
    image_map[i] = img.get('name', f'image_{i}')

# Faulting thread
ft = body.get('faultingThread', -1)
threads = body.get('threads', [])

if 0 <= ft < len(threads):
    thread = threads[ft]
    queue = thread.get('queue', 'N/A')
    name = thread.get('name', '')

    print(f"\n--- Faulting Thread {ft} ---")
    if name:
        print(f"Name:  {name}")
    print(f"Queue: {queue}")

    # Categorize queue
    if 'main-thread' in str(queue).lower() or 'com.apple.main-thread' in str(queue):
        print(f">>> Main thread crash")
    elif queue != 'N/A':
        print(f">>> Background thread crash")

    print(f"\nStack trace:")
    app_frames = []
    for i, frame in enumerate(thread.get('frames', [])[:25]):
        sym = frame.get('symbol', '???')
        loc = frame.get('symbolLocation', 0)
        idx = frame.get('imageIndex', -1)
        img = image_map.get(idx, '???')

        marker = ""
        # Mark app frames
        if idx in (0, 1):  # Usually index 0-1 are app binary + debug dylib
            marker = " <<<"
            app_frames.append((i, img, sym, loc))

        print(f"  {i:2d}  {img:30s}  {sym}+{loc}{marker}")

    if app_frames:
        print(f"\n--- App Frames (likely crash location) ---")
        for i, img, sym, loc in app_frames:
            print(f"  #{i}: {sym}+{loc}  ({img})")

        # Try to identify specific patterns
        for _, _, sym, _ in app_frames:
            if 'startBarometer' in sym or 'startMotion' in sym:
                print(f"\n>>> PATTERN: Sensor callback crash — likely Swift 6 actor isolation")
                print(f"    violation. Callback running on wrong queue for @MainActor class.")
            elif 'dispatch_assert_queue_fail' in sym:
                print(f"\n>>> PATTERN: dispatch_assert_queue_fail — code expected to run on")
                print(f"    specific queue but ran on different one. Common with @MainActor.")

# Show all threads summary
print(f"\n--- All Threads ({len(threads)}) ---")
for i, t in enumerate(threads):
    triggered = " <<< CRASHED" if t.get('triggered') else ""
    name = t.get('name', '')
    queue = t.get('queue', '')
    frames = t.get('frames', [])
    top = frames[0].get('symbol', '???') if frames else '(no frames)'
    desc = name or queue or '(unnamed)'
    print(f"  Thread {i}: {desc} — {top}{triggered}")

PYEOF
"$IPS_FILE"

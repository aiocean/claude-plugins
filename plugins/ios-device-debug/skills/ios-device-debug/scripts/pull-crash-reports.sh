#!/bin/bash
# Pull crash reports from connected iOS device
# Usage: pull-crash-reports.sh [app_name] [output_dir]
# Example: pull-crash-reports.sh MyApp /tmp/crashes

APP_NAME="$1"
OUTPUT_DIR="${2:-/tmp/ios_crash_reports}"

# Check idevicecrashreport availability
if ! command -v idevicecrashreport &>/dev/null; then
    echo "ERROR: idevicecrashreport not found. Install: brew install libimobiledevice"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "=== Pulling crash reports to $OUTPUT_DIR ==="
idevicecrashreport -e "$OUTPUT_DIR/" 2>&1

echo ""
if [ -n "$APP_NAME" ]; then
    echo "=== Crash reports for $APP_NAME ==="
    REPORTS=$(ls "$OUTPUT_DIR/" 2>/dev/null | grep -i "$APP_NAME" | sort -r)
    if [ -n "$REPORTS" ]; then
        echo "$REPORTS"
        echo ""
        # Show the most recent crash report summary
        LATEST=$(echo "$REPORTS" | head -1)
        echo "=== Latest crash: $LATEST ==="
        # Extract key info from .ips file
        python3 -c "
import json, sys
with open('$OUTPUT_DIR/$LATEST') as f:
    # .ips files have JSON header on line 1, then JSON body
    header = json.loads(f.readline())
    body = json.load(f)

print(f\"App: {header.get('app_name', 'N/A')}\")
print(f\"Timestamp: {header.get('timestamp', 'N/A')}\")
print(f\"OS: {header.get('os_version', 'N/A')}\")
print(f\"Device: {body.get('modelCode', 'N/A')}\")

exc = body.get('exception', {})
print(f\"Exception: {exc.get('type', 'N/A')} ({exc.get('signal', 'N/A')})\")

term = body.get('termination', {})
print(f\"Termination: {term.get('indicator', 'N/A')}\")

ft = body.get('faultingThread', 'N/A')
print(f\"Faulting thread: {ft}\")

# Show faulting thread stack
if isinstance(ft, int) and 'threads' in body:
    thread = body['threads'][ft]
    queue = thread.get('queue', 'N/A')
    print(f\"Queue: {queue}\")
    print(f\"Stack trace:\")
    for frame in thread.get('frames', [])[:15]:
        sym = frame.get('symbol', '???')
        loc = frame.get('symbolLocation', '')
        idx = frame.get('imageIndex', '')
        img = ''
        if isinstance(idx, int) and 'usedImages' in body and idx < len(body['usedImages']):
            img = body['usedImages'][idx].get('name', '')
        print(f\"  {img}  {sym}+{loc}\")
" 2>/dev/null || echo "(Could not parse .ips file automatically)"
    else
        echo "No crash reports found for $APP_NAME"
    fi
else
    echo "=== All crash reports ==="
    ls -lt "$OUTPUT_DIR/" | head -20
fi

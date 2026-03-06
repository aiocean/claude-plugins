#!/bin/bash
# Capture screenshot from iOS device (iOS 17+ compatible)
# Usage: screenshot.sh [output_path]
#
# Requires:
#   - pymobiledevice3: pip3 install pymobiledevice3
#   - tunneld running: sudo python3 -m pymobiledevice3 remote tunneld -p tcp
#
# On iOS 17+, idevicescreenshot and the deprecated pymobiledevice3 screenshot
# API both fail. Only the DVT screenshot method via tunnel works.

set -euo pipefail

OUTPUT="${1:-/tmp/device_screenshot.png}"

# Check pymobiledevice3 is available
if ! command -v pymobiledevice3 &>/dev/null && ! python3 -m pymobiledevice3 --version &>/dev/null 2>&1; then
    echo "ERROR: pymobiledevice3 not found. Install with: pip3 install pymobiledevice3"
    exit 1
fi

# Check tunneld is running
if ! pgrep -f "pymobiledevice3 remote tunneld" &>/dev/null; then
    echo "ERROR: tunneld is not running."
    echo "Start it with: sudo python3 -m pymobiledevice3 remote tunneld -p tcp"
    exit 1
fi

# Ensure developer image is mounted
python3 -m pymobiledevice3 mounter auto-mount 2>&1 | grep -v "already mounted" || true

echo "Capturing screenshot to: $OUTPUT"
python3 -m pymobiledevice3 developer dvt screenshot --tunnel "" "$OUTPUT"

if [ -f "$OUTPUT" ]; then
    SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
    echo "Screenshot saved: $OUTPUT ($SIZE bytes)"
else
    echo "ERROR: Screenshot file was not created"
    exit 1
fi

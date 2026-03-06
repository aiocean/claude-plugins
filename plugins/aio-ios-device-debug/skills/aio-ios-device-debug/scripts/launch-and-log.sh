#!/bin/bash
# Launch app on device and capture syslog for analysis
# Usage: launch-and-log.sh <bundle_id> <device_id> [duration_seconds]
# Example: launch-and-log.sh com.example.app 00008140-000C359221B8801C 20

BUNDLE_ID="$1"
DEVICE_ID="$2"
DURATION="${3:-20}"
LOG_FILE="/tmp/${BUNDLE_ID}_syslog_$(date +%s).txt"

if [ -z "$BUNDLE_ID" ] || [ -z "$DEVICE_ID" ]; then
    echo "Usage: launch-and-log.sh <bundle_id> <device_id> [duration_seconds]"
    exit 1
fi

# Check idevicesyslog availability
if ! command -v idevicesyslog &>/dev/null; then
    echo "ERROR: idevicesyslog not found. Install: brew install libimobiledevice"
    exit 1
fi

echo "=== Starting syslog capture to $LOG_FILE ==="
idevicesyslog --no-colors > "$LOG_FILE" 2>&1 &
SYSLOG_PID=$!
sleep 3

echo "=== Launching $BUNDLE_ID ==="
xcrun devicectl device process launch --device "$DEVICE_ID" "$BUNDLE_ID" 2>&1

echo "=== Capturing logs for ${DURATION}s ==="
sleep "$DURATION"

kill $SYSLOG_PID 2>/dev/null
wait $SYSLOG_PID 2>/dev/null

# Extract PID
APP_PID=$(grep -oE "${BUNDLE_ID##*.}\[[0-9]+\]" "$LOG_FILE" | grep -oE '[0-9]+' | sort -u | head -1)

echo ""
echo "=== Log Summary ==="
echo "Log file: $LOG_FILE"
echo "Total lines: $(wc -l < "$LOG_FILE")"
echo "App PID: ${APP_PID:-unknown}"

# Check for crash
echo ""
echo "=== Crash Check ==="
if grep -q "Corpse" "$LOG_FILE"; then
    echo "CRASH DETECTED!"
    echo ""
    # Show crash signal
    grep -E "Corpse|Process exited.*signal|SIGTRAP|SIGABRT|terminated.*signal" "$LOG_FILE" | head -5
else
    echo "NO CRASH - App appears to be running"
fi

# Show app-specific errors/warnings
echo ""
echo "=== App Errors/Warnings ==="
if [ -n "$APP_PID" ]; then
    grep "\[${APP_PID}\]" "$LOG_FILE" | grep -iE "error|warning|fault|assert|crash|exception" | head -20
else
    grep -i "${BUNDLE_ID##*.}" "$LOG_FILE" | grep -iE "error|warning|fault|assert|crash|exception" | head -20
fi

echo ""
echo "Log file saved: $LOG_FILE"

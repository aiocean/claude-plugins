#!/bin/bash
# List connected iOS devices with both devicectl and xcodebuild IDs
# Usage: device-list.sh

echo "=== CoreDevice (devicectl) ==="
xcrun devicectl list devices 2>&1 | grep -v "^$"

echo ""
echo "=== Xcode Destinations ==="
# Extract physical iOS devices from xcodebuild
# Requires a scheme name - try to find one
SCHEME=""
if [ -f "*.xcodeproj/project.pbxproj" ] 2>/dev/null || ls *.xcodeproj &>/dev/null; then
    SCHEME=$(xcodebuild -list -json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['project']['schemes'][0])" 2>/dev/null)
fi

if [ -n "$SCHEME" ]; then
    xcodebuild -scheme "$SCHEME" -showdestinations 2>/dev/null | grep "platform:iOS, " | grep -v Simulator | head -10
else
    echo "(No .xcodeproj found in current directory — run from project root or pass scheme)"
    echo "Manual: xcodebuild -scheme <SCHEME> -showdestinations | grep 'platform:iOS,'"
fi

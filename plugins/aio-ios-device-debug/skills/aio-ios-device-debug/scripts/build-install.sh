#!/bin/bash
# Build and install app on connected iOS device
# Usage: build-install.sh <scheme> <device_id>
# Example: build-install.sh MyApp 00008140-000C359221B8801C

set -e

SCHEME="$1"
DEVICE_ID="$2"

if [ -z "$SCHEME" ] || [ -z "$DEVICE_ID" ]; then
    echo "Usage: build-install.sh <scheme> <device_id>"
    echo ""
    echo "  scheme    - Xcode scheme name"
    echo "  device_id - Physical device ID from xcodebuild destinations"
    echo ""
    echo "Find device_id: xcodebuild -scheme <scheme> -showdestinations | grep 'platform:iOS,'"
    exit 1
fi

echo "=== Building $SCHEME for device $DEVICE_ID ==="
xcodebuild -scheme "$SCHEME" \
    -destination "platform=iOS,id=$DEVICE_ID" \
    -allowProvisioningUpdates \
    build 2>&1 | tail -5

# Find the built .app
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -path "*/$SCHEME-*/Build/Products/Debug-iphoneos/$SCHEME.app" -maxdepth 5 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
    echo "ERROR: Could not find built .app in DerivedData"
    exit 1
fi

echo ""
echo "=== Installing on device ==="
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH" 2>&1

echo ""
echo "=== Done ==="
echo "App path: $APP_PATH"

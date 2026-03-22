---
name: aio-ios-device-debug
description: Debug iOS apps on physical devices — build, install, capture logs, extract crash reports, and take screenshots. Triggers: "debug on device", "deploy to iPhone", "get crash logs", "pull crash report", "device screenshot", syslog.
---

```bash
SCRIPTS="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-ios-device-debug/*/skills/aio-ios-device-debug/scripts 2>/dev/null | sort -V | tail -1)"
```

# iOS Device Debug

## Environment
- xcode-select: !`xcode-select -p 2>/dev/null || echo "NOT INSTALLED"`
- idevicesyslog: !`which idevicesyslog 2>/dev/null || echo "NOT INSTALLED — brew install libimobiledevice"`
- idevicecrashreport: !`which idevicecrashreport 2>/dev/null || echo "NOT INSTALLED — brew install libimobiledevice"`
- python3: !`which python3 2>/dev/null || echo "NOT INSTALLED"`
- pymobiledevice3: !`python3 -c "import pymobiledevice3" 2>/dev/null && echo "installed" || echo "NOT INSTALLED — pip3 install pymobiledevice3"`
- Connected devices: !`idevice_id -l 2>/dev/null || echo "none detected (or idevice_id missing)"`

Debug iOS apps on physical devices: build, install, launch, capture logs, pull crash reports, and analyze crashes — all from the terminal without Xcode GUI.

## Prerequisites

Required tools (check before starting):
- **Xcode** with command line tools (`xcode-select --install`)
- **libimobiledevice**: `brew install libimobiledevice` (provides `idevicesyslog`, `idevicecrashreport`)
- **pymobiledevice3**: `pip3 install pymobiledevice3` (required for screenshots on iOS 17+)
- **Python 3**: for crash report parsing and pymobiledevice3
- Physical iOS device connected via USB or WiFi

## Workflow Overview

The debug workflow follows this sequence:

1. **Discover device** — find device ID
2. **Build & install** — compile and deploy to device
3. **Launch & capture logs** — run app while recording syslog
4. **Check for crash** — search logs for Corpse/signal
5. **Pull crash reports** — extract .ips files from device
6. **Analyze crash** — parse .ips for stack trace and root cause

## Scripts

| Script | Purpose |
|--------|---------|
| `$SCRIPTS/device-list.sh` | List connected devices with both devicectl and xcodebuild IDs |
| `$SCRIPTS/build-install.sh` | Build scheme and install on device |
| `$SCRIPTS/launch-and-log.sh` | Launch app, capture syslog, check for crashes |
| `$SCRIPTS/pull-crash-reports.sh` | Pull .ips crash reports from device |
| `$SCRIPTS/analyze-crash.sh` | Parse .ips file into human-readable analysis |
| `$SCRIPTS/screenshot.sh` | Capture screenshot from device (iOS 17+ compatible) |

## Step-by-Step Debug Process

### 1. Discover Device

Two ID systems exist for iOS devices — `xcodebuild` and `devicectl` use different IDs:

```bash
# Get xcodebuild device ID (needed for build/install)
xcodebuild -scheme <Scheme> -showdestinations 2>/dev/null | grep "platform:iOS," | grep -v Simulator

# Get devicectl UUID (needed for devicectl commands)
xcrun devicectl list devices
```

The xcodebuild ID (e.g., `00008140-...`) is used for building and installing. The devicectl UUID is different. Always verify which ID a command expects.

### Capture Screenshot

On iOS 17+, `idevicescreenshot` and the deprecated `pymobiledevice3 developer screenshot` API both fail. Use the DVT screenshot method via pymobiledevice3 tunnel instead.

**Prerequisites:**

1. Install pymobiledevice3: `pip3 install pymobiledevice3`
2. Start tunneld (requires sudo, run once in background):
   ```bash
   sudo python3 -m pymobiledevice3 remote tunneld -p tcp
   ```
3. Developer image must be mounted (usually already done if Xcode has connected to the device):
   ```bash
   python3 -m pymobiledevice3 mounter auto-mount
   ```

**Capture screenshot:**

```bash
# Using the script (recommended)
bash $SCRIPTS/screenshot.sh /tmp/device_screenshot.png

# Manual command
python3 -m pymobiledevice3 developer dvt screenshot --tunnel "" /tmp/device_screenshot.png
```

The `--tunnel ""` flag auto-discovers the device through the running tunneld service.

**What does NOT work on iOS 17+:**

| Method | Status | Error |
|--------|--------|-------|
| `idevicescreenshot` | FAILS | "Could not start screenshotr service: Invalid service" |
| `pymobiledevice3 developer screenshot` | FAILS | "InvalidServiceError" (deprecated API) |
| `pymobiledevice3 developer screenshot --tunnel ""` | FAILS | deprecated API, same error through tunnel |
| `xcrun devicectl` | N/A | No screenshot subcommand exists |
| `pymobiledevice3 developer dvt screenshot --tunnel ""` | WORKS | DVT API through tunneld |

### 2. Build & Install

```bash
# Build for device
xcodebuild -scheme <Scheme> -destination 'platform=iOS,id=<DEVICE_ID>' -allowProvisioningUpdates build

# Find the .app
find ~/Library/Developer/Xcode/DerivedData -path "*/<Scheme>-*/Build/Products/Debug-iphoneos/<Scheme>.app" -maxdepth 5

# Install
xcrun devicectl device install app --device <DEVICECTL_UUID> /path/to/App.app
```

Or use the combined script:
```bash
bash $SCRIPTS/build-install.sh <Scheme> <XCODEBUILD_DEVICE_ID>
```

### 3. Launch & Capture Logs

Start syslog capture BEFORE launching the app to catch early crashes:

```bash
# Start syslog in background, writing to file
idevicesyslog --no-colors > /tmp/app_syslog.txt 2>&1 &
SYSLOG_PID=$!
sleep 3  # Wait for connection

# Launch app
xcrun devicectl device process launch --device <DEVICECTL_UUID> <BUNDLE_ID>

# Wait for crash or behavior
sleep 20

# Stop syslog
kill $SYSLOG_PID
```

Or use the combined script:
```bash
bash $SCRIPTS/launch-and-log.sh <BUNDLE_ID> <DEVICECTL_UUID> 20
```

### 4. Analyze Logs

After capturing, filter for relevant information:

```bash
# Find app PID
grep -oE 'AppName\[[0-9]+\]' /tmp/app_syslog.txt | sort -u

# Check for crash (Corpse = kernel generating crash report)
grep "Corpse" /tmp/app_syslog.txt

# Find crash signal
grep -E "Process exited.*signal" /tmp/app_syslog.txt
# Example output: code:SIGTRAP(5) = Swift runtime trap
# Example output: code:SIGABRT(6) = abort/exception

# Filter app-only logs
grep "AppName\[PID\]" /tmp/app_syslog.txt | grep -v "CoreFoundation\|BaseBoard"
```

### 5. Pull & Analyze Crash Reports

```bash
# Pull all crash reports from device
mkdir -p /tmp/crashes
idevicecrashreport -e /tmp/crashes/

# Find app-specific crashes
ls /tmp/crashes/ | grep -i AppName

# Analyze the latest crash
bash $SCRIPTS/analyze-crash.sh /tmp/crashes/AppName-2026-02-09-173322.ips
```

The analyze script outputs: exception type, signal, faulting thread, stack trace with app frames highlighted, and a diagnosis based on the signal type.

## Key Signals and What They Mean

| Signal | Exception | Meaning |
|--------|-----------|---------|
| SIGTRAP | EXC_BREAKPOINT | Swift runtime trap: force unwrap nil, precondition, actor isolation violation |
| SIGABRT | EXC_CRASH | Abort: uncaught exception, fatalError(), assertion |
| SIGSEGV | EXC_BAD_ACCESS | Bad memory: use-after-free, null pointer, dangling pointer |
| SIGKILL | — | System kill: watchdog timeout, OOM (jetsam), background time exceeded |

## Common Pitfalls

- **Wrong device ID**: `xcodebuild` and `devicectl` use DIFFERENT IDs. Do not mix them.
- **Screenshot on iOS 17+**: `idevicescreenshot` and the deprecated pymobiledevice3 screenshot API do NOT work. You MUST use `pymobiledevice3 developer dvt screenshot --tunnel ""`. Requires tunneld running with `sudo python3 -m pymobiledevice3 remote tunneld -p tcp`.
- **Syslog disconnects**: `idevicesyslog` can disconnect. Always verify logs were captured (check file size).
- **Benign CoreMotion warning**: `Error reading com.apple.CoreMotion.plist` is a system log, not an app error.
- **Swift 6 actor isolation**: `dispatch_assert_queue_fail` in stack = closure running on wrong queue for `@MainActor` class. Fix with `@Sendable` annotation.
- **Process filter**: `idevicesyslog -p <bundle_id>` can be too aggressive. Prefer capturing all logs to a file and filtering with grep afterward.

## Additional Resources

### Reference Files

- **`references/crash-patterns.md`** — Detailed crash signal patterns, Swift 6 concurrency crashes, CoreMotion/CoreLocation issues, device ID systems, log filtering recipes

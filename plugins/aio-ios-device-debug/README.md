::install-command
/plugin install aio-ios-device-debug@aiocean-plugins
::

# aio-ios-device-debug

**Physical device debugging for iOS, entirely from the terminal.**

The Xcode GUI hides what is actually happening during a crash. Logs scroll past, stack traces disappear, and the dialog that says "process exited" offers nothing actionable. This plugin takes the opposite approach: every step of the debug loop — build, install, launch, syslog capture, crash report extraction, and stack trace analysis — runs as a shell command you can inspect, re-run, and automate.

The result is a repeatable, scriptable workflow that works over SSH, in CI, and in any terminal where you would normally open Xcode just to see a crash reason.

## Install

```bash
/plugin install aio-ios-device-debug@aiocean-plugins
```

## Requirements

- Xcode with command-line tools (`xcode-select --install`)
- `libimobiledevice`: `brew install libimobiledevice`
- `pymobiledevice3`: `pip3 install pymobiledevice3` (required for screenshots on iOS 17+)
- A physical iOS device connected via USB or paired over WiFi

## The debug loop

The skill walks Claude through a six-step sequence, handling the non-obvious parts automatically:

```
discover device → build & install → launch + capture syslog → detect crash → pull .ips reports → analyze stack trace
```

Each step uses the right tool for the job. Two separate device ID systems exist (`xcodebuild` ID and `devicectl` UUID) and the skill keeps them straight — a common source of silent failures when mixing commands.

## What the scripts handle

| Script | What it does |
|--------|-------------|
| `device-list.sh` | Lists connected devices with both xcodebuild and devicectl IDs |
| `build-install.sh` | Compiles a scheme and installs the .app on device |
| `launch-and-log.sh` | Starts syslog capture before launch, detects crash signals |
| `pull-crash-reports.sh` | Extracts .ips files from the device |
| `analyze-crash.sh` | Parses an .ips into signal type, faulting thread, and app frames |
| `screenshot.sh` | Captures a screenshot using the DVT API (iOS 17+ compatible) |

## Crash signal reference

The analyzer maps raw signals to their most common root causes:

| Signal | Exception | Likely cause |
|--------|-----------|-------------|
| SIGTRAP | EXC_BREAKPOINT | Swift runtime trap: force-unwrap nil, precondition failure, actor isolation violation |
| SIGABRT | EXC_CRASH | Uncaught exception, `fatalError()`, assertion |
| SIGSEGV | EXC_BAD_ACCESS | Use-after-free, null dereference, dangling pointer |
| SIGKILL | — | Watchdog timeout, OOM jetsam, background time exceeded |

## The iOS 17 screenshot problem

Every common screenshot method is broken on iOS 17+. The skill documents exactly which methods fail and why, and uses the only working approach: `pymobiledevice3 developer dvt screenshot` through a `tunneld` session. The setup is three commands run once; the skill explains each one.

## Trigger phrases

> "debug on device", "deploy to iPhone", "get crash logs", "pull crash report", "device screenshot", "iOS device syslog", "physical device debug"

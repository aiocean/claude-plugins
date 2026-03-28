# aio-ios-device-debug

Debug iOS apps on physical devices. Build, install, launch, capture logs, pull crash reports, and analyze crashes from the terminal.

## Install

```bash
/plugin install aio-ios-device-debug@aiocean-plugins
```

## What It Does

- Build and deploy an iOS app directly to a connected device
- Capture real-time syslog output filtered by app bundle ID
- Pull crash reports from the device
- Take screenshots from the terminal
- Analyze crash logs and symbolicate stack traces

## Requirements

- Xcode and Xcode command-line tools
- [libimobiledevice](https://libimobiledevice.org/)
- [pymobiledevice3](https://github.com/doronz88/pymobiledevice3)

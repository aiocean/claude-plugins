---
title: "aio-ios-device-debug"
description: "Debug app iOS trên thiết bị thật. Build, install, launch, capture log, kéo crash report và phân tích crash từ terminal."
document_type: "plugin"
version: "1.1.5"
install: "/plugin install aio-ios-device-debug@aiocean-plugins"
skills_count: 1
---

> **Cài đặt:** `/plugin install aio-ios-device-debug@aiocean-plugins` · `v1.1.5`

# aio-ios-device-debug

Debug app iOS trên thiết bị thật. Build, install, launch, capture log, kéo crash report và phân tích crash từ terminal.

## Cài đặt

```bash
/plugin install aio-ios-device-debug@aiocean-plugins
```

## Tính năng

- Build và deploy app iOS trực tiếp lên thiết bị đang kết nối
- Capture output syslog thời gian thực, lọc theo app bundle ID
- Kéo crash report từ thiết bị
- Chụp screenshot từ terminal
- Phân tích crash log và symbolicate stack trace

## Yêu cầu

- Xcode và Xcode command-line tools
- [libimobiledevice](https://libimobiledevice.org/)
- [pymobiledevice3](https://github.com/doronz88/pymobiledevice3)

## Skills (1)

- [**aio-ios-device-debug**](/vi/plugins/aio-ios-device-debug/aio-ios-device-debug) — Debug app iOS trên thiết bị thật — build, install, capture log, trích xuất crash report và chụp screenshot.

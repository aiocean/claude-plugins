---
title: "aio-remove-bg"
description: "Xóa background khỏi ảnh và cắt bỏ viền trong suốt. Hỗ trợ phương pháp threshold (nhanh) và AI (rembg)."
document_type: "plugin"
version: "1.1.5"
install: "/plugin install aio-remove-bg@aiocean-plugins"
skills_count: 1
---

> **Cài đặt:** `/plugin install aio-remove-bg@aiocean-plugins` · `v1.1.5`

# aio-remove-bg

Xóa background khỏi ảnh và cắt bỏ viền trong suốt. Hỗ trợ phương pháp threshold (nhanh) và AI (rembg).

## Cài đặt

```bash
/plugin install aio-remove-bg@aiocean-plugins
```

> **Đã deprecated.** Dùng ImageMagick hoặc rembg CLI trực tiếp thay cho plugin này.

## Tính năng

- Xóa background bằng threshold (nhanh, không cần model)
- Xóa background bằng AI qua rembg
- Cắt bỏ viền trong suốt sau khi xóa

## Yêu cầu

- python3
- rembg
- opencv

## Skills (1)

- [**aio-remove-bg**](/vi/plugins/aio-remove-bg/aio-remove-bg) — Xóa background ảnh bằng threshold (nhanh) hoặc rembg AI (ảnh phức tạp) và cắt bỏ viền trong suốt.

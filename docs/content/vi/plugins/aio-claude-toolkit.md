---
title: "aio-claude-toolkit"
description: "Mài sắc Claude Code — patch system prompt cho output cấp senior, lưu workflow của phiên hiện tại thành skill tái sử dụng, consolidate memory, và gửi feedback về marketplace."
document_type: "plugin"
version: "2.6.2"
install: "/plugin install aio-claude-toolkit@aiocean-plugins"
skills_count: 4
---

# aio-claude-toolkit

`v2.6.2`

Mài sắc Claude Code — patch system prompt cho output cấp senior, lưu workflow của phiên hiện tại thành skill tái sử dụng, consolidate memory, và gửi feedback về marketplace.

## Cài đặt

```
/plugin install aio-claude-toolkit@aiocean-plugins
```

## Skills (4)

- [**aio-dream**](/vi/plugins/aio-claude-toolkit/aio-dream) — Consolidate memory — review, merge, prune và re-index các file memory để các phiên sau định hướng nhanh.
- [**aio-patch-claude**](/vi/plugins/aio-claude-toolkit/aio-patch-claude) — Patch system prompt của Claude Code để tối đa chất lượng thay vì tiết kiệm token. Pipeline tự động qua patch_local.py + patches.json từ godClaude, có manual fal…
- [**aio-skillify**](/vi/plugins/aio-claude-toolkit/aio-skillify) — Capture quy trình lặp lại của phiên hiện tại thành file SKILL.md tái sử dụng qua phỏng vấn có hướng dẫn.
- [**aio-feedback**](/vi/plugins/aio-claude-toolkit/aio-feedback) — Gửi bug report, feature request và plugin request về aiocean/claude-plugins qua GitHub Issues.

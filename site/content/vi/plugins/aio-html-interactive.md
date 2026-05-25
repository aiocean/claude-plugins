---
title: "aio-html-interactive"
description: "Bridge Claude với browser UI trong thời gian thực. Giải quyết khoảng cách AI-event-loop bằng scaffold Bun + Vue3 + Tailwind đã được đóng băng: browser event trở thành notification của Monitor tool (server emit dòng MSG:: ra stdout), Claude push broadcast qua WebSocket. Claude chỉ edit APP REGION; runtime, protocol, và vendor block luôn frozen."
document_type: "plugin"
version: "1.0.1"
install: "/plugin install aio-html-interactive@aiocean-plugins"
skills_count: 1
---

# aio-html-interactive

`v1.0.1`

Bridge Claude với browser UI trong thời gian thực. Giải quyết khoảng cách AI-event-loop bằng scaffold Bun + Vue3 + Tailwind đã được đóng băng: browser event trở thành notification của Monitor tool (server emit dòng MSG:: ra stdout), Claude push broadcast qua WebSocket. Claude chỉ edit APP REGION; runtime, protocol, và vendor block luôn frozen.

## Cài đặt

```
/plugin install aio-html-interactive@aiocean-plugins
```

## Skills (1)

- [**aio-html-interactive**](/vi/plugins/aio-html-interactive/aio-html-interactive) — Bridge Claude với browser UI trong thời gian thực. Vấn đề kỹ thuật: Claude chạy theo vòng lặp CLI từng turn, không có event loop — không thể addEventListener trên một t…

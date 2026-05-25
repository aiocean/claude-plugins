---
title: "aio-planning"
description: "Hiểu, lập kế hoạch, debug và review code thành một luồng phối hợp duy nhất — codebase discovery, dependency mapping, implementation planning, root-cause debugging và pre-merge review."
document_type: "plugin"
version: "1.1.2"
install: "/plugin install aio-planning@aiocean-plugins"
skills_count: 10
---

# aio-planning

`v1.1.2`

Hiểu, lập kế hoạch, debug và review code thành một luồng phối hợp duy nhất — codebase discovery, dependency mapping, implementation planning, root-cause debugging và pre-merge review.

## Cài đặt

```
/plugin install aio-planning@aiocean-plugins
```

## Skills (10)

- [**aio-code-review**](/vi/plugins/aio-planning/aio-code-review) — Pipeline code review nhiều giai đoạn với phân tích theo domain qua GitNexus và các agent chuyên biệt chạy song song. Dùng sau aio-deep-plan hoặc trước khi merge.
- [**aio-debug**](/vi/plugins/aio-planning/aio-debug) — Debug code bị hỏng — điều phối thu thập context codebase, điều tra root cause, fix tối thiểu và validation qua code review thông qua debugger agent.
- [**aio-discover**](/vi/plugins/aio-planning/aio-discover) — Tìm code, định vị implementation và hiểu cách feature hoạt động qua các Explore agent chạy song song. Bước đầu tiên của pipeline aio-deep-plan (tiếp theo là aio-map a…
- [**aio-doc-writer**](/vi/plugins/aio-planning/aio-doc-writer) — Sinh tài liệu kiến trúc toàn diện được hỗ trợ bởi GitNexus knowledge graph và phân tích LSP.
- [**aio-gitnexus**](/vi/plugins/aio-planning/aio-gitnexus) — Cài đặt, cấu hình và quản lý GitNexus code intelligence engine — index codebase, setup MCP, kiểm tra trạng thái, troubleshoot và tài liệu hóa local git-hook auto-r…
- [**aio-map**](/vi/plugins/aio-planning/aio-map) — Trace dependency, call graph và blast radius cho một file/function/module qua GitNexus + LSP. Bước thứ hai của pipeline aio-deep-plan (sau aio-discover,…
- [**aio-plan**](/vi/plugins/aio-planning/aio-plan) — Tổng hợp discovery và dependency mapping thành một implementation plan từng bước qua planner agent. Bước thứ ba của pipeline aio-deep-plan (sau aio-disco…
- [**aio-review**](/vi/plugins/aio-planning/aio-review) — Validate các thay đổi sau implementation so với baseline aio-snapshot — kiểm tra sanity nhanh trước commit qua change detection, duplication detection và type che…
- [**aio-rubber-duck**](/vi/plugins/aio-planning/aio-rubber-duck) — Rubber duck companion — Claude đóng vai con vịt (đặt câu hỏi, thăm dò giả định, không vội đưa giải pháp); người dùng giải thích vấn đề từng bước để externalize lập luận…
- [**aio-snapshot**](/vi/plugins/aio-planning/aio-snapshot) — Chụp một baseline GitNexus của codebase trước khi code để aio-review có thể phát hiện thay đổi về sau.

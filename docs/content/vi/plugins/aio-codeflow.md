---
title: "aio-codeflow"
description: "Hiểu, lập kế hoạch, debug và review code thành một workflow phối hợp — codebase discovery, dependency mapping, implementation planning, root-cause debugging và pre-merge review."
document_type: "plugin"
version: "2.0.0"
install: "/plugin install aio-codeflow@aiocean-plugins"
skills_count: 10
---

# aio-codeflow

`v2.0.0`

Hiểu, lập kế hoạch, debug và review code thành một workflow phối hợp — codebase discovery, dependency mapping, implementation planning, root-cause debugging và pre-merge review.

## Cài đặt

```
/plugin install aio-codeflow@aiocean-plugins
```

## Skills (10)

- [**aio-debug**](/vi/plugins/aio-codeflow/aio-debug) — Debug code bị hỏng — điều phối thu thập context codebase, điều tra root cause, fix tối thiểu và validation qua code review thông qua debugger agent.
- [**aio-discover**](/vi/plugins/aio-codeflow/aio-discover) — Tìm code, định vị implementation và hiểu cách feature hoạt động qua các Explore agent chạy song song. Bước 1 của bộ ba codeflow discover → map → plan, dùng trước khi implement.
- [**aio-doc-writer**](/vi/plugins/aio-codeflow/aio-doc-writer) — Sinh tài liệu kiến trúc toàn diện được hỗ trợ bởi GitNexus knowledge graph và phân tích LSP.
- [**aio-gitnexus**](/vi/plugins/aio-codeflow/aio-gitnexus) — Cài đặt, cấu hình và quản lý GitNexus code intelligence engine — index codebase, setup MCP, kiểm tra trạng thái, troubleshoot và tài liệu hóa local git-hook auto-refresh cho workflow master-only.
- [**aio-map**](/vi/plugins/aio-codeflow/aio-map) — Trace dependency, call graph và blast radius cho một file/function/module qua GitNexus + LSP. Bước 2 của bộ ba codeflow discover → map → plan (sau aio-discover, trước aio-plan).
- [**aio-plan**](/vi/plugins/aio-codeflow/aio-plan) — Tổng hợp discovery và dependency mapping thành một implementation plan từng bước qua planner agent. Bước 3 của bộ ba codeflow discover → map → plan (sau aio-discover và aio-map).
- [**aio-review-quick**](/vi/plugins/aio-codeflow/aio-review-quick) — Sanity check nhanh trước commit — validate các thay đổi sau implementation so với baseline aio-snapshot qua change detection, duplication detection và type checking. Light pass; cho deep review dùng aio-review-deep.
- [**aio-review-deep**](/vi/plugins/aio-codeflow/aio-review-deep) — Deep multi-agent code review — dispatch fleet các agent chuyên biệt chạy song song (security, architecture, quality, performance) với phân tích domain qua GitNexus. Dùng trước khi merge hoặc sau khi feature lớn vừa land.
- [**aio-rubber-duck**](/vi/plugins/aio-codeflow/aio-rubber-duck) — Rubber duck companion — Claude đóng vai con vịt (đặt câu hỏi, thăm dò giả định, không vội đưa giải pháp); người dùng giải thích vấn đề từng bước để externalize lập luận.
- [**aio-snapshot**](/vi/plugins/aio-codeflow/aio-snapshot) — Chụp một baseline GitNexus của codebase trước khi code để aio-review-quick có thể phát hiện thay đổi về sau.

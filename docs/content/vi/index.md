---
title: "Claude Plugins"
description: "Procedural memory cho Claude Code: 28 plugins, 59 skills bao phủ dịch thuật, debug, design system, infra ops, và viết plugin. Cài đặt bằng hai câu lệnh."
document_type: "listing"
weight: 0
---

# Claude Plugins

Claude Code plugin là một folder chứa skills, agents, hooks, và slash
command mà Claude cài đặt theo từng project. Marketplace này có 28 plugins,
59 skills.

```
/plugin marketplace add aiocean/claude-plugins
/plugin install <plugin-name>@aiocean-plugins
```

Skill được nạp khi description của nó khớp với câu hỏi của bạn, hook bắn ra
khi có tool call event, agent được spawn qua tool `Agent`. Plugin nằm yên
thì không tốn gì — duyệt [plugins](/vi/plugins) hoặc đọc [guides](/vi/guides).

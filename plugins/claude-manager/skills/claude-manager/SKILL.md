---
name: claude-manager
description: Enable/disable skills based on project context. Use when user says "manage skills", "disable skills", "enable skills", wants to reduce skill clutter, or when starting work on a specific project type (frontend, backend, data, etc.).
---

# Claude Manager

Quản lý skills, agents, và reflect để improve Claude Code workflow.

## Script

```bash
~/.claude/skills/claude-manager/manage.sh [command] [args]
```

| Command | Example | Description |
|---------|---------|-------------|
| `status` | `manage.sh status` | List all skills and agents |
| `skills status` | `manage.sh skills status` | List skills only |
| `skills enable` | `manage.sh skills enable youtube` | Enable skills |
| `skills disable` | `manage.sh skills disable shopify` | Disable skills |
| `agents status` | `manage.sh agents status` | List agents only |
| `agents enable` | `manage.sh agents enable universe-thinker` | Enable agents |
| `agents disable` | `manage.sh agents disable vue-lint-fixer` | Disable agents |
| `enable` | `manage.sh enable youtube` | Enable skills (shortcut) |
| `disable` | `manage.sh disable shopify` | Disable skills (shortcut) |
| `preset` | `manage.sh preset frontend` | Apply a preset |
| `detect` | `manage.sh detect` | Detect project type |
| `usage` | `manage.sh usage` | Full usage report (skills, agents, commands) |

## Usage Report

Chạy `manage.sh usage` để xem report đầy đủ:

- **Skills usage**: Số lần invoke `/skill-name` từ history
- **Agents usage**: Số sessions có agent invocation trong transcripts
- **Top slash commands**: Các lệnh `/command` dùng nhiều nhất
- **Recommendations**: Gợi ý disable những thứ không dùng

## Presets

| Preset | Keeps |
|--------|-------|
| `minimal` | Core skills only |
| `frontend` | Core + frontend-design, neobrutalism |
| `backend` | Core + pm2-dev, bun-fullstack-setup, cloudflare, socket-rpc |
| `ai` | Core + agent-sdk-*, collaborating-with-*, triumvirate, prompt-engineering, mental-models |
| `data` | Core + dagster-graphql, notebooklm |
| `all` | Everything enabled |

**Core skills (never disabled):** claude-manager, generate-skill, code-review, conventional-commit

## Reflect

> **Biến những bài học thoáng qua thành cải tiến vĩnh viễn**

Mỗi conversation dạy AI điều gì đó. Phần lớn bị mất khi conversation kết thúc. Reflect thu hoạch những bài học đó và encode vào CLAUDE.md.

### Khi nào reflect

- Sau nhiều session làm việc cùng project
- Khi thấy AI lặp lỗi cũ
- Khi muốn document patterns/conventions

### Cách reflect

**Bước 1: Tìm conversation files**

```python
from pathlib import Path
import os

cwd = os.getcwd()
project_path = cwd.replace("/", "-").lstrip("-")
conversations_dir = Path.home() / f".claude/projects/-{project_path}"

files = sorted(
    [f for f in conversations_dir.glob("*.jsonl") if not f.name.startswith("agent-")],
    key=lambda x: x.stat().st_mtime,
    reverse=True
)[:10]
```

**Bước 2: Parse JSONL**

Mỗi line là một JSON object:

```
{
  "type": "user" | "assistant" | "system" | ...,
  "isMeta": true/false,
  "message": { "role": "...", "content": ... }
}
```

**Đọc:**
| type | Điều kiện | Lấy từ | Evaluate |
|------|-----------|--------|----------|
| `user` | `isMeta != true`, không bắt đầu `<` | `message.content` | User intent, corrections |
| `assistant` | `type: "text"` | `item.text` | AI responses |
| `assistant` | `type: "thinking"` | `item.thinking` | AI reasoning |
| `assistant` | `type: "tool_use"` | `item.name`, `item.input` | AI decisions |

**Skip:** `file-history-snapshot`, `queue-operation`, `system`, `tool_result`, `isMeta: true`

**Bước 3: Tìm patterns**

- **Friction:** User phải correct AI điều gì? Lặp lại yêu cầu gì?
- **Patterns:** User có style/preference gì? Convention nào?
- **Mistakes:** AI mắc lỗi gì nhiều lần? Over-engineer ở đâu?

**Bước 4: Đề xuất CLAUDE.md updates**

Chỉ thêm những gì:
- Actionable và cụ thể
- Genuinely prevent future issues
- Không duplicate rules đã có

Format:
```
## Đề xuất thêm vào CLAUDE.md

### [Section name]
[Nội dung cụ thể]

**Lý do:** [Observation từ conversations]
```

## Workflow Examples

```bash
# See current state
~/.claude/skills/claude-manager/manage.sh status

# Analyze what's actually being used
~/.claude/skills/claude-manager/manage.sh usage

# Working on frontend project
~/.claude/skills/claude-manager/manage.sh preset frontend

# Disable specific skills
~/.claude/skills/claude-manager/manage.sh disable shopify-listing epub-packing

# Disable specific agents
~/.claude/skills/claude-manager/manage.sh agents disable vue-lint-fixer

# Re-enable everything
~/.claude/skills/claude-manager/manage.sh preset all
```

Restart Claude Code sau khi thay đổi để apply.

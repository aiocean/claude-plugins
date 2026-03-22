---
name: aio-confluence
description: Search, create, update, and manage Confluence pages via CLI or MCP. Triggers: "search confluence", "create page", "update page", "list spaces", confluence, wiki, CQL.
---

# Confluence

Source: [nguyenvanduocit/confluence-mcp](https://github.com/nguyenvanduocit/confluence-mcp)

## Environment

- Go: !`which go 2>/dev/null || echo "NOT INSTALLED"`
- confluence-mcp: !`which confluence-mcp 2>/dev/null || echo "NOT INSTALLED"`
- confluence-cli: !`which confluence-cli 2>/dev/null || echo "NOT INSTALLED"`
- ATLASSIAN_HOST: !`echo ${ATLASSIAN_HOST:-NOT SET}`
- ATLASSIAN_EMAIL: !`echo ${ATLASSIAN_EMAIL:-NOT SET}`
- ATLASSIAN_TOKEN: !`[ -n "$ATLASSIAN_TOKEN" ] && echo "SET" || echo "NOT SET"`
- MCP configured: !`cat .mcp.json 2>/dev/null | grep -q confluence && echo "YES" || echo "NO"`

## Install (skip if already installed above)

```bash
# Via Go
go install github.com/nguyenvanduocit/confluence-mcp@latest
go install github.com/nguyenvanduocit/confluence-mcp/cmd/confluence-cli@latest

# Or via Homebrew
brew install nguyenvanduocit/tap/confluence-mcp
```

Env vars needed: `ATLASSIAN_HOST`, `ATLASSIAN_EMAIL`, `ATLASSIAN_TOKEN` (get token from https://id.atlassian.com/manage-profile/security/api-tokens).

MCP config (`.mcp.json`):
```json
{
  "mcpServers": {
    "confluence": {
      "command": "confluence-mcp",
      "env": {
        "ATLASSIAN_HOST": "",
        "ATLASSIAN_EMAIL": "",
        "ATLASSIAN_TOKEN": ""
      }
    }
  }
}
```

Restart Claude Code after adding MCP config.

## MCP Tools (prefix: `confluence_`)

| Tool | Usage |
|------|-------|
| search_page | `confluence_search_page(query: "type = page AND space = DEV AND text ~ 'deploy'")` |
| get_page | `confluence_get_page(page_id: "12345")` |
| create_page | `confluence_create_page(space_key: "DEV", title: "Title", content: "<p>HTML</p>", parent_id: "123")` |
| update_page | `confluence_update_page(page_id: "123", title: "Title", content: "<p>HTML</p>", version: N+1)` |
| get_comments | `confluence_get_comments(page_id: "12345")` |
| list_spaces | `confluence_list_spaces()` |

Note: `update_page` requires `version` = current version + 1. Get current from `get_page` first.

## CLI (fallback if MCP not configured)

```bash
confluence-cli search-page --query "CQL" --env .env
confluence-cli get-page --page-id 12345 --env .env
confluence-cli create-page --space-key DEV --title "Title" --content "<p>HTML</p>" --env .env
confluence-cli update-page --page-id 12345 --title "Title" --content "<p>HTML</p>" --version 2 --env .env
confluence-cli get-comments --page-id 12345 --env .env
confluence-cli list-spaces --env .env
```

Flags: `--env` (path to .env file), `--output` (`text` or `json`).

## Workflows

**Find and update:** search → get_page (note version) → update_page (version+1)
**Doc hierarchy:** create parent page → create children with `parent_id`

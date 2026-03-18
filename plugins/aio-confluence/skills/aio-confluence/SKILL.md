---
name: aio-confluence
description: This skill should be used when the user asks to search confluence, get page, create page, update page, list spaces, get comments, or mentions confluence, wiki, atlassian pages, CQL. Provides Confluence operations through CLI or MCP. Auto-installs confluence-mcp if missing.
---

# Confluence Skill

Confluence operations via [nguyenvanduocit/confluence-mcp](https://github.com/nguyenvanduocit/confluence-mcp).

## Step 1: Check Availability

Check if confluence tools are available:

1. Use `ToolSearch("confluence")` to look for tools prefixed with `confluence_` (e.g. `confluence_search_page`, `confluence_get_page`)
2. If confluence tools are found → skip to **Step 3: Use Tools**
3. If no tools found → check if `confluence-cli` binary exists: `which confluence-cli`
4. If CLI exists → skip to **Step 4: Use CLI**
5. If neither found → proceed to **Step 2: Install**

## Step 2: Install

### 2a. Install via Go

```bash
# MCP server (for MCP integration)
go install github.com/nguyenvanduocit/confluence-mcp@latest

# CLI (for direct command-line use)
go install github.com/nguyenvanduocit/confluence-mcp/cmd/confluence-cli@latest
```

### 2b. Install via Homebrew

```bash
brew install nguyenvanduocit/tap/confluence-mcp
```

### 2c. Environment Variables

**Ask the user for these three values:**

- `ATLASSIAN_HOST` — Confluence instance URL (e.g. `https://company.atlassian.net`)
- `ATLASSIAN_EMAIL` — Atlassian account email
- `ATLASSIAN_TOKEN` — API token from https://id.atlassian.com/manage-profile/security/api-tokens

Set them in a `.env` file or export them:

```bash
export ATLASSIAN_HOST="https://company.atlassian.net"
export ATLASSIAN_EMAIL="user@company.com"
export ATLASSIAN_TOKEN="your-api-token"
```

### 2d. Configure as MCP Server (optional)

Add to `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "confluence": {
      "command": "confluence-mcp",
      "env": {
        "ATLASSIAN_HOST": "https://company.atlassian.net",
        "ATLASSIAN_EMAIL": "user@company.com",
        "ATLASSIAN_TOKEN": "your-api-token"
      }
    }
  }
}
```

Tell the user to restart Claude Code for MCP to be picked up.

## Step 3: Use MCP Tools

All tools are prefixed with `confluence_`.

### Search Pages (CQL)

```
confluence_search_page(query: "type = page AND space = DEV AND text ~ 'deployment'")
confluence_search_page(query: "label = architecture AND space = TEAM")
```

### Get Page

```
confluence_get_page(page_id: "12345")
```

Returns: title, content (HTML), version, space info, metadata.

### Create Page

```
confluence_create_page(
  space_key: "DEV",
  title: "Deployment Guide",
  content: "<h1>Guide</h1><p>Steps to deploy...</p>",
  parent_id: "12345"
)
```

### Update Page

```
confluence_update_page(
  page_id: "12345",
  title: "Updated Title",
  content: "<h1>Updated</h1><p>New content...</p>",
  version: 2
)
```

Note: `version` must be current version + 1. Get current version from `get_page` first.

### Get Comments

```
confluence_get_comments(page_id: "12345")
```

### List Spaces

```
confluence_list_spaces()
```

## Step 4: Use CLI

If using the CLI directly instead of MCP:

```bash
# Search pages with CQL
confluence-cli search-page --query "type = page AND text ~ 'deploy'" --env .env

# Get page content
confluence-cli get-page --page-id 12345 --env .env

# Create page
confluence-cli create-page --space-key DEV --title "New Page" --content "<p>Content</p>" --env .env

# Update page
confluence-cli update-page --page-id 12345 --title "Updated" --content "<p>New</p>" --version 2 --env .env

# Get comments
confluence-cli get-comments --page-id 12345 --env .env

# List spaces
confluence-cli list-spaces --env .env
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--env` | Path to .env file with credentials |
| `--output` | Output format: `text` (default) or `json` |

## Common Workflows

### Find and Update a Page

1. Search: `confluence_search_page(query: "title = 'Release Notes'")`
2. Get current: `confluence_get_page(page_id: "found-id")`
3. Update: `confluence_update_page(page_id: "found-id", title: "Release Notes", content: "...", version: current+1)`

### Create Documentation Hierarchy

1. Create parent: `confluence_create_page(space_key: "DEV", title: "API Docs")`
2. Create child: `confluence_create_page(space_key: "DEV", title: "Auth API", parent_id: "parent-id")`
3. Create child: `confluence_create_page(space_key: "DEV", title: "User API", parent_id: "parent-id")`

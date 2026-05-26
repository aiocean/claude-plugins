::install-command
/plugin install aio-saas-tools@aiocean-plugins
::

# aio-saas-tools

Most developer time spent on SaaS tools is wasted on context-switching: browser tabs open for Jira, another for Gmail, a terminal for everything else. This plugin collapses Jira, Confluence, Google Workspace, Tanca HR, and Twitter/X into a single Claude conversation. You describe what you want in natural language; Claude calls the right CLI or MCP tool and reports back.

The underlying approach is deliberate minimalism. Each skill is a thin wrapper around an existing, well-maintained CLI or MCP server — no new abstraction layer, no proprietary sync engine. Credentials stay in your `.env` files. The tools do exactly what they say.

## Installation

```bash
/plugin install aio-saas-tools@aiocean-plugins
```

## Skills

### aio-atlassian

> "PROJ-123", "create a Jira story", "search issues in sprint", "update Confluence page", "JQL query", "transition to Done"

Jira and Confluence via [`jira-cli`](https://github.com/nguyenvanduocit/jira-mcp) and [`confluence-cli`](https://github.com/nguyenvanduocit/confluence-mcp). Covers the full Jira surface: issues (create, update, delete, subtasks), workflows (transitions, status listing), sprints (list, active, search), comments, worklogs, issue links, versions, and development info (linked PRs, branches, commits). For Confluence: search pages with CQL, get, create, and update pages, list spaces.

One important detail: the CLI automatically converts Markdown to Atlassian Document Format (ADF) for all text fields — comments, descriptions, updates. Write standard Markdown and it renders correctly in the Jira UI. Never use Jira wiki markup (`h2.`, `{code}`, `||header||`) — the CLI handles the conversion.

**Setup:** install via `go install`, create a `.env` file with `ATLASSIAN_HOST`, `ATLASSIAN_EMAIL`, `ATLASSIAN_TOKEN` (from id.atlassian.com), and pass `--env .env` to all commands.

### aio-google-workspace

> "send email", "check calendar", "upload to Drive", "read spreadsheet", "standup report", "list contacts", "create event"

Gmail, Drive, Calendar, Sheets, Docs, Tasks, Chat, Slides, and People via the `gws` CLI. The CLI exposes both a direct API mode (`gws <service> <resource> <method> --params '<JSON>'`) and higher-level helper commands (`gws gmail +triage`, `gws calendar +agenda`, `gws workflow +standup-report`) for the most common tasks.

Cross-service workflows are built in: `gws workflow +standup-report` fetches today's meetings and open tasks in one call. `gws workflow +email-to-task` converts a message into a tracked task. Schema discovery via `gws schema <service.resource.method>` shows the full parameter list for any API method without leaving the terminal.

**Setup:** install `gws`, run `gws auth login` once to authenticate via OAuth.

### aio-tanca

> "check in employee", "check out", "list shifts", "clock in", "timekeeping", "attendance report", "monthly attendance"

Employee timekeeping and HR operations via [`tanca-mcp`](https://github.com/nguyenvanduocit/tanca-mcp). Covers employee listing, shift retrieval (today's shift, shift summary, all shifts), check-in/check-out recording, and clock log queries across any date range.

The skill works via MCP tools (prefix `tanca_`) when the MCP server is configured in `.mcp.json`, or via `tanca-cli` as a fallback. For monthly attendance reporting, query `get_clock_logs` per employee across the date range and compare against `get_shift_summary` to surface discrepancies.

**Setup:** `go install github.com/nguyenvanduocit/tanca-mcp@latest`, add `tanca-mcp` to `.mcp.json` with `TANCA_TOKEN` and `TANCA_SHOP_ID`, restart Claude Code.

### aio-x

> "post tweet", "draft a thread", "search Twitter", "get mentions", "like tweet", "check timeline", "post on X"

Twitter/X via [`x-mcp`](https://github.com/nguyenvanduocit/x-mcp). Covers tweet operations (get, post, delete, post thread), user lookups, timeline and mentions retrieval, engagement actions (like, retweet, quote tweets), list browsing, and moderation (mute, block).

Works via MCP tools (prefix `x_`) or `x-cli` fallback. The thread posting tool (`x_post_thread`) accepts an array of tweet strings and posts them as a connected thread — useful when Claude drafts and immediately publishes multi-tweet content.

**Setup:** `go install github.com/nguyenvanduocit/x-mcp@latest`, add to `.mcp.json` with all four Twitter API credentials (`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`), restart Claude Code.

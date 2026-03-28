# aio-atlassian

Atlassian CLI tools for Jira and Confluence. Manage Jira issues, sprints, workflows, and Confluence pages via CLI.

## Install

```bash
/plugin install aio-atlassian@aiocean-plugins
```

## Skills

- Jira issue CRUD (create, read, update, close)
- Sprint management and workflow transitions
- JQL search and bulk operations
- Confluence page management (create, update, fetch)
- CQL search across Confluence spaces

## Requirements

- Go
- jira-cli
- confluence-cli
- Environment: `ATLASSIAN_HOST`, `ATLASSIAN_EMAIL`, `ATLASSIAN_TOKEN`

---
name: aio-x
description: Post, search, and manage Twitter/X content via x-mcp (auto-installs if missing). Triggers: "post tweet", "search twitter", "post thread", "get mentions", twitter, x.com, tweet, timeline.
---

# X / Twitter Skill

Twitter/X operations via [nguyenvanduocit/x-mcp](https://github.com/nguyenvanduocit/x-mcp).

## Environment

- Go: !`which go 2>/dev/null || echo "NOT INSTALLED"`
- x-mcp: !`which x-mcp 2>/dev/null || echo "NOT INSTALLED"`
- x-cli: !`which x-cli 2>/dev/null || echo "NOT INSTALLED"`
- X_API_KEY: !`[ -n "$X_API_KEY" ] && echo "SET" || echo "NOT SET"`
- X_API_SECRET: !`[ -n "$X_API_SECRET" ] && echo "SET" || echo "NOT SET"`
- X_ACCESS_TOKEN: !`[ -n "$X_ACCESS_TOKEN" ] && echo "SET" || echo "NOT SET"`
- X_ACCESS_TOKEN_SECRET: !`[ -n "$X_ACCESS_TOKEN_SECRET" ] && echo "SET" || echo "NOT SET"`
- MCP configured: !`cat .mcp.json 2>/dev/null | grep -q '"x"' && echo "YES" || echo "NO"`

## Install (skip if already installed above)

```bash
go install github.com/nguyenvanduocit/x-mcp@latest
go install github.com/nguyenvanduocit/x-mcp/cmd/x-cli@latest
```

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "x": {
      "command": "x-mcp",
      "env": {
        "X_API_KEY": "your-api-key",
        "X_API_SECRET": "your-api-secret",
        "X_ACCESS_TOKEN": "your-access-token",
        "X_ACCESS_TOKEN_SECRET": "your-access-token-secret"
      }
    }
  }
}
```

All four values from https://developer.x.com/en/portal/dashboard. Restart Claude Code after configuring.

## MCP Tools (prefix: `x_`)

### Tweet Operations

| Tool | Usage |
|------|-------|
| `x_get_tweet` | `(tweet_id: "1234567890")` |
| `x_post_tweet` | `(text: "Hello from Claude!")` |
| `x_delete_tweet` | `(tweet_id: "1234567890")` |
| `x_post_thread` | `(tweets: ["First", "Second", "Final"])` |
| `x_search` | `(query: "golang best practices", max_results: 10)` |

### User Operations

| Tool | Usage |
|------|-------|
| `x_get_user` | `(username: "elonmusk")` |
| `x_get_user_timeline` | `(user_id: "123456", max_results: 20)` |
| `x_get_mentions` | `(user_id: "123456", max_results: 20)` |

### Engagement

```
x_like_tweet(tweet_id: "1234567890")
x_unlike_tweet(tweet_id: "1234567890")
x_retweet(tweet_id: "1234567890")
x_unretweet(tweet_id: "1234567890")
x_get_quote_tweets(tweet_id: "1234567890")
```

### Moderation

```
x_mute_user(user_id: "123456")
x_unmute_user(user_id: "123456")
x_block_user(user_id: "123456")
x_unblock_user(user_id: "123456")
```

### Lists

```
x_get_user_lists(user_id: "123456")
x_get_list_tweets(list_id: "789", max_results: 20)
```

## CLI (fallback if MCP not configured)

```bash
x-cli get-tweet --tweet-id 1234567890 --env .env
x-cli post-tweet --text "Hello from CLI!" --env .env
x-cli delete-tweet --tweet-id 1234567890 --env .env
x-cli post-thread --tweets '["First", "Second", "Third"]' --env .env
x-cli search --query "golang" --max-results 10 --env .env
x-cli get-user --username elonmusk --env .env
x-cli get-user-timeline --user-id 123456 --env .env
x-cli get-mentions --user-id 123456 --env .env
x-cli like-tweet --tweet-id 1234567890 --env .env
x-cli unlike-tweet --tweet-id 1234567890 --env .env
x-cli retweet --tweet-id 1234567890 --env .env
x-cli mute-user --user-id 123456 --env .env
x-cli block-user --user-id 123456 --env .env
x-cli get-user-lists --user-id 123456 --env .env
x-cli get-list-tweets --list-id 789 --env .env
```

Flag: `--env` path to .env file with credentials.

## Workflows

### Post a Thread
1. Draft tweets (each ≤ 280 chars)
2. `x_post_thread(tweets: ["Tweet 1...", "Tweet 2...", "Tweet 3..."])`

### Monitor Mentions
1. `x_get_user(username: "myaccount")` — get user_id
2. `x_get_mentions(user_id: "...", max_results: 20)` — check recent mentions
3. `x_like_tweet(tweet_id: "...")` — engage with relevant mentions

### Content Research
1. `x_search(query: "topic keyword", max_results: 20)` — find relevant tweets
2. `x_get_user(username: "expert")` — check profile
3. `x_get_user_timeline(user_id: "...", max_results: 20)` — review their content

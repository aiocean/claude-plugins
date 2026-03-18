---
name: aio-x
description: This skill should be used when the user asks to post tweet, search twitter, get tweet, like tweet, retweet, post thread, block user, mute user, get mentions, or mentions twitter, x.com, tweet, timeline, x API. Auto-installs x-mcp if missing.
---

# X / Twitter Skill

Twitter/X operations via [nguyenvanduocit/x-mcp](https://github.com/nguyenvanduocit/x-mcp).

## Step 1: Check Availability

1. Use `ToolSearch("x_")` to look for tools prefixed with `x_` (e.g. `x_post_tweet`, `x_search`)
2. If x tools are found → skip to **Step 3: Use Tools**
3. If no tools found → check: `which x-cli`
4. If CLI exists → skip to **Step 4: Use CLI**
5. If neither → proceed to **Step 2: Install**

## Step 2: Install

### 2a. Install via Go

```bash
go install github.com/nguyenvanduocit/x-mcp@latest
go install github.com/nguyenvanduocit/x-mcp/cmd/x-cli@latest
```

### 2b. Environment Variables

**Ask the user for these four values** from https://developer.x.com/en/portal/dashboard:

- `X_API_KEY` — API key (consumer key)
- `X_API_SECRET` — API secret (consumer secret)
- `X_ACCESS_TOKEN` — Access token
- `X_ACCESS_TOKEN_SECRET` — Access token secret

```bash
export X_API_KEY="your-api-key"
export X_API_SECRET="your-api-secret"
export X_ACCESS_TOKEN="your-access-token"
export X_ACCESS_TOKEN_SECRET="your-access-token-secret"
```

### 2c. Configure as MCP Server (optional)

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

## Step 3: Use MCP Tools

### Tweet Operations

```
# Get tweet
x_get_tweet(tweet_id: "1234567890")

# Post tweet
x_post_tweet(text: "Hello from Claude!")

# Delete tweet
x_delete_tweet(tweet_id: "1234567890")

# Post thread
x_post_thread(tweets: ["First tweet in thread", "Second tweet", "Final tweet"])

# Search tweets
x_search(query: "golang best practices", max_results: 10)
```

### User Operations

```
# Get user profile
x_get_user(username: "elonmusk")

# Get user timeline
x_get_user_timeline(user_id: "123456", max_results: 20)

# Get mentions
x_get_mentions(user_id: "123456", max_results: 20)
```

### Engagement

```
# Like / unlike
x_like_tweet(tweet_id: "1234567890")
x_unlike_tweet(tweet_id: "1234567890")

# Retweet / undo retweet
x_retweet(tweet_id: "1234567890")
x_unretweet(tweet_id: "1234567890")

# Get quote tweets
x_get_quote_tweets(tweet_id: "1234567890")
```

### Moderation

```
# Mute / unmute user
x_mute_user(user_id: "123456")
x_unmute_user(user_id: "123456")

# Block / unblock user
x_block_user(user_id: "123456")
x_unblock_user(user_id: "123456")
```

### Lists

```
# Get user's lists
x_get_user_lists(user_id: "123456")

# Get tweets from a list
x_get_list_tweets(list_id: "789", max_results: 20)
```

## Step 4: Use CLI

```bash
# Get tweet
x-cli get-tweet --tweet-id 1234567890 --env .env

# Post tweet
x-cli post-tweet --text "Hello from CLI!" --env .env

# Delete tweet
x-cli delete-tweet --tweet-id 1234567890 --env .env

# Post thread
x-cli post-thread --tweets '["First", "Second", "Third"]' --env .env

# Search
x-cli search --query "golang" --max-results 10 --env .env

# Get user
x-cli get-user --username elonmusk --env .env

# Get timeline
x-cli get-user-timeline --user-id 123456 --env .env

# Get mentions
x-cli get-mentions --user-id 123456 --env .env

# Like / unlike
x-cli like-tweet --tweet-id 1234567890 --env .env
x-cli unlike-tweet --tweet-id 1234567890 --env .env

# Retweet
x-cli retweet --tweet-id 1234567890 --env .env

# Mute/block
x-cli mute-user --user-id 123456 --env .env
x-cli block-user --user-id 123456 --env .env

# Lists
x-cli get-user-lists --user-id 123456 --env .env
x-cli get-list-tweets --list-id 789 --env .env
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--env` | Path to .env file with credentials |

## Common Workflows

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

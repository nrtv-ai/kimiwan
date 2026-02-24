---
name: x-social
description: X (Twitter) social media engagement via browser automation. Read timeline, post tweets, search topics, engage with content.
---

# X (Twitter) Social Skill

Engage with X (Twitter) via browser automation for timeline reading, posting, searching, and engagement.

## Prerequisites

- Browser automation available via `browser` tool
- X account logged in (user must be logged in via Chrome extension relay)

## Usage

### Read Timeline
```bash
# Use browser snapshot to read timeline
browser snapshot --url https://x.com/home
```

### Post a Tweet
```bash
# Navigate to compose
canvas navigate --url https://x.com/compose/tweet
# Type and submit via browser actions
```

### Search
```bash
browser snapshot --url "https://x.com/search?q=AI+agents&f=live"
```

### Engage
Use browser act to click like, retweet, reply buttons.

## Rate Limits
- Reading: No strict limit
- Posting: ~50 tweets/day for new accounts, ~2400/day for established
- Likes: ~1000/day
- Follows: ~400/day

## Safety
- Always verify actions before executing
- Never automate sensitive account operations
- Respect platform terms of service

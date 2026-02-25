---
name: x-social
description: X (Twitter) social media engagement via API. Read timeline, post tweets, search topics, engage with content.
---

# X (Twitter) Social Skill

Engage with X (Twitter) via API v2 for timeline reading, posting, searching, and engagement.

## Prerequisites

- X API credentials stored in `.credentials` file
- Python 3 with `requests-oauthlib` installed

## Usage

### Read Timeline / User Info
```bash
# Get user info
python3 scripts/x-api.py me

# Get timeline (requires elevated access - may not work with basic tier)
python3 scripts/x-api.py timeline
```

### Search
```bash
# Search for tweets
python3 scripts/x-api.py search "AI agents"
```

### Get Notifications/Mentions
```bash
python3 scripts/x-api.py notifications
```

### Post a Tweet
```bash
python3 scripts/x-api.py post "Hello from Kimiwan!"
```

### Like a Tweet
```bash
python3 scripts/x-api.py like <tweet_id>
```

## API Credentials

Credentials are loaded from `/root/.openclaw/workspace/.credentials`:
- `X_API_KEY` - API Key
- `X_API_SECRET` - API Secret
- `X_ACCESS_TOKEN` - Access Token
- `X_ACCESS_TOKEN_SECRET` - Access Token Secret
- `X_BEARER_TOKEN` - Bearer Token (for read-only operations)

## Rate Limits
- Reading: No strict limit (Bearer token)
- Posting: ~50 tweets/day for new accounts, ~2400/day for established
- Likes: ~1000/day
- Follows: ~400/day

## Safety
- Always verify actions before executing
- Never automate sensitive account operations
- Respect platform terms of service
- The script validates responses and handles errors gracefully

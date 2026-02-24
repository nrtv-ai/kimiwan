# HEARTBEAT.md — Orchestrator Model

## Architecture Shift
I'm now an **orchestrator**. Individual tasks run as subagents spawned by the hourly cron.

## Hourly Cron Spawns

### Mersoom Agent
- 1 post/hour (as directed)
- Check posts, vote, comment

### ACP Research Agent  
- Market research: browse competitor offerings, analyze pricing
- Price optimization: ensure profit margin > 50% (price > token_cost × model_cost × 1.5)
- Check `acp job active` for customers
- Identify new service opportunities

### Moltbook Agent
- Registration retry if needed
- Engagement

### Product Dev Agent
- PM-Cursor or A2A-Coop development

### X Social Agent (every 2nd hour)
- Timeline, engagement, posts (2x daily)

## Manual / As Needed
- GitHub commits
- ACP seller setup (when ready to list offerings)

## Research & Build Pipeline
1. Agent-native Notion alternative (GitHub-based)
2. AI-native messenger for human-agent collaboration

---

Last updated: 2026-02-24 08:15 KST

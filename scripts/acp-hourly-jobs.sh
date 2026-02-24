#!/usr/bin/env bash
# ACP Hourly Job Scanner - Auto-create jobs I can 100% complete
# Runs every hour via cron

set -e

cd /root/.openclaw/workspace/skills/virtuals-protocol-acp

LOG_FILE="/root/.openclaw/workspace/logs/acp-hourly-$(date +%Y%m%d).log"
mkdir -p /root/.openclaw/workspace/logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== ACP Hourly Job Scan Started ==="

# Check wallet balance first
BALANCE=$(./bin/acp.ts wallet balance --json 2>/dev/null || echo '{"error":"failed"}')
USDC_BALANCE=$(echo "$BALANCE" | jq -r '.[] | select(.symbol=="USDC") | .balance // "0"' 2>/dev/null || echo "0")
log "Wallet USDC Balance: $USDC_BALANCE"

# Minimum balance threshold (need at least $5 to create jobs)
MIN_BALANCE=5
if (( $(echo "$USDC_BALANCE < $MIN_BALANCE" | bc -l) )); then
    log "WARNING: Low balance ($USDC_BALANCE USDC). Skipping job creation."
    exit 0
fi

# Browse for research-related jobs I can complete
log "Browsing marketplace for research jobs..."
RESEARCH_AGENTS=$(./bin/acp.ts browse "market research token analysis" --json 2>/dev/null || echo '[]')

# Agents I can use for specific tasks I can 100% deliver:
# 1. Ask Caesar - coreResearch ($0.60) - for fundamental analysis I can resell
# 2. Maximus - market_research ($8.00) - comprehensive research
# 3. WhaleIntel - Virtuals on-chain data ($1.00) - on-chain analysis
# 4. Clawd - web_research ($1.00) - general web research

# My sell offerings that need to be fulfilled:
# - deep_research ($0.50) - I can use cheaper agents and add value
# - code_review ($0.75) - I do this myself
# - web_automation ($0.75) - I do this myself

# Strategy: Create jobs that help me deliver my own offerings
# or arbitrage opportunities where I can buy low and sell value-add

# For now, focus on buying research from cheaper agents to build knowledge base
# and potentially resell insights

# Create a job with Ask Caesar for market intelligence (good price at $0.60)
log "Creating job with Ask Caesar for market research..."
CAESAR_WALLET="0xc1e1755D08618727081233abFc516b135f2739Dc"

# Create a job for coreResearch
JOB_RESULT=$(./bin/acp.ts job create "$CAESAR_WALLET" "coreResearch" --requirements '{
    "query": "Latest trends in AI agent ecosystems and tokenized agent economies - focus on Virtuals, ACP, and emerging platforms",
    "system_prompt": "You are a research analyst specializing in AI agent economies. Provide detailed fundamental analysis with specific data points, market trends, and actionable insights."
}' --json 2>/dev/null || echo '{"error":"failed"}')

JOB_ID=$(echo "$JOB_RESULT" | jq -r '.jobId // .id // empty' 2>/dev/null)
if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
    log "Created job ID: $JOB_ID with Ask Caesar"
    
    # Poll for completion (max 5 minutes)
    for i in {1..30}; do
        sleep 10
        STATUS=$(./bin/acp.ts job status "$JOB_ID" --json 2>/dev/null || echo '{"phase":"UNKNOWN"}')
        PHASE=$(echo "$STATUS" | jq -r '.phase // "UNKNOWN"')
        log "Job $JOB_ID status: $PHASE"
        
        if [ "$PHASE" = "COMPLETED" ]; then
            DELIVERABLE=$(echo "$STATUS" | jq -r '.deliverable // empty' 2>/dev/null)
            log "Job completed! Deliverable length: ${#DELIVERABLE} chars"
            
            # Save deliverable for potential resell
            echo "$DELIVERABLE" > "/root/.openclaw/workspace/acp-deliverables/job-$JOB_ID-$(date +%Y%m%d-%H%M).json"
            break
        elif [ "$PHASE" = "REJECTED" ] || [ "$PHASE" = "EXPIRED" ]; then
            log "Job failed with phase: $PHASE"
            break
        fi
    done
else
    log "Failed to create job: $JOB_RESULT"
fi

# Create additional job with WhaleIntel for on-chain data
log "Creating job with WhaleIntel for on-chain analysis..."
WHALE_WALLET="0xAf93672631F8171f93f7CC4443dF42adE48F3c61"

WHALE_RESULT=$(./bin/acp.ts job create "$WHALE_WALLET" "Virtual Ecosystem Market Sentiment" --requirements '{}' --json 2>/dev/null || echo '{"error":"failed"}')
WHALE_JOB_ID=$(echo "$WHALE_RESULT" | jq -r '.jobId // .id // empty' 2>/dev/null)

if [ -n "$WHALE_JOB_ID" ] && [ "$WHALE_JOB_ID" != "null" ]; then
    log "Created job ID: $WHALE_JOB_ID with WhaleIntel"
fi

log "=== ACP Hourly Job Scan Completed ==="

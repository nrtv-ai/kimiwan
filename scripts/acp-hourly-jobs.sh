#!/bin/bash
# ACP Hourly Job Scanner - DISABLED (user requested stop hiring agents)
# This script now only monitors wallet and reports status

set -e

cd /root/.openclaw/workspace/skills/virtuals-protocol-acp

LOG_FILE="/root/.openclaw/workspace/logs/acp-hourly-$(date +%Y%m%d).log"
mkdir -p /root/.openclaw/workspace/logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== ACP Hourly Scan Started (JOB CREATION DISABLED) ==="

# Check wallet balance - fixed syntax
log "Checking wallet balance..."
BALANCE_OUTPUT=$(npx tsx bin/acp.ts wallet balance 2>&1 || echo "ERROR")
log "Raw balance output: $BALANCE_OUTPUT"

# Parse USDC balance more safely
USDC_BALANCE=$(echo "$BALANCE_OUTPUT" | grep -i "USDC" | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0")
if [ -z "$USDC_BALANCE" ]; then
    USDC_BALANCE="0"
fi

log "Wallet USDC Balance: $USDC_BALANCE"

# Just browse marketplace for research (no job creation)
log "Browsing marketplace for pricing intelligence..."
npx tsx bin/acp.ts browse "research" --json 2>/dev/null | jq -r '.[0:3] | .[] | "\(.name): \(.offerings[0].price // "N/A") USDC"' 2>/dev/null || log "Browse failed"

log "=== ACP Hourly Scan Completed (No jobs created - user disabled) ==="
log "To re-enable job creation, edit this script and remove the early exit"
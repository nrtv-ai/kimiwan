#!/bin/bash
# Moltbook comment script
API_KEY="moltbook_sk_QxtJ-2q-yry9Z1NvE7mu2e-vzXPLMuwH"

curl -s -X POST "https://www.moltbook.com/api/v1/posts/$1/comments" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$2\"}"

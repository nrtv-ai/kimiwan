#!/bin/bash
# X (Twitter) API Client - OAuth 1.0a for posting tweets
# Bearer token for read-only operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.credentials"

API_BASE="https://api.twitter.com/2"

# Generate OAuth 1.0a signature
oauth_nonce() {
    openssl rand -hex 16
}

oauth_timestamp() {
    date +%s
}

url_encode() {
    python3 -c "import urllib.parse; print(urllib.parse.quote('$1', safe=''))"
}

# Post a tweet using OAuth 1.0a
post_tweet() {
    local text="$1"
    local url="${API_BASE}/tweets"
    local method="POST"
    
    local timestamp=$(oauth_timestamp)
    local nonce=$(oauth_nonce)
    
    # Create signature base string
    local params="oauth_consumer_key=$(url_encode "$X_API_KEY")&oauth_nonce=$(url_encode "$nonce")&oauth_signature_method=HMAC-SHA1&oauth_timestamp=$(url_encode "$timestamp")&oauth_token=$(url_encode "$X_ACCESS_TOKEN")&oauth_version=1.0"
    
    local base_string="${method}&$(url_encode "$url")&$(url_encode "$params")"
    local signing_key="$(url_encode "$X_API_SECRET")&$(url_encode "$X_ACCESS_TOKEN_SECRET")"
    
    local signature=$(echo -n "$base_string" | openssl dgst -sha1 -hmac "$signing_key" -binary | base64)
    
    local auth_header="OAuth oauth_consumer_key=\"$X_API_KEY\", oauth_token=\"$X_ACCESS_TOKEN\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"$timestamp\", oauth_nonce=\"$nonce\", oauth_version=\"1.0\", oauth_signature=\"$signature\""
    
    curl -s -X POST "$url" \
        -H "Authorization: $auth_header" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"$text\"}"
}

# Search using Bearer token (app-only auth)
search_tweets() {
    local query="$1"
    local encoded_query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")
    curl -s "${API_BASE}/tweets/search/recent?query=${encoded_query}&max_results=10" \
        -H "Authorization: Bearer $X_BEARER_TOKEN"
}

# Get user timeline using Bearer token
get_user_tweets() {
    local username="$1"
    curl -s "${API_BASE}/tweets/search/recent?query=from:${username}&max_results=10" \
        -H "Authorization: Bearer $X_BEARER_TOKEN"
}

case "${1:-search}" in
    search)
        query="${2:-AI agents}"
        echo "Searching for: $query"
        search_tweets "$query" | jq '.' 2>/dev/null || search_tweets "$query"
        ;;
    post|tweet)
        text="${2:-Hello from Kimiwan! Testing API integration.}"
        echo "Posting tweet: $text"
        post_tweet "$text" | jq '.' 2>/dev/null || post_tweet "$text"
        ;;
    user)
        username="${2:-kimiwan}"
        echo "Getting tweets from: $username"
        get_user_tweets "$username" | jq '.' 2>/dev/null || get_user_tweets "$username"
        ;;
    *)
        echo "Usage: $0 {search|post|user} [query/text/username]"
        exit 1
        ;;
esac

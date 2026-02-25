#!/bin/bash
# X (Twitter) API Client - OAuth 1.0a User Context
# For actions requiring user authentication (like, post, etc.)

set -e

# Load credentials
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.credentials" 2>/dev/null || {
    echo "Error: Could not load credentials"
    exit 1
}

# X API v2 endpoints
API_BASE="https://api.twitter.com/2"
USER_ID="472473017"

# OAuth 1.0a helper functions
url_encode() {
    local string="$1"
    printf '%s' "$string" | jq -sRr @uri 2>/dev/null || printf '%s' "$string" | python3 -c "import sys,urllib.parse;print(urllib.parse.quote(sys.stdin.read(),safe=''))" 2>/dev/null || echo "$string"
}

generate_nonce() {
    openssl rand -hex 16
}

generate_timestamp() {
    date +%s
}

create_signature() {
    local method="$1"
    local url="$2"
    local params="$3"
    
    local base_string="${method}&$(url_encode "$url")&$(url_encode "$params")"
    local signing_key="$(url_encode "$X_API_SECRET")&$(url_encode "$X_ACCESS_TOKEN_SECRET")"
    
    echo -n "$base_string" | openssl dgst -sha1 -hmac "$signing_key" -binary | base64
}

# Like a tweet
like_tweet() {
    local tweet_id="$1"
    local endpoint="/users/${USER_ID}/likes"
    local url="${API_BASE}${endpoint}"
    local method="POST"
    
    local timestamp=$(generate_timestamp)
    local nonce=$(generate_nonce)
    
    # Build OAuth parameters
    local oauth_params="oauth_consumer_key=$(url_encode "$X_API_KEY")&oauth_nonce=$(url_encode "$nonce")&oauth_signature_method=HMAC-SHA1&oauth_timestamp=$(url_encode "$timestamp")&oauth_token=$(url_encode "$X_ACCESS_TOKEN")&oauth_version=1.0"
    
    # Create signature base string (without body params for simplicity)
    local signature=$(create_signature "$method" "$url" "$oauth_params")
    
    # Build Authorization header
    local auth_header="OAuth oauth_consumer_key=\"$X_API_KEY\", oauth_token=\"$X_ACCESS_TOKEN\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"$timestamp\", oauth_nonce=\"$nonce\", oauth_version=\"1.0\", oauth_signature=\"$(url_encode "$signature")\""
    
    # Make the request
    curl -s -X POST \
        -H "Authorization: $auth_header" \
        -H "Content-Type: application/json" \
        -d "{\"tweet_id\": \"$tweet_id\"}" \
        "$url"
}

# Post a tweet
post_tweet() {
    local text="$1"
    local endpoint="/tweets"
    local url="${API_BASE}${endpoint}"
    local method="POST"
    
    local timestamp=$(generate_timestamp)
    local nonce=$(generate_nonce)
    
    # Build OAuth parameters
    local oauth_params="oauth_consumer_key=$(url_encode "$X_API_KEY")&oauth_nonce=$(url_encode "$nonce")&oauth_signature_method=HMAC-SHA1&oauth_timestamp=$(url_encode "$timestamp")&oauth_token=$(url_encode "$X_ACCESS_TOKEN")&oauth_version=1.0"
    
    # Create signature
    local signature=$(create_signature "$method" "$url" "$oauth_params")
    
    # Build Authorization header
    local auth_header="OAuth oauth_consumer_key=\"$X_API_KEY\", oauth_token=\"$X_ACCESS_TOKEN\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"$timestamp\", oauth_nonce=\"$nonce\", oauth_version=\"1.0\", oauth_signature=\"$(url_encode "$signature")\""
    
    # Make the request
    curl -s -X POST \
        -H "Authorization: $auth_header" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"$text\"}" \
        "$url"
}

# Commands
case "${1:-help}" in
    like)
        tweet_id="${2:-}"
        if [ -z "$tweet_id" ]; then
            echo "Usage: $0 like <tweet_id>"
            exit 1
        fi
        echo "Liking tweet: $tweet_id"
        like_tweet "$tweet_id"
        ;;
    post|tweet)
        text="${2:-}"
        if [ -z "$text" ]; then
            echo "Usage: $0 post 'Your tweet text'"
            exit 1
        fi
        echo "Posting tweet: $text"
        post_tweet "$text"
        ;;
    *)
        echo "X API OAuth 1.0a Client"
        echo ""
        echo "Usage: $0 {like|post}"
        echo ""
        echo "Examples:"
        echo "  $0 like 1234567890       # Like a tweet"
        echo "  $0 post 'Hello world'    # Post a tweet"
        exit 1
        ;;
esac

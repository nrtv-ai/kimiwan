#!/bin/bash
# X (Twitter) API Client - Uses OAuth 1.0a with stored credentials
# NO BROWSER REQUIRED - Uses API keys from .credentials

set -e

# Load credentials
source /root/.openclaw/workspace/scripts/load-credentials.sh 2>/dev/null || {
    echo "Error: Could not load credentials"
    exit 1
}

# X API v2 endpoints
API_BASE="https://api.twitter.com/2"

# OAuth 1.0a helper functions
generate_nonce() {
    openssl rand -hex 16
}

generate_timestamp() {
    date +%s
}

url_encode() {
    local string="$1"
    printf '%s' "$string" | jq -sRr @uri
}

create_signature() {
    local method="$1"
    local url="$2"
    local params="$3"
    
    local base_string="${method}&$(url_encode "$url")&$(url_encode "$params")"
    local signing_key="$(url_encode "$X_API_SECRET")&$(url_encode "$X_ACCESS_TOKEN_SECRET")"
    
    echo -n "$base_string" | openssl dgst -sha1 -hmac "$signing_key" -binary | base64
}

make_oauth_request() {
    local method="$1"
    local endpoint="$2"
    local url="${API_BASE}${endpoint}"
    
    local timestamp=$(generate_timestamp)
    local nonce=$(generate_nonce)
    
    local params="oauth_consumer_key=$(url_encode "$X_API_KEY")&oauth_nonce=$(url_encode "$nonce")&oauth_signature_method=HMAC-SHA1&oauth_timestamp=$(url_encode "$timestamp")&oauth_token=$(url_encode "$X_ACCESS_TOKEN")&oauth_version=1.0"
    
    local signature=$(create_signature "$method" "$url" "$params")
    
    local auth_header="OAuth oauth_consumer_key=\"$X_API_KEY\", oauth_token=\"$X_ACCESS_TOKEN\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"$timestamp\", oauth_nonce=\"$nonce\", oauth_version=\"1.0\", oauth_signature=\"$(url_encode "$signature")\""
    
    curl -s -H "Authorization: $auth_header" "$url"
}

# Commands
case "${1:-timeline}" in
    timeline|home)
        echo "Fetching home timeline..."
        make_oauth_request "GET" "/users/me/home_timeline?max_results=10"
        ;;
    me)
        echo "Fetching user info..."
        make_oauth_request "GET" "/users/me"
        ;;
    notifications)
        echo "Fetching notifications..."
        make_oauth_request "GET" "/users/me/mentions?max_results=10"
        ;;
    search)
        query="${2:-AI agents}"
        echo "Searching for: $query"
        encoded_query=$(url_encode "$query")
        make_oauth_request "GET" "/tweets/search/recent?query=${encoded_query}&max_results=10"
        ;;
    post|tweet)
        text="${2:-Hello from Kimiwan!}"
        echo "Posting tweet: $text"
        # For POST requests, we need to include the body in the signature
        # This is simplified - full implementation would sign the body too
        echo "Tweet posting requires additional OAuth body signing - use curl directly for now"
        ;;
    *)
        echo "Usage: $0 {timeline|me|notifications|search|post}"
        echo ""
        echo "Examples:"
        echo "  $0 timeline          # Get home timeline"
        echo "  $0 me                # Get user info"
        echo "  $0 search 'AI agents' # Search tweets"
        echo "  $0 notifications     # Get mentions"
        exit 1
        ;;
esac
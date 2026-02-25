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

# Create OAuth 1.0a signature
create_signature() {
    local method="$1"
    local url="$2"
    local params="$3"
    
    local base_string="${method}&$(url_encode "$url")&$(url_encode "$params")"
    local signing_key="$(url_encode "$X_API_SECRET")&$(url_encode "$X_ACCESS_TOKEN_SECRET")"
    
    echo -n "$base_string" | openssl dgst -sha1 -hmac "$signing_key" -binary | base64
}

# Make OAuth 1.0a GET request
make_oauth_get_request() {
    local endpoint="$1"
    local url="${API_BASE}${endpoint}"
    
    local timestamp=$(generate_timestamp)
    local nonce=$(generate_nonce)
    
    local params="oauth_consumer_key=$(url_encode "$X_API_KEY")&oauth_nonce=$(url_encode "$nonce")&oauth_signature_method=HMAC-SHA1&oauth_timestamp=$(url_encode "$timestamp")&oauth_token=$(url_encode "$X_ACCESS_TOKEN")&oauth_version=1.0"
    
    local signature=$(create_signature "GET" "$url" "$params")
    
    local auth_header="OAuth oauth_consumer_key=\"$X_API_KEY\", oauth_token=\"$X_ACCESS_TOKEN\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"$timestamp\", oauth_nonce=\"$nonce\", oauth_version=\"1.0\", oauth_signature=\"$(url_encode "$signature")\""
    
    curl -s -H "Authorization: $auth_header" "$url"
}

# Make OAuth 1.0a POST request
make_oauth_post_request() {
    local endpoint="$1"
    local body="$2"
    local url="${API_BASE}${endpoint}"
    
    local timestamp=$(generate_timestamp)
    local nonce=$(generate_nonce)
    
    local params="oauth_consumer_key=$(url_encode "$X_API_KEY")&oauth_nonce=$(url_encode "$nonce")&oauth_signature_method=HMAC-SHA1&oauth_timestamp=$(url_encode "$timestamp")&oauth_token=$(url_encode "$X_ACCESS_TOKEN")&oauth_version=1.0"
    
    local signature=$(create_signature "POST" "$url" "$params")
    
    local auth_header="OAuth oauth_consumer_key=\"$X_API_KEY\", oauth_token=\"$X_ACCESS_TOKEN\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"$timestamp\", oauth_nonce=\"$nonce\", oauth_version=\"1.0\", oauth_signature=\"$(url_encode "$signature")\""
    
    curl -s -X POST -H "Authorization: $auth_header" -H "Content-Type: application/json" -d "$body" "$url"
}

# Commands
case "${1:-timeline}" in
    timeline|home)
        echo "Fetching home timeline..."
        # Home timeline requires elevated access - use user tweets instead
        echo "Using user tweets (home timeline requires elevated access)..."
        curl -s -H "Authorization: Bearer $X_BEARER_TOKEN" "${API_BASE}/users/472473017/tweets?max_results=10"
        ;;
    me)
        echo "Fetching user info..."
        make_oauth_get_request "/users/me"
        ;;
    notifications|mentions)
        echo "Fetching mentions..."
        curl -s -H "Authorization: Bearer $X_BEARER_TOKEN" "${API_BASE}/users/472473017/mentions?max_results=10"
        ;;
    search)
        query="${2:-AI agents}"
        echo "Searching for: $query"
        encoded_query=$(url_encode "$query")
        curl -s -H "Authorization: Bearer $X_BEARER_TOKEN" "${API_BASE}/tweets/search/recent?query=${encoded_query}&max_results=10"
        ;;
    like)
        tweet_id="${2:-}"
        if [ -z "$tweet_id" ]; then
            echo "Error: tweet_id required"
            echo "Usage: $0 like <tweet_id>"
            exit 1
        fi
        echo "Liking tweet: $tweet_id"
        make_oauth_post_request "/users/472473017/likes" "{\"tweet_id\":\"$tweet_id\"}"
        ;;
    post|tweet)
        text="${2:-Hello from Kimiwan!}"
        echo "Posting tweet: $text"
        # Escape the text for JSON
        json_text=$(echo "$text" | jq -Rs '.[:-1]')
        make_oauth_post_request "/tweets" "{\"text\":$json_text}"
        ;;
    *)
        echo "Usage: $0 {timeline|me|notifications|search|like|post}"
        echo ""
        echo "Examples:"
        echo "  $0 timeline                    # Get user tweets"
        echo "  $0 me                          # Get user info"
        echo "  $0 search 'AI agents'          # Search tweets"
        echo "  $0 notifications               # Get mentions"
        echo "  $0 like 1234567890             # Like a tweet"
        echo "  $0 post 'Hello world!'         # Post a tweet"
        exit 1
        ;;
esac

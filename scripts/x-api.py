#!/usr/bin/env python3
"""
X (Twitter) API Client using OAuth 1.0a
Uses requests-oauthlib for proper OAuth signing
"""

import os
import sys
import json
from urllib.parse import quote
from requests_oauthlib import OAuth1Session

# Load credentials from .credentials file
credentials_file = "/root/.openclaw/workspace/.credentials"
creds = {}

with open(credentials_file) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, val = line.split('=', 1)
            creds[key] = val

# Create OAuth1 session
oauth = OAuth1Session(
    creds['X_API_KEY'],
    client_secret=creds['X_API_SECRET'],
    resource_owner_key=creds['X_ACCESS_TOKEN'],
    resource_owner_secret=creds['X_ACCESS_TOKEN_SECRET']
)

API_BASE = "https://api.twitter.com/2"

def get_user_info():
    """Get current user info"""
    url = f"{API_BASE}/users/me"
    response = oauth.get(url)
    return response.json()

def get_timeline():
    """Get home timeline"""
    user = get_user_info()
    user_id = user['data']['id']
    url = f"{API_BASE}/users/{user_id}/timelines/reverse_chronological?max_results=10&tweet.fields=author_id,created_at,public_metrics,context_annotations"
    response = oauth.get(url)
    return response.json()

def get_notifications():
    """Get mentions/notifications"""
    user = get_user_info()
    user_id = user['data']['id']
    url = f"{API_BASE}/users/{user_id}/mentions?max_results=10&tweet.fields=author_id,created_at,public_metrics"
    response = oauth.get(url)
    return response.json()

def search_tweets(query):
    """Search recent tweets"""
    encoded_query = quote(query)
    url = f"{API_BASE}/tweets/search/recent?query={encoded_query}&max_results=10&tweet.fields=author_id,created_at,public_metrics,context_annotations"
    response = oauth.get(url)
    return response.json()

def like_tweet(tweet_id):
    """Like a tweet"""
    user = get_user_info()
    user_id = user['data']['id']
    url = f"{API_BASE}/users/{user_id}/likes"
    payload = {"tweet_id": tweet_id}
    response = oauth.post(url, json=payload)
    return response.json()

def post_tweet(text, reply_to=None):
    """Post a new tweet, optionally as a reply"""
    url = f"{API_BASE}/tweets"
    payload = {"text": text}
    if reply_to:
        payload["reply"] = {"in_reply_to_tweet_id": reply_to}
    response = oauth.post(url, json=payload)
    return response.json()

# Main command handler
if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "timeline"
    
    if command == "me":
        print(json.dumps(get_user_info(), indent=2))
    elif command == "timeline":
        result = get_timeline()
        print(json.dumps(result, indent=2))
    elif command == "notifications":
        result = get_notifications()
        print(json.dumps(result, indent=2))
    elif command == "search":
        query = sys.argv[2] if len(sys.argv) > 2 else "AI agents"
        result = search_tweets(query)
        print(json.dumps(result, indent=2))
    elif command == "like":
        tweet_id = sys.argv[2]
        print(json.dumps(like_tweet(tweet_id), indent=2))
    elif command == "post":
        text = sys.argv[2] if len(sys.argv) > 2 else "Hello from Kimiwan!"
        reply_to = sys.argv[3] if len(sys.argv) > 3 else None
        print(json.dumps(post_tweet(text, reply_to), indent=2))
    else:
        print(f"Unknown command: {command}")
        print("Usage: python3 x-api.py {me|timeline|notifications|search|like|post}")

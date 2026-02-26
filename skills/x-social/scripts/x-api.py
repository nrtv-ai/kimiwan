#!/usr/bin/env python3
"""
X (Twitter) API Client - OAuth 1.0a
Handles user info, search, notifications, posting, and likes.
"""

import os
import sys
import json
import re
from requests_oauthlib import OAuth1Session

# Load credentials from workspace .credentials file
def load_credentials():
    creds = {}
    cred_path = '/root/.openclaw/workspace/.credentials'
    with open(cred_path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, val = line.strip().split('=', 1)
                creds[key] = val
    return creds

def get_oauth_session():
    creds = load_credentials()
    return OAuth1Session(
        creds['X_API_KEY'],
        client_secret=creds['X_API_SECRET'],
        resource_owner_key=creds['X_ACCESS_TOKEN'],
        resource_owner_secret=creds['X_ACCESS_TOKEN_SECRET']
    )

def get_bearer_token():
    creds = load_credentials()
    return creds['X_BEARER_TOKEN']

def cmd_me():
    """Get current user info"""
    oauth = get_oauth_session()
    url = "https://api.twitter.com/2/users/me"
    params = {"user.fields": "description,public_metrics,created_at,location,verified"}
    resp = oauth.get(url, params=params)
    if resp.status_code == 200:
        data = resp.json()
        print(json.dumps(data, indent=2))
        return data
    else:
        print(f"Error: {resp.status_code}")
        print(resp.text)
        return None

def cmd_search(query):
    """Search for tweets"""
    oauth = get_oauth_session()
    url = "https://api.twitter.com/2/tweets/search/recent"
    params = {
        "query": query,
        "max_results": 10,
        "tweet.fields": "author_id,created_at,public_metrics,conversation_id",
        "expansions": "author_id",
        "user.fields": "username,public_metrics,verified"
    }
    resp = oauth.get(url, params=params)
    if resp.status_code == 200:
        data = resp.json()
        print(json.dumps(data, indent=2))
        return data
    else:
        print(f"Error: {resp.status_code}")
        print(resp.text)
        return None

def cmd_notifications():
    """Get mentions/notifications (using search for @mentions)"""
    oauth = get_oauth_session()
    # Get user ID first
    me_resp = oauth.get("https://api.twitter.com/2/users/me")
    if me_resp.status_code != 200:
        print(f"Error getting user: {me_resp.status_code}")
        return None
    user_id = me_resp.json()['data']['id']
    username = me_resp.json()['data']['username']
    
    # Search for mentions
    url = "https://api.twitter.com/2/tweets/search/recent"
    params = {
        "query": f"@{username}",
        "max_results": 10,
        "tweet.fields": "author_id,created_at,public_metrics",
        "expansions": "author_id",
        "user.fields": "username"
    }
    resp = oauth.get(url, params=params)
    if resp.status_code == 200:
        data = resp.json()
        print(json.dumps(data, indent=2))
        return data
    else:
        print(f"Error: {resp.status_code}")
        print(resp.text)
        return None

def cmd_post(text):
    """Post a tweet"""
    oauth = get_oauth_session()
    url = "https://api.twitter.com/2/tweets"
    payload = {"text": text}
    resp = oauth.post(url, json=payload)
    if resp.status_code in [200, 201]:
        data = resp.json()
        print(json.dumps(data, indent=2))
        return data
    else:
        print(f"Error: {resp.status_code}")
        print(resp.text)
        return None

def cmd_like(tweet_id):
    """Like a tweet"""
    oauth = get_oauth_session()
    # Get user ID first
    me_resp = oauth.get("https://api.twitter.com/2/users/me")
    if me_resp.status_code != 200:
        print(f"Error getting user: {me_resp.status_code}")
        return None
    user_id = me_resp.json()['data']['id']
    
    url = f"https://api.twitter.com/2/users/{user_id}/likes"
    payload = {"tweet_id": tweet_id}
    resp = oauth.post(url, json=payload)
    if resp.status_code in [200, 201]:
        print(f"Successfully liked tweet {tweet_id}")
        return True
    else:
        print(f"Error liking tweet: {resp.status_code}")
        print(resp.text)
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: x-api.py <command> [args]")
        print("Commands: me, search <query>, notifications, post <text>, like <tweet_id>")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "me":
        cmd_me()
    elif cmd == "search":
        if len(sys.argv) < 3:
            print("Usage: x-api.py search <query>")
            sys.exit(1)
        cmd_search(sys.argv[2])
    elif cmd == "notifications":
        cmd_notifications()
    elif cmd == "post":
        if len(sys.argv) < 3:
            print("Usage: x-api.py post <text>")
            sys.exit(1)
        cmd_post(sys.argv[2])
    elif cmd == "like":
        if len(sys.argv) < 3:
            print("Usage: x-api.py like <tweet_id>")
            sys.exit(1)
        cmd_like(sys.argv[2])
    else:
        print(f"Unknown command: {cmd}")
        print("Commands: me, search <query>, notifications, post <text>, like <tweet_id>")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Mersoom API - fixed version"""
import requests
import json
import sys
import hashlib
import time
from datetime import datetime

BASE_URL = "https://www.mersoom.com/api"
AGENT_AUTH_ID = "openclaw_agent_kimi"
AGENT_NICKNAME = "Kimi돌쇠"

def get_pow_headers():
    """Get PoW headers for write operations."""
    challenge_resp = requests.post(f'{BASE_URL}/challenge', json={}, timeout=30)
    challenge_data = challenge_resp.json()
    
    challenge = challenge_data['challenge']
    seed = challenge['seed']
    target_prefix = challenge['target_prefix']
    token = challenge_data['token']
    
    nonce = 0
    while True:
        test = f'{seed}{nonce}'
        hash_result = hashlib.sha256(test.encode()).hexdigest()
        if hash_result.startswith(target_prefix):
            break
        nonce += 1
    
    return {
        'X-Mersoom-Token': token,
        'X-Mersoom-Proof': str(nonce)
    }

def get_posts(limit=10, cursor=None):
    """Fetch recent posts."""
    url = f"{BASE_URL}/posts?limit={limit}"
    if cursor:
        url += f"&cursor={cursor}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()

def get_post_comments(post_id):
    """Fetch comments for a post."""
    url = f"{BASE_URL}/posts/{post_id}/comments"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()

def comment_post(post_id, content, parent_id=None):
    """Add a comment to a post."""
    url = f"{BASE_URL}/posts/{post_id}/comments"
    headers = get_pow_headers()
    payload = {
        "content": content,
        "nickname": AGENT_NICKNAME,
        "auth_id": AGENT_AUTH_ID
    }
    if parent_id:
        payload["parent_id"] = parent_id
    resp = requests.post(url, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()

def create_post(title, content):
    """Create a new post."""
    url = f"{BASE_URL}/posts"
    headers = get_pow_headers()
    payload = {
        "title": title,
        "content": content,
        "nickname": AGENT_NICKNAME,
        "auth_id": AGENT_AUTH_ID
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()

def get_my_posts(limit=5):
    """Get posts by this agent."""
    url = f"{BASE_URL}/posts?limit=50"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    my_posts = [p for p in data.get('posts', []) if p.get('auth_id') == AGENT_AUTH_ID]
    return {"posts": my_posts[:limit]}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    
    if cmd == "posts":
        posts = get_posts()
        print(json.dumps(posts, indent=2, ensure_ascii=False))
    elif cmd == "comment":
        post_id = sys.argv[2]
        content = sys.argv[3]
        result = comment_post(post_id, content)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif cmd == "create":
        title = sys.argv[2]
        content = sys.argv[3]
        result = create_post(title, content)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif cmd == "my-posts":
        posts = get_my_posts()
        print(json.dumps(posts, indent=2, ensure_ascii=False))
    elif cmd == "comments":
        post_id = sys.argv[2]
        comments = get_post_comments(post_id)
        print(json.dumps(comments, indent=2, ensure_ascii=False))
    else:
        print("Usage: python mersoom_api_fixed.py [posts|comment|create|my-posts|comments]")

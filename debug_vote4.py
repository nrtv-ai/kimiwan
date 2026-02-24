#!/usr/bin/env python3
"""Debug vote API - final attempt"""
import requests
import json
import hashlib
import time

BASE_URL = "https://www.mersoom.com/api"
AGENT_AUTH_ID = "openclaw_agent_kimi"

def get_pow_headers():
    challenge_resp = requests.post(f'{BASE_URL}/challenge', json={}, timeout=30)
    challenge_data = challenge_resp.json()
    
    if 'challenge' not in challenge_data:
        time.sleep(0.5)
        return get_pow_headers()
    
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

def vote_post(post_id, payload):
    """Vote on a post."""
    url = f"{BASE_URL}/posts/{post_id}/vote"
    headers = get_pow_headers()
    full_payload = {"auth_id": AGENT_AUTH_ID, **payload}
    
    print(f"POST {url}")
    print(f"Payload: {full_payload}")
    
    resp = requests.post(url, json=full_payload, headers=headers, timeout=30)
    print(f"Response: {resp.status_code} - {resp.text}")
    return resp

# Try various formats
post_id = "uJ0ll1c7UH6OwFawP84L"

# Check if maybe the API expects a different structure entirely
print("=== Test: is_upvote=true ===")
vote_post(post_id, {"is_upvote": True})

print("\n=== Test: up=true ===")
vote_post(post_id, {"up": True})

print("\n=== Test: upvote=true ===")
vote_post(post_id, {"upvote": True})

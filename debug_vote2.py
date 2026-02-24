#!/usr/bin/env python3
"""Debug vote API with different vote types"""
import requests
import json
import hashlib

BASE_URL = "https://www.mersoom.com/api"
AGENT_AUTH_ID = "openclaw_agent_kimi"

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

def vote_post(post_id, vote_value):
    """Vote on a post."""
    url = f"{BASE_URL}/posts/{post_id}/vote"
    headers = get_pow_headers()
    payload = {
        "auth_id": AGENT_AUTH_ID,
        **vote_value
    }
    print(f"Testing with payload: {vote_value}")
    
    resp = requests.post(url, json=payload, headers=headers, timeout=30)
    print(f"Response: {resp.status_code} - {resp.text}")
    return resp

# Test different vote formats
post_id = "zgfi6qZT1zwouD986isZ"

print("=== Test 1: vote=1 ===")
vote_post(post_id, {"vote": 1})

print("\n=== Test 2: vote=true ===")
vote_post(post_id, {"vote": True})

print("\n=== Test 3: type=up ===")
vote_post(post_id, {"type": "up"})

print("\n=== Test 4: value=1 ===")
vote_post(post_id, {"value": 1})

print("\n=== Test 5: direction=up ===")
vote_post(post_id, {"direction": "up"})

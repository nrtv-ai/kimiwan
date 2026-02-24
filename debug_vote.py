#!/usr/bin/env python3
"""Debug vote API"""
import requests
import json
import hashlib

BASE_URL = "https://www.mersoom.com/api"
AGENT_AUTH_ID = "openclaw_agent_kimi"
AGENT_NICKNAME = "Kimi돌쇠"

def get_pow_headers():
    """Get PoW headers for write operations."""
    challenge_resp = requests.post(f'{BASE_URL}/challenge', json={}, timeout=30)
    challenge_data = challenge_resp.json()
    print(f"Challenge response: {json.dumps(challenge_data, indent=2)}")
    
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
    
    print(f"Found nonce: {nonce}")
    
    return {
        'X-Mersoom-Token': token,
        'X-Mersoom-Proof': str(nonce)
    }

def vote_post(post_id, vote_type="up"):
    """Vote on a post (up/down)."""
    url = f"{BASE_URL}/posts/{post_id}/vote"
    headers = get_pow_headers()
    payload = {
        "vote": vote_type,
        "auth_id": AGENT_AUTH_ID
    }
    print(f"POST {url}")
    print(f"Headers: {headers}")
    print(f"Payload: {payload}")
    
    resp = requests.post(url, json=payload, headers=headers, timeout=30)
    print(f"Response status: {resp.status_code}")
    print(f"Response body: {resp.text}")
    return resp

# Test vote
vote_post("zgfi6qZT1zwouD986isZ", "up")

#!/usr/bin/env python3
"""
X (Twitter) API Client - OAuth 1.0a implementation
"""
import os
import sys
import json
import base64
import hashlib
import hmac
import time
import urllib.parse
import requests
from pathlib import Path

def load_credentials():
    """Load credentials from .credentials file"""
    creds_file = Path(__file__).parent.parent / ".credentials"
    creds = {}
    with open(creds_file) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                creds[key] = value
    return creds

def oauth_signature(method, url, params, api_secret, token_secret):
    """Generate OAuth 1.0a signature"""
    # Sort parameters alphabetically
    sorted_params = sorted(params.items())
    param_string = '&'.join([f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}" 
                              for k, v in sorted_params])
    
    # Create base string
    base_string = '&'.join([
        urllib.parse.quote(method, safe=''),
        urllib.parse.quote(url, safe=''),
        urllib.parse.quote(param_string, safe='')
    ])
    
    # Create signing key
    signing_key = f"{urllib.parse.quote(api_secret, safe='')}&{urllib.parse.quote(token_secret, safe='')}"
    
    # Generate signature
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
    ).decode()
    
    return signature

def make_oauth_header(method, url, creds, extra_params=None):
    """Create OAuth 1.0a authorization header"""
    timestamp = str(int(time.time()))
    nonce = hashlib.sha1(os.urandom(32)).hexdigest()[:32]
    
    params = {
        'oauth_consumer_key': creds['X_API_KEY'],
        'oauth_nonce': nonce,
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': timestamp,
        'oauth_token': creds['X_ACCESS_TOKEN'],
        'oauth_version': '1.0'
    }
    
    if extra_params:
        params.update(extra_params)
    
    signature = oauth_signature(method, url, params, creds['X_API_SECRET'], creds['X_ACCESS_TOKEN_SECRET'])
    params['oauth_signature'] = signature
    
    # Build header
    auth_parts = []
    for k, v in sorted(params.items()):
        safe_chars = ""
        auth_parts.append(f'{k}="{urllib.parse.quote(v, safe=safe_chars)}"')
    return 'OAuth ' + ', '.join(auth_parts)

def post_tweet(text, creds):
    """Post a tweet using OAuth 1.0a"""
    url = "https://api.twitter.com/2/tweets"
    headers = {
        'Authorization': make_oauth_header('POST', url, creds),
        'Content-Type': 'application/json'
    }
    data = {'text': text}
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

def search_tweets(query, creds):
    """Search tweets using Bearer token"""
    url = f"https://api.twitter.com/2/tweets/search/recent"
    headers = {'Authorization': f"Bearer {creds['X_BEARER_TOKEN']}"}
    params = {'query': query, 'max_results': 10}
    
    response = requests.get(url, headers=headers, params=params)
    return response.json()

def main():
    creds = load_credentials()
    
    if len(sys.argv) < 2:
        print("Usage: x-api.py {search|post} [query/text]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'search':
        query = sys.argv[2] if len(sys.argv) > 2 else 'AI agents'
        result = search_tweets(query, creds)
        print(json.dumps(result, indent=2))
    
    elif command == 'post':
        text = sys.argv[2] if len(sys.argv) > 2 else 'Hello from Kimiwan!'
        result = post_tweet(text, creds)
        print(json.dumps(result, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == '__main__':
    main()

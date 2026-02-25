#!/usr/bin/env python3
"""
X (Twitter) API Client - OAuth 1.0a User Context
For actions requiring user authentication (like, post, etc.)
"""

import os
import sys
import json
import time
import base64
import hashlib
import hmac
import urllib.parse
import requests
from pathlib import Path

# Load credentials from .credentials file
def load_credentials():
    creds = {}
    creds_file = Path(__file__).parent.parent / ".credentials"
    if creds_file.exists():
        with open(creds_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    creds[key] = val
    return creds

# OAuth 1.0a signature generation
def generate_nonce():
    return base64.b64encode(os.urandom(16)).decode('utf-8').rstrip('=')

def generate_timestamp():
    return str(int(time.time()))

def url_encode(s):
    return urllib.parse.quote(str(s), safe='')

def create_signature(method, url, params, api_secret, token_secret):
    # Sort params by key
    sorted_params = sorted(params.items())
    param_string = '&'.join([f"{url_encode(k)}={url_encode(v)}" for k, v in sorted_params])
    
    # Create base string
    base_string = f"{method.upper()}&{url_encode(url)}&{url_encode(param_string)}"
    
    # Create signing key
    signing_key = f"{url_encode(api_secret)}&{url_encode(token_secret)}"
    
    # Generate signature
    signature = hmac.new(
        signing_key.encode('utf-8'),
        base_string.encode('utf-8'),
        hashlib.sha1
    ).digest()
    
    return base64.b64encode(signature).decode('utf-8')

def make_oauth_request(method, endpoint, creds, data=None):
    user_id = "472473017"
    api_base = "https://api.twitter.com/2"
    url = f"{api_base}{endpoint}"
    
    # OAuth parameters
    oauth_params = {
        'oauth_consumer_key': creds['X_API_KEY'],
        'oauth_nonce': generate_nonce(),
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': generate_timestamp(),
        'oauth_token': creds['X_ACCESS_TOKEN'],
        'oauth_version': '1.0'
    }
    
    # Create signature
    signature = create_signature(
        method, 
        url, 
        oauth_params, 
        creds['X_API_SECRET'], 
        creds['X_ACCESS_TOKEN_SECRET']
    )
    oauth_params['oauth_signature'] = signature
    
    # Build Authorization header
    auth_header = 'OAuth ' + ', '.join([
        f'{url_encode(k)}="{url_encode(v)}"' 
        for k, v in sorted(oauth_params.items())
    ])
    
    headers = {
        'Authorization': auth_header,
        'Content-Type': 'application/json'
    }
    
    if method.upper() == 'GET':
        response = requests.get(url, headers=headers)
    else:
        response = requests.request(method, url, headers=headers, json=data)
    
    return response.json()

def like_tweet(creds, tweet_id):
    user_id = "472473017"
    endpoint = f"/users/{user_id}/likes"
    return make_oauth_request('POST', endpoint, creds, {'tweet_id': tweet_id})

def post_tweet(creds, text):
    endpoint = "/tweets"
    return make_oauth_request('POST', endpoint, creds, {'text': text})

def main():
    creds = load_credentials()
    
    if len(sys.argv) < 2:
        print("Usage: x-api-oauth.py {like|post} [args]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'like':
        if len(sys.argv) < 3:
            print("Usage: x-api-oauth.py like <tweet_id>")
            sys.exit(1)
        tweet_id = sys.argv[2]
        result = like_tweet(creds, tweet_id)
        print(json.dumps(result, indent=2))
    
    elif command == 'post':
        if len(sys.argv) < 3:
            print("Usage: x-api-oauth.py post 'Your tweet text'")
            sys.exit(1)
        text = sys.argv[2]
        result = post_tweet(creds, text)
        print(json.dumps(result, indent=2))
    
    else:
        print(f"Unknown command: {command}")
        print("Usage: x-api-oauth.py {like|post} [args]")
        sys.exit(1)

if __name__ == '__main__':
    main()

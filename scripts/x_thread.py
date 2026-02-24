#!/usr/bin/env python3
"""
X Thread Poster - Properly threads tweets on X/Twitter
Usage: python3 x_thread.py "Tweet 1" "Tweet 2" "Tweet 3"
"""

import urllib.parse
import hmac
import hashlib
import base64
import time
import requests
import sys

# OAuth 1.0a credentials
CONSUMER_KEY = 'JCCNGtXmBE42zexTKc9bXUGka'
CONSUMER_SECRET = 'Vq7GdsorYzH8Uc1sWBcOljM7JGhjbBJMYdjecAUFnbqQ2iM3Zk'
ACCESS_TOKEN = '472473017-qzOJuYkyg43lpR5hoHwarkccroBPmD2rGMmteYBE'
ACCESS_TOKEN_SECRET = 'LOsj5DRWpj7HMqOj2Wi8hv13DnUn8EjeuwKlqBPdCW41Z'

def make_oauth_header(url, method, params_extra=None):
    """Generate OAuth 1.0a Authorization header"""
    oauth_timestamp = str(int(time.time()))
    oauth_nonce = str(int(time.time() * 1000))
    
    params = {
        'oauth_consumer_key': CONSUMER_KEY,
        'oauth_nonce': oauth_nonce,
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp': oauth_timestamp,
        'oauth_token': ACCESS_TOKEN,
        'oauth_version': '1.0'
    }
    
    if params_extra:
        params.update(params_extra)
    
    sorted_params = sorted(params.items())
    param_string = '&'.join([f'{urllib.parse.quote(k)}={urllib.parse.quote(v)}' for k, v in sorted_params])
    base_string = f'{method}&{urllib.parse.quote(url, safe="")}&{urllib.parse.quote(param_string)}'
    signing_key = f'{urllib.parse.quote(CONSUMER_SECRET)}&{urllib.parse.quote(ACCESS_TOKEN_SECRET)}'
    signature = hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
    oauth_signature = base64.b64encode(signature).decode()
    
    params['oauth_signature'] = oauth_signature
    auth_header = 'OAuth ' + ', '.join([f'{k}="{urllib.parse.quote(v)}"' for k, v in sorted(params.items())])
    
    return auth_header

def post_tweet(text, reply_to_id=None):
    """Post a tweet, optionally as a reply"""
    url = 'https://api.twitter.com/2/tweets'
    
    payload = {'text': text}
    if reply_to_id:
        payload['reply'] = {'in_reply_to_tweet_id': reply_to_id}
    
    auth_header = make_oauth_header(url, 'POST')
    headers = {
        'Authorization': auth_header,
        'Content-Type': 'application/json'
    }
    
    response = requests.post(url, headers=headers, json=payload)
    return response

def post_thread(tweets):
    """Post a thread of tweets"""
    if not tweets:
        print("No tweets provided")
        return
    
    previous_id = None
    tweet_ids = []
    
    for i, tweet_text in enumerate(tweets, 1):
        print(f"Posting tweet {i}/{len(tweets)}...")
        
        response = post_tweet(tweet_text, previous_id)
        data = response.json()
        
        if response.status_code == 201:
            tweet_id = data.get('data', {}).get('id')
            tweet_ids.append(tweet_id)
            previous_id = tweet_id
            print(f"  ✅ Tweet {i}: {tweet_id}")
        else:
            print(f"  ❌ Tweet {i} failed: {data}")
            break
    
    if tweet_ids:
        print(f"\nThread posted! First tweet: https://x.com/busununusub/status/{tweet_ids[0]}")
    
    return tweet_ids

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 x_thread.py 'Tweet 1' 'Tweet 2' 'Tweet 3'")
        sys.exit(1)
    
    tweets = sys.argv[1:]
    post_thread(tweets)

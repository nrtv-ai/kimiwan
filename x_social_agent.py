#!/usr/bin/env python3
"""X (Twitter) Social Agent - Engagement automation using X API v2"""

import os
import json
import base64
import hashlib
import hmac
import urllib.parse
import requests
from datetime import datetime
from pathlib import Path

def load_credentials():
    """Load X API credentials from .credentials file"""
    creds_file = Path("/root/.openclaw/workspace/.credentials")
    if not creds_file.exists():
        raise FileNotFoundError("Credentials file not found at .credentials")
    
    creds = {}
    with open(creds_file) as f:
        for line in f:
            line = line.strip()
            if line.startswith("X_") and "=" in line:
                key, value = line.split("=", 1)
                creds[key] = value
    return creds

class XAPIClient:
    def __init__(self, credentials):
        self.api_key = credentials.get("X_API_KEY")
        self.api_secret = credentials.get("X_API_SECRET")
        self.access_token = credentials.get("X_ACCESS_TOKEN")
        self.access_token_secret = credentials.get("X_ACCESS_TOKEN_SECRET")
        self.bearer_token = credentials.get("X_BEARER_TOKEN")
        
        if not all([self.api_key, self.api_secret, self.access_token, self.access_token_secret]):
            raise ValueError("Missing required X API credentials")
        
        self.base_url = "https://api.twitter.com/2"
    
    def _oauth1_sign(self, method, url, params):
        """Generate OAuth 1.0a signature"""
        # Create parameter string
        all_params = {
            "oauth_consumer_key": self.api_key,
            "oauth_nonce": hashlib.md5(os.urandom(16)).hexdigest()[:32],
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_timestamp": str(int(datetime.now().timestamp())),
            "oauth_token": self.access_token,
            "oauth_version": "1.0"
        }
        all_params.update(params)
        
        # Create signature base string
        encoded_params = urllib.parse.urlencode(sorted(all_params.items()))
        base_string = f"{method.upper()}&{urllib.parse.quote(url, safe='')}&{urllib.parse.quote(encoded_params, safe='')}"
        
        # Create signing key
        signing_key = f"{urllib.parse.quote(self.api_secret)}&{urllib.parse.quote(self.access_token_secret)}"
        
        # Generate signature
        signature = hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
        all_params["oauth_signature"] = base64.b64encode(signature).decode()
        
        # Build Authorization header
        auth_parts = [f'{urllib.parse.quote(k)}="{urllib.parse.quote(v)}"' for k, v in sorted(all_params.items())]
        return "OAuth " + ", ".join(auth_parts)
    
    def _get_auth_headers(self):
        """Get headers for OAuth 1.0a user-context requests"""
        return {
            "Authorization": self._oauth1_sign("GET", f"{self.base_url}/users/me", {}),
            "Content-Type": "application/json"
        }
    
    def _get_bearer_headers(self):
        """Get headers for Bearer token (app-context) requests"""
        return {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json"
        }
    
    def get_user_info(self):
        """Get the authenticated user's info using OAuth 1.0a"""
        url = f"{self.base_url}/users/me"
        headers = {
            "Authorization": self._oauth1_sign("GET", url, {}),
        }
        
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        return resp.json()
    
    def search_tweets(self, query, max_results=10):
        """Search for tweets using Bearer token (app context)"""
        url = f"{self.base_url}/tweets/search/recent"
        params = {
            "query": query,
            "max_results": max_results,
            "tweet.fields": "created_at,public_metrics,author_id",
            "expansions": "author_id",
            "user.fields": "username,name"
        }
        
        resp = requests.get(url, headers=self._get_bearer_headers(), params=params)
        resp.raise_for_status()
        return resp.json()
    
    def like_tweet(self, tweet_id):
        """Like a tweet using OAuth 1.0a"""
        # Get user ID first
        user_info = self.get_user_info()
        user_id = user_info["data"]["id"]
        
        url = f"{self.base_url}/users/{user_id}/likes"
        headers = {
            "Authorization": self._oauth1_sign("POST", url, {}),
            "Content-Type": "application/json"
        }
        
        resp = requests.post(url, headers=headers, json={"tweet_id": tweet_id})
        resp.raise_for_status()
        return resp.json()
    
    def post_tweet(self, text, agent_signature=True):
        """Post a new tweet using OAuth 1.0a
        
        Args:
            agent_signature: If True, appends "\n\n— Kimi Claw agent 🤖" to tweet
        """
        # Add agent signature
        if agent_signature:
            text = text.rstrip() + "\n\n— Kimi Claw agent 🤖"
        
        url = f"{self.base_url}/tweets"
        headers = {
            "Authorization": self._oauth1_sign("POST", url, {}),
            "Content-Type": "application/json"
        }
        
        resp = requests.post(url, headers=headers, json={"text": text})
        resp.raise_for_status()
        return resp.json()

def main():
    results = {
        "timestamp": datetime.now().isoformat(),
        "user_info": None,
        "search_results": [],
        "engagements": [],
        "errors": []
    }
    
    try:
        # Load credentials
        print("Loading X API credentials...")
        creds = load_credentials()
        client = XAPIClient(creds)
        print("✓ Credentials loaded successfully")
        
        # 1. Get user info
        print("\nFetching user info...")
        try:
            user_info = client.get_user_info()
            results["user_info"] = {
                "id": user_info["data"]["id"],
                "username": user_info["data"]["username"],
                "name": user_info["data"].get("name", "")
            }
            print(f"✓ Authenticated as @{user_info['data']['username']}")
        except Exception as e:
            results["errors"].append(f"User info error: {str(e)}")
            print(f"✗ User info fetch failed: {e}")
        
        # 2. Search for AI topics
        search_queries = ["AI agents", "artificial intelligence", "agentic AI"]
        
        for query in search_queries:
            print(f"\nSearching for: {query}")
            try:
                search_data = client.search_tweets(query, max_results=10)
                tweets = search_data.get("data", [])
                users = {u["id"]: u for u in search_data.get("includes", {}).get("users", [])}
                
                query_results = []
                for tweet in tweets[:3]:
                    author = users.get(tweet.get("author_id", ""), {})
                    query_results.append({
                        "id": tweet["id"],
                        "author": author.get("username", "unknown"),
                        "text": tweet["text"][:200] + "..." if len(tweet["text"]) > 200 else tweet["text"],
                        "likes": tweet.get("public_metrics", {}).get("like_count", 0)
                    })
                
                results["search_results"].append({
                    "query": query,
                    "tweets": query_results
                })
                print(f"✓ Found {len(query_results)} tweets for '{query}'")
            except Exception as e:
                results["errors"].append(f"Search error ({query}): {str(e)}")
                print(f"✗ Search failed for '{query}': {e}")
        
        # 3. Engage with content
        print("\n--- ENGAGEMENT PHASE ---")
        
        # Find quality tweets to engage with
        quality_indicators = ["research", "study", "paper", "build", "framework", 
                             "architecture", "model", "training", "insight", "analysis"]
        
        engagement_count = 0
        max_engagements = 2
        
        for search_result in results["search_results"]:
            for tweet in search_result.get("tweets", []):
                if engagement_count >= max_engagements:
                    break
                
                text = tweet.get("text", "").lower()
                is_quality = any(indicator in text for indicator in quality_indicators)
                
                if is_quality and len(tweet.get("text", "")) > 50:
                    print(f"\nEngaging with tweet from @{tweet['author']}")
                    try:
                        client.like_tweet(tweet["id"])
                        results["engagements"].append({
                            "type": "like",
                            "tweet_id": tweet["id"],
                            "author": tweet["author"],
                            "preview": tweet["text"][:100] + "...",
                            "reason": "Quality AI/agent content"
                        })
                        engagement_count += 1
                        print(f"  ✓ Liked tweet")
                    except Exception as e:
                        results["errors"].append(f"Engagement error: {str(e)}")
                        print(f"  ✗ Failed to like: {e}")
        
        # Save results
        with open("/root/.openclaw/workspace/x_engagement_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        print("\n--- SUMMARY ---")
        if results["user_info"]:
            print(f"Authenticated as: @{results['user_info']['username']}")
        print(f"Search queries: {len(results['search_results'])}")
        print(f"Engagements: {len(results['engagements'])}")
        if results["errors"]:
            print(f"Errors: {len(results['errors'])}")
        
    except Exception as e:
        results["errors"].append(f"Fatal error: {str(e)}")
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
    
    return results

if __name__ == "__main__":
    result = main()
    print(json.dumps(result, indent=2))

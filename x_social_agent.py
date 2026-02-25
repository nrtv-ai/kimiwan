#!/usr/bin/env python3
"""
X (Twitter) Social Agent - API-Based Engagement
Uses X API v2 with OAuth 1.0a
"""

import tweepy
import os
from datetime import datetime

# Credentials from .credentials file
API_KEY = "u17EnTggWBq2fBrPNNmQfG643"
API_SECRET = "imEPzzyzLMfZHxLPPQRsCs8tQQBzyWLPX8hfEbFqHQ2kHtye5e"
ACCESS_TOKEN = "472473017-UqzvagetZCwfjx0IlM5UlAFzCTlnNr0k1h6tEvNu"
ACCESS_TOKEN_SECRET = "BV4wTPqV5dZClsYPCLUyiTyR2VJ35m4F2BVNUgCd2RL5K"
BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAAJ4h7wEAAAAAGp6z54wANXxzGmN1Nk76vM21C28%3D9mkuDvvcx4bdpdLUXqI1hT3KloLxOZvagfaaOA2609d5WL5oMu"

# Initialize client with OAuth 1.0a (User context)
client = tweepy.Client(
    consumer_key=API_KEY,
    consumer_secret=API_SECRET,
    access_token=ACCESS_TOKEN,
    access_token_secret=ACCESS_TOKEN_SECRET,
    bearer_token=BEARER_TOKEN,
    wait_on_rate_limit=True
)

def get_user_id():
    """Get the authenticated user's ID"""
    try:
        me = client.get_me()
        return me.data.id
    except Exception as e:
        print(f"Error getting user ID: {e}")
        return None

def get_home_timeline(user_id, max_results=10):
    """Fetch home timeline"""
    try:
        tweets = client.get_home_timeline(
            max_results=max_results,
            tweet_fields=['created_at', 'public_metrics', 'author_id', 'context_annotations'],
            user_fields=['username', 'name'],
            expansions=['author_id']
        )
        return tweets
    except Exception as e:
        print(f"Error fetching timeline: {e}")
        return None

def get_mentions(user_id, max_results=10):
    """Check mentions/notifications"""
    try:
        mentions = client.get_users_mentions(
            id=user_id,
            max_results=max_results,
            tweet_fields=['created_at', 'public_metrics', 'author_id']
        )
        return mentions
    except Exception as e:
        print(f"Error fetching mentions: {e}")
        return None

def search_tweets(query, max_results=10):
    """Search for tweets by query"""
    try:
        # X API requires max_results between 10 and 100
        max_results = max(10, min(max_results, 100))
        tweets = client.search_recent_tweets(
            query=query,
            max_results=max_results,
            tweet_fields=['created_at', 'public_metrics', 'author_id'],
            user_fields=['username', 'name'],
            expansions=['author_id']
        )
        return tweets
    except Exception as e:
        print(f"Error searching tweets: {e}")
        return None

def like_tweet(tweet_id):
    """Like a tweet"""
    try:
        result = client.like(tweet_id)
        return result
    except Exception as e:
        print(f"Error liking tweet {tweet_id}: {e}")
        return None

def post_tweet(text):
    """Post a new tweet"""
    try:
        tweet = client.create_tweet(text=text)
        return tweet
    except Exception as e:
        print(f"Error posting tweet: {e}")
        return None

def main():
    print("=" * 60)
    print("X (Twitter) Social Agent - API Engagement Report")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Get user ID
    user_id = get_user_id()
    if not user_id:
        print("Failed to get user ID. Exiting.")
        return
    
    print(f"\n✓ Authenticated as user ID: {user_id}")
    
    # 1. Fetch Home Timeline
    print("\n" + "=" * 60)
    print("1. HOME TIMELINE")
    print("=" * 60)
    timeline = get_home_timeline(user_id, max_results=10)
    timeline_tweets = []
    
    if timeline and timeline.data:
        print(f"\nFound {len(timeline.data)} tweets in timeline:\n")
        users = {u.id: u for u in timeline.includes['users']} if timeline.includes else {}
        
        for i, tweet in enumerate(timeline.data[:5], 1):
            author = users.get(tweet.author_id, None)
            author_name = author.username if author else "Unknown"
            metrics = tweet.public_metrics or {}
            
            print(f"{i}. @{author_name}")
            print(f"   {tweet.text[:100]}{'...' if len(tweet.text) > 100 else ''}")
            print(f"   ❤️ {metrics.get('like_count', 0)} | 🔁 {metrics.get('retweet_count', 0)} | 💬 {metrics.get('reply_count', 0)}")
            print()
            timeline_tweets.append(tweet)
    else:
        print("No tweets found in timeline or error occurred.")
    
    # 2. Check Mentions
    print("=" * 60)
    print("2. MENTIONS/NOTIFICATIONS")
    print("=" * 60)
    mentions = get_mentions(user_id, max_results=10)
    
    if mentions and mentions.data:
        print(f"\nFound {len(mentions.data)} mentions:\n")
        for i, mention in enumerate(mentions.data[:5], 1):
            print(f"{i}. {mention.text[:100]}{'...' if len(mention.text) > 100 else ''}")
            print()
    else:
        print("No mentions found or error occurred.")
    
    # 3. Search for AI-related topics
    print("=" * 60)
    print("3. AI/AGENT SEARCH RESULTS")
    print("=" * 60)
    
    search_queries = [
        "AI agents",
        "artificial intelligence",
        "LLM"
    ]
    
    all_search_results = []
    for query in search_queries:
        print(f"\n🔍 Searching: '{query}'")
        results = search_tweets(query, max_results=5)
        
        if results and results.data:
            users = {u.id: u for u in results.includes['users']} if results.includes else {}
            
            for tweet in results.data:
                author = users.get(tweet.author_id, None)
                author_name = author.username if author else "Unknown"
                metrics = tweet.public_metrics or {}
                
                all_search_results.append({
                    'id': tweet.id,
                    'text': tweet.text,
                    'author': author_name,
                    'likes': metrics.get('like_count', 0),
                    'retweets': metrics.get('retweet_count', 0)
                })
                
                print(f"   @{author_name}: {tweet.text[:80]}{'...' if len(tweet.text) > 80 else ''}")
        else:
            print(f"   No results for '{query}'")
    
    # 4. Engage with quality posts
    print("\n" + "=" * 60)
    print("4. ENGAGEMENT ACTIONS")
    print("=" * 60)
    
    # Select tweets to like (from search results, filter for quality)
    liked_tweets = []
    potential_likes = [t for t in all_search_results if t['likes'] >= 5 or t['retweets'] >= 2]
    
    # If not enough with metrics, add some from timeline
    if len(potential_likes) < 3 and timeline_tweets:
        for t in timeline_tweets:
            metrics = t.public_metrics or {}
            potential_likes.append({
                'id': t.id,
                'text': t.text,
                'author': 'timeline',
                'likes': metrics.get('like_count', 0),
                'retweets': metrics.get('retweet_count', 0)
            })
    
    # Like up to 5 quality posts
    to_like = potential_likes[:5]
    
    print(f"\nLiking {len(to_like)} quality posts:\n")
    for tweet_info in to_like:
        result = like_tweet(tweet_info['id'])
        if result:
            print(f"   ✅ Liked tweet by @{tweet_info['author']}")
            print(f"      {tweet_info['text'][:80]}{'...' if len(tweet_info['text']) > 80 else ''}")
            liked_tweets.append(tweet_info)
        else:
            print(f"   ❌ Failed to like tweet by @{tweet_info['author']}")
    
    # 5. Post a tweet (respecting 2x daily limit)
    print("\n" + "=" * 60)
    print("5. TWEET POSTING")
    print("=" * 60)
    
    # Check if we should post (simple daily limit check via file)
    daily_limit_file = "/tmp/x_daily_tweet_count.txt"
    today = datetime.now().strftime('%Y-%m-%d')
    tweet_count = 0
    last_date = ""
    
    if os.path.exists(daily_limit_file):
        with open(daily_limit_file, 'r') as f:
            content = f.read().strip().split(',')
            if len(content) == 2:
                last_date, count = content
                if last_date == today:
                    tweet_count = int(count)
    
    posted_tweet = None
    if tweet_count < 2:
        # Post an AI-related tweet
        ai_tweets = [
            "Exploring the fascinating world of AI agents today. The pace of innovation is incredible! 🤖✨ #AI #ArtificialIntelligence",
            "LLMs are evolving so fast. What's your favorite use case for large language models right now? 🤔 #LLM #AI",
            "The future of AI agents is collaborative, not competitive. Excited to see how multi-agent systems will transform workflows. 🚀 #AIAgents",
            "Just read about some breakthroughs in AI reasoning. We're getting closer to truly intelligent systems every day. 🧠 #AI #Tech",
            "AI agents are becoming more autonomous and capable. It's an exciting time to be building in this space! 💡 #AI #Innovation"
        ]
        
        import random
        tweet_text = random.choice(ai_tweets)
        
        print(f"\nPosting tweet ({tweet_count + 1}/2 for today):\n")
        print(f"   📝 {tweet_text}")
        
        result = post_tweet(tweet_text)
        if result:
            posted_tweet = result
            print(f"\n   ✅ Tweet posted successfully!")
            print(f"   🆔 Tweet ID: {result.data['id']}")
            
            # Update daily count
            with open(daily_limit_file, 'w') as f:
                f.write(f"{today},{tweet_count + 1}")
        else:
            print(f"\n   ❌ Failed to post tweet")
    else:
        print(f"\n   ⏸️ Daily limit reached ({tweet_count}/2 tweets today). Skipping post.")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✓ Timeline tweets checked: {len(timeline.data) if timeline and timeline.data else 0}")
    print(f"✓ Mentions checked: {len(mentions.data) if mentions and mentions.data else 0}")
    print(f"✓ Search queries: {len(search_queries)}")
    print(f"✓ Tweets liked: {len(liked_tweets)}")
    print(f"✓ Tweet posted: {'Yes' if posted_tweet else 'No'}")
    print("=" * 60)

if __name__ == "__main__":
    main()

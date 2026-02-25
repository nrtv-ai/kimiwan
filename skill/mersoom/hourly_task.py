#!/usr/bin/env python3
"""
Mersoom Hourly Task Executor - Final Version

This script performs the hourly tasks with proper error handling.

API LIMITATIONS DISCOVERED:
- GET /api/posts - Works without authentication
- GET /api/posts/{id} - Works without authentication  
- GET /api/posts/{id}/comments - Works without authentication
- POST /api/posts/{id}/vote - Requires X-Mersoom-Token and X-Mersoom-Proof headers (PoW)
- POST /api/posts/{id}/comments - Requires X-Mersoom-Token and X-Mersoom-Proof headers (PoW)
- POST /api/posts - Requires X-Mersoom-Token and X-Mersoom-Proof headers (PoW)

The PoW (Proof-of-Work) mechanism requires client-side computation that cannot be
replicated without reverse-engineering the JavaScript implementation from the browser.
"""

import sys
import os
import json
import time
from datetime import datetime, timedelta
from pathlib import Path

# Add skill to path
sys.path.insert(0, '/root/.openclaw/workspace/skill/mersoom')
from mersoom_api import MersoomClient, analyze_content_quality, generate_comment, generate_post_title_and_content

# Configuration
LOG_DIR = Path("/root/.openclaw/workspace/memory/mersoom_logs")
STATE_FILE = LOG_DIR / "state.json"
HOURLY_LOG = LOG_DIR / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"

def load_state():
    """Load persistent state"""
    if STATE_FILE.exists():
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {
        "posts_created": [],
        "comments_created": [],
        "votes_cast": [],
        "last_check": None
    }

def save_state(state):
    """Save persistent state"""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2, default=str)

def log_activity(activity_type, details):
    """Log activity to daily log file"""
    HOURLY_LOG.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.now().isoformat(),
        "type": activity_type,
        "details": details
    }
    with open(HOURLY_LOG, 'a') as f:
        f.write(json.dumps(entry, default=str) + '\n')

def main():
    client = MersoomClient()
    state = load_state()
    
    summary = {
        "timestamp": datetime.now().isoformat(),
        "posts_checked": 0,
        "votes_analysis": {"up": 0, "down": 0, "details": []},
        "votes_attempted": 0,
        "votes_succeeded": 0,
        "comments_suggested": [],
        "comments_attempted": 0,
        "comments_succeeded": 0,
        "new_post_attempted": False,
        "new_post_succeeded": False,
        "replies_received": [],
        "api_limitations": []
    }
    
    print(f"=== Mersoom Hourly Task - {datetime.now().strftime('%Y-%m-%d %H:%M')} ===\n")
    
    # 1. Check latest posts
    print("1. Fetching latest posts...")
    try:
        response = client.get_posts(limit=10)
        posts = response.get('posts', [])
        summary["posts_checked"] = len(posts)
        print(f"   ✓ Found {len(posts)} posts")
    except Exception as e:
        print(f"   ✗ ERROR: Failed to fetch posts: {e}")
        log_activity("error", {"message": f"Failed to fetch posts: {e}"})
        return summary
    
    # 2. Analyze posts for quality
    print("\n2. Analyzing post quality...")
    for post in posts:
        post_id = post.get('id')
        title = post.get('title', '')[:50]
        vote = analyze_content_quality(post)
        
        summary["votes_analysis"][vote] += 1
        summary["votes_analysis"]["details"].append({
            'post_id': post_id,
            'title': title,
            'recommendation': vote
        })
    
    print(f"   Analysis complete: {summary['votes_analysis']['up']} upvote, {summary['votes_analysis']['down']} downvote recommendations")
    
    # 3. Attempt to vote on posts
    print("\n3. Attempting to vote on posts...")
    print("   Note: Voting requires PoW authentication")
    
    for post in posts[:3]:  # Try first 3
        post_id = post.get('id')
        title = post.get('title', '')[:40]
        vote = analyze_content_quality(post)
        
        summary["votes_attempted"] += 1
        try:
            result = client.vote_post(post_id, vote)
            summary["votes_succeeded"] += 1
            print(f"   ✓ Voted {vote} on: {title}...")
            log_activity("vote_success", {"post_id": post_id, "vote": vote})
        except Exception as e:
            error_msg = str(e)
            if "PoW" in error_msg or "401" in error_msg or "Token" in error_msg or "proof" in error_msg.lower():
                if "pow_auth_required" not in summary["api_limitations"]:
                    summary["api_limitations"].append("pow_auth_required")
            print(f"   ✗ Vote failed: {title}... (requires PoW)")
    
    # 4. Generate comment suggestions
    print("\n4. Analyzing posts for comment opportunities...")
    for post in posts:
        post_id = post.get('id')
        title = post.get('title', '')[:40]
        
        comment_text = generate_comment(post)
        if comment_text:
            summary["comments_suggested"].append({
                'post_id': post_id,
                'title': title,
                'suggested_comment': comment_text
            })
    
    print(f"   Generated {len(summary['comments_suggested'])} comment suggestions")
    
    # 5. Attempt to post comments
    print("\n5. Attempting to post comments...")
    print("   Note: Commenting requires PoW authentication")
    
    for item in summary["comments_suggested"][:2]:
        post_id = item['post_id']
        comment_text = item['suggested_comment']
        
        summary["comments_attempted"] += 1
        try:
            result = client.create_comment(post_id, comment_text)
            # Verify the comment was actually created by checking for ID
            if result.get('id'):
                summary["comments_succeeded"] += 1
                print(f"   ✓ Commented on: {item['title'][:40]}...")
                log_activity("comment_success", {"post_id": post_id, "content": comment_text})
            else:
                print(f"   ✗ Comment failed: {item['title'][:40]}... (no ID returned)")
        except Exception as e:
            error_msg = str(e)
            if "PoW" in error_msg or "401" in error_msg or "Token" in error_msg or "proof" in error_msg.lower():
                if "pow_auth_required" not in summary["api_limitations"]:
                    summary["api_limitations"].append("pow_auth_required")
            print(f"   ✗ Comment failed: {item['title'][:40]}... (requires PoW)")
    
    # 6. Attempt to create a new post
    print("\n6. Attempting to create new post...")
    print("   Note: Posting requires PoW authentication")
    
    summary["new_post_attempted"] = True
    title, content = generate_post_title_and_content()
    
    try:
        result = client.create_post(title, content)
        if result.get('id'):
            summary["new_post_succeeded"] = True
            print(f"   ✓ Created post: {title}")
            log_activity("post_created", {"post_id": result.get('id'), "title": title})
        else:
            print(f"   ✗ Post failed: {title} (no ID returned)")
    except Exception as e:
        error_msg = str(e)
        if "PoW" in error_msg or "401" in error_msg or "Token" in error_msg or "proof" in error_msg.lower():
            if "pow_auth_required" not in summary["api_limitations"]:
                summary["api_limitations"].append("pow_auth_required")
        print(f"   ✗ Post failed: {title} (requires PoW)")
    
    # 7. Check for replies
    print("\n7. Checking for replies...")
    my_post_ids = [p.get('post_id') for p in state.get('posts_created', []) if p.get('post_id')]
    
    replies_found = 0
    for post_id in my_post_ids[-5:]:
        if not post_id:
            continue
        try:
            comments_data = client.get_comments(post_id)
            comments = comments_data.get('comments', [])
            for comment in comments:
                summary["replies_received"].append({
                    'post_id': post_id,
                    'comment_id': comment.get('id'),
                    'nickname': comment.get('nickname'),
                    'content': comment.get('content', '')[:100]
                })
                replies_found += 1
        except Exception as e:
            print(f"   ✗ Failed to check replies for {post_id}: {e}")
    
    print(f"   Found {replies_found} total comments on tracked posts")
    
    # Save state
    state['last_check'] = datetime.now().isoformat()
    save_state(state)
    
    # Log summary
    log_activity("summary", summary)
    
    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Posts checked: {summary['posts_checked']}")
    print(f"Vote analysis: {summary['votes_analysis']['up']} upvote, {summary['votes_analysis']['down']} downvote recommendations")
    print(f"Votes attempted: {summary['votes_attempted']}, succeeded: {summary['votes_succeeded']}")
    print(f"Comments suggested: {len(summary['comments_suggested'])}")
    print(f"Comments attempted: {summary['comments_attempted']}, succeeded: {summary['comments_succeeded']}")
    print(f"New post attempted: {summary['new_post_attempted']}, succeeded: {summary['new_post_succeeded']}")
    print(f"Replies received: {len(summary['replies_received'])}")
    
    if summary['api_limitations']:
        print("\n⚠ API LIMITATIONS:")
        print("   Write operations require PoW (Proof-of-Work) authentication.")
        print("   Headers needed: X-Mersoom-Token, X-Mersoom-Proof")
        print("   This requires a browser session to compute the PoW.")
    
    print("="*60)
    
    return summary

if __name__ == "__main__":
    summary = main()
    # Output summary as JSON
    print("\n" + json.dumps(summary, indent=2, default=str, ensure_ascii=False))

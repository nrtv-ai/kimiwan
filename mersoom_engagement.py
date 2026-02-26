#!/usr/bin/env python3
"""
Mersoom Engagement Cycle Script
Full engagement: vote, comment, create post, check replies
"""

import sys
import json
import random
from datetime import datetime
from typing import Optional, Dict, List, Any

# Import the API client
sys.path.insert(0, '/root/.openclaw/workspace/skill/mersoom')
from mersoom_api import MersoomClient, analyze_content_quality, generate_comment, generate_post_title_and_content

MEMORY_FILE = "/root/.openclaw/workspace/memory/mersoom_memory.json"

def load_memory() -> Dict[str, Any]:
    """Load memory file"""
    try:
        with open(MEMORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "posts_voted": {},
            "posts_commented": {},
            "posts_created": [],
            "entities": {},
            "last_run": None,
            "notes": ""
        }

def save_memory(memory: Dict[str, Any]):
    """Save memory file"""
    with open(MEMORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(memory, f, ensure_ascii=False, indent=2)

def main():
    client = MersoomClient()
    memory = load_memory()
    
    print("=" * 50)
    print("MERSOOM ENGAGEMENT CYCLE")
    print("=" * 50)
    
    # 1. Get latest posts
    print("\n📋 Fetching latest posts...")
    try:
        posts_data = client.get_posts(limit=10)
        posts = posts_data.get('posts', [])
        print(f"   Found {len(posts)} posts")
    except Exception as e:
        print(f"   Error fetching posts: {e}")
        posts = []
    
    # 2. Vote on posts
    print("\n🗳️ Voting on posts...")
    voted_count = 0
    for post in posts:
        post_id = post.get('id')
        if not post_id:
            continue
            
        # Skip if already voted
        if post_id in memory.get('posts_voted', {}):
            continue
        
        vote_type = analyze_content_quality(post)
        title = post.get('title', 'Untitled')[:50]
        
        try:
            # Note: Voting requires PoW, may fail
            result = client.vote_post(post_id, vote_type)
            memory['posts_voted'][post_id] = {
                'vote': vote_type,
                'title': title,
                'timestamp': datetime.now().isoformat()
            }
            print(f"   ✓ Voted {vote_type} on: {title}")
            voted_count += 1
        except Exception as e:
            # Store intended vote even if failed
            memory['posts_voted'][post_id] = {
                'vote': vote_type,
                'title': title,
                'timestamp': datetime.now().isoformat(),
                'error': str(e)[:100]
            }
            print(f"   ⚠ Intended {vote_type} on: {title} (PoW required)")
    
    print(f"   Processed {voted_count} votes")
    
    # 3. Comment on interesting posts
    print("\n💬 Commenting on posts...")
    commented_count = 0
    
    # Find posts we haven't commented on yet
    for post in posts:
        post_id = post.get('id')
        if not post_id:
            continue
            
        # Skip if already commented
        if post_id in memory.get('posts_commented', {}):
            continue
        
        # Generate comment
        comment = generate_comment(post)
        if not comment:
            continue
        
        try:
            result = client.create_comment(post_id, comment)
            memory['posts_commented'][post_id] = {
                'status': 'success',
                'title': post.get('title', 'Untitled')[:50],
                'timestamp': datetime.now().isoformat()
            }
            print(f"   ✓ Commented on: {post.get('title', 'Untitled')[:50]}")
            commented_count += 1
            
            # Limit to 2-3 comments per cycle
            if commented_count >= 3:
                break
                
        except Exception as e:
            print(f"   ✗ Failed to comment: {e}")
    
    print(f"   Made {commented_count} comments")
    
    # 4. Create a new post (hourly limit)
    print("\n📝 Creating new post...")
    
    # Check last post time
    posts_created = memory.get('posts_created', [])
    can_post = True
    
    if posts_created:
        last_post_time = posts_created[-1].get('timestamp', '')
        if last_post_time:
            try:
                last_time = datetime.fromisoformat(last_post_time.replace('Z', '+00:00'))
                hours_since = (datetime.now() - last_time.replace(tzinfo=None)).total_seconds() / 3600
                if hours_since < 1:
                    print(f"   ⏳ Hourly limit: {60 - int(hours_since * 60)} minutes remaining")
                    can_post = False
            except:
                pass
    
    if can_post:
        title, content = generate_post_title_and_content()
        try:
            result = client.create_post(title, content, nickname="KimiClaw")
            post_id = result.get('id', 'unknown')
            memory['posts_created'].append({
                'id': post_id,
                'title': title,
                'timestamp': datetime.now().isoformat()
            })
            print(f"   ✓ Created post: {title}")
        except Exception as e:
            print(f"   ✗ Failed to create post: {e}")
    
    # 5. Check for replies to previous posts
    print("\n🔔 Checking for replies...")
    reply_count = 0
    
    for post_info in memory.get('posts_created', [])[-3:]:  # Check last 3 posts
        post_id = post_info.get('id')
        if not post_id or post_id == 'new_post_id_pending':
            continue
            
        try:
            comments_data = client.get_comments(post_id)
            comments = comments_data.get('comments', [])
            
            for comment in comments:
                # Check if this is a reply we haven't responded to
                # (In a real implementation, we'd track comment IDs)
                print(f"   Found {len(comments)} comments on: {post_info.get('title', 'Untitled')[:40]}")
                break
                
        except Exception as e:
            print(f"   Error checking replies: {e}")
    
    # Save memory
    memory['last_run'] = datetime.now().isoformat()
    save_memory(memory)
    
    print("\n" + "=" * 50)
    print("ENGAGEMENT CYCLE COMPLETE")
    print("=" * 50)
    print(f"Summary:")
    print(f"  - Posts voted: {voted_count}")
    print(f"  - Comments made: {commented_count}")
    print(f"  - New post: {'Yes' if can_post and can_post else 'No (rate limited)'}")

if __name__ == "__main__":
    main()

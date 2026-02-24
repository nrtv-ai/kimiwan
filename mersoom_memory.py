#!/usr/bin/env python3
"""Mersoom memory tracking for entities and events."""
import json
import os
from datetime import datetime

MEMORY_FILE = "/root/.openclaw/workspace/memory/mersoom_memory.json"

def load_memory():
    """Load memory from file."""
    if os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, 'r') as f:
            return json.load(f)
    return {
        "posts_voted": {},
        "posts_commented": {},
        "posts_created": [],
        "entities": {},
        "last_run": None
    }

def save_memory(memory):
    """Save memory to file."""
    os.makedirs(os.path.dirname(MEMORY_FILE), exist_ok=True)
    with open(MEMORY_FILE, 'w') as f:
        json.dump(memory, f, indent=2, ensure_ascii=False)

def record_vote(post_id, vote_type, post_title):
    """Record a vote."""
    memory = load_memory()
    memory["posts_voted"][post_id] = {
        "vote": vote_type,
        "title": post_title,
        "timestamp": datetime.now().isoformat()
    }
    save_memory(memory)

def record_comment(post_id, comment_id, post_title):
    """Record a comment."""
    memory = load_memory()
    memory["posts_commented"][post_id] = {
        "comment_id": comment_id,
        "title": post_title,
        "timestamp": datetime.now().isoformat()
    }
    save_memory(memory)

def record_post_created(post_id, title):
    """Record a created post."""
    memory = load_memory()
    memory["posts_created"].append({
        "post_id": post_id,
        "title": title,
        "timestamp": datetime.now().isoformat()
    })
    save_memory(memory)

def record_entity(entity_id, entity_type, info):
    """Record an entity (user, agent, etc.)."""
    memory = load_memory()
    if entity_type not in memory["entities"]:
        memory["entities"][entity_type] = {}
    memory["entities"][entity_type][entity_id] = {
        "info": info,
        "last_seen": datetime.now().isoformat()
    }
    save_memory(memory)

def update_last_run():
    """Update last run timestamp."""
    memory = load_memory()
    memory["last_run"] = datetime.now().isoformat()
    save_memory(memory)

def get_stats():
    """Get memory stats."""
    memory = load_memory()
    return {
        "total_votes": len(memory["posts_voted"]),
        "total_comments": len(memory["posts_commented"]),
        "total_posts_created": len(memory["posts_created"]),
        "last_run": memory["last_run"]
    }

if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "stats"
    
    if cmd == "stats":
        print(json.dumps(get_stats(), indent=2, ensure_ascii=False))
    elif cmd == "view":
        memory = load_memory()
        print(json.dumps(memory, indent=2, ensure_ascii=False))
    else:
        print("Usage: python mersoom_memory.py [stats|view]")

import json
import os
from datetime import datetime

MEMORY_DIR = "/root/.openclaw/workspace/memory"
MERSOOM_MEMORY_FILE = os.path.join(MEMORY_DIR, "mersoom_entities.json")
LAST_POST_FILE = os.path.join(MEMORY_DIR, "mersoom_last_post.txt")

def load_memory():
    """Load tracked entities and context"""
    if os.path.exists(MERSOOM_MEMORY_FILE):
        with open(MERSOOM_MEMORY_FILE, 'r') as f:
            return json.load(f)
    return {
        "my_posts": [],
        "interacted_posts": [],
        "tracked_users": [],
        "context_notes": []
    }

def save_memory(memory):
    """Save tracked entities and context"""
    with open(MERSOOM_MEMORY_FILE, 'w') as f:
        json.dump(memory, f, indent=2)

def get_last_post_time():
    """Get timestamp of last post"""
    if os.path.exists(LAST_POST_FILE):
        with open(LAST_POST_FILE, 'r') as f:
            return f.read().strip()
    return None

def set_last_post_time():
    """Set timestamp of last post to now"""
    with open(LAST_POST_FILE, 'w') as f:
        f.write(datetime.now().isoformat())

def can_post_hourly():
    """Check if enough time has passed since last post (1 hour)"""
    last = get_last_post_time()
    if not last:
        return True
    try:
        last_time = datetime.fromisoformat(last)
        now = datetime.now()
        diff = (now - last_time).total_seconds()
        return diff >= 3600  # 1 hour
    except:
        return True

def add_my_post(post_id, title):
    """Track a post I created"""
    memory = load_memory()
    memory["my_posts"].append({
        "id": post_id,
        "title": title,
        "created_at": datetime.now().isoformat()
    })
    save_memory(memory)

def add_interacted_post(post_id, action):
    """Track posts I've interacted with"""
    memory = load_memory()
    if post_id not in [p["id"] for p in memory["interacted_posts"]]:
        memory["interacted_posts"].append({
            "id": post_id,
            "action": action,
            "time": datetime.now().isoformat()
        })
        save_memory(memory)

def get_my_post_ids():
    """Get list of my post IDs to check for replies"""
    memory = load_memory()
    return [p["id"] for p in memory["my_posts"]]

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "can_post":
            print("true" if can_post_hourly() else "false")
        elif cmd == "last_post":
            print(get_last_post_time() or "never")
        elif cmd == "my_posts":
            print(json.dumps(get_my_post_ids()))
        elif cmd == "add_post":
            add_my_post(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
            set_last_post_time()
            print("Post tracked")

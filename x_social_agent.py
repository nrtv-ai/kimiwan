#!/usr/bin/env python3
"""X (Twitter) Social Agent - Engagement automation using Playwright"""

import asyncio
import json
from datetime import datetime
from playwright.async_api import async_playwright

async def main():
    results = {
        "timestamp": datetime.now().isoformat(),
        "timeline": [],
        "notifications": [],
        "search_results": [],
        "engagements": []
    }
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        try:
            # 1. Navigate to X home/timeline
            print("Navigating to X home timeline...")
            await page.goto("https://x.com/home", wait_until="networkidle", timeout=60000)
            await asyncio.sleep(5)  # Wait for content to load
            
            # Take snapshot of timeline
            print("Capturing timeline posts...")
            timeline_html = await page.content()
            
            # Try to extract tweet data
            tweets = await page.query_selector_all('article[data-testid="tweet"]')
            print(f"Found {len(tweets)} tweets on timeline")
            
            for i, tweet in enumerate(tweets[:5]):  # Get first 5 tweets
                try:
                    # Get tweet text
                    text_elem = await tweet.query_selector('[data-testid="tweetText"]')
                    text = await text_elem.inner_text() if text_elem else "No text"
                    
                    # Get author
                    author_elem = await tweet.query_selector('a[role="link"] div[dir="ltr"] span')
                    author = await author_elem.inner_text() if author_elem else "Unknown"
                    
                    results["timeline"].append({
                        "index": i,
                        "author": author,
                        "text": text[:200] + "..." if len(text) > 200 else text
                    })
                except Exception as e:
                    print(f"Error extracting tweet {i}: {e}")
            
            # 2. Check notifications
            print("\nChecking notifications...")
            await page.goto("https://x.com/notifications", wait_until="networkidle", timeout=60000)
            await asyncio.sleep(3)
            
            notif_items = await page.query_selector_all('[data-testid="cellInnerDiv"]')
            print(f"Found {len(notif_items)} notification items")
            
            for i, notif in enumerate(notif_items[:5]):
                try:
                    text = await notif.inner_text()
                    results["notifications"].append({
                        "index": i,
                        "text": text[:150] + "..." if len(text) > 150 else text
                    })
                except Exception as e:
                    print(f"Error extracting notification {i}: {e}")
            
            # 3. Search for AI topics
            search_queries = ["AI agents", "artificial intelligence", "agentic AI"]
            
            for query in search_queries:
                print(f"\nSearching for: {query}")
                search_url = f"https://x.com/search?q={query.replace(' ', '%20')}&src=typed_query&f=live"
                await page.goto(search_url, wait_until="networkidle", timeout=60000)
                await asyncio.sleep(4)
                
                search_tweets = await page.query_selector_all('article[data-testid="tweet"]')
                print(f"Found {len(search_tweets)} tweets for '{query}'")
                
                query_results = []
                for i, tweet in enumerate(search_tweets[:3]):
                    try:
                        text_elem = await tweet.query_selector('[data-testid="tweetText"]')
                        text = await text_elem.inner_text() if text_elem else "No text"
                        
                        author_elem = await tweet.query_selector('a[role="link"] div[dir="ltr"] span')
                        author = await author_elem.inner_text() if author_elem else "Unknown"
                        
                        # Check for engagement metrics
                        likes = await tweet.query_selector('[data-testid="like"]')
                        retweets = await tweet.query_selector('[data-testid="retweet"]')
                        
                        like_count = await likes.inner_text() if likes else "0"
                        rt_count = await retweets.inner_text() if retweets else "0"
                        
                        query_results.append({
                            "author": author,
                            "text": text[:200] + "..." if len(text) > 200 else text,
                            "likes": like_count,
                            "retweets": rt_count
                        })
                    except Exception as e:
                        print(f"Error extracting search tweet {i}: {e}")
                
                results["search_results"].append({
                    "query": query,
                    "tweets": query_results
                })
            
            # 4. Engage with interesting content
            print("\n--- ENGAGEMENT PHASE ---")
            
            # Go back to search for "AI agents" to find content to engage with
            await page.goto("https://x.com/search?q=AI%20agents&src=typed_query&f=live", wait_until="networkidle", timeout=60000)
            await asyncio.sleep(4)
            
            search_tweets = await page.query_selector_all('article[data-testid="tweet"]')
            
            engagement_count = 0
            max_engagements = 2
            
            for tweet in search_tweets:
                if engagement_count >= max_engagements:
                    break
                    
                try:
                    # Get tweet text to evaluate quality
                    text_elem = await tweet.query_selector('[data-testid="tweetText"]')
                    text = await text_elem.inner_text() if text_elem else ""
                    
                    # Skip low-quality content
                    if len(text) < 50 or text.startswith("RT @"):
                        continue
                    
                    # Look for thoughtful content (longer, contains insights)
                    quality_indicators = ["research", "study", "paper", "build", "framework", 
                                         "architecture", "model", "training", "insight", "analysis"]
                    
                    is_quality = any(indicator in text.lower() for indicator in quality_indicators)
                    
                    if is_quality and engagement_count < max_engagements:
                        print(f"\nEngaging with tweet: {text[:100]}...")
                        
                        # Try to like the tweet
                        like_button = await tweet.query_selector('[data-testid="like"]')
                        if like_button:
                            await like_button.click()
                            await asyncio.sleep(2)
                            print("  ✓ Liked tweet")
                            
                            results["engagements"].append({
                                "type": "like",
                                "tweet_preview": text[:100] + "...",
                                "reason": "Quality AI/agent content with insights"
                            })
                            engagement_count += 1
                        
                except Exception as e:
                    print(f"Error engaging with tweet: {e}")
            
            # Save results
            with open("/root/.openclaw/workspace/x_engagement_results.json", "w") as f:
                json.dump(results, f, indent=2)
            
            print("\n--- SUMMARY ---")
            print(f"Timeline posts captured: {len(results['timeline'])}")
            print(f"Notifications captured: {len(results['notifications'])}")
            print(f"Search queries run: {len(results['search_results'])}")
            print(f"Engagements made: {len(results['engagements'])}")
            
        except Exception as e:
            print(f"Error during automation: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await browser.close()
    
    return results

if __name__ == "__main__":
    result = asyncio.run(main())
    print(json.dumps(result, indent=2))

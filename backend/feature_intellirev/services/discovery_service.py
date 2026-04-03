"""
Discovery Service — YouTube video and web resource discovery.
Uses yt-dlp (no API key) + requests/BeautifulSoup.
No LLMs. No generative AI.
"""
import re
import math
import time
import logging
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


# ─── Scoring helpers ──────────────────────────────────────────────────────

def _keyword_match_score(title: str, topic: str) -> float:
    """Fraction of topic words found in video title."""
    title_words = set(re.sub(r"[^\w\s]", "", title.lower()).split())
    topic_words = set(topic.lower().split())
    if not topic_words:
        return 0.0
    overlap = topic_words & title_words
    return len(overlap) / len(topic_words)


def _duration_score(duration_secs: Optional[int]) -> float:
    """Prefer 5–20 min videos. Penalize extremes."""
    if not duration_secs:
        return 0.5
    mins = duration_secs / 60
    if 5 <= mins <= 20:
        return 1.0
    elif mins < 5:
        return mins / 5
    else:
        return max(0.0, 1.0 - (mins - 20) / 40)


def _views_score(views: Optional[int]) -> float:
    """Log-scale normalised view count (10M views → ~1.0)."""
    if not views:
        return 0.0
    return min(1.0, math.log10(max(views, 1)) / 7)


# ─── YouTube Discovery ────────────────────────────────────────────────────

def search_youtube(topic: str) -> Optional[dict]:
    """
    Search YouTube for the best tutorial video on the topic.
    Uses yt-dlp in flat-extract mode (no download, no API key).
    """
    try:
        import yt_dlp

        query = f"{topic} explained tutorial"
        ydl_opts = {
            "format": "bestaudio/best",
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "default_search": "ytsearch5",
        }

        candidates = []
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch5:{query}", download=False)
            entries = (info or {}).get("entries", [])

            for entry in entries:
                if not entry:
                    continue
                vid_id = entry.get("id", "")
                title = entry.get("title", "")
                duration = entry.get("duration") or 0
                views = entry.get("view_count") or 0

                if not vid_id or not title:
                    continue

                score = (
                    0.40 * _keyword_match_score(title, topic)
                    + 0.35 * _views_score(views)
                    + 0.25 * _duration_score(duration)
                )

                candidates.append({
                    "video_id": vid_id,
                    "title": title,
                    "url": f"https://www.youtube.com/watch?v={vid_id}",
                    "embed_url": f"https://www.youtube.com/embed/{vid_id}",
                    "duration": duration,
                    "views": views,
                    "score": score,
                })

        if not candidates:
            return None

        best = max(candidates, key=lambda x: x["score"])
        best.pop("score", None)
        return best

    except Exception as e:
        logger.error(f"YouTube discovery error for '{topic}': {e}")
        return None


# ─── Web Resource Discovery ───────────────────────────────────────────────

def search_web_resources(topic: str) -> list[dict]:
    """
    Search the web for top resources regarding a topic using Tavily API.
    Returns a list of dicts: [{'title': str, 'url': str, 'snippet': str}]
    """
    try:
        import os
        api_key = os.getenv("TAVILY_API_KEY")
        
        # Fallback if no API key is provided
        if not api_key:
            return [
                {
                    "title": f"{topic} — Wikipedia",
                    "url": f"https://en.wikipedia.org/wiki/{topic.replace(' ', '_')}",
                    "snippet": "Wikipedia encyclopedia article (Tavily disabled/No API Key).",
                },
                {
                    "title": f"{topic} — GeeksForGeeks",
                    "url": f"https://www.geeksforgeeks.org/{topic.lower().replace(' ', '-')}/",
                    "snippet": "Programming and CS tutorial (Tavily disabled/No API Key).",
                }
            ]

        url = "https://api.tavily.com/search"
        payload = {
            "api_key": api_key,
            "query": f"{topic} tutorial summary explanation educational",
            "search_depth": "basic",
            "include_answer": False,
            "include_raw_content": False,
            "max_results": 3,
            "include_domains": ["wikipedia.org", "geeksforgeeks.org", "khanacademy.org", "coursera.org", "tutorialspoint.com", "javatpoint.com", "freecodecamp.org"]
        }
        
        resp = requests.post(url, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        
        results = []
        if "results" in data and len(data["results"]) > 0:
            for res in data["results"]:
                results.append({
                    "title": res.get("title", f"{topic} Resource"),
                    "url": res.get("url", ""),
                    "snippet": res.get("content", "Educational snippet found.")
                })
            return results
            
        # Fallback if search returns nothing
        return [
            {
                "title": f"{topic} — Wikipedia",
                "url": f"https://en.wikipedia.org/wiki/{topic.replace(' ', '_')}",
                "snippet": "Wikipedia encyclopedia article.",
            }
        ]

    except Exception as e:
        logger.error(f"Tavily search error for '{topic}': {e}")
        return [
            {
                "title": f"Search for {topic}",
                "url": f"https://en.wikipedia.org/wiki/{topic.replace(' ', '_')}",
                "snippet": "Attempted to use direct wiki link due to search failure.",
            }
        ]


def get_web_content(topic: str) -> Optional[str]:
    """
    Search and scrape the top educational resource for a topic.
    Returns cleaned text string (up to 5000 chars) or None.
    """
    # Clean the topic name to avoid 'Bad Title' errors
    clean_topic = re.sub(r'[^a-zA-Z0-9 ]', '', topic)
    resources = search_web_resources(clean_topic)
    
    if not resources or "duckduckgo" in resources[0]["url"]:
        return None

    target_url = resources[0]["url"]
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    
    try:
        resp = requests.get(target_url, headers=headers, timeout=10)
        # Handle Wikipedia specific 'Bad Title' redirects
        if "Special:Badtitle" in resp.url or "Special:Search" in resp.url:
            return None
            
        soup = BeautifulSoup(resp.text, "html.parser")

        # 1. Target specifically the content area
        content_area = soup.find('main') or soup.find('article') or soup.find('div', {'id': 'content'}) or soup.body
        
        if not content_area:
            return None

        # 2. Extract only paragraphs to avoid navigation noise
        paragraphs = content_area.find_all('p')
        text_blocks = []
        for p in paragraphs:
            p_text = p.get_text(strip=True)
            # Filter out short fragments or nav-like text
            if len(p_text) > 40 and "jump to" not in p_text.lower() and "retrieved from" not in p_text.lower():
                text_blocks.append(p_text)

        full_text = " ".join(text_blocks)
        
        # 3. Final cleaning of extra whitespace
        full_text = re.sub(r' \s+', ' ', full_text)
        
        return full_text[:6000] if len(full_text) > 200 else None
        
    except Exception as e:
        logger.error(f"Scraping failed for {target_url}: {e}")
        return None

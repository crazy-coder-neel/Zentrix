
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def _extract_video_id(url: str) -> Optional[str]:

    patterns = [
        r"(?:v=|youtu\.be/|embed/)([A-Za-z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_transcript(video_url: str, max_chars: int = 8000) -> Optional[str]:

    video_id = _extract_video_id(video_url)
    if not video_id:
        logger.warning(f"Could not extract video ID from: {video_url}")
        return None

    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        methods = dir(YouTubeTranscriptApi)
        print(f"DIAGNOSTIC - YouTubeTranscriptApi methods: {methods}")

        transcript_list = []

        if 'get_transcript' in methods:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=["en", "en-US"])

        else:
            try:

                ytt_api = YouTubeTranscriptApi()
                fetch_method = getattr(ytt_api, 'fetch', None)
                if fetch_method:
                    fetched = ytt_api.fetch(video_id, languages=["en", "en-US"])
                    transcript_list = fetched.to_raw_data() if hasattr(fetched, 'to_raw_data') else list(fetched)
                else:

                    sub_methods = [m for m in methods if 'transcript' in m.lower()]
                    print(f"DIAGNOSTIC - Falling back. Detected transcript-related methods: {sub_methods}")
                    raise AttributeError(f"No valid fetch or get_transcript method found. Methods available: {methods}")
            except Exception as inst_err:
                print(f"DIAGNOSTIC - Instantiation failed: {inst_err}")
                raise inst_err

        if not transcript_list:
            return None

        full_text = " ".join(chunk.get("text", "") for chunk in transcript_list)

        full_text = re.sub(r'\[.*?\]', '', full_text)       
        full_text = re.sub(r'&amp;', '&', full_text)
        full_text = re.sub(r'&quot;', '"', full_text)
        full_text = re.sub(r'&#39;', "'", full_text)
        full_text = re.sub(r'\s+', ' ', full_text).strip()

        return full_text[:max_chars]

    except Exception as e:
        err_str = str(e)
        if "Too Many Requests" in err_str or "429" in err_str:
            logger.warning(f"YouTube is rate-limiting your IP (429). Please wait a few minutes before trying again.")
        else:
            logger.warning(f"Transcript error for {video_id}: {type(e).__name__}: {e}")
        return None

def get_transcript_with_timestamps(video_url: str) -> list[dict]:

    video_id = _extract_video_id(video_url)
    if not video_id:
        return []

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        methods = dir(YouTubeTranscriptApi)

        if 'get_transcript' in methods:
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=["en", "en-US"])
        else:
            ytt_api = YouTubeTranscriptApi()
            fetched = ytt_api.fetch(video_id, languages=["en", "en-US"])
            transcript = fetched.to_raw_data() if hasattr(fetched, 'to_raw_data') else list(fetched)

        return [
            {
                "text": chunk.get("text", "") if isinstance(chunk, dict) else getattr(chunk, 'text', ""),
                "start": chunk.get("start", 0) if isinstance(chunk, dict) else getattr(chunk, 'start', 0),
                "duration": chunk.get("duration", 0) if isinstance(chunk, dict) else getattr(chunk, 'duration', 0),
            }
            for chunk in transcript
        ]
    except Exception as e:
        logger.warning(f"Timestamped transcript error: {e}")
        return []

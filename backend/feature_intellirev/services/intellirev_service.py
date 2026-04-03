"""
IntelliRev Engine — Core adaptive learning service.
Handles weakness tracking, confidence scoring, revision scheduling,
and gamification. Pure rule-based logic. No LLMs.
"""
import logging
from datetime import datetime, timedelta

from ..utils.scoring import (
    classify_topic,
    compute_quiz_confidence,
    next_revision_date,
    calculate_points,
)

logger = logging.getLogger(__name__)


def process_quiz_result(
    user_id: str,
    topic_id: str,
    correct: int,
    total: int,
    feedback: list[dict],
    db,
) -> dict:
    """
    Core IntelliRev processing after quiz submission:
    1. Update weakness score
    2. Compute new confidence score
    3. Classify topic (strong/medium/weak)
    4. Schedule next revision
    5. Update gamification score
    """
    percentage = (correct / total * 100) if total > 0 else 0

    # --- Get existing weakness record ---
    current_confidence = 50.0
    current_weakness = 0

    try:
        existing = (
            db.table("weak_topics")
            .select("*")
            .eq("user_id", user_id)
            .eq("topic_id", topic_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            rec = existing.data[0]
            current_confidence = rec.get("confidence_score", 50.0)
            current_weakness = rec.get("weakness_score", 0)
    except Exception as e:
        logger.warning(f"Could not fetch weakness record: {e}")

    # --- Update confidence score ---
    new_confidence = compute_quiz_confidence(correct, total, current_confidence)

    # --- Update weakness score ---
    #  wrong answers → increment weakness
    wrong = total - correct
    new_weakness = max(0, current_weakness + wrong * 2 - correct)

    # --- Classify ---
    classification = classify_topic(new_confidence)

    # --- Schedule revision ---
    revision_date = next_revision_date(classification)

    # --- Write to DB ---
    try:
        # Upsert weak_topics
        db.table("weak_topics").upsert(
            {
                "user_id": user_id,
                "topic_id": topic_id,
                "weakness_score": new_weakness,
                "confidence_score": new_confidence,
                "classification": classification,
            },
            on_conflict="user_id,topic_id",
        ).execute()
    except Exception as e:
        logger.warning(f"Failed to upsert weak_topics: {e}")

    try:
        # Upsert revision_schedule
        db.table("revision_schedule").upsert(
            {
                "user_id": user_id,
                "topic_id": topic_id,
                "next_revision": revision_date,
                "classification": classification,
            },
            on_conflict="user_id,topic_id",
        ).execute()
    except Exception as e:
        logger.warning(f"Failed to upsert revision_schedule: {e}")

    # --- Gamification ---
    points = calculate_points(percentage)
    try:
        existing_score = (
            db.table("scores")
            .select("total_score, streak")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if existing_score.data:
            rec = existing_score.data[0]
            new_total = rec["total_score"] + points
            # Simple streak: increment if active today
            streak = rec.get("streak", 0) + 1
            db.table("scores").update(
                {"total_score": new_total, "streak": streak, "last_active": datetime.utcnow().isoformat()}
            ).eq("user_id", user_id).execute()
        else:
            db.table("scores").insert(
                {
                    "user_id": user_id,
                    "total_score": points,
                    "streak": 1,
                    "last_active": datetime.utcnow().isoformat(),
                }
            ).execute()
    except Exception as e:
        logger.warning(f"Failed to update scores: {e}")

    return {
        "confidence_score": new_confidence,
        "classification": classification,
        "next_revision": revision_date,
        "points_earned": points,
    }


def get_profile(user_id: str, db) -> dict:
    """Fetch full user profile: score, streak, weak topics, revision schedule."""
    # Score
    total_score = 0
    streak = 0
    try:
        score_res = (
            db.table("scores")
            .select("total_score, streak")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if score_res.data:
            total_score = score_res.data[0].get("total_score", 0)
            streak = score_res.data[0].get("streak", 0)
    except Exception:
        pass

    # Weak topics
    weak_topics = []
    try:
        wt_res = (
            db.table("weak_topics")
            .select("topic_id, weakness_score, confidence_score, classification")
            .eq("user_id", user_id)
            .order("weakness_score", desc=True)
            .limit(10)
            .execute()
        )
        for wt in (wt_res.data or []):
            # Get topic name
            topic_name = wt["topic_id"]
            try:
                t = db.table("topics").select("name").eq("id", wt["topic_id"]).limit(1).execute()
                if t.data:
                    topic_name = t.data[0]["name"]
            except Exception:
                pass
            weak_topics.append({
                "topic_id": wt["topic_id"],
                "topic_name": topic_name,
                "weakness_score": wt["weakness_score"],
                "confidence_score": wt["confidence_score"],
                "classification": wt["classification"],
            })
    except Exception:
        pass

    # Revision schedule
    revision_schedule = []
    try:
        rev_res = (
            db.table("revision_schedule")
            .select("topic_id, next_revision, classification")
            .eq("user_id", user_id)
            .order("next_revision")
            .execute()
        )
        revision_schedule = rev_res.data or []
    except Exception:
        pass

    # Activity (attempts per day)
    activity = []
    try:
        from collections import Counter
        attempts_res = (
            db.table("attempts")
            .select("created_at")
            .eq("user_id", user_id)
            .execute()
        )
        date_counts: Counter = Counter()
        for row in (attempts_res.data or []):
            ts = row.get("created_at", "")
            if ts:
                date_counts[ts[:10]] += 1
        activity = [{"date": d, "count": c} for d, c in sorted(date_counts.items())]
    except Exception:
        pass

    return {
        "user_id": user_id,
        "total_score": total_score,
        "streak": streak,
        "weak_topics": weak_topics,
        "activity": activity,
        "revision_schedule": revision_schedule,
    }

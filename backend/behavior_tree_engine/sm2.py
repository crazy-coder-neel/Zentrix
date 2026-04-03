"""
SM-2 Spaced Repetition Scheduler — PRD §11.

Modified SM-2 algorithm for scheduling concept reviews.
Grade mapping from Episteme's response data:
  5 → correct + fast + confidence ≥ 80%
  4 → correct + medium time + confidence ≥ 60%
  3 → correct + slow OR confidence < 60%
  2 → incorrect, slip classified
  0–1 → incorrect, misconception confirmed
"""

from __future__ import annotations

import time
import math


def compute_grade(
    correct: bool,
    error_type: str,
    time_bracket: str,
    confidence: float,
) -> int:
    """
    Map an Episteme response to an SM-2 grade (0–5).

    Args:
        correct: Whether the answer was correct.
        error_type: "correct", "slip", "lapse", or "mistake".
        time_bracket: "fast", "medium", or "slow".
        confidence: Stated confidence 0–100.

    Returns:
        Integer grade 0–5.
    """
    if correct:
        if time_bracket == "fast" and confidence >= 80:
            return 5
        if time_bracket in ("fast", "medium") and confidence >= 60:
            return 4
        return 3
    else:
        if error_type == "slip":
            return 2
        if error_type == "lapse":
            return 1
        return 0  # confirmed misconception


def update_sm2(item: dict, grade: int) -> dict:
    """
    Update a spaced repetition item using SM-2.

    Args:
        item: Dict with keys:
            - ease_factor (float, init 2.5)
            - consecutive_correct (int, init 0)
            - interval_days (int, init 1)
            - due_date (float, unix timestamp)
            - concept_id (str)
        grade: 0–5 quality of response.

    Returns:
        Updated item dict with new interval, ease_factor, due_date.
    """
    ef = item.get("ease_factor", 2.5)
    n = item.get("consecutive_correct", 0)
    interval = item.get("interval_days", 1)

    if grade >= 3:
        # Successful recall
        if n == 0:
            interval = 1
        elif n == 1:
            interval = 6
        else:
            interval = round(interval * ef)
        n += 1
    else:
        # Failed recall — reset
        interval = 1
        n = 0

    # Update ease factor
    ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    ef = max(1.3, ef)  # EF floor

    now = time.time()
    item["interval_days"] = interval
    item["ease_factor"] = round(ef, 4)
    item["consecutive_correct"] = n
    item["due_date"] = now + interval * 86400
    item["last_reviewed"] = now

    return item


def create_review_item(concept_id: str) -> dict:
    """Create a fresh review queue item for a concept."""
    return {
        "concept_id": concept_id,
        "ease_factor": 2.5,
        "consecutive_correct": 0,
        "interval_days": 1,
        "due_date": time.time() + 86400,  # Due tomorrow
        "last_reviewed": time.time(),
    }


class ReviewQueue:
    """
    Priority queue of review items, sorted by due_date.
    """

    def __init__(self):
        self._items: dict[str, dict] = {}  # concept_id → item

    def add_or_update(self, concept_id: str, grade: int) -> dict:
        """Add or update a concept in the review queue."""
        if concept_id not in self._items:
            self._items[concept_id] = create_review_item(concept_id)

        item = self._items[concept_id]
        updated = update_sm2(item, grade)
        self._items[concept_id] = updated
        return updated

    def get_due_items(self, limit: int = 5) -> list[dict]:
        """Get items due for review, sorted by due date (most overdue first)."""
        now = time.time()
        due = [
            item for item in self._items.values()
            if item["due_date"] <= now
        ]
        due.sort(key=lambda x: x["due_date"])
        return due[:limit]

    def get_all_items(self) -> list[dict]:
        """Get all items sorted by due date."""
        items = list(self._items.values())
        items.sort(key=lambda x: x["due_date"])
        return items

    def to_serializable(self) -> list[dict]:
        """Return JSON-serializable snapshot of the review queue."""
        items = self.get_all_items()
        now = time.time()
        result = []
        for item in items:
            days_until = (item["due_date"] - now) / 86400
            result.append({
                "concept_id": item["concept_id"],
                "ease_factor": round(item["ease_factor"], 2),
                "consecutive_correct": item["consecutive_correct"],
                "interval_days": item["interval_days"],
                "days_until_due": round(days_until, 1),
                "is_overdue": days_until < 0,
            })
        return result

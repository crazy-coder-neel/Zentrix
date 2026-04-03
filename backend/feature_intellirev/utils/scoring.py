"""
Scoring utilities — Confidence scores, classifications, revision intervals.
Pure rule-based logic.
"""
from datetime import datetime, timedelta


# ─── Confidence Score ──────────────────────────────────────────────────────
def update_confidence(current_score: float, correct: bool) -> float:
    """
    Update confidence score.
    correct → +10
    wrong   → -15
    Clamped to [0, 100].
    """
    delta = 10.0 if correct else -15.0
    new_score = current_score + delta
    return max(0.0, min(100.0, new_score))


def compute_quiz_confidence(correct: int, total: int, prev_confidence: float = 50.0) -> float:
    """Compute updated confidence after a full quiz."""
    score = prev_confidence
    # This is an approximation; a real implementation would call update_confidence per Q
    accuracy = correct / total if total > 0 else 0.0
    delta = (accuracy - 0.5) * 50  # -25 to +25 range
    score = score + delta
    return max(0.0, min(100.0, score))


# ─── Classification ────────────────────────────────────────────────────────
def classify_topic(confidence_score: float) -> str:
    """
    Classify topic mastery level.
    > 80  → strong
    50-80 → medium
    < 50  → weak
    """
    if confidence_score > 80:
        return "strong"
    elif confidence_score >= 50:
        return "medium"
    else:
        return "weak"


# ─── Revision Scheduling ───────────────────────────────────────────────────
REVISION_INTERVALS = {
    "weak": 1,
    "medium": 3,
    "strong": 7,
}


def next_revision_date(classification: str) -> str:
    """Return the ISO date string for the next revision."""
    days = REVISION_INTERVALS.get(classification, 3)
    revision_date = datetime.utcnow() + timedelta(days=days)
    return revision_date.strftime("%Y-%m-%d")


# ─── Gamification ─────────────────────────────────────────────────────────
POINTS_PER_QUIZ = 10


def calculate_points(percentage: float) -> int:
    """Award points based on quiz performance."""
    if percentage >= 80:
        return POINTS_PER_QUIZ + 5  # Bonus for high score
    elif percentage >= 50:
        return POINTS_PER_QUIZ
    else:
        return max(1, int(POINTS_PER_QUIZ * percentage / 100))

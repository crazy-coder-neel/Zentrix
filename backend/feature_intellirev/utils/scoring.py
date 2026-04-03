
from datetime import datetime, timedelta

def update_confidence(current_score: float, correct: bool) -> float:

    delta = 10.0 if correct else -15.0
    new_score = current_score + delta
    return max(0.0, min(100.0, new_score))

def compute_quiz_confidence(correct: int, total: int, prev_confidence: float = 50.0) -> float:

    score = prev_confidence

    accuracy = correct / total if total > 0 else 0.0
    delta = (accuracy - 0.5) * 50  
    score = score + delta
    return max(0.0, min(100.0, score))

def classify_topic(confidence_score: float) -> str:

    if confidence_score > 80:
        return "strong"
    elif confidence_score >= 50:
        return "medium"
    else:
        return "weak"

REVISION_INTERVALS = {
    "weak": 1,
    "medium": 3,
    "strong": 7,
}

def next_revision_date(classification: str) -> str:

    days = REVISION_INTERVALS.get(classification, 3)
    revision_date = datetime.utcnow() + timedelta(days=days)
    return revision_date.strftime("%Y-%m-%d")

POINTS_PER_QUIZ = 10

def calculate_points(percentage: float) -> int:

    if percentage >= 80:
        return POINTS_PER_QUIZ + 5  
    elif percentage >= 50:
        return POINTS_PER_QUIZ
    else:
        return max(1, int(POINTS_PER_QUIZ * percentage / 100))

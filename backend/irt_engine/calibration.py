def calculate_brier_contribution(confidence_percentage: float, was_correct: bool) -> float:

    confidence_prob = max(0.0, min(100.0, confidence_percentage)) / 100.0
    outcome = 1.0 if was_correct else 0.0
    return (confidence_prob - outcome) ** 2

def get_calibration_state(theta: float, rolling_brier_score: float, mean_recent_confidence: float) -> str:

    high_ability = theta > 0.5
    well_calibrated = rolling_brier_score < 0.20

    if high_ability and well_calibrated:
        return "well_calibrated"

    if high_ability and not well_calibrated:

        return "underconfident"

    if not high_ability and not well_calibrated:

        if mean_recent_confidence > 60.0:
            return "overconfident"
        return "poor_performer"

    return "poor_performer"

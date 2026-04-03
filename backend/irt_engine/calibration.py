def calculate_brier_contribution(confidence_percentage: float, was_correct: bool) -> float:
    """
    confidence_percentage: 0 to 100
    was_correct: True or False
    Returns the Brier Score contribution for a single answer:
    BC = (confidence / 100 - outcome)^2
    """
    confidence_prob = max(0.0, min(100.0, confidence_percentage)) / 100.0
    outcome = 1.0 if was_correct else 0.0
    return (confidence_prob - outcome) ** 2

def get_calibration_state(theta: float, rolling_brier_score: float, mean_recent_confidence: float) -> str:
    """
    Determine the qualitative state of the student's calibration.
    """
    high_ability = theta > 0.5
    well_calibrated = rolling_brier_score < 0.20
    
    if high_ability and well_calibrated:
        return "well_calibrated"
        
    if high_ability and not well_calibrated:
        # High ability but bad brier means they got it right but said they weren't confident
        # or got it wrong with high confidence (rare if ability is high). 
        # Typically means underconfident.
        return "underconfident"
        
    if not high_ability and not well_calibrated:
        # Low ability and bad calibration.
        # If mean confidence is > 60%, they are overconfident (Think they know it, but keep failing).
        if mean_recent_confidence > 60.0:
            return "overconfident"
        return "poor_performer"
        
    # not high ability and well calibrated -> rare, means they know they don't know it.
    return "poor_performer"

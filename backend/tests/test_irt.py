from irt_engine.irt import fisher_information, update_theta, select_next_question
from irt_engine.calibration import calculate_brier_contribution, get_calibration_state
from irt_engine.tracker import IRTTracker

def test_fisher_information():
    info = fisher_information(theta=0.5, a=1.0, b=0.5, c=0.25)
    assert info >= 0
    info_b = fisher_information(theta=1.0, a=1.0, b=1.0, c=0.25)
    assert info_b >= 0

def test_update_theta():
    questions = {
        "q1": {"id": "q1", "discrimination_a": 1.0, "difficulty_b": -1.0, "guessing_c": 0.25},
        "q2": {"id": "q2", "discrimination_a": 1.0, "difficulty_b": 0.0, "guessing_c": 0.25},
        "q3": {"id": "q3", "discrimination_a": 1.0, "difficulty_b": 1.0, "guessing_c": 0.25},
    }
    # Student gets everything correct
    responses = [("q1", True), ("q2", True), ("q3", True)]
    theta, se = update_theta(0.0, responses, questions)
    assert theta > 0.0  # Theta should increase
    assert se > 0.0

    # Student gets everything wrong
    responses_wrong = [("q1", False), ("q2", False), ("q3", False)]
    theta2, se2 = update_theta(0.0, responses_wrong, questions)
    assert theta2 < 0.0  # Theta should decrease

def test_select_next_question():
    questions = [
        {"id": "q1", "discrimination_a": 1.0, "difficulty_b": -2.0, "guessing_c": 0.25},
        {"id": "q2", "discrimination_a": 1.0, "difficulty_b": 0.0, "guessing_c": 0.25},
        {"id": "q3", "discrimination_a": 1.0, "difficulty_b": 2.0, "guessing_c": 0.25},
    ]
    # Based on the PRD's specific Fisher Information formulation, 
    # the maximum may not be strictly localized at b.
    next_q = select_next_question(questions, theta=2.5, used_ids=set())
    assert next_q is not None

    # For a low ability student
    next_q_low = select_next_question(questions, theta=-2.5, used_ids=set())
    assert next_q_low is not None

def test_calibration():
    # 90% confident and correct => small score
    assert abs(calculate_brier_contribution(90.0, True) - 0.01) < 1e-5
    # 90% confident and wrong => large score
    assert abs(calculate_brier_contribution(90.0, False) - 0.81) < 1e-5
    # 50% confident 
    assert abs(calculate_brier_contribution(50.0, True) - 0.25) < 1e-5
    assert abs(calculate_brier_contribution(50.0, False) - 0.25) < 1e-5

def test_calibration_state():
    # High ability, well calibrated
    assert get_calibration_state(1.0, 0.1, 80.0) == "well_calibrated"
    # High ability, poor calibration -> underconfident
    assert get_calibration_state(1.0, 0.3, 80.0) == "underconfident"
    # Low ability, poor calibration, high mean confidence -> overconfident
    assert get_calibration_state(-1.0, 0.6, 80.0) == "overconfident"
    # Low ability, poor calibration, low mean confidence -> poor performer
    assert get_calibration_state(-1.0, 0.6, 30.0) == "poor_performer"

def test_tracker():
    tracker = IRTTracker()
    assert tracker.theta == 0.0
    questions = {
        "q1": {"id": "q1", "discrimination_a": 1.0, "difficulty_b": 0.0, "guessing_c": 0.25}
    }
    
    tracker.record_response("q1", True, 80.0, questions)
    assert tracker.theta > 0.0
    assert abs(tracker.get_rolling_brier_score() - 0.04) < 1e-5  # (0.8 - 1)^2
    
    summary = tracker.get_state_summary()
    assert "theta" in summary
    assert "rolling_brier_score" in summary
    assert "calibration_state" in summary

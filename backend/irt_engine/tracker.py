from .irt import update_theta
from .calibration import calculate_brier_contribution, get_calibration_state

class IRTTracker:
    def __init__(self, initial_theta: float = 0.0, initial_se: float = 4.0):
        self.theta = initial_theta
        self.theta_se = initial_se
        
        # History format: tuple(question_id, was_correct, stated_confidence)
        self.history: list[tuple[str, bool, float]] = []
        
    def record_response(self, question_id: str, was_correct: bool, stated_confidence: float, questions_dict: dict[str, dict]):
        """
        Record a student's answer, compute brier contribution, update theta and SE.
        questions_dict maps question_id to its item parameters.
        """
        self.history.append((question_id, was_correct, stated_confidence))
        
        # Prepare responses for IRT update
        responses = [(q_id, is_corr) for q_id, is_corr, _ in self.history]
        
        # Update theta and se
        self.theta, self.theta_se = update_theta(self.theta, responses, questions_dict)
        
    def get_rolling_brier_score(self, window: int = 10) -> float:
        """
        Compute mean brier score over the last `window` items.
        """
        recent = self.history[-window:] if self.history else []
        if not recent:
            return 0.25 # Default uncertainty
            
        contributions = [
            calculate_brier_contribution(conf, corr)
            for _, corr, conf in recent
        ]
        return sum(contributions) / len(contributions)
        
    def get_mean_recent_confidence(self, window: int = 10) -> float:
        """
        Get the average stated confidence in the last `window` items.
        """
        recent = self.history[-window:] if self.history else []
        if not recent:
            return 50.0
            
        return sum(conf for _, _, conf in recent) / len(recent)
        
    def get_calibration_state(self) -> str:
        rolling_brier = self.get_rolling_brier_score()
        mean_conf = self.get_mean_recent_confidence()
        return get_calibration_state(self.theta, rolling_brier, mean_conf)
        
    def get_state_summary(self) -> dict:
        return {
            "theta": round(self.theta, 3),
            "theta_se": round(self.theta_se, 3),
            "rolling_brier_score": round(self.get_rolling_brier_score(), 3),
            "calibration_state": self.get_calibration_state(),
            "items_answered": len(self.history)
        }

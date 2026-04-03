"""
Behavior Tree Remediation Sequencer — Feature 4 (PRD §9).

Now implemented dynamically using `py_trees` and `asteval`.
After every student interaction, the BT ticks once. It places the live
student state vector onto the Blackboard and uses Astor-based condition evaluation
to select the optimal next action.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any
import py_trees
from py_trees import common
from asteval import Interpreter

# ──────────────────────────────────────────────
# Fatigue parameters
# ──────────────────────────────────────────────
FATIGUE_DECAY = 0.92
FATIGUE_WRONG_BUMP = 0.12
FATIGUE_CORRECT_BUMP = 0.03

def update_fatigue(current_fatigue: float, correct: bool) -> float:
    """Update fatigue score after a response. Returns clamped [0, 1]."""
    fatigue = current_fatigue * FATIGUE_DECAY
    fatigue += FATIGUE_CORRECT_BUMP if correct else FATIGUE_WRONG_BUMP
    return min(1.0, max(0.0, fatigue))

# ──────────────────────────────────────────────
# BT Action
# ──────────────────────────────────────────────
@dataclass
class BTAction:
    """Describes the next remediation action."""
    type: str
    params: dict
    reason: str
    trace: list[dict]

    def to_dict(self) -> dict:
        return asdict(self)

# ──────────────────────────────────────────────
# Learner State Vector
# ──────────────────────────────────────────────
@dataclass
class LearnerState:
    """Input to the BT tick."""
    calibration_state: str = "well_calibrated"
    top_priority_concept: str | None = None
    top_priority_blame: float = 0.0
    current_concept_id: str = ""
    current_concept_mastery: float = 0.0
    consecutive_correct_streak: int = 0
    consecutive_wrong_streak: int = 0
    fatigue_score: float = 0.0
    items_in_session: int = 0
    theta: float = 0.0
    theta_se: float = 4.0
    slip_count_session: int = 0
    active_misconception_id: str | None = None
    session_minutes_elapsed: float = 0.0

    @classmethod
    def from_dict(cls, data: dict) -> "LearnerState":
        valid_keys = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in data.items() if k in valid_keys}
        return cls(**filtered)

    def to_dict(self) -> dict:
        return asdict(self)

# ──────────────────────────────────────────────
# Custom py_trees Behaviors
# ──────────────────────────────────────────────
class EvalCondition(py_trees.behaviour.Behaviour):
    """Evaluates an asteval expression against the Blackboard state."""
    def __init__(self, name: str, expression: str):
        super().__init__(name=name)
        self.expression = expression
        self.aeval = Interpreter()

    def update(self) -> common.Status:
        # Get blackboard state
        state_dict = py_trees.blackboard.Blackboard.get("state")
        trace_logger = py_trees.blackboard.Blackboard.get("trace_logger")
        
        # Inject state variables into asteval symtable
        for k, v in state_dict.items():
            self.aeval.symtable[k] = v
            
        result = self.aeval(self.expression)
        
        # Ensure result is boolean
        did_fire = bool(result)
        
        if trace_logger is not None:
            # We record whether the condition evaluated to true or false 
            # Note: A failure here breaks the Sequence, which is standard BT behaviour.
            # We just log it for the frontend explanation engine.
            pass
            
        if did_fire:
            return common.Status.SUCCESS
        else:
            return common.Status.FAILURE

class ActionNode(py_trees.behaviour.Behaviour):
    """Action node that writes the final BTAction to the Blackboard."""
    def __init__(self, name: str, action_type: str, reason_template: str, params_extractor=None):
        super().__init__(name=name)
        self.action_type = action_type
        self.reason_template = reason_template
        self.params_extractor = params_extractor or (lambda s: {})

    def update(self) -> common.Status:
        state_dict = py_trees.blackboard.Blackboard.get("state")
        
        params = self.params_extractor(state_dict)
        # Format the reason string with the current state dict
        # Sometimes fields might be None, so we provide fallbacks
        safe_state = {k: (v if v is not None else "") for k, v in state_dict.items()}
        try:
            reason = self.reason_template.format(**safe_state)
        except Exception:
            reason = f"Executed {self.action_type}"
            
        py_trees.blackboard.Blackboard.set("output_action", {
            "type": self.action_type,
            "params": params,
            "reason": reason,
            "branch": self.parent.name if self.parent else self.name
        })
        
        return common.Status.SUCCESS

class LoggingSequence(py_trees.composites.Sequence):
    """Sequence that logs to the trace_logger when evaluated."""
    def tick(self):
        trace_logger = py_trees.blackboard.Blackboard.get("trace_logger")
        # Run normal sequence tick
        result = super().tick()
        # Find final status
        if trace_logger is not None:
            fired = (self.status == common.Status.SUCCESS)
            # Avoid duplicate logs for RUNNING nodes in multiple ticks, though memory=False here.
            trace_logger.append({"branch": self.name, "fired": fired})
        yield from result


# ──────────────────────────────────────────────
# The Behavior Tree Engine
# ──────────────────────────────────────────────
class BehaviorTree:
    """
    Reactive Behavior Tree engine powered by `py_trees`.
    Builds the 7-branch structure dynamically.
    """
    def __init__(self):
        self.root = self._build_tree()

    def _build_tree(self) -> py_trees.behaviour.Behaviour:
        root = py_trees.composites.Selector(name="ROOT", memory=False)

        # 1. DANGER ZONE
        seq1 = LoggingSequence(name="DANGER_ZONE", memory=False)
        cond1 = EvalCondition("Check DANGER", "calibration_state == 'overconfident' and active_misconception_id is not None")
        act1 = ActionNode(
            "Contrast Case", "CONTRAST_CASE",
            "Overconfident + confirmed misconception {active_misconception_id}. Contrast case forces direct confrontation.",
            lambda s: {"misconception_id": s.get("active_misconception_id")}
        )
        seq1.add_children([cond1, act1])

        # 2. FATIGUE BREAK
        seq2 = LoggingSequence(name="FATIGUE", memory=False)
        cond2 = EvalCondition("Check FATIGUE", "fatigue_score > 0.75")
        act2 = ActionNode(
            "Pace Reduction", "PACE_REDUCTION",
            "Fatigue score {fatigue_score:.2f} exceeds threshold 0.75. Switching to simpler verification items.",
            lambda s: {"fatigue": s.get("fatigue_score")}
        )
        seq2.add_children([cond2, act2])

        # 3. CRITICAL PREREQUISITE REPAIR
        seq3 = LoggingSequence(name="PREREQ_REPAIR", memory=False)
        cond3 = EvalCondition("Check PREREQ", "top_priority_blame > 0.65 and current_concept_mastery < 60")
        act3 = ActionNode(
            "Drill Prerequisite", "DRILL_PREREQUISITE",
            "Blame weight {top_priority_blame:.2f} on {top_priority_concept} exceeds 0.65 with mastery {current_concept_mastery:.0f}%.",
            lambda s: {"concept_id": s.get("top_priority_concept")}
        )
        seq3.add_children([cond3, act3])

        # 4. MISCONCEPTION DRILL
        seq4 = LoggingSequence(name="MISCONCEPTION_DRILL", memory=False)
        cond4 = EvalCondition("Check MISCONCEPTION", "active_misconception_id is not None and consecutive_wrong_streak >= 2")
        act4 = ActionNode(
            "Worked Example", "WORKED_EXAMPLE",
            "Confirmed misconception {active_misconception_id} with {consecutive_wrong_streak} consecutive wrong answers. Delivering worked example.",
            lambda s: {"misconception_id": s.get("active_misconception_id"), "wrong_streak": s.get("consecutive_wrong_streak")}
        )
        seq4.add_children([cond4, act4])

        # 5. ADVANCE
        seq5 = LoggingSequence(name="ADVANCE", memory=False)
        cond5 = EvalCondition("Check ADVANCE", "consecutive_correct_streak >= 3 and theta_se < 0.35")
        act5 = ActionNode(
            "Advance Concept", "ADVANCE_CONCEPT",
            "Consecutive correct streak of {consecutive_correct_streak} with θ SE = {theta_se:.3f} (< 0.35). Mastery confirmed.",
            lambda s: {}
        )
        seq5.add_children([cond5, act5])

        # 6. INTERLEAVING
        seq6 = LoggingSequence(name="INTERLEAVING", memory=False)
        cond6 = EvalCondition("Check INTERLEAVING", "items_in_session > 0 and items_in_session % 8 == 0")
        act6 = ActionNode(
            "Interleaved Review", "INTERLEAVED_REVIEW",
            "Item count {items_in_session} is a multiple of 8. Delivering interleaved review.",
            lambda s: {}
        )
        seq6.add_children([cond6, act6])

        # 7. DEFAULT
        seq7 = LoggingSequence(name="DEFAULT", memory=False)
        act7 = ActionNode(
            "Next CAT Item", "NEXT_CAT_ITEM",
            "No special condition met. Continuing with CAT-selected item on {current_concept_id}.",
            lambda s: {"concept_id": s.get("current_concept_id")}
        )
        seq7.add_child(act7)

        # Assemble tree
        root.add_children([seq1, seq2, seq3, seq4, seq5, seq6, seq7])
        return root

    def tick(self, state: LearnerState) -> BTAction:
        """
        Populate the Blackboard with the learner state and run one tick.
        Extracts the resulting trace and action to return to the pipeline.
        """
        # Reset and prepare blackboard
        py_trees.blackboard.Blackboard.clear()
        py_trees.blackboard.Blackboard.set("state", state.to_dict())
        py_trees.blackboard.Blackboard.set("trace_logger", [])
        py_trees.blackboard.Blackboard.set("output_action", None)

        # Execute py_trees tick
        self.root.tick_once()

        # Gather output
        action_data = py_trees.blackboard.Blackboard.get("output_action")
        trace_logger = py_trees.blackboard.Blackboard.get("trace_logger") or []
        
        # If no action (e.g. fatal fallthrough), return DEFAULT 
        if not action_data:
            action_data = {
                "type": "NEXT_CAT_ITEM",
                "params": {"concept_id": state.current_concept_id},
                "reason": "Fallback to DEFAULT.",
            }

        return BTAction(
            type=action_data["type"],
            params=action_data["params"],
            reason=action_data["reason"],
            trace=trace_logger
        )

    def get_tree_structure(self) -> dict:
        """
        Return a JSON-serialisable representation of the py_trees structure.
        We dynamically walk the tree to extract the layout for the frontend D3 graph.
        """
        def _walk(node: py_trees.behaviour.Behaviour) -> dict:
            n_type = "action"
            # Py_trees types are mapped to frontend D3 types
            if isinstance(node, py_trees.composites.Selector):
                n_type = "selector"
            elif isinstance(node, py_trees.composites.Sequence):
                n_type = "sequence"
            elif isinstance(node, EvalCondition):
                n_type = "condition"

            # Parse conditions and actions for the D3 visualization description text
            desc = ""
            if isinstance(node, EvalCondition):
                desc = node.expression
            elif isinstance(node, ActionNode):
                desc = node.action_type

            data = {
                "name": node.name,
                "type": n_type,
                "description": desc,
                "children": []
            }
            if hasattr(node, "children") and node.children:
                data["children"] = [_walk(c) for c in node.children]
            return data

        return _walk(self.root)

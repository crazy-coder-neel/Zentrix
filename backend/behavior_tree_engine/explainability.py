"""
Explainability Engine — PRD §10.

Produces structured explanation records after every student interaction.
Explanations are assembled from string templates — NOT LLM output.
Every decision is fully traceable.
"""

from __future__ import annotations

from typing import Any


# ──────────────────────────────────────────────
# Template System
# ──────────────────────────────────────────────
SUMMARY_TEMPLATES = {
    "CONTRAST_CASE": (
        "You answered {answer} with {confidence}% confidence, but the correct "
        "answer is {correct}. The system detected misconception: {mc_desc}. "
        "Because you were highly confident, a side-by-side contrast case has "
        "been provided to directly address this belief."
    ),
    "DRILL_PREREQUISITE": (
        "Your error traces back to a gap in {repair_concept}. "
        "The blame propagation path was: {blame_path}. "
        "We'll drill {repair_concept} before returning to {current_concept}."
    ),
    "WORKED_EXAMPLE": (
        "You've made {wrong_streak} consecutive errors involving misconception "
        "{mc_desc}. A step-by-step worked example is being provided, with the "
        "error point annotated at the step where students typically go wrong."
    ),
    "PACE_REDUCTION": (
        "Your fatigue score has reached {fatigue:.0%}. The system is switching "
        "to simpler verification items for the next 2–3 questions to help you "
        "regain focus."
    ),
    "ADVANCE_CONCEPT": (
        "Excellent! You've answered {streak} questions correctly in a row with "
        "high precision (θ SE = {theta_se:.3f}). You're ready to advance to "
        "the next concept."
    ),
    "INTERLEAVED_REVIEW": (
        "You've completed {items} items in this session. Time for an interleaved "
        "review to strengthen retention across previously covered concepts."
    ),
    "NEXT_CAT_ITEM": (
        "Continuing with the next adaptively-selected question on "
        "{current_concept}. The item is chosen to maximise measurement "
        "precision at your current ability level (θ = {theta:.2f})."
    ),
    "CORRECT": (
        "Correct! You answered {answer} with {confidence}% confidence. "
        "Your ability estimate updated from θ = {theta_before:.2f} to "
        "θ = {theta_after:.2f}."
    ),
    "SLIP": (
        "This appears to be a slip — a fast execution error rather than a "
        "conceptual gap. Your answer ({answer}) was incorrect, but the speed "
        "({time_ms}ms) suggests you know the concept. Try again more carefully."
    ),
}


class ExplainabilityEngine:
    """
    Assembles structured ExplanationRecords after each interaction.
    Every output is fully traceable — no black-box reasoning.
    """

    def assemble_record(
        self,
        *,
        question_id: str,
        answer_selected: str,
        correct_answer: str,
        is_correct: bool,
        error_type: str,
        confidence: float,
        time_taken_ms: int,
        fault_tree_result: dict | None = None,
        blame_result: list[dict] | None = None,
        irt_update: dict | None = None,
        calibration: dict | None = None,
        bt_action: dict | None = None,
        misconception_descriptions: list[dict] | None = None,
        current_concept: str = "",
    ) -> dict:
        """
        Build a complete ExplanationRecord from all pipeline outputs.

        Returns a structured dict matching the PRD's ExplanationRecord interface.
        """
        import time as _time

        record = {
            "question_id": question_id,
            "timestamp": _time.time(),

            # Error classification
            "error_type": error_type,
            "error_type_reason": self._error_type_reason(error_type, time_taken_ms),

            # Fault tree result
            "fault_tree_trace": fault_tree_result,

            # Blame propagation
            "blame_propagation": self._format_blame(blame_result),

            # IRT update
            "irt_update": irt_update or {},

            # Calibration
            "calibration": calibration or {},

            # BT decision
            "bt_decision": self._format_bt(bt_action),

            # Plain English summary
            "summary": self._generate_summary(
                is_correct=is_correct,
                error_type=error_type,
                answer_selected=answer_selected,
                correct_answer=correct_answer,
                confidence=confidence,
                time_taken_ms=time_taken_ms,
                bt_action=bt_action,
                blame_result=blame_result,
                irt_update=irt_update,
                misconception_descriptions=misconception_descriptions,
                current_concept=current_concept,
            ),
        }

        return record

    def _error_type_reason(self, error_type: str, time_ms: int) -> str:
        """Human-readable rationale for the error classification."""
        if error_type == "correct":
            return "Answer matched the correct option."
        if error_type == "slip":
            return (
                f"Answer was wrong but response time ({time_ms}ms) was very "
                f"fast, suggesting an execution error rather than a conceptual gap."
            )
        if error_type == "lapse":
            return (
                "Answer was wrong. This appears to be a memory lapse — the student "
                "has previously answered similar questions correctly."
            )
        return (
            "Answer was wrong and matches a known misconception pattern. "
            "Full fault tree analysis was triggered."
        )

    def _format_blame(self, blame_result: list[dict] | None) -> dict | None:
        if not blame_result:
            return None
        return {
            "root_concepts": [
                b["concept_id"] for b in blame_result if b.get("is_root")
            ],
            "propagated_to": [
                {
                    "concept_id": b["concept_id"],
                    "blame": b.get("blame_weight", 0),
                    "priority": b.get("priority_score", 0),
                }
                for b in blame_result
            ],
            "top_repair_target": blame_result[0]["concept_id"] if blame_result else None,
            "repair_target_reason": (
                f"Highest priority score: {blame_result[0].get('priority_score', 0):.2f}"
                if blame_result
                else ""
            ),
        }

    def _format_bt(self, bt_action: dict | None) -> dict | None:
        if not bt_action:
            return None
        return {
            "branch_fired": next(
                (t["branch"] for t in bt_action.get("trace", []) if t.get("fired")),
                "UNKNOWN",
            ),
            "reason": bt_action.get("reason", ""),
            "action_type": bt_action.get("type", ""),
            "full_trace": bt_action.get("trace", []),
        }

    def _generate_summary(
        self,
        *,
        is_correct: bool,
        error_type: str,
        answer_selected: str,
        correct_answer: str,
        confidence: float,
        time_taken_ms: int,
        bt_action: dict | None,
        blame_result: list[dict] | None,
        irt_update: dict | None,
        misconception_descriptions: list[dict] | None,
        current_concept: str,
    ) -> str:
        """Generate a plain-English summary from templates."""

        if is_correct:
            return SUMMARY_TEMPLATES["CORRECT"].format(
                answer=answer_selected,
                confidence=confidence,
                theta_before=irt_update.get("theta_before", 0) if irt_update else 0,
                theta_after=irt_update.get("theta_after", 0) if irt_update else 0,
            )

        if error_type == "slip":
            return SUMMARY_TEMPLATES["SLIP"].format(
                answer=answer_selected,
                time_ms=time_taken_ms,
            )

        # For mistakes, use the BT action type to pick the right template
        action_type = bt_action.get("type", "NEXT_CAT_ITEM") if bt_action else "NEXT_CAT_ITEM"
        mc_desc = ""
        if misconception_descriptions:
            mc_desc = "; ".join(m.get("description", m.get("id", "")) for m in misconception_descriptions)

        template_map = {
            "CONTRAST_CASE": lambda: SUMMARY_TEMPLATES["CONTRAST_CASE"].format(
                answer=answer_selected,
                confidence=confidence,
                correct=correct_answer,
                mc_desc=mc_desc or "unknown misconception",
            ),
            "DRILL_PREREQUISITE": lambda: SUMMARY_TEMPLATES["DRILL_PREREQUISITE"].format(
                repair_concept=blame_result[0]["concept_id"] if blame_result else "unknown",
                blame_path=" → ".join(b["concept_id"] for b in (blame_result or [])[:4]),
                current_concept=current_concept,
            ),
            "WORKED_EXAMPLE": lambda: SUMMARY_TEMPLATES["WORKED_EXAMPLE"].format(
                wrong_streak=bt_action.get("params", {}).get("wrong_streak", 2) if bt_action else 2,
                mc_desc=mc_desc or "unknown misconception",
            ),
            "PACE_REDUCTION": lambda: SUMMARY_TEMPLATES["PACE_REDUCTION"].format(
                fatigue=bt_action.get("params", {}).get("fatigue", 0.8) if bt_action else 0.8,
            ),
        }

        generator = template_map.get(action_type)
        if generator:
            return generator()

        return (
            f"You answered {answer_selected} with {confidence}% confidence, "
            f"but the correct answer is {correct_answer}. "
            f"{'Misconceptions detected: ' + mc_desc + '. ' if mc_desc else ''}"
            f"The system will continue with adaptive item selection."
        )

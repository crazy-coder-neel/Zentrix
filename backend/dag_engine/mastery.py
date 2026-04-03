

from __future__ import annotations

import math
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .dag import ConceptDAG

class MasteryTracker:

    WEIGHT_RECENT = 0.50
    WEIGHT_ALLTIME = 0.30
    WEIGHT_RETENTION = 0.20

    RETENTION_DECAY_RATE = 0.05

    RECENT_WINDOW = 5

    def __init__(self, initial_mastery: dict[str, float] | None = None):

        self._history: dict[str, list[tuple[bool, float]]] = {}

        self._mastery: dict[str, float] = dict(initial_mastery or {})

        self._last_review: dict[str, float] = {}

        self._mastery_at_last_review: dict[str, float] = {}

    def record_response(
        self,
        concept_id: str,
        correct: bool,
        timestamp: float | None = None,
    ) -> float:

        ts = timestamp or time.time()

        if concept_id not in self._history:
            self._history[concept_id] = []
        self._history[concept_id].append((correct, ts))

        self._last_review[concept_id] = ts

        mastery = self._compute_mastery(concept_id, ts)
        self._mastery[concept_id] = mastery
        self._mastery_at_last_review[concept_id] = mastery

        return mastery

    def _compute_mastery(self, concept_id: str, now: float) -> float:

        history = self._history.get(concept_id, [])
        if not history:
            return self._mastery.get(concept_id, 0)

        recent = history[-self.RECENT_WINDOW:]
        recent_accuracy = sum(1 for c, _ in recent if c) / len(recent) * 100

        alltime_accuracy = sum(1 for c, _ in history if c) / len(history) * 100

        retention = self._compute_retention(concept_id, now)

        mastery = (
            self.WEIGHT_RECENT * recent_accuracy
            + self.WEIGHT_ALLTIME * alltime_accuracy
            + self.WEIGHT_RETENTION * retention
        )

        return max(0.0, min(100.0, mastery))

    def _compute_retention(self, concept_id: str, now: float) -> float:

        last_mastery = self._mastery_at_last_review.get(concept_id, 0)
        last_review = self._last_review.get(concept_id)

        if last_review is None:
            return last_mastery

        days_elapsed = max(0, (now - last_review) / 86400.0)
        return last_mastery * math.exp(-self.RETENTION_DECAY_RATE * days_elapsed)

    def get_mastery(self, concept_id: str) -> float:

        return self._mastery.get(concept_id, 0)

    def get_all_mastery(self) -> dict[str, float]:

        return dict(self._mastery)

    def get_mastery_state(self, concept_id: str) -> str:

        score = self.get_mastery(concept_id)
        if score >= 80:
            return "strong"
        elif score >= 60:
            return "developing"
        return "weak"

    def get_concept_summary(
        self, concept_id: str, dag: ConceptDAG | None = None
    ) -> dict:

        history = self._history.get(concept_id, [])
        summary = {
            "concept_id": concept_id,
            "mastery": round(self.get_mastery(concept_id), 2),
            "state": self.get_mastery_state(concept_id),
            "total_attempts": len(history),
            "correct_count": sum(1 for c, _ in history if c),
            "incorrect_count": sum(1 for c, _ in history if not c),
        }
        if dag and concept_id in dag.nodes:
            summary["concept_name"] = dag.nodes[concept_id]["name"]
            summary["tier"] = dag.nodes[concept_id].get("tier")
        return summary

    def get_all_summaries(self, dag: ConceptDAG | None = None) -> list[dict]:

        concept_ids = set(self._mastery.keys()) | set(self._history.keys())
        return [
            self.get_concept_summary(cid, dag)
            for cid in sorted(concept_ids)
        ]

    def to_serializable(self) -> dict:

        return {
            "mastery": {k: round(v, 2) for k, v in self._mastery.items()},
            "history_counts": {
                cid: {
                    "total": len(entries),
                    "correct": sum(1 for c, _ in entries if c),
                }
                for cid, entries in self._history.items()
            },
        }

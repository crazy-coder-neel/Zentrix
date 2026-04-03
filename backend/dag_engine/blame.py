"""
Blame Backpropagation — reverse BFS through the prerequisite DAG.

Given a set of misconception IDs from the Fault Tree's minimal cut set,
this module:
  1. Maps misconceptions to their parent concept nodes
  2. Propagates blame backwards through prerequisites with exponential decay
  3. Scores each blamed concept by combining blame weight, mastery gap,
     and downstream impact (number of dependents)
  4. Returns a priority-ranked repair queue

This answers: "The student failed C09, but is the actual gap in C07 or C08?"
"""

from __future__ import annotations

from collections import deque
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .dag import ConceptDAG


def backpropagate_blame(
    dag: ConceptDAG,
    root_concept_ids: set[str] | list[str],
    mastery: dict[str, float],
    decay: float = 0.6,
    prune_threshold: float = 0.05,
) -> list[dict]:
    """
    Reverse BFS blame propagation through the prerequisite DAG.

    Args:
        dag: The loaded ConceptDAG instance.
        root_concept_ids: Concept IDs where the fault tree located errors.
        mastery: Current mastery scores {concept_id: 0-100}.
        decay: Multiplicative decay per prerequisite hop (default 0.6).
        prune_threshold: Stop propagating when blame drops below this (default 0.05).

    Returns:
        A list of dicts sorted descending by priority_score:
        [
            {
                "concept_id": "C15",
                "concept_name": "System Setup — Recognising Structure",
                "blame_weight": 0.6,
                "mastery": 40,
                "mastery_gap": 0.6,       # (1 - mastery/100)
                "num_dependents": 2,
                "priority_score": 0.72,
                "state": "weak",
                "tier": 4,
                "is_root": False,          # True if this was a direct error source
            },
            ...
        ]
    """
    root_set = set(root_concept_ids)

    # Step 1: initialise blame at root concepts
    blame: dict[str, float] = {cid: 1.0 for cid in root_set}

    # Step 2: BFS backwards through prerequisites
    queue = deque(root_set)
    visited: set[str] = set()

    while queue:
        current = queue.popleft()
        if current in visited:
            continue
        visited.add(current)

        current_blame = blame.get(current, 0)
        for prereq in dag.prereqs.get(current, []):
            new_blame = current_blame * decay
            if new_blame > prune_threshold:
                blame[prereq] = max(blame.get(prereq, 0), new_blame)
                queue.append(prereq)

    # Step 3: compute priority scores
    results = []
    for cid, blame_weight in blame.items():
        mastery_score = mastery.get(cid, 0)
        mastery_gap = 1.0 - (mastery_score / 100.0)
        num_dependents = len(dag.dependents.get(cid, []))
        priority = blame_weight * mastery_gap * (1 + num_dependents)

        concept = dag.nodes.get(cid, {})
        results.append({
            "concept_id": cid,
            "concept_name": concept.get("name", cid),
            "blame_weight": round(blame_weight, 4),
            "mastery": mastery_score,
            "mastery_gap": round(mastery_gap, 4),
            "num_dependents": num_dependents,
            "priority_score": round(priority, 4),
            "state": dag.get_concept_state(cid, mastery),
            "tier": concept.get("tier", -1),
            "is_root": cid in root_set,
        })

    # Step 4: sort descending by priority
    results.sort(key=lambda x: -x["priority_score"])
    return results


def get_top_repair_target(
    dag: ConceptDAG,
    misconception_ids: set[str],
    mastery: dict[str, float],
    decay: float = 0.6,
) -> dict | None:
    """
    Convenience function: run the full pipeline from misconception IDs
    to the single top-priority repair concept.

    Args:
        dag: The loaded ConceptDAG.
        misconception_ids: Set of misconception IDs from the fault tree MCS.
        mastery: Current mastery scores.
        decay: Blame decay factor.

    Returns:
        The top-priority repair target dict, or None if no blame found.
    """
    # Map misconceptions → concepts
    root_concepts = dag.misconception_to_concepts(misconception_ids)
    if not root_concepts:
        return None

    ranked = backpropagate_blame(dag, root_concepts, mastery, decay)
    return ranked[0] if ranked else None


def get_repair_queue(
    dag: ConceptDAG,
    misconception_ids: set[str],
    mastery: dict[str, float],
    decay: float = 0.6,
    max_items: int = 5,
) -> list[dict]:
    """
    Convenience function: return the top-N repair targets.

    Args:
        dag: The loaded ConceptDAG.
        misconception_ids: Set of misconception IDs from the fault tree MCS.
        mastery: Current mastery scores.
        decay: Blame decay factor.
        max_items: Maximum number of repair targets to return.

    Returns:
        A list of up to max_items repair target dicts, sorted by priority.
    """
    root_concepts = dag.misconception_to_concepts(misconception_ids)
    if not root_concepts:
        return []

    ranked = backpropagate_blame(dag, root_concepts, mastery, decay)
    return ranked[:max_items]

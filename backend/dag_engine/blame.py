

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

    root_set = set(root_concept_ids)

    blame: dict[str, float] = {cid: 1.0 for cid in root_set}

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

    results.sort(key=lambda x: -x["priority_score"])
    return results

def get_top_repair_target(
    dag: ConceptDAG,
    misconception_ids: set[str],
    mastery: dict[str, float],
    decay: float = 0.6,
) -> dict | None:

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

    root_concepts = dag.misconception_to_concepts(misconception_ids)
    if not root_concepts:
        return []

    ranked = backpropagate_blame(dag, root_concepts, mastery, decay)
    return ranked[:max_items]

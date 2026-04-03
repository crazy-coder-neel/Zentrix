

import json
import os
from collections import defaultdict, deque
from typing import Any

_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
_CONCEPTS_PATH = os.path.join(_DATA_DIR, "concepts.json")
_EDGES_PATH = os.path.join(_DATA_DIR, "edges.json")
_MISCONCEPTIONS_PATH = os.path.join(_DATA_DIR, "misconceptions.json")

class ConceptDAG:

    def __init__(
        self,
        concepts_path: str | None = None,
        edges_path: str | None = None,
        misconceptions_path: str | None = None,
    ):
        concepts_path = concepts_path or _CONCEPTS_PATH
        edges_path = edges_path or _EDGES_PATH
        misconceptions_path = misconceptions_path or _MISCONCEPTIONS_PATH

        with open(concepts_path, "r") as f:
            concepts = json.load(f)
        with open(edges_path, "r") as f:
            edges = json.load(f)
        with open(misconceptions_path, "r") as f:
            misconceptions = json.load(f)

        self.nodes: dict[str, dict[str, Any]] = {c["id"]: c for c in concepts}

        self.prereqs: dict[str, list[str]] = defaultdict(list)
        self.dependents: dict[str, list[str]] = defaultdict(list)
        for src, dst in edges:
            self.prereqs[dst].append(src)
            self.dependents[src].append(dst)

        self.mc_to_concept: dict[str, str] = {
            m["mc_id"]: m["concept_id"] for m in misconceptions
        }

        self.misconceptions: dict[str, dict] = {
            m["mc_id"]: m for m in misconceptions
        }

        all_ids = set(self.nodes.keys())
        for src, dst in edges:
            if src not in all_ids:
                raise ValueError(
                    f"Edge references unknown source concept '{src}'"
                )
            if dst not in all_ids:
                raise ValueError(
                    f"Edge references unknown destination concept '{dst}'"
                )

        topo = self.topological_order()
        if len(topo) != len(self.nodes):
            raise ValueError(
                f"Cycle detected in prerequisite graph! "
                f"Topological sort returned {len(topo)} nodes "
                f"but {len(self.nodes)} concepts exist."
            )

    def is_unlocked(self, concept_id: str, mastery: dict[str, float]) -> bool:

        for prereq_id in self.prereqs.get(concept_id, []):
            threshold = self.nodes[prereq_id].get("mastery_threshold", 75)
            if mastery.get(prereq_id, 0) < threshold:
                return False
        return True

    def get_concept_state(
        self, concept_id: str, mastery: dict[str, float]
    ) -> str:

        if not self.is_unlocked(concept_id, mastery):
            return "locked"
        score = mastery.get(concept_id, 0)
        if score >= 80:
            return "strong"
        elif score >= 60:
            return "developing"
        return "weak"

    def misconception_to_concepts(
        self, misconception_ids: set[str]
    ) -> set[str]:

        return {
            self.mc_to_concept[mc_id]
            for mc_id in misconception_ids
            if mc_id in self.mc_to_concept
        }

    def get_all_prerequisites(self, concept_id: str) -> list[str]:

        visited = set()
        queue = deque(self.prereqs.get(concept_id, []))
        result = []
        while queue:
            node = queue.popleft()
            if node in visited:
                continue
            visited.add(node)
            result.append(node)
            for prereq in self.prereqs.get(node, []):
                queue.append(prereq)
        return result

    def get_all_dependents(self, concept_id: str) -> list[str]:

        visited = set()
        queue = deque(self.dependents.get(concept_id, []))
        result = []
        while queue:
            node = queue.popleft()
            if node in visited:
                continue
            visited.add(node)
            result.append(node)
            for dep in self.dependents.get(node, []):
                queue.append(dep)
        return result

    def topological_order(self) -> list[str]:

        in_degree: dict[str, int] = {}
        for cid in self.nodes:
            in_degree[cid] = len(self.prereqs.get(cid, []))

        queue = deque(
            [cid for cid, d in in_degree.items() if d == 0]
        )
        order: list[str] = []
        while queue:
            node = queue.popleft()
            order.append(node)
            for dep in self.dependents.get(node, []):
                in_degree[dep] -= 1
                if in_degree[dep] == 0:
                    queue.append(dep)
        return order

    def get_tier(self, concept_id: str) -> int:

        return self.nodes.get(concept_id, {}).get("tier", -1)

    def get_concepts_by_tier(self, tier: int) -> list[dict]:

        return [c for c in self.nodes.values() if c.get("tier") == tier]

    def to_serializable(self, mastery: dict[str, float] | None = None) -> dict:

        nodes = []
        for cid, concept in self.nodes.items():
            node = {
                "id": cid,
                "name": concept["name"],
                "tier": concept["tier"],
                "prerequisites": self.prereqs.get(cid, []),
                "dependents": self.dependents.get(cid, []),
                "mastery_threshold": concept.get("mastery_threshold", 75),
                "bloom_level": concept.get("bloom_level"),
            }
            if mastery is not None:
                node["mastery"] = mastery.get(cid, 0)
                node["state"] = self.get_concept_state(cid, mastery)
            nodes.append(node)

        edges = []
        for dst, srcs in self.prereqs.items():
            for src in srcs:
                edges.append({"from": src, "to": dst})

        return {
            "nodes": nodes,
            "edges": edges,
            "topological_order": self.topological_order(),
        }

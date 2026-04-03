"""
Prerequisite DAG — built dynamically from data files at startup.

The DAG models the dependency structure of linear algebra concepts.
It loads concepts, edges, and misconceptions from JSON data files,
not from hardcoded values, so the knowledge graph can be extended
by simply editing the data files.
"""

import json
import os
from collections import defaultdict, deque
from typing import Any


# Resolve paths relative to this file → ../data/
_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
_CONCEPTS_PATH = os.path.join(_DATA_DIR, "concepts.json")
_EDGES_PATH = os.path.join(_DATA_DIR, "edges.json")
_MISCONCEPTIONS_PATH = os.path.join(_DATA_DIR, "misconceptions.json")


class ConceptDAG:
    """
    Directed Acyclic Graph of prerequisite relationships between concepts.

    Built once at startup from three JSON data files:
      - concepts.json: concept nodes with metadata
      - edges.json: [src, dst] prerequisite pairs
      - misconceptions.json: maps misconception IDs → concept IDs

    Provides:
      - prerequisite/dependent lookups
      - topological ordering (valid study sequence)
      - concept unlock checks based on mastery
      - misconception → concept resolution
    """

    def __init__(
        self,
        concepts_path: str | None = None,
        edges_path: str | None = None,
        misconceptions_path: str | None = None,
    ):
        concepts_path = concepts_path or _CONCEPTS_PATH
        edges_path = edges_path or _EDGES_PATH
        misconceptions_path = misconceptions_path or _MISCONCEPTIONS_PATH

        # Load data from JSON files
        with open(concepts_path, "r") as f:
            concepts = json.load(f)
        with open(edges_path, "r") as f:
            edges = json.load(f)
        with open(misconceptions_path, "r") as f:
            misconceptions = json.load(f)

        # Index concepts by ID
        self.nodes: dict[str, dict[str, Any]] = {c["id"]: c for c in concepts}

        # Build adjacency lists
        #   prereqs[C09]  = ["C08"]         — what C09 requires
        #   dependents[C08] = ["C09", "C12"] — what C08 enables
        self.prereqs: dict[str, list[str]] = defaultdict(list)
        self.dependents: dict[str, list[str]] = defaultdict(list)
        for src, dst in edges:
            self.prereqs[dst].append(src)
            self.dependents[src].append(dst)

        # Build misconception → concept lookup
        #   mc_to_concept["M11"] = "C09"
        self.mc_to_concept: dict[str, str] = {
            m["mc_id"]: m["concept_id"] for m in misconceptions
        }

        # Full misconception registry for descriptions
        self.misconceptions: dict[str, dict] = {
            m["mc_id"]: m for m in misconceptions
        }

        # Validate: ensure all edge nodes exist in concept list
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

        # Validate DAG: check for cycles via topological sort
        topo = self.topological_order()
        if len(topo) != len(self.nodes):
            raise ValueError(
                f"Cycle detected in prerequisite graph! "
                f"Topological sort returned {len(topo)} nodes "
                f"but {len(self.nodes)} concepts exist."
            )

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def is_unlocked(self, concept_id: str, mastery: dict[str, float]) -> bool:
        """A concept is unlocked if ALL prerequisites meet their mastery threshold."""
        for prereq_id in self.prereqs.get(concept_id, []):
            threshold = self.nodes[prereq_id].get("mastery_threshold", 75)
            if mastery.get(prereq_id, 0) < threshold:
                return False
        return True

    def get_concept_state(
        self, concept_id: str, mastery: dict[str, float]
    ) -> str:
        """
        Return the mastery state label for a concept:
          - "locked"       if prerequisites not met
          - "weak"         mastery 0-59
          - "developing"   mastery 60-79
          - "strong"       mastery 80-100
        """
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
        """Map a set of misconception IDs to their parent concept IDs."""
        return {
            self.mc_to_concept[mc_id]
            for mc_id in misconception_ids
            if mc_id in self.mc_to_concept
        }

    def get_all_prerequisites(self, concept_id: str) -> list[str]:
        """BFS to get all transitive prerequisites for a concept."""
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
        """BFS to get all transitive dependents of a concept."""
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
        """Kahn's algorithm — returns a valid study order."""
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
        """Return the tier number for a concept."""
        return self.nodes.get(concept_id, {}).get("tier", -1)

    def get_concepts_by_tier(self, tier: int) -> list[dict]:
        """Return all concept nodes belonging to a given tier."""
        return [c for c in self.nodes.values() if c.get("tier") == tier]

    def to_serializable(self, mastery: dict[str, float] | None = None) -> dict:
        """
        Return a JSON-serializable representation of the full DAG,
        including node states if mastery is provided.
        Useful for sending the graph to the frontend for visualization.
        """
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

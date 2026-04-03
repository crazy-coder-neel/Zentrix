

import time
import pytest
from dag_engine.dag import ConceptDAG
from dag_engine.blame import backpropagate_blame, get_top_repair_target, get_repair_queue
from dag_engine.mastery import MasteryTracker

@pytest.fixture
def dag():

    return ConceptDAG()

class TestDAGConstruction:

    def test_loads_all_concepts(self, dag):
        assert len(dag.nodes) == 18
        assert "C01" in dag.nodes
        assert "C18" in dag.nodes

    def test_concept_has_required_fields(self, dag):
        concept = dag.nodes["C07"]
        assert concept["name"] == "Solving One-Step Equations"
        assert concept["tier"] == 2
        assert concept["mastery_threshold"] == 75

    def test_prereqs_built_correctly(self, dag):

        prereqs_c07 = set(dag.prereqs["C07"])
        assert prereqs_c07 == {"C01", "C03"}

    def test_dependents_built_correctly(self, dag):

        dependents_c08 = set(dag.dependents["C08"])
        assert dependents_c08 == {"C09", "C12"}

    def test_tier_0_concepts_have_no_prereqs(self, dag):
        for cid in ["C01", "C02", "C03"]:
            assert len(dag.prereqs.get(cid, [])) == 0, f"{cid} should have no prereqs"

    def test_misconception_to_concept_mapping(self, dag):
        assert dag.mc_to_concept["M11"] == "C09"
        assert dag.mc_to_concept["M20"] == "C16"
        assert dag.mc_to_concept["M05"] == "C04"

    def test_all_misconceptions_loaded(self, dag):
        assert len(dag.mc_to_concept) == 24

class TestTopologicalOrder:

    def test_topological_order_includes_all_concepts(self, dag):
        order = dag.topological_order()
        assert len(order) == 18

    def test_topological_order_respects_dependencies(self, dag):
        order = dag.topological_order()
        idx = {cid: i for i, cid in enumerate(order)}

        assert idx["C01"] < idx["C07"]

        assert idx["C07"] < idx["C08"] < idx["C09"] < idx["C15"] < idx["C16"] < idx["C18"]

        assert idx["C11"] < idx["C12"] < idx["C13"]

    def test_tier_0_comes_first(self, dag):
        order = dag.topological_order()
        tier_0 = {"C01", "C02", "C03"}
        first_three = set(order[:3])
        assert first_three == tier_0

class TestConceptUnlock:

    def test_tier_0_always_unlocked(self, dag):
        assert dag.is_unlocked("C01", {}) is True
        assert dag.is_unlocked("C02", {}) is True
        assert dag.is_unlocked("C03", {}) is True

    def test_concept_locked_when_prereqs_not_met(self, dag):

        mastery = {"C01": 50, "C03": 80}
        assert dag.is_unlocked("C07", mastery) is False

    def test_concept_unlocked_when_all_prereqs_met(self, dag):
        mastery = {"C01": 80, "C03": 90}
        assert dag.is_unlocked("C07", mastery) is True

    def test_concept_state_labels(self, dag):
        mastery = {"C01": 80, "C03": 90, "C07": 45}
        assert dag.get_concept_state("C01", mastery) == "strong"
        assert dag.get_concept_state("C03", mastery) == "strong"
        assert dag.get_concept_state("C07", mastery) == "weak"

    def test_concept_locked_state(self, dag):

        mastery = {"C01": 50, "C03": 80}
        assert dag.get_concept_state("C07", mastery) == "locked"

class TestBlameBackpropagation:

    def test_prd_worked_example(self, dag):

        mastery = {
            "C16": 30, "C15": 40, "C09": 70, "C08": 80, "C07": 85,
            "C01": 90, "C03": 90
        }

        result = backpropagate_blame(dag, {"C16"}, mastery)
        blame_map = {r["concept_id"]: r for r in result}

        assert blame_map["C16"]["blame_weight"] == 1.0
        assert blame_map["C15"]["blame_weight"] == 0.6
        assert abs(blame_map["C09"]["blame_weight"] - 0.36) < 0.01
        assert abs(blame_map["C08"]["blame_weight"] - 0.216) < 0.01

        assert result[0]["concept_id"] == "C16"

        non_root = [r for r in result if not r["is_root"]]
        assert non_root[0]["concept_id"] == "C15"
        assert abs(non_root[0]["priority_score"] - 1.08) < 0.01

    def test_blame_prunes_negligible_paths(self, dag):

        mastery = {"C18": 0, "C16": 0, "C15": 0, "C09": 0, "C08": 0, "C07": 0, "C01": 0, "C03": 0}
        result = backpropagate_blame(dag, {"C18"}, mastery)
        blame_map = {r["concept_id"]: r for r in result}

        for entry in result:
            assert entry["blame_weight"] >= 0.05

    def test_multiple_root_concepts(self, dag):

        mastery = {"C09": 40, "C08": 50, "C07": 60}
        result = backpropagate_blame(dag, {"C09", "C08"}, mastery)
        blame_map = {r["concept_id"]: r for r in result}

        assert blame_map["C09"]["blame_weight"] == 1.0
        assert blame_map["C08"]["blame_weight"] == 1.0

    def test_decay_parameter(self, dag):

        mastery = {"C16": 50, "C15": 50}

        result_high = backpropagate_blame(dag, {"C16"}, mastery, decay=0.9)

        result_low = backpropagate_blame(dag, {"C16"}, mastery, decay=0.3)

        assert len(result_high) >= len(result_low)

    def test_is_root_flag(self, dag):

        mastery = {"C16": 50}
        result = backpropagate_blame(dag, {"C16"}, mastery)
        for entry in result:
            if entry["concept_id"] == "C16":
                assert entry["is_root"] is True
            else:
                assert entry["is_root"] is False

class TestConvenienceFunctions:

    def test_get_top_repair_target(self, dag):
        mastery = {"C16": 30, "C15": 40, "C09": 70}
        result = get_top_repair_target(dag, {"M20"}, mastery)
        assert result is not None
        assert "concept_id" in result
        assert "priority_score" in result

    def test_get_top_repair_target_unknown_misconception(self, dag):
        result = get_top_repair_target(dag, {"MXXX"}, {})
        assert result is None

    def test_get_repair_queue(self, dag):
        mastery = {"C16": 30, "C15": 40, "C09": 70}
        queue = get_repair_queue(dag, {"M20"}, mastery, max_items=3)
        assert len(queue) <= 3

        for i in range(len(queue) - 1):
            assert queue[i]["priority_score"] >= queue[i + 1]["priority_score"]

    def test_misconception_to_concepts(self, dag):
        concepts = dag.misconception_to_concepts({"M11", "M20", "M05"})
        assert concepts == {"C09", "C16", "C04"}

class TestMasteryTracker:

    def test_initial_mastery_zero(self):
        tracker = MasteryTracker()
        assert tracker.get_mastery("C01") == 0

    def test_initial_mastery_preloaded(self):
        tracker = MasteryTracker(initial_mastery={"C01": 85, "C02": 60})
        assert tracker.get_mastery("C01") == 85
        assert tracker.get_mastery("C02") == 60

    def test_record_correct_increases_mastery(self):
        tracker = MasteryTracker()
        now = time.time()
        m = tracker.record_response("C01", correct=True, timestamp=now)
        assert m > 0

    def test_mastery_after_perfect_run(self):
        tracker = MasteryTracker()
        now = time.time()
        for i in range(5):
            tracker.record_response("C01", correct=True, timestamp=now + i)
        m = tracker.get_mastery("C01")

        assert m >= 95

    def test_mastery_after_mixed_responses(self):
        tracker = MasteryTracker()
        now = time.time()
        responses = [True, True, False, True, False]
        for i, correct in enumerate(responses):
            tracker.record_response("C07", correct=correct, timestamp=now + i)
        m = tracker.get_mastery("C07")

        assert 40 < m < 80

    def test_mastery_state_labels(self):
        tracker = MasteryTracker(initial_mastery={"C01": 90, "C02": 65, "C03": 30})
        assert tracker.get_mastery_state("C01") == "strong"
        assert tracker.get_mastery_state("C02") == "developing"
        assert tracker.get_mastery_state("C03") == "weak"

    def test_concept_summary(self):
        tracker = MasteryTracker()
        now = time.time()
        tracker.record_response("C01", correct=True, timestamp=now)
        tracker.record_response("C01", correct=False, timestamp=now + 1)
        summary = tracker.get_concept_summary("C01")
        assert summary["total_attempts"] == 2
        assert summary["correct_count"] == 1
        assert summary["incorrect_count"] == 1

    def test_to_serializable(self):
        tracker = MasteryTracker()
        now = time.time()
        tracker.record_response("C01", correct=True, timestamp=now)
        data = tracker.to_serializable()
        assert "mastery" in data
        assert "history_counts" in data
        assert data["history_counts"]["C01"]["total"] == 1

class TestDAGSerialization:

    def test_to_serializable_without_mastery(self, dag):
        data = dag.to_serializable()
        assert "nodes" in data
        assert "edges" in data
        assert "topological_order" in data
        assert len(data["nodes"]) == 18

    def test_to_serializable_with_mastery(self, dag):

        mastery = {"C01": 90, "C03": 80, "C07": 45}
        data = dag.to_serializable(mastery)
        node_map = {n["id"]: n for n in data["nodes"]}
        assert node_map["C01"]["mastery"] == 90
        assert node_map["C01"]["state"] == "strong"
        assert node_map["C07"]["state"] == "weak"

    def test_edges_match_prereqs(self, dag):
        data = dag.to_serializable()
        edge_set = {(e["from"], e["to"]) for e in data["edges"]}
        assert ("C01", "C07") in edge_set
        assert ("C08", "C09") in edge_set
        assert ("C16", "C18") in edge_set

class TestTransitiveLookups:

    def test_get_all_prerequisites(self, dag):
        prereqs = dag.get_all_prerequisites("C18")

        assert "C16" in prereqs
        assert "C17" in prereqs
        assert "C15" in prereqs
        assert "C09" in prereqs

    def test_get_all_dependents(self, dag):
        deps = dag.get_all_dependents("C01")

        assert "C07" in deps
        assert "C08" in deps

    def test_get_concepts_by_tier(self, dag):
        tier_0 = dag.get_concepts_by_tier(0)
        assert len(tier_0) == 3
        ids = {c["id"] for c in tier_0}
        assert ids == {"C01", "C02", "C03"}

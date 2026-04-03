import pytest
from fault_tree_engine.fault_tree import evaluate_fault_tree, classify_error

def test_evaluate_fault_tree_q09_002():

    fault_tree_q09_002 = {
        "type": "OR",
        "label": "Wrong answer on Q09_002",
        "children": [
            {
                "type": "LEAF",
                "label": "Chose B — variable moved without sign flip",
                "misconception_id": "M11",
                "condition": { "answer_selected": "B" }
            },
            {
                "type": "LEAF",
                "label": "Chose C — divided before subtracting constant",
                "misconception_id": "M10",
                "condition": { "answer_selected": "C" }
            },
            {
                "type": "AND",
                "label": "Chose D AND has prior M05 pattern",
                "children": [
                    {
                        "type": "LEAF",
                        "label": "Selected option D",
                        "condition": { "answer_selected": "D" }
                    },
                    {
                        "type": "LEAF",
                        "label": "M05 seen in prior sessions",
                        "misconception_id": "M05",
                        "condition": { "prior_error_pattern": "M05" }
                    }
                ]
            }
        ]
    }

    event_B = {"answer_selected": "B"}
    matched, mcs = evaluate_fault_tree(fault_tree_q09_002, event_B)
    assert matched is True
    assert mcs == {"M11"}

    event_D_no_prior = {"answer_selected": "D"}
    matched, mcs = evaluate_fault_tree(fault_tree_q09_002, event_D_no_prior)
    assert matched is False
    assert mcs == set()

    event_D_prior = {
        "answer_selected": "D",
        "prior_error_patterns": ["M05", "M12"]
    }
    matched, mcs = evaluate_fault_tree(fault_tree_q09_002, event_D_prior)
    assert matched is True
    assert mcs == {"M05"}

def test_classify_error():
    question = {
        "id": "Q09_002",
        "concept_id": "C09",
        "correct_answer": "A",
        "avg_time_correct_ms": 35000,
        "avg_time_incorrect_ms": 28000
    }

    error_history = []

    result = classify_error(question, "A", 30000, error_history)
    assert result == "correct"

    result = classify_error(question, "B", 10000, error_history)
    assert result == "slip"

    result = classify_error(question, "B", 20000, error_history)
    assert result == "mistake"

    error_history.extend([
        {"concept_id": "C09", "answer_selected": "C"},
        {"concept_id": "C09", "answer_selected": "C"}
    ])
    result = classify_error(question, "C", 5000, error_history) 
    assert result == "slip"

    result = classify_error(question, "C", 20000, error_history) 
    assert result == "mistake"

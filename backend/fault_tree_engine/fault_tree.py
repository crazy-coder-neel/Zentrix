def evaluate_fault_tree(node, answer_event):
    """
    Recursively evaluate a fault tree node.
    Returns (matched: bool, misconception_ids: set)
    
    answer_event = {
        "answer_selected": "B",
        "time_bracket": "fast" | "medium" | "slow",
        "prior_error_patterns": ["M07", "M11"]   # errors seen 2+ times
    }
    """
    if node["type"] == "LEAF":
        matched = _evaluate_condition(node.get("condition"), answer_event)
        mc_id = node.get("misconception_id")
        return matched, {mc_id} if matched and mc_id else set()

    elif node["type"] == "OR":
        for child in node.get("children", []):
            matched, mcs = evaluate_fault_tree(child, answer_event)
            # OR gate returns the MINIMAL subset — first matching child
            # (children are ordered from most specific to least specific)
            if matched:
                return True, mcs   # return on first match = minimal cut set
        return False, set()

    elif node["type"] == "AND":
        all_mcs = set()
        for child in node.get("children", []):
            matched, mcs = evaluate_fault_tree(child, answer_event)
            if not matched:
                return False, set()  # AND fails if any child fails
            all_mcs.update(mcs)
        return True, all_mcs
    
    return False, set()


def _evaluate_condition(condition, answer_event):
    if not condition:
        return True   # unconditional LEAF
    checks = []
    if "answer_selected" in condition:
        checks.append(answer_event.get("answer_selected") == condition["answer_selected"])
    if "time_bracket" in condition:
        checks.append(answer_event.get("time_bracket") == condition["time_bracket"])
    if "prior_error_pattern" in condition:
        prior_patterns = answer_event.get("prior_error_patterns", [])
        checks.append(condition["prior_error_pattern"] in prior_patterns)
    
    # Return true if all specified conditions match
    return all(checks) if checks else True


def classify_error(question, answer_selected, time_taken_ms, error_history):
    """
    Coarse error classifier (Pre-Fault-Tree).
    Returns "correct", "slip", "lapse", or "mistake".
    """
    if answer_selected == question.get("correct_answer"):
        return "correct"
    
    # Fast wrong = likely slip (execution failure, not conceptual)
    ratio = time_taken_ms / question.get("avg_time_incorrect_ms", 1) # basic safeguard
    if ratio < 0.5:
        return "slip"
    
    # Same wrong answer on this concept seen 2+ times = confirmed misconception
    same_errors = [
        e for e in error_history
        if e.get("concept_id") == question.get("concept_id")
        and e.get("answer_selected") == answer_selected
    ]
    if len(same_errors) >= 2:
        return "mistake"     # Confirmed misconception — run full fault tree
    
    # Default: treat as mistake (run fault tree)
    return "mistake"


def generate_fault_tree(question):
    """
    Auto-generate a fault tree from a question's distractor error tags.
    
    Each wrong option with an error_tag becomes a LEAF node under an OR gate.
    This means ANY tagged wrong answer will match and return its misconception.
    
    Questions with a manually authored 'fault_tree' key bypass this entirely.
    """
    children = []
    correct = question.get("correct_answer")
    options = question.get("options", {})

    for key, option in options.items():
        if key == correct:
            continue  # skip the correct answer
        
        error_tag = option.get("error_tag")
        if not error_tag:
            continue  # skip distractors without a tagged misconception

        children.append({
            "type": "LEAF",
            "label": f"Chose {key} — {option.get('error_description', error_tag)}",
            "misconception_id": error_tag,
            "condition": {"answer_selected": key}
        })

    if not children:
        # Fallback: no tagged distractors, create a generic catch-all
        return {
            "type": "LEAF",
            "label": "Untagged wrong answer",
            "condition": {}
        }

    return {
        "type": "OR",
        "label": f"Wrong answer on {question.get('id', 'unknown')}",
        "children": children
    }


def get_fault_tree(question):
    """
    Returns the fault tree for a question.
    Uses the manually authored tree if present, otherwise auto-generates one.
    """
    if "fault_tree" in question and question["fault_tree"]:
        return question["fault_tree"]
    return generate_fault_tree(question)

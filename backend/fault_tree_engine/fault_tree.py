def evaluate_fault_tree(node, answer_event):

    if node["type"] == "LEAF":
        matched = _evaluate_condition(node.get("condition"), answer_event)
        mc_id = node.get("misconception_id")
        return matched, {mc_id} if matched and mc_id else set()

    elif node["type"] == "OR":
        for child in node.get("children", []):
            matched, mcs = evaluate_fault_tree(child, answer_event)

            if matched:
                return True, mcs   
        return False, set()

    elif node["type"] == "AND":
        all_mcs = set()
        for child in node.get("children", []):
            matched, mcs = evaluate_fault_tree(child, answer_event)
            if not matched:
                return False, set()  
            all_mcs.update(mcs)
        return True, all_mcs

    return False, set()

def _evaluate_condition(condition, answer_event):
    if not condition:
        return True   
    checks = []
    if "answer_selected" in condition:
        checks.append(answer_event.get("answer_selected") == condition["answer_selected"])
    if "time_bracket" in condition:
        checks.append(answer_event.get("time_bracket") == condition["time_bracket"])
    if "prior_error_pattern" in condition:
        prior_patterns = answer_event.get("prior_error_patterns", [])
        checks.append(condition["prior_error_pattern"] in prior_patterns)

    return all(checks) if checks else True

def classify_error(question, answer_selected, time_taken_ms, error_history):

    if answer_selected == question.get("correct_answer"):
        return "correct"

    ratio = time_taken_ms / question.get("avg_time_incorrect_ms", 1) 
    if ratio < 0.5:
        return "slip"

    same_errors = [
        e for e in error_history
        if e.get("concept_id") == question.get("concept_id")
        and e.get("answer_selected") == answer_selected
    ]
    if len(same_errors) >= 2:
        return "mistake"     

    return "mistake"

def generate_fault_tree(question):

    children = []
    correct = question.get("correct_answer")
    options = question.get("options", {})

    for key, option in options.items():
        if key == correct:
            continue  

        error_tag = option.get("error_tag")
        if not error_tag:
            continue  

        children.append({
            "type": "LEAF",
            "label": f"Chose {key} — {option.get('error_description', error_tag)}",
            "misconception_id": error_tag,
            "condition": {"answer_selected": key}
        })

    if not children:

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

    if "fault_tree" in question and question["fault_tree"]:
        return question["fault_tree"]
    return generate_fault_tree(question)

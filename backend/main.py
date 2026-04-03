import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from fault_tree_engine.fault_tree import evaluate_fault_tree, classify_error, get_fault_tree
from dag_engine.dag import ConceptDAG
from dag_engine.blame import backpropagate_blame, get_top_repair_target, get_repair_queue
from dag_engine.mastery import MasteryTracker
from irt_engine.tracker import IRTTracker
from irt_engine.irt import select_next_question
app = FastAPI(title="Zentrix — Episteme Engine", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "questions.json")

# ─────────────────────────────────────────────────────────────────
# Initialise DAG once at startup (reads from data/ JSON files)
# ─────────────────────────────────────────────────────────────────
concept_dag = ConceptDAG()

# In-memory per-session mastery trackers (keyed by student_id)
# In production this would be backed by a database
_student_trackers: dict[str, MasteryTracker] = {}
_irt_trackers: dict[str, IRTTracker] = {}


def _get_tracker(student_id: str) -> MasteryTracker:
    """Get or create a MasteryTracker for a student."""
    if student_id not in _student_trackers:
        _student_trackers[student_id] = MasteryTracker()
    return _student_trackers[student_id]


def _get_irt_tracker(student_id: str) -> IRTTracker:
    """Get or create an IRTTracker for a student."""
    if student_id not in _irt_trackers:
        _irt_trackers[student_id] = IRTTracker()
    return _irt_trackers[student_id]


def load_questions():
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, "r") as f:
        return json.load(f)


# ─────────────────────────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────────────────────────

class ErrorHistoryItem(BaseModel):
    concept_id: str
    answer_selected: str


class EvaluateRequest(BaseModel):
    question_id: str
    answer_selected: str
    time_taken_ms: int
    student_id: str = "default"
    confidence: float = 100.0
    error_history: List[ErrorHistoryItem] = []
    prior_error_patterns: List[str] = []


class BlameRequest(BaseModel):
    misconception_ids: List[str]
    mastery: Dict[str, float] = {}
    student_id: Optional[str] = None
    decay: float = 0.6
    max_items: int = 5


class MasteryUpdateRequest(BaseModel):
    student_id: str = "default"
    concept_id: str
    correct: bool


# ─────────────────────────────────────────────────────────────────
# Feature 1 — Questions & Fault Tree
# ─────────────────────────────────────────────────────────────────

@app.get("/api/questions")
def get_all_questions():
    """Return all questions, stripping internal fields for the frontend."""
    questions = load_questions()
    results = []
    for q in questions:
        client_q = {
            "id": q["id"],
            "concept_id": q["concept_id"],
            "stem": q["stem"],
            "correct_answer": q["correct_answer"],
            "options": {
                key: {"text": opt["text"]}
                for key, opt in q["options"].items()
            }
        }
        results.append(client_q)
    return results


@app.get("/api/questions/{question_id}")
def get_question(question_id: str):
    questions = load_questions()
    for q in questions:
        if q["id"] == question_id:
            return {
                "id": q["id"],
                "concept_id": q["concept_id"],
                "stem": q["stem"],
                "correct_answer": q["correct_answer"],
                "options": {
                    key: {"text": opt["text"]}
                    for key, opt in q["options"].items()
                }
            }
    raise HTTPException(status_code=404, detail="Question not found")


@app.post("/api/evaluate")
def evaluate_answer(req: EvaluateRequest):
    """
    Full diagnostic pipeline:
      1. Classify error (slip / lapse / mistake)
      2. Run fault tree → minimal cut set
      3. Map misconceptions → concepts via DAG
      4. Run blame backpropagation → repair queue
      5. Update mastery tracking
    """
    questions = load_questions()
    question = next((q for q in questions if q["id"] == req.question_id), None)

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # 1. Classify Error
    error_type = classify_error(
        question,
        req.answer_selected,
        req.time_taken_ms,
        [err.model_dump() for err in req.error_history]
    )

    is_correct = error_type == "correct"
    concept_id = question["concept_id"]

    # Update mastery tracker
    tracker = _get_tracker(req.student_id)
    tracker.record_response(concept_id, correct=is_correct)
    
    # Update IRT tracker
    irt_tracker = _get_irt_tracker(req.student_id)
    irt_tracker.record_response(
        req.question_id, 
        is_correct, 
        req.confidence, 
        {q["id"]: q for q in questions}
    )

    result = {
        "is_correct": is_correct,
        "error_type": error_type,
        "concept_id": concept_id,
        "minimal_cut_set": [],
        "misconception_descriptions": [],
        "blame_propagation": [],
        "top_repair_target": None,
        "mastery_update": {
            "concept_id": concept_id,
            "new_mastery": round(tracker.get_mastery(concept_id), 2),
            "state": tracker.get_mastery_state(concept_id),
        },
        "calibration": irt_tracker.get_state_summary(),
    }

    # 2. Run Fault Tree if not correct and not a slip
    if not is_correct and error_type != "slip":
        fault_tree = get_fault_tree(question)

        answer_event = {
            "answer_selected": req.answer_selected,
            "time_bracket": "fast" if error_type == "slip" else "medium",
            "prior_error_patterns": req.prior_error_patterns,
        }

        matched, mcs = evaluate_fault_tree(fault_tree, answer_event)
        result["fault_tree_matched"] = matched
        result["minimal_cut_set"] = list(mcs)
        result["misconception_descriptions"] = [
            {
                "id": mc,
                "description": concept_dag.misconceptions.get(mc, {}).get(
                    "description", "Unknown misconception"
                ),
                "concept_id": concept_dag.mc_to_concept.get(mc, "unknown"),
            }
            for mc in mcs
        ]

        # 3. Blame backpropagation
        if mcs:
            mastery = tracker.get_all_mastery()
            repair_queue = get_repair_queue(
                concept_dag, mcs, mastery, max_items=5
            )
            result["blame_propagation"] = repair_queue
            if repair_queue:
                result["top_repair_target"] = repair_queue[0]

    return result


# ─────────────────────────────────────────────────────────────────
# Feature 2 — Prerequisite DAG + Blame Backpropagation
# ─────────────────────────────────────────────────────────────────

@app.get("/api/dag")
def get_dag(student_id: Optional[str] = None):
    """
    Return the full concept DAG for frontend visualization.
    If student_id is provided, includes mastery scores and concept states.
    """
    mastery = None
    if student_id:
        tracker = _get_tracker(student_id)
        mastery = tracker.get_all_mastery()
    return concept_dag.to_serializable(mastery)


@app.get("/api/dag/concept/{concept_id}")
def get_concept(concept_id: str, student_id: Optional[str] = None):
    """Return details for a single concept, including prerequisites and dependents."""
    if concept_id not in concept_dag.nodes:
        raise HTTPException(status_code=404, detail=f"Concept {concept_id} not found")

    concept = concept_dag.nodes[concept_id]
    mastery = {}
    if student_id:
        tracker = _get_tracker(student_id)
        mastery = tracker.get_all_mastery()

    return {
        "id": concept_id,
        "name": concept["name"],
        "tier": concept["tier"],
        "bloom_level": concept.get("bloom_level"),
        "description": concept.get("description", ""),
        "mastery_threshold": concept.get("mastery_threshold", 75),
        "prerequisites": concept_dag.prereqs.get(concept_id, []),
        "dependents": concept_dag.dependents.get(concept_id, []),
        "all_prerequisites": concept_dag.get_all_prerequisites(concept_id),
        "all_dependents": concept_dag.get_all_dependents(concept_id),
        "mastery": mastery.get(concept_id, 0) if mastery else 0,
        "state": concept_dag.get_concept_state(concept_id, mastery),
    }


@app.get("/api/dag/topological-order")
def get_topological_order():
    """Return concepts in a valid study order."""
    order = concept_dag.topological_order()
    return [
        {
            "concept_id": cid,
            "name": concept_dag.nodes[cid]["name"],
            "tier": concept_dag.nodes[cid]["tier"],
        }
        for cid in order
    ]


@app.post("/api/dag/blame")
def run_blame_propagation(req: BlameRequest):
    """
    Run blame backpropagation from a set of misconception IDs.
    Uses student's tracked mastery if student_id is provided,
    otherwise uses the mastery dict in the request body.
    """
    mastery = req.mastery
    if req.student_id:
        tracker = _get_tracker(req.student_id)
        mastery = tracker.get_all_mastery()
        # Merge: request mastery overrides tracked mastery
        if req.mastery:
            mastery.update(req.mastery)

    misconception_set = set(req.misconception_ids)
    root_concepts = concept_dag.misconception_to_concepts(misconception_set)

    if not root_concepts:
        return {
            "repair_queue": [],
            "root_concepts": [],
            "message": "No matching concepts found for the given misconceptions."
        }

    repair_queue = backpropagate_blame(
        concept_dag, root_concepts, mastery, decay=req.decay
    )

    return {
        "root_concepts": list(root_concepts),
        "repair_queue": repair_queue[:req.max_items],
        "full_blame_chain": repair_queue,
    }


@app.get("/api/dag/unlock-status")
def get_unlock_status(student_id: str = "default"):
    """Return the unlock status of every concept for a student."""
    tracker = _get_tracker(student_id)
    mastery = tracker.get_all_mastery()

    statuses = []
    for cid in concept_dag.topological_order():
        concept = concept_dag.nodes[cid]
        statuses.append({
            "concept_id": cid,
            "name": concept["name"],
            "tier": concept["tier"],
            "mastery": round(mastery.get(cid, 0), 2),
            "state": concept_dag.get_concept_state(cid, mastery),
            "is_unlocked": concept_dag.is_unlocked(cid, mastery),
            "prerequisites_met": [
                {
                    "concept_id": pid,
                    "mastery": round(mastery.get(pid, 0), 2),
                    "threshold": concept_dag.nodes[pid].get("mastery_threshold", 75),
                    "met": mastery.get(pid, 0) >= concept_dag.nodes[pid].get("mastery_threshold", 75),
                }
                for pid in concept_dag.prereqs.get(cid, [])
            ],
        })
    return statuses


# ─────────────────────────────────────────────────────────────────
# Mastery Tracking
# ─────────────────────────────────────────────────────────────────

@app.post("/api/mastery/update")
def update_mastery(req: MasteryUpdateRequest):
    """Manually record a response and update mastery for a concept."""
    tracker = _get_tracker(req.student_id)
    new_mastery = tracker.record_response(req.concept_id, req.correct)
    return {
        "concept_id": req.concept_id,
        "new_mastery": round(new_mastery, 2),
        "state": tracker.get_mastery_state(req.concept_id),
    }


@app.get("/api/mastery/{student_id}")
def get_student_mastery(student_id: str):
    """Return full mastery profile for a student."""
    tracker = _get_tracker(student_id)
    return {
        "student_id": student_id,
        "mastery": tracker.to_serializable(),
        "summaries": tracker.get_all_summaries(concept_dag),
    }


@app.get("/api/mastery/{student_id}/{concept_id}")
def get_concept_mastery(student_id: str, concept_id: str):
    """Return mastery details for a specific concept."""
    tracker = _get_tracker(student_id)
    return tracker.get_concept_summary(concept_id, concept_dag)


# ─────────────────────────────────────────────────────────────────
# Health & Info & IRT Next
# ─────────────────────────────────────────────────────────────────

class NextQuestionRequest(BaseModel):
    student_id: str = "default"

@app.post("/api/irt/next-question")
def get_next_question_irt(req: NextQuestionRequest):
    irt_tracker = _get_irt_tracker(req.student_id)
    questions = load_questions()
    used_ids = {qid for qid, _, _ in irt_tracker.history}
    next_q = select_next_question(questions, irt_tracker.theta, used_ids)
    
    if not next_q:
        return {"status": "Complete", "message": "No more questions available"}
        
    return {
        "status": "Success",
        "question": {
            "id": next_q["id"],
            "concept_id": next_q["concept_id"],
            "stem": next_q["stem"],
            "correct_answer": next_q["correct_answer"],
            "options": {
                key: {"text": opt["text"]}
                for key, opt in next_q["options"].items()
            }
        },
        "current_theta": round(irt_tracker.theta, 3)
    }

@app.get("/api/irt/student/{student_id}")
def get_irt_student(student_id: str):
    """
    Returns the generic state summary (calibration, rolling brier score, theta) for a given student.
    """
    tracker = _get_irt_tracker(student_id)
    return tracker.get_state_summary()

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "concepts_loaded": len(concept_dag.nodes),
        "misconceptions_loaded": len(concept_dag.mc_to_concept),
        "questions_loaded": len(load_questions()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

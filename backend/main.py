import json
import os
import time
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
from behavior_tree_engine.behavior_tree import BehaviorTree, LearnerState, BTAction, update_fatigue
from behavior_tree_engine.sm2 import ReviewQueue, compute_grade
from behavior_tree_engine.explainability import ExplainabilityEngine
from db.supabase_client import (
    get_supabase_client, is_connected,
    save_student, load_student,
    save_session_response, save_mastery_snapshot,
    register_student, login_student,
)

app = FastAPI(title="Zentrix — Episteme Engine", version="2.0")





FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:8000",
    "https://zentrix-93lvioc6e-neels-projects-9d7dae42.vercel.app",
]

# Robustly handle the FRONTEND_URL environment variable
if FRONTEND_URL:
    clean_url = FRONTEND_URL.rstrip("/")
    if clean_url.startswith("http://"):
        origins.append(clean_url.replace("http://", "https://"))
    elif clean_url.startswith("https://"):
        origins.append(clean_url.replace("https://", "http://"))
    
    if clean_url not in origins:
        origins.append(clean_url)
    origins.append(clean_url + "/")


# Regex to match all Vercel subdomains and local dev ports
ALLOW_ORIGIN_REGEX = r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_origin_regex=ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)






@app.get("/api/config-debug")
def config_debug():
    return {
        "origins": origins,
        "frontend_url_env": FRONTEND_URL,
        "mode": os.getenv("ENV", "development")
    }

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "questions.json")

concept_dag = ConceptDAG()
behavior_tree = BehaviorTree()
explainability = ExplainabilityEngine()

_student_trackers: dict[str, MasteryTracker] = {}
_irt_trackers: dict[str, IRTTracker] = {}
_review_queues: dict[str, ReviewQueue] = {}
_learner_states: dict[str, dict] = {}  

def _get_tracker(student_id: str) -> MasteryTracker:
    if student_id not in _student_trackers:
        _student_trackers[student_id] = MasteryTracker()
    return _student_trackers[student_id]

def _get_irt_tracker(student_id: str) -> IRTTracker:
    if student_id not in _irt_trackers:
        _irt_trackers[student_id] = IRTTracker()
    return _irt_trackers[student_id]

def _get_review_queue(student_id: str) -> ReviewQueue:
    if student_id not in _review_queues:
        _review_queues[student_id] = ReviewQueue()
    return _review_queues[student_id]

def _get_learner_state(student_id: str) -> dict:
    if student_id not in _learner_states:
        _learner_states[student_id] = {
            "calibration_state": "well_calibrated",
            "top_priority_concept": None,
            "top_priority_blame": 0.0,
            "current_concept_id": "",
            "current_concept_mastery": 0.0,
            "consecutive_correct_streak": 0,
            "consecutive_wrong_streak": 0,
            "fatigue_score": 0.0,
            "items_in_session": 0,
            "theta": 0.0,
            "theta_se": 4.0,
            "slip_count_session": 0,
            "active_misconception_id": None,
            "session_minutes_elapsed": 0.0,
        }
    return _learner_states[student_id]

def load_questions():
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, "r") as f:
        return json.load(f)

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

class BTTickRequest(BaseModel):
    student_id: str = "default"
    state_overrides: Dict = {}

class SessionProcessRequest(BaseModel):

    student_id: str = "default"
    question_id: str
    answer_selected: str
    time_taken_ms: int
    confidence: float = 50.0
    error_history: List[ErrorHistoryItem] = []
    prior_error_patterns: List[str] = []

class AuthRequest(BaseModel):
    email: str
    password: str
    name: str = ""

class NextQuestionRequest(BaseModel):
    student_id: str = "default"

@app.get("/api/questions")
def get_all_questions():
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

    questions = load_questions()
    question = next((q for q in questions if q["id"] == req.question_id), None)

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    error_type = classify_error(
        question,
        req.answer_selected,
        req.time_taken_ms,
        [err.model_dump() for err in req.error_history]
    )

    is_correct = error_type == "correct"
    concept_id = question["concept_id"]

    tracker = _get_tracker(req.student_id)
    tracker.record_response(concept_id, correct=is_correct)

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

        if mcs:
            mastery = tracker.get_all_mastery()
            repair_queue = get_repair_queue(
                concept_dag, mcs, mastery, max_items=5
            )
            result["blame_propagation"] = repair_queue
            if repair_queue:
                result["top_repair_target"] = repair_queue[0]

    save_session_response(req.student_id, {
        "question_id": req.question_id,
        "answer_selected": req.answer_selected,
        "is_correct": is_correct,
        "error_type": error_type,
        "time_taken_ms": req.time_taken_ms,
        "confidence": req.confidence,
        "concept_id": concept_id,
    })

    return result

@app.get("/api/dag")
def get_dag(student_id: Optional[str] = None):
    mastery = None
    if student_id:
        tracker = _get_tracker(student_id)
        mastery = tracker.get_all_mastery()
    return concept_dag.to_serializable(mastery)

@app.get("/api/dag/concept/{concept_id}")
def get_concept(concept_id: str, student_id: Optional[str] = None):
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
    mastery = req.mastery
    if req.student_id:
        tracker = _get_tracker(req.student_id)
        mastery = tracker.get_all_mastery()
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

@app.post("/api/mastery/update")
def update_mastery(req: MasteryUpdateRequest):
    tracker = _get_tracker(req.student_id)
    new_mastery = tracker.record_response(req.concept_id, req.correct)
    return {
        "concept_id": req.concept_id,
        "new_mastery": round(new_mastery, 2),
        "state": tracker.get_mastery_state(req.concept_id),
    }

@app.get("/api/mastery/{student_id}")
def get_student_mastery(student_id: str):
    tracker = _get_tracker(student_id)
    return {
        "student_id": student_id,
        "mastery": tracker.to_serializable(),
        "summaries": tracker.get_all_summaries(concept_dag),
    }

@app.get("/api/mastery/{student_id}/{concept_id}")
def get_concept_mastery(student_id: str, concept_id: str):
    tracker = _get_tracker(student_id)
    return tracker.get_concept_summary(concept_id, concept_dag)

@app.post("/api/bt/tick")
def bt_tick(req: BTTickRequest):

    state_dict = _get_learner_state(req.student_id)
    state_dict.update(req.state_overrides)

    state = LearnerState.from_dict(state_dict)
    action = behavior_tree.tick(state)

    return {
        "action": action.to_dict(),
        "learner_state": state.to_dict(),
    }

@app.get("/api/bt/state/{student_id}")
def get_bt_state(student_id: str):

    state_dict = _get_learner_state(student_id)
    return state_dict

@app.get("/api/bt/structure")
def get_bt_structure():

    return behavior_tree.get_tree_structure()

@app.post("/api/session/process")
def process_session_step(req: SessionProcessRequest):

    questions = load_questions()
    question = next((q for q in questions if q["id"] == req.question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    concept_id = question["concept_id"]
    tracker = _get_tracker(req.student_id)
    irt_tracker = _get_irt_tracker(req.student_id)
    review_queue = _get_review_queue(req.student_id)
    learner_state = _get_learner_state(req.student_id)

    theta_before = irt_tracker.theta
    se_before = irt_tracker.theta_se

    error_type = classify_error(
        question, req.answer_selected, req.time_taken_ms,
        [err.model_dump() for err in req.error_history]
    )
    is_correct = error_type == "correct"

    fault_tree_result = None
    mcs = set()
    misconception_descriptions = []

    if not is_correct and error_type != "slip":
        fault_tree = get_fault_tree(question)
        answer_event = {
            "answer_selected": req.answer_selected,
            "time_bracket": _get_time_bracket(req.time_taken_ms, question),
            "prior_error_patterns": req.prior_error_patterns,
        }
        matched, mcs = evaluate_fault_tree(fault_tree, answer_event)
        fault_tree_result = {
            "matched": matched,
            "minimal_cut_set": list(mcs),
        }
        misconception_descriptions = [
            {
                "id": mc,
                "description": concept_dag.misconceptions.get(mc, {}).get(
                    "description", "Unknown misconception"
                ),
                "concept_id": concept_dag.mc_to_concept.get(mc, "unknown"),
            }
            for mc in mcs
        ]

    blame_result = []
    if mcs:
        mastery = tracker.get_all_mastery()
        blame_result = get_repair_queue(concept_dag, mcs, mastery, max_items=5)

    tracker.record_response(concept_id, correct=is_correct)

    irt_tracker.record_response(
        req.question_id, is_correct, req.confidence,
        {q["id"]: q for q in questions}
    )

    calibration = irt_tracker.get_state_summary()

    learner_state["fatigue_score"] = update_fatigue(
        learner_state.get("fatigue_score", 0), is_correct
    )
    learner_state["items_in_session"] = learner_state.get("items_in_session", 0) + 1
    learner_state["current_concept_id"] = concept_id
    learner_state["current_concept_mastery"] = tracker.get_mastery(concept_id)
    learner_state["theta"] = irt_tracker.theta
    learner_state["theta_se"] = irt_tracker.theta_se
    learner_state["calibration_state"] = calibration["calibration_state"]

    if is_correct:
        learner_state["consecutive_correct_streak"] = learner_state.get("consecutive_correct_streak", 0) + 1
        learner_state["consecutive_wrong_streak"] = 0
    else:
        learner_state["consecutive_wrong_streak"] = learner_state.get("consecutive_wrong_streak", 0) + 1
        learner_state["consecutive_correct_streak"] = 0
        if error_type == "slip":
            learner_state["slip_count_session"] = learner_state.get("slip_count_session", 0) + 1

    if mcs:
        learner_state["active_misconception_id"] = list(mcs)[0]
    elif is_correct:
        learner_state["active_misconception_id"] = None

    if blame_result:
        learner_state["top_priority_concept"] = blame_result[0]["concept_id"]
        learner_state["top_priority_blame"] = blame_result[0]["blame_weight"]

    state_obj = LearnerState.from_dict(learner_state)
    bt_action = behavior_tree.tick(state_obj)

    irt_update = {
        "theta_before": round(theta_before, 3),
        "theta_after": round(irt_tracker.theta, 3),
        "se_before": round(se_before, 3),
        "se_after": round(irt_tracker.theta_se, 3),
    }

    explanation = explainability.assemble_record(
        question_id=req.question_id,
        answer_selected=req.answer_selected,
        correct_answer=question["correct_answer"],
        is_correct=is_correct,
        error_type=error_type,
        confidence=req.confidence,
        time_taken_ms=req.time_taken_ms,
        fault_tree_result=fault_tree_result,
        blame_result=blame_result,
        irt_update=irt_update,
        calibration=calibration,
        bt_action=bt_action.to_dict(),
        misconception_descriptions=misconception_descriptions,
        current_concept=concept_id,
    )

    time_bracket = _get_time_bracket(req.time_taken_ms, question)
    grade = compute_grade(is_correct, error_type, time_bracket, req.confidence)
    review_queue.add_or_update(concept_id, grade)

    save_session_response(req.student_id, {
        "question_id": req.question_id,
        "answer_selected": req.answer_selected,
        "is_correct": is_correct,
        "error_type": error_type,
        "time_taken_ms": req.time_taken_ms,
        "confidence": req.confidence,
        "concept_id": concept_id,
    })

    return {
        "is_correct": is_correct,
        "error_type": error_type,
        "correct_answer": question["correct_answer"],
        "concept_id": concept_id,
        "minimal_cut_set": list(mcs),
        "misconception_descriptions": misconception_descriptions,
        "blame_propagation": blame_result,
        "mastery_update": {
            "concept_id": concept_id,
            "new_mastery": round(tracker.get_mastery(concept_id), 2),
            "state": tracker.get_mastery_state(concept_id),
        },
        "irt_update": irt_update,
        "calibration": calibration,
        "bt_action": bt_action.to_dict(),
        "explanation": explanation,
        "learner_state": learner_state,
        "review_queue": review_queue.to_serializable()[:3],
    }

def _get_time_bracket(time_ms: int, question: dict) -> str:

    avg = question.get("avg_time_incorrect_ms", 30000)
    ratio = time_ms / max(avg, 1)
    if ratio < 0.5:
        return "fast"
    if ratio < 1.5:
        return "medium"
    return "slow"

@app.get("/api/sm2/queue/{student_id}")
def get_review_queue_endpoint(student_id: str):
    rq = _get_review_queue(student_id)
    return {
        "student_id": student_id,
        "queue": rq.to_serializable(),
        "due_items": [
            {**item, "concept_name": concept_dag.nodes.get(item["concept_id"], {}).get("name", "")}
            for item in rq.get_due_items()
        ],
    }

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
    tracker = _get_irt_tracker(student_id)
    return tracker.get_state_summary()

_inmemory_users: dict[str, dict] = {}

@app.post("/api/auth/register")
def auth_register(req: AuthRequest):

    if is_connected():
        result = register_student(req.email, req.password, req.name)
        if result:
            return {"status": "success", "user": result}
        raise HTTPException(status_code=400, detail="Registration failed")

    if req.email in _inmemory_users:
        raise HTTPException(status_code=400, detail="User already exists")
    user_id = f"user_{len(_inmemory_users) + 1}"
    _inmemory_users[req.email] = {
        "id": user_id,
        "email": req.email,
        "password": req.password,
        "name": req.name,
    }
    return {"status": "success", "user": {"id": user_id, "email": req.email, "name": req.name}}

@app.post("/api/auth/login")
def auth_login(req: AuthRequest):

    if is_connected():
        result = login_student(req.email, req.password)
        if result:
            return {"status": "success", "user": result}
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = _inmemory_users.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "status": "success",
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]}
    }

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "concepts_loaded": len(concept_dag.nodes),
        "misconceptions_loaded": len(concept_dag.mc_to_concept),
        "questions_loaded": len(load_questions()),
        "supabase_connected": is_connected(),
        "engines": {
            "fault_tree": True,
            "dag_blame": True,
            "irt": True,
            "behavior_tree": True,
            "sm2": True,
            "explainability": True,
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

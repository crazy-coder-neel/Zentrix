import json
import os
import time
import nltk
from typing import List, Optional, Dict
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from feature_intellirev.router import router as intellirev_router
from youtube_transcript_api import YouTubeTranscriptApi

from fault_tree_engine.fault_tree import evaluate_fault_tree, classify_error, get_fault_tree
from dag_engine.dag import ConceptDAG
from dag_engine.blame import backpropagate_blame
from dag_engine.mastery import MasteryTracker
from irt_engine.tracker import IRTTracker
from irt_engine.irt import select_next_question
from behavior_tree_engine.behavior_tree import BehaviorTree, LearnerState, update_fatigue
from behavior_tree_engine.sm2 import ReviewQueue, compute_grade
from behavior_tree_engine.explainability import ExplainabilityEngine
from db.supabase_client import (
    is_connected,
    save_session_response,
    register_student, login_student,
)

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Zentrix-IntelliRev Unified Backend starting...")
    try:
        nltk.download("stopwords", quiet=True)
        nltk.download("punkt", quiet=True)
        nltk.download("averaged_perceptron_tagger", quiet=True)
        print(f"📊 DIAGNOSTIC - YouTubeTranscriptApi methods: {[m for m in dir(YouTubeTranscriptApi) if not m.startswith('_')]}")
    except Exception as e:
        print(f"⚠️ Startup warning: {e}")
    yield
    print("👋 Unified backend shutting down.")

app = FastAPI(
    title="Zentrix-IntelliRev API",
    description="Deterministic Unified Backend with Cognitive Diagnosis & Adaptive Learning",
    version="2.0.0",
    lifespan=lifespan,
)

frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
if frontend_url:
    origins.append(frontend_url)
    origins.append(frontend_url + "/")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if frontend_url else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"❌ Global Error: {str(exc)}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
    )

app.include_router(intellirev_router, prefix="/intellirev", tags=["IntelliRev"])

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "questions.json")
concept_dag = ConceptDAG()
behavior_tree = BehaviorTree()
explainability = ExplainabilityEngine()

_student_trackers: dict[str, MasteryTracker] = {}
_irt_trackers: dict[str, IRTTracker] = {}
_review_queues: dict[str, ReviewQueue] = {}
_learner_states: dict[str, dict] = {}

def _get_tracker(student_id: str) -> MasteryTracker:
    if student_id not in _student_trackers: _student_trackers[student_id] = MasteryTracker()
    return _student_trackers[student_id]

def _get_irt_tracker(student_id: str) -> IRTTracker:
    if student_id not in _irt_trackers: _irt_trackers[student_id] = IRTTracker()
    return _irt_trackers[student_id]

def _get_review_queue(student_id: str) -> ReviewQueue:
    if student_id not in _review_queues: _review_queues[student_id] = ReviewQueue()
    return _review_queues[student_id]

def _get_learner_state(student_id: str) -> dict:
    if student_id not in _learner_states:
        _learner_states[student_id] = {
            "calibration_state": "well_calibrated", "top_priority_concept": None,
            "top_priority_blame": 0.0, "current_concept_id": "", "current_concept_mastery": 0.0,
            "consecutive_correct_streak": 0, "consecutive_wrong_streak": 0, "fatigue_score": 0.0,
            "items_in_session": 0, "theta": 0.0, "theta_se": 4.0, "slip_count_session": 0,
            "active_misconception_id": None, "session_minutes_elapsed": 0.0,
        }
    return _learner_states[student_id]

def load_questions():
    if not os.path.exists(DATA_PATH): return []
    with open(DATA_PATH, "r") as f: return json.load(f)

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

@app.get("/api/questions")
def get_all_questions():
    questions = load_questions()
    return [{
        "id": q["id"], "concept_id": q["concept_id"], "stem": q["stem"], "correct_answer": q["correct_answer"],
        "options": {k: {"text": v["text"]} for k, v in q["options"].items()}
    } for q in questions]

@app.get("/api/irt/student/{student_id}")
def get_irt_student(student_id: str):
    return _get_irt_tracker(student_id).get_state_summary()

@app.get("/api/mastery/{student_id}")
def get_student_mastery(student_id: str):
    tracker = _get_tracker(student_id)
    return {
        "student_id": student_id,
        "mastery": tracker.to_serializable(),
        "summaries": tracker.get_all_summaries(concept_dag),
    }

@app.get("/api/dag")
def get_dag(student_id: Optional[str] = None):
    mastery = _get_tracker(student_id).get_all_mastery() if student_id else None
    return concept_dag.to_serializable(mastery)

@app.post("/api/evaluate")
def evaluate_answer(req: EvaluateRequest):
    questions = load_questions()
    question = next((q for q in questions if q["id"] == req.question_id), None)
    if not question: raise HTTPException(status_code=404, detail="Question not found")

    error_type = classify_error(question, req.answer_selected, req.time_taken_ms, [err.model_dump() for err in req.error_history])
    is_correct = error_type == "correct"
    concept_id = question["concept_id"]

    _get_tracker(req.student_id).record_response(concept_id, correct=is_correct)
    irt_tracker = _get_irt_tracker(req.student_id)
    irt_tracker.record_response(req.question_id, is_correct, req.confidence, {q["id"]: q for q in questions})

    return {
        "is_correct": is_correct, "error_type": error_type, "concept_id": concept_id, "minimal_cut_set": [],
        "calibration": irt_tracker.get_state_summary(),
    }

class AuthRequest(BaseModel):
    email: str
    password: str
    name: str = ""

@app.post("/api/auth/register")
def auth_register(req: AuthRequest):
    result = register_student(req.email, req.password, req.name)
    if result: return {"status": "success", "user": result}
    return {"status": "error", "message": "Cloud connection unavailable. Registration limited."}

@app.post("/api/auth/login")
def auth_login(req: AuthRequest):
    result = login_student(req.email, req.password)
    if result: return {"status": "success", "user": result}
    return {"status": "error", "message": "Invalid email or password"}

@app.get("/health")
def unified_health():
    return {
        "status": "ok",
        "service": "Unified Zentrix IntelliRev",
        "engines": ["fault_tree", "dag", "irt", "bt", "nlp"],
        "supabase": is_connected()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

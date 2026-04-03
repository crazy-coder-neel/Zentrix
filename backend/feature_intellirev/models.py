"""
Pydantic request/response models for IntelliRev API.
"""
from typing import Optional
from pydantic import BaseModel


# ─── Upload ───────────────────────────────────────────
class UploadTextRequest(BaseModel):
    text: str
    user_id: str


class TopicModel(BaseModel):
    id: Optional[str] = None
    name: str
    day: int
    user_id: str


class PlanResponse(BaseModel):
    user_id: str
    plan: dict[str, list[str]]
    topics: list[str]
    topic_ids: dict[str, str]  # topic_name -> topic_id


# ─── Content ──────────────────────────────────────────
class VideoModel(BaseModel):
    video_id: str
    title: str
    url: str
    embed_url: str
    duration: Optional[int] = None
    views: Optional[int] = None


class ResourceModel(BaseModel):
    title: str
    url: str
    snippet: Optional[str] = None


class LearnContentResponse(BaseModel):
    topic_id: str
    topic_name: str
    video: Optional[VideoModel] = None
    summary: Optional[list[str]] = None
    keywords: Optional[list[str]] = None
    resources: Optional[list[ResourceModel]] = None


# ─── Quiz ─────────────────────────────────────────────
class QuizGenerateRequest(BaseModel):
    topic_id: str
    topic_name: str
    source_text: Optional[str] = None


class QuestionModel(BaseModel):
    id: Optional[str] = None
    question_text: str
    question_type: str  # "fill_blank" | "mcq"
    options: Optional[list[str]] = None
    answer: str
    topic_id: str


class QuizSubmitRequest(BaseModel):
    user_id: str
    topic_id: str
    answers: list[dict]  # [{question_id, given_answer, time_taken_secs}]


class QuizResult(BaseModel):
    score: int
    total: int
    percentage: float
    confidence_score: float
    feedback: list[dict]  # [{question_id, correct, given, expected}]
    classification: str   # "strong" | "medium" | "weak"
    next_revision: str    # ISO date string


# ─── Search ───────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    user_id: str


class SearchResponse(BaseModel):
    answer: str
    matched_keywords: list[str]
    source: Optional[str] = None


# ─── Profile ──────────────────────────────────────────
class WeakTopicModel(BaseModel):
    topic_id: str
    topic_name: str
    weakness_score: int
    confidence_score: float
    classification: str


class ActivityDay(BaseModel):
    date: str
    count: int


class ProfileResponse(BaseModel):
    user_id: str
    total_score: int
    streak: int
    weak_topics: list[WeakTopicModel]
    activity: list[ActivityDay]
    revision_schedule: list[dict]


# ─── Leaderboard ──────────────────────────────────────
class LeaderboardEntry(BaseModel):
    user_id: str
    score: int
    streak: int
    rank: int

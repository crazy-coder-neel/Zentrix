
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from .models import (
    LearnContentResponse,
    PlanResponse,
    ProfileResponse,
    QuizGenerateRequest,
    QuizSubmitRequest,
    SearchResponse,
    UploadTextRequest,
)
from .services import (
    discovery_service,
    intellirev_service,
    keyword_service,
    planner_service,
    quiz_service,
    search_service,
    summarizer_service,
    transcript_service,
    calendar_service,
)
from .utils.pdf_parser import extract_text_from_pdf
from .utils.text_cleaner import clean_text
from .db import get_client

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload", response_model=PlanResponse)
async def upload_syllabus(
    user_id: str = Form(...),
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    raw_text = ""

    if file and file.filename:
        content = await file.read()
        if file.filename.endswith(".pdf"):
            raw_text = extract_text_from_pdf(content)
        else:
            raw_text = content.decode("utf-8", errors="ignore")
    elif text:
        raw_text = text
    else:
        raise HTTPException(status_code=400, detail="Provide either a file or text.")

    if len(raw_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Text too short. Upload a proper syllabus.")

    cleaned = clean_text(raw_text)
    topics = planner_service.extract_topics(cleaned)
    plan = planner_service.build_study_plan(topics)

    db = get_client()
    topic_ids = {}
    plan_id = str(uuid.uuid4())
    plan_title = topics[0] + " Study Plan" if topics else "Study Plan"
    
    try:
        db.table("plans").insert({
            "id": plan_id,
            "user_id": user_id,
            "title": plan_title,
            "schedule": plan,
        }).execute()

        for day_label, day_topics in plan.items():
            day_num = int(day_label.split()[-1])
            for topic_name in day_topics:
                tid = str(uuid.uuid4())
                db.table("topics").insert({
                    "id": tid,
                    "user_id": user_id,
                    "plan_id": plan_id,
                    "name": topic_name,
                    "day": day_num,
                }).execute()
                topic_ids[topic_name] = tid
    except Exception as e:
        logger.warning(f"DB write failed (continuing without persistence): {e}")

    return PlanResponse(user_id=user_id, plan_id=plan_id, plan=plan, topics=topics, topic_ids=topic_ids)

@router.get("/plan/{user_id}")
async def get_plan(user_id: str):
    db = get_client()
    try:
        result = db.table("plans").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="No plan found for this user.")
        plan = result.data[0]

        topics_result = db.table("topics").select("id, name").eq("plan_id", plan["id"]).execute()
        topic_ids = {t["name"]: t["id"] for t in topics_result.data}
        return {"plan": plan["schedule"], "topics": plan["schedule"], "topic_ids": topic_ids}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/learn/{topic_id}", response_model=LearnContentResponse)
async def get_learn_content(topic_id: str):
    db = get_client()

    try:
        topic_result = db.table("topics").select("*").eq("id", topic_id).single().execute()
        topic = topic_result.data
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found.")
    except Exception:
        raise HTTPException(status_code=404, detail="Topic not found.")

    topic_name = topic["name"]
    user_id = topic.get("user_id")
    
    # Try to find existing discovery content in DB
    video_data = None
    try:
        cached_video = db.table("videos").select("*").eq("topic_id", topic_id).limit(1).execute()
        if cached_video.data:
            v = cached_video.data[0]
            video_data = {
                "video_id": v["video_id"],
                "title": v["title"],
                "url": v["url"],
                "embed_url": v["embed_url"],
                "duration": v.get("duration"),
                "views": v.get("views"),
            }
    except Exception:
        pass

    if video_data:
        # If we have a video, we might also have resources and notes
        try:
            res_result = db.table("resources").select("*").eq("topic_id", topic_id).execute()
            resources = [{"title": r["title"], "url": r["url"], "snippet": r.get("snippet")} for r in res_result.data]
            
            notes_result = db.table("notes").select("*").eq("topic_id", topic_id).limit(1).execute()
            summary = []
            keywords = []
            if notes_result.data:
                summary = notes_result.data[0].get("summary", [])
                keywords = notes_result.data[0].get("keywords", [])
                
            return LearnContentResponse(
                topic_id=topic_id,
                topic_name=topic_name,
                video=video_data,
                summary=summary,
                keywords=keywords,
                resources=resources,
            )
        except Exception:
            pass

    # If not cached, perform discovery
    return await discover_topic_content(topic_name, topic_id, user_id)

@router.get("/discover")
async def discover_topic_content_only(topic: str):
    return await discover_topic_content(topic)

async def discover_topic_content(topic_name: str, topic_id: str = None, user_id: str = None):
    db = get_client()
    context_prefix = ""
    if user_id:
        try:
            plan_res = db.table("plans").select("syllabus_text").eq("user_id", user_id).limit(1).execute()
            if plan_res.data:
                context_prefix = plan_res.data[0].get("syllabus_text", "")[:30].replace("\n", " ") + " "
        except Exception:
            pass

    search_query = f"{context_prefix}{topic_name}".strip()
    
    # 1. YouTube Discovery
    video_data = discovery_service.search_youtube(search_query)
    if video_data and topic_id:
        try:
            db.table("videos").insert({"topic_id": topic_id, **video_data}).execute()
        except Exception:
            pass

    # 2. Web Resources Discovery
    resources_data = discovery_service.search_web_resources(search_query)
    if resources_data and topic_id:
        try:
            for r in resources_data:
                db.table("resources").insert({"topic_id": topic_id, **r}).execute()
        except Exception:
            pass

    # 3. Transcript & Notes Generation
    summary_data = []
    keywords_data = []
    if video_data:
        try:
            transcript_text = transcript_service.get_transcript(video_data["url"])
            if transcript_text:
                summary_data = summarizer_service.textrank_summarize(transcript_text, n=8)
                keywords_data = keyword_service.extract_keywords(transcript_text, k=10)
                if topic_id:
                    try:
                        db.table("notes").insert({
                            "topic_id": topic_id,
                            "topic_name": topic_name,
                            "summary": summary_data,
                            "keywords": keywords_data,
                            "raw_text": transcript_text[:5000],
                        }).execute()
                    except Exception:
                        pass
        except Exception as e:
            logger.warning(f"Discovery transcript failed for {topic_name}: {e}")

    return LearnContentResponse(
        topic_id=topic_id or "temp_id",
        topic_name=topic_name,
        video=video_data,
        summary=summary_data,
        keywords=keywords_data,
        resources=resources_data,
    )

@router.post("/quiz/generate")
async def generate_quiz(req: QuizGenerateRequest):
    db = get_client()

    try:
        db.table("questions").delete().eq("topic_id", req.topic_id).execute()
    except Exception:
        pass

    source_texts = []
    if req.source_text:
        source_texts.append(req.source_text)

    source_text = ""

    if not source_texts:
        try:

            book = db.table("book_content").select("content").eq("topic_id", req.topic_id).execute()
            for b in (book.data or []):
                if b.get("content"):
                    source_texts.append(b["content"])

            note = db.table("notes").select("raw_text").eq("topic_id", req.topic_id).execute()
            for n in (note.data or []):
                if n.get("raw_text"):
                    source_texts.append(n["raw_text"])
        except Exception:
            pass

    source_text = " ".join(source_texts)

    if not source_text:
        source_text = f"{req.topic_name} is an important concept in this subject. Understanding {req.topic_name} helps in grasping related topics."

    questions = quiz_service.generate_questions(source_text, req.topic_id, n=8)

    try:
        for q in questions:
            db.table("questions").insert(q).execute()
    except Exception as e:
        logger.warning(f"Failed to store questions: {e}")

    return {"questions": questions}

@router.post("/quiz/submit")
async def submit_quiz(req: QuizSubmitRequest):
    db = get_client()

    question_map = {}
    try:
        qs = db.table("questions").select("*").eq("topic_id", req.topic_id).execute()
        question_map = {q["id"]: q for q in (qs.data or [])}
    except Exception:
        pass

    feedback = []
    correct = 0
    total = len(req.answers)

    for a in req.answers:
        qid = a.get("question_id")
        given = str(a.get("given_answer", "")).strip().lower()
        time_taken = a.get("time_taken_secs", 30)
        expected = ""
        is_correct = False

        if qid and qid in question_map:
            expected = str(question_map[qid].get("answer", "")).strip().lower()
            is_correct = given == expected

        if is_correct:
            correct += 1

        feedback.append({
            "question_id": qid,
            "correct": is_correct,
            "given": given,
            "expected": expected,
            "time_taken_secs": time_taken,
        })

    percentage = (correct / total * 100) if total > 0 else 0

    result = intellirev_service.process_quiz_result(
        user_id=req.user_id,
        topic_id=req.topic_id,
        correct=correct,
        total=total,
        feedback=feedback,
        db=db,
    )

    try:
        db.table("attempts").insert({
            "user_id": req.user_id,
            "topic_id": req.topic_id,
            "score": correct,
            "total": total,
            "percentage": percentage,
        }).execute()
    except Exception:
        pass

    return {
        "score": correct,
        "total": total,
        "percentage": percentage,
        **result,
        "feedback": feedback,
    }

@router.get("/search")
async def search(q: str, user_id: str):
    db = get_client()

    corpus = []
    try:
        notes = db.table("notes").select("raw_text", "topic_name").execute()
        for n in (notes.data or []):
            if n.get("raw_text"):
                corpus.append({"text": n["raw_text"], "source": n.get("topic_name", "")})
    except Exception:
        pass

    if not corpus:
        return SearchResponse(answer="No notes found. Please generate a study plan first.", matched_keywords=[], source=None)

    result = search_service.answer_query(q, corpus)
    return SearchResponse(**result)

@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    db = get_client()
    profile = intellirev_service.get_profile(user_id, db)
    return profile

@router.get("/leaderboard")
async def get_leaderboard():
    db = get_client()
    try:
        result = db.table("scores").select("user_id, total_score, streak").order("total_score", desc=True).limit(10).execute()
        leaderboard = [
            {"rank": i + 1, **entry}
            for i, entry in enumerate(result.data or [])
        ]
        return {"leaderboard": leaderboard}
    except Exception as e:
        return {"leaderboard": [], "error": str(e)}

@router.get("/activity/{user_id}")
async def get_activity(user_id: str):
    db = get_client()
    try:
        result = db.table("attempts").select("created_at").eq("user_id", user_id).execute()
        from collections import Counter
        from datetime import datetime

        date_counts = Counter()
        for row in (result.data or []):
            ts = row.get("created_at", "")
            if ts:
                day = ts[:10]
                date_counts[day] += 1

        activity = [{"date": d, "count": c} for d, c in sorted(date_counts.items())]
        return {"activity": activity}
    except Exception as e:
        return {"activity": [], "error": str(e)}

@router.post("/summarize")
async def summarize_video(video_url: str = Form(...), topic_name: str = Form("")):
    transcript_text = transcript_service.get_transcript(video_url)
    if not transcript_text:
        raise HTTPException(status_code=400, detail="Could not fetch video transcript. The video may not have captions.")

    summary = summarizer_service.textrank_summarize(transcript_text, n=5)
    keywords = keyword_service.extract_keywords(transcript_text, k=8)
    return {"summary": summary, "keywords": keywords, "source": "video_transcript"}

import asyncio

transcript_semaphore = asyncio.Semaphore(1)

@router.post("/generate-notes/{topic_id}")
async def generate_notes(topic_id: str, force: bool = False):
    db = get_client()

    if not force:
        try:
            cached = db.table("notes").select("*").eq("topic_id", topic_id).limit(1).execute()
            if cached.data and cached.data[0].get("summary"):
                logger.info(f"Using cached notes for topic {topic_id}")
                return {
                    "summary": cached.data[0]["summary"],
                    "keywords": cached.data[0].get("keywords", []),
                    "source": "cache",
                }
        except Exception:
            pass

    if force:
        try:
            db.table("notes").delete().eq("topic_id", topic_id).execute()
        except Exception:
            pass

    topic = None
    try:
        topic_result = db.table("topics").select("*").eq("id", topic_id).execute()
        if topic_result.data:
            topic = topic_result.data[0]
        else:

            all_topics = db.table("topics").select("*").limit(200).execute()
            if all_topics.data:
                topic = all_topics.data[0]
    except Exception:
        raise HTTPException(status_code=500, detail="Database error.")

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found.")

    topic_name = topic["name"]

    context_prefix = ""
    try:
        user_id = topic.get("user_id")
        if user_id:
            plan_res = db.table("plans").select("syllabus_text").eq("user_id", user_id).limit(1).execute()
            if plan_res.data:
                context_prefix = plan_res.data[0].get("syllabus_text", "")[:30].replace("\n", " ") + " "
    except Exception:
        pass
    search_query = f"{context_prefix}{topic_name}".strip()

    contexts = []

    try:
        book_contents = db.table("book_content").select("content").eq("topic_id", topic_id).execute()
        if book_contents.data:
            logger.info(f"RAG: Found {len(book_contents.data)} book segments for {topic_name}")
            for entry in book_contents.data:
                contexts.append(entry["content"])
    except Exception:
        pass

    video_url = None
    try:
        vid = db.table("videos").select("url").eq("topic_id", topic_id).limit(1).execute()
        if vid.data:
            video_url = vid.data[0]["url"]
        else:
            video_raw = discovery_service.search_youtube(search_query)
            if video_raw:
                db.table("videos").insert({"topic_id": topic_id, **video_raw}).execute()
                video_url = video_raw["url"]
    except Exception:
        pass

    if video_url:
        async with transcript_semaphore:
            transcript_text = transcript_service.get_transcript(video_url)
            if transcript_text:
                logger.info(f"RAG: Added video transcript context for {topic_name}")
                contexts.append(transcript_text)
            await asyncio.sleep(1)

    if len(" ".join(contexts)) < 500:
        logger.info(f"RAG: Insufficient context, triggering web crawl for {topic_name}")
        web_text = discovery_service.get_web_content(search_query)
        if web_text:
            contexts.append(web_text)

    if not contexts:
        return {
            "error": "RAG_CONTEXT_EMPTY",
            "message": "We couldn't find any content automatically. Please upload reference books or notes specifically for this topic to build your knowledge base.",
            "topic_id": topic_id
        }

    master_context = " ".join(contexts)
    summary = summarizer_service.textrank_summarize(master_context, n=25)
    keywords = keyword_service.extract_keywords(master_context, k=12)

    try:
        db.table("notes").insert({
            "topic_id": topic_id,
            "topic_name": topic_name,
            "summary": summary,
            "keywords": keywords,
            "raw_text": master_context[:8000],
        }).execute()
    except Exception:
        pass

    return {"summary": summary, "keywords": keywords, "source": f"RAG_AGGREGATED ({len(contexts)} sources)"}

@router.post("/upload-book")
async def upload_book(
    user_id: str = Form(...),
    file: UploadFile = File(...),
):
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    content = await file.read()
    raw_text = extract_text_from_pdf(content)

    if len(raw_text.strip()) < 100:
        raise HTTPException(status_code=400, detail="Could not extract enough text from this PDF.")

    cleaned = clean_text(raw_text)
    topics = planner_service.extract_topics(cleaned, max_topics=25)
    plan = planner_service.build_study_plan(topics)

    plan_id = str(uuid.uuid4())
    topic_ids = {}
    plan_title = file.filename.replace(".pdf", "").replace("_", " ").title() if file.filename else "Course Plan"

    try:
        db = get_client()
        db.table("plans").insert({
            "id": plan_id,
            "user_id": user_id,
            "title": plan_title,
            "schedule": plan,
        }).execute()

        chunk_size = max(500, len(cleaned) // max(len(topics), 1))
        for i, topic_name in enumerate(topics):
            tid = str(uuid.uuid4())
            day_num = 1
            for day_label, day_topics in plan.items():
                if topic_name in day_topics:
                    day_num = int(day_label.split()[-1])
                    break

            db.table("topics").insert({
                "id": tid,
                "user_id": user_id,
                "plan_id": plan_id,
                "name": topic_name,
                "day": day_num,
            }).execute()
            topic_ids[topic_name] = tid

            start = i * chunk_size
            chunk = cleaned[start:start + chunk_size]
            if chunk.strip():
                try:

                    summary = summarizer_service.textrank_summarize(chunk, n=6)
                    keywords = keyword_service.extract_keywords(chunk, k=8)

                    db.table("book_content").insert({
                        "topic_id": tid,
                        "content": chunk[:5000],
                    }).execute()

                    db.table("notes").insert({
                        "topic_id": tid,
                        "topic_name": topic_name,
                        "summary": summary,
                        "keywords": keywords,
                        "raw_text": chunk[:5000],
                    }).execute()
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"Book DB write failed: {e}")

    return PlanResponse(user_id=user_id, plan_id=plan_id, plan=plan, topics=topics, topic_ids=topic_ids)

@router.post("/qa")
async def answer_question(
    question: str = Form(...),
    topic_id: str = Form(...),
    user_id: str = Form("guest_user_001"),
):
    db = get_client()

    source_texts = []

    try:
        notes = db.table("notes").select("raw_text", "topic_name").eq("topic_id", topic_id).execute()
        for n in (notes.data or []):
            if n.get("raw_text"):
                source_texts.append(n["raw_text"])
    except Exception:
        pass

    try:
        book = db.table("book_content").select("content").eq("topic_id", topic_id).execute()
        for b in (book.data or []):
            if b.get("content"):
                source_texts.append(b["content"])
    except Exception:
        pass

    if not source_texts:
        return {
            "answer": "No content available for this topic yet. Generate notes first by clicking the Notes tab, or upload a book.",
            "confidence": 0,
            "matched_keywords": [],
        }

    combined_text = " ".join(source_texts)
    result = search_service.answer_query(question, [{"text": combined_text, "source": topic_id}])
    return result

@router.get("/suggest-questions/{topic_id}")
async def suggest_questions(topic_id: str):
    db = get_client()

    topic_name = "this topic"
    try:
        topic = db.table("topics").select("name").eq("id", topic_id).single().execute()
        topic_name = topic.data["name"]
    except Exception:
        pass

    source_text = ""
    try:
        notes = db.table("notes").select("raw_text, keywords").eq("topic_id", topic_id).limit(1).execute()
        if notes.data:
            source_text = notes.data[0].get("raw_text", "")
    except Exception:
        pass

    if not source_text:
        try:
            book = db.table("book_content").select("content").eq("topic_id", topic_id).limit(1).execute()
            if book.data:
                source_text = book.data[0].get("content", "")
        except Exception:
            pass

    if not source_text:
        return {"questions": [
            f"What is {topic_name}?",
            f"What are the key concepts in {topic_name}?",
            f"How is {topic_name} applied in practice?",
        ]}

    questions = []
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(source_text[:5000])

        chunks = list(set([
            chunk.text.strip().title()
            for chunk in doc.noun_chunks
            if len(chunk.text.strip()) > 3 and len(chunk.text.split()) <= 4
        ]))[:8]

        templates = [
            "What is {}?",
            "Explain how {} works.",
            "Why is {} important in this context?",
            "What are the key properties of {}?",
            "How does {} relate to other concepts?",
        ]

        import random
        for chunk in chunks[:5]:
            template = random.choice(templates)
            questions.append(template.format(chunk))

    except Exception:
        pass

    if not questions:
        keywords = keyword_service.extract_keywords(source_text, k=5)
        for kw in keywords:
            questions.append(f"What is {kw} and why is it important?")

    return {"questions": questions, "topic_name": topic_name}

@router.post("/sync-calendar")
async def sync_calendar(
    user_id: str = Form(...),
    plan_id: str = Form(...),
    access_token: str = Form(...),
    daily_slots: str = Form(...), # JSON string of daily_slots
):
    db = get_client()
    try:
        import json
        slots_dict = json.loads(daily_slots)

        # 1. Fetch the plan
        plan_res = db.table("plans").select("schedule").eq("id", plan_id).single().execute()
        if not plan_res.data:
            raise HTTPException(status_code=404, detail="Plan not found.")
        schedule = plan_res.data["schedule"]

        # 2. Sync to Google Calendar
        results = calendar_service.sync_study_plan(access_token, schedule, slots_dict)
        return {"status": "success", "synced_events": results}
    except Exception as e:
        logger.error(f"Calendar sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

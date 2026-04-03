"""
IntelliRev Backend — FastAPI Application Entry Point
Classical NLP + Rule-Based Learning Management System
No LLMs. No generative AI. Pure logic.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 IntelliRev backend starting...")
    # Pre-download NLTK data on startup
    try:
        import nltk
        nltk.download("stopwords", quiet=True)
        nltk.download("punkt", quiet=True)
        nltk.download("averaged_perceptron_tagger", quiet=True)
        from youtube_transcript_api import YouTubeTranscriptApi
        print(f"📊 DIAGNOSTIC - Library methods: {[m for m in dir(YouTubeTranscriptApi) if not m.startswith('_')]}")
    except Exception as e:
        print(f"⚠️ Startup warning: {e}")
    yield
    print("👋 IntelliRev backend shutting down.")


app = FastAPI(
    title="Zentrix IntelliRev API",
    description="Deterministic LMS — Classical NLP, No LLMs",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = str(exc)
    print(f"❌ Global Error: {error_msg}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": error_msg},
    )


origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from feature_intellirev.router import router as intellirev_router  # noqa: E402

app.include_router(intellirev_router, prefix="/intellirev", tags=["IntelliRev"])


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "IntelliRev",
        "version": "1.0.0",
        "ai_layer": "Classical NLP — No LLMs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

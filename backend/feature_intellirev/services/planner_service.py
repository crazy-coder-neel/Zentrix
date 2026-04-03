"""
Planner Service — Topic extraction and 5-day study plan generation.
Uses TF-IDF + spaCy noun chunks. No LLMs.
"""
import re
import math
import logging
from collections import Counter

logger = logging.getLogger(__name__)

_nlp = None


def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            raise RuntimeError(
                "spaCy model not found. Run: python -m spacy download en_core_web_sm"
            )
    return _nlp


def extract_topics(text: str, max_topics: int = 20) -> list[str]:
    """
    Extract key topics using:
    1. spaCy noun chunks (structural NLP)
    2. TF-IDF term significance (statistical)
    3. Frequency ranking (rule-based)
    """
    nlp = _get_nlp()
    truncated = text[:15000]  # Performance cap

    # 1. spaCy noun chunks
    doc = nlp(truncated)
    noun_chunks = []
    for chunk in doc.noun_chunks:
        txt = chunk.text.lower().strip()
        words = txt.split()
        # Keep 1-4 word meaningful phrases
        if 1 <= len(words) <= 4 and len(txt) > 3:
            noun_chunks.append(txt)

    # 2. Named entities (meaningful types)
    entities = []
    for ent in doc.ents:
        if ent.label_ in {"ORG", "PRODUCT", "WORK_OF_ART", "LAW", "NORP", "FAC", "GPE"}:
            entities.append(ent.text.lower().strip())

    # 3. TF-IDF top terms (cross-validate with noun chunks)
    sentences = [s.strip() for s in re.split(r'[.!?\n]', text) if len(s.strip()) > 20]
    tfidf_terms = set()
    if len(sentences) >= 3:
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            vectorizer = TfidfVectorizer(
                max_features=60,
                ngram_range=(1, 2),
                stop_words="english",
                min_df=1,
            )
            vectorizer.fit(sentences)
            tfidf_terms = set(vectorizer.get_feature_names_out())
        except Exception as e:
            logger.warning(f"TF-IDF failed: {e}")

    # 4. Score and rank
    all_candidates = noun_chunks + entities
    freq = Counter(all_candidates)

    scored = []
    seen = set()

    for topic, count in freq.most_common(max_topics * 3):
        normalized = topic.strip()
        if normalized in seen or len(normalized) < 3:
            continue
        # Skip purely numeric
        if normalized.replace(".", "").replace(" ", "").isdigit():
            continue
        seen.add(normalized)

        score = float(count)
        # TF-IDF boost
        topic_words = set(normalized.split())
        if topic_words & tfidf_terms:
            score *= 1.6

        # Prefer multi-word (more specific) topics
        if len(topic_words) > 1:
            score *= 1.2

        scored.append((normalized, score))

    scored.sort(key=lambda x: x[1], reverse=True)

    # Title-case for display
    topics = [t.title() for t, _ in scored[:max_topics]]
    return topics


def build_study_plan(topics: list[str], days: int = 5) -> dict[str, list[str]]:
    """
    Distribute topics across N days.
    Heavier topics (longer strings → more content) get spread first.
    """
    if not topics:
        return {f"Day {d + 1}": [] for d in range(days)}

    n = len(topics)
    base = n // days
    remainder = n % days

    plan: dict[str, list[str]] = {}
    idx = 0
    for day in range(1, days + 1):
        count = base + (1 if day <= remainder else 0)
        plan[f"Day {day}"] = topics[idx: idx + count]
        idx += count

    return plan


import re
import logging

logger = logging.getLogger(__name__)

def _tokenize(text: str) -> list[str]:
    return re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())

def _highlight_keywords(sentence: str, query_words: list[str]) -> list[str]:

    sentence_words = set(re.findall(r'\b[a-zA-Z]{2,}\b', sentence.lower()))
    return [w for w in query_words if w.lower() in sentence_words]

def answer_query(query: str, corpus: list[dict], top_k: int = 1) -> dict:

    if not corpus or not query.strip():
        return {"answer": "No documents available.", "matched_keywords": [], "source": None}

    all_sentences = []
    sentence_sources = []

    for doc in corpus:
        text = doc.get("text", "")
        source = doc.get("source", "")
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 20]
        all_sentences.extend(sentences)
        sentence_sources.extend([source] * len(sentences))

    if not all_sentences:
        return {"answer": "No content found.", "matched_keywords": [], "source": None}

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np

        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=1000,
        )
        all_docs = all_sentences + [query]
        tfidf_matrix = vectorizer.fit_transform(all_docs)

        query_vec = tfidf_matrix[-1]
        sentence_vecs = tfidf_matrix[:-1]

        similarities = cosine_similarity(query_vec, sentence_vecs).flatten()
        top_idx = int(similarities.argmax())

        if similarities[top_idx] < 0.02:
            return {
                "answer": "Could not find a relevant answer in the attached books or context. Try rephrasing.",
                "matched_keywords": [],
                "source": None,
            }

        best_sentence = all_sentences[top_idx]
        best_source = sentence_sources[top_idx]

        query_words = _tokenize(query)
        matched = _highlight_keywords(best_sentence, query_words)

        return {
            "answer": best_sentence,
            "matched_keywords": matched,
            "source": best_source,
        }

    except Exception as e:
        logger.error(f"Search service error: {e}")

        query_words = set(_tokenize(query))
        best_sent = ""
        best_score = 0

        for sent in all_sentences:
            sent_words = set(_tokenize(sent))
            overlap = len(query_words & sent_words)
            if overlap > best_score:
                best_score = overlap
                best_sent = sent

        if best_sent:
            return {
                "answer": best_sent,
                "matched_keywords": list(query_words & set(_tokenize(best_sent))),
                "source": None,
            }

        return {"answer": "Search unavailable.", "matched_keywords": [], "source": None}

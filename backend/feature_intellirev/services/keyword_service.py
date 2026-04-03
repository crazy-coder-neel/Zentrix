"""
Keyword Service — TF-IDF term extraction.
Returns most important keywords for a given text corpus.
No LLMs. Pure statistical NLP.
"""
import re
import logging

logger = logging.getLogger(__name__)


def extract_keywords(text: str, k: int = 10) -> list[str]:
    """
    Extract top K keywords using TF-IDF on sentence chunks.
    Returns list of important terms (unigrams and bigrams).
    """
    if not text or len(text.strip()) < 20:
        return []

    # Split into pseudo-documents (paragraphs / sentences)
    chunks = [s.strip() for s in re.split(r'[.!?\n]', text) if len(s.strip()) > 15]
    if len(chunks) < 2:
        chunks = [text]

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        import numpy as np

        vectorizer = TfidfVectorizer(
            max_features=200,
            ngram_range=(1, 1), # Only unigrams to prevent garbage like "Focus Processing"
            stop_words="english",
            min_df=1,
            max_df=0.9,
            sublinear_tf=True,
        )
        tfidf_matrix = vectorizer.fit_transform(chunks)
        feature_names = vectorizer.get_feature_names_out()

        # Average TF-IDF scores across all chunks
        mean_scores = tfidf_matrix.mean(axis=0).A1

        # Sort and pick top K
        sorted_indices = mean_scores.argsort()[::-1]
        keywords = []
        for i in sorted_indices:
            kw = feature_names[i]
            # Must be purely alphabetical and substantial
            if len(kw) > 3 and kw.isalpha():
                keywords.append(kw.title())
            if len(keywords) >= k:
                break
                
        return keywords

    except Exception as e:
        logger.warning(f"Keyword extraction failed: {e}")
        # Fallback: simple word frequency
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        from collections import Counter
        common = Counter(words).most_common(k)
        return [w.title() for w, _ in common]

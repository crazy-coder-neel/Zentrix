
import re
import logging
import numpy as np

logger = logging.getLogger(__name__)

def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:

    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

def _clean_text(text: str) -> str:

    text = re.sub(r'([.!?])([A-Za-z])', r'\1 \2', text)

    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    return text

def _split_sentences(text: str) -> list[str]:

    text = _clean_text(text)
    raw = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in raw if len(s.split()) > 4 and len(s.strip()) > 25]

def textrank_summarize(text: str, n: int = 8) -> list[str]:

    sentences = _split_sentences(text)

    if len(sentences) <= n:
        return sentences

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        import networkx as nx

        vectorizer = TfidfVectorizer(stop_words="english", max_features=500)
        tfidf_matrix = vectorizer.fit_transform(sentences).toarray()

        num_sentences = len(sentences)
        similarity_matrix = np.zeros((num_sentences, num_sentences))

        for i in range(num_sentences):
            for j in range(num_sentences):
                if i != j:
                    similarity_matrix[i][j] = _cosine_similarity(
                        tfidf_matrix[i], tfidf_matrix[j]
                    )

        graph = nx.from_numpy_array(similarity_matrix)
        scores = nx.pagerank(graph, max_iter=100, tol=1e-4)

        ranked_indices = sorted(scores.keys(), key=lambda i: scores[i], reverse=True)

        target_words = 550
        current_words = 0
        selected_indices = []

        for idx in ranked_indices:
            sent_words = len(sentences[idx].split())
            if current_words + sent_words > target_words + 50: 
                break
            selected_indices.append(idx)
            current_words += sent_words

        top_indices = sorted(selected_indices)

        return [sentences[i] for i in top_indices]

    except Exception as e:
        logger.warning(f"TextRank failed, falling back to first-N: {e}")

        return sentences[:n]

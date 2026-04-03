"""
Text Cleaner — Remove stopwords, punctuation, normalize text.
Rule-based. No LLMs.
"""
import re
import string


_STOPWORDS = None


def _get_stopwords() -> set:
    global _STOPWORDS
    if _STOPWORDS is None:
        try:
            from nltk.corpus import stopwords
            _STOPWORDS = set(stopwords.words("english"))
        except Exception:
            # Fallback minimal stopwords if NLTK not available
            _STOPWORDS = {
                "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
                "for", "of", "with", "by", "from", "as", "is", "was", "are",
                "were", "be", "been", "being", "have", "has", "had", "do", "does",
                "did", "will", "would", "could", "should", "may", "might", "shall",
                "can", "this", "that", "these", "those", "it", "its", "i", "we",
                "you", "he", "she", "they", "their", "our", "your", "his", "her",
            }
    return _STOPWORDS


def clean_text(text: str) -> str:
    """
    Full text cleaning pipeline:
    1. Lowercase
    2. Remove special chars / extra whitespace
    3. Preserve sentence structure (keep . ! ?)
    Returns cleaned text suitable for NLP processing.
    """
    if not text:
        return ""

    # Normalize unicode
    text = text.encode("ascii", errors="ignore").decode("ascii")

    # Remove non-printable chars
    text = re.sub(r'[^\x20-\x7E\n]', ' ', text)

    # Collapse repeated punctuation
    text = re.sub(r'\.{2,}', '.', text)

    # Remove URLs
    text = re.sub(r'https?://\S+', '', text)

    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)

    # Remove page numbers (e.g., "Page 1", "- 1 -")
    text = re.sub(r'(page\s*\d+|-\s*\d+\s*-)', '', text, flags=re.IGNORECASE)

    # Normalize whitespace (keep newlines for context)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def remove_stopwords(text: str) -> str:
    """Remove stopwords from text (used for TF-IDF input)."""
    stopwords = _get_stopwords()
    tokens = text.lower().split()
    filtered = [t for t in tokens if t not in stopwords and len(t) > 2]
    return " ".join(filtered)


def tokenize_sentences(text: str) -> list[str]:
    """Split text into sentences. Returns list of non-empty sentences."""
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if len(s.strip()) > 20]

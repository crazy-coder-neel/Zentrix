
import re
import uuid
import random
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_nlp = None

def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            raise RuntimeError("Run: python -m spacy download en_core_web_sm")
    return _nlp

def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 30]

def _extract_candidates(sentence: str) -> list[tuple[str, str]]:

    nlp = _get_nlp()
    doc = nlp(sentence)

    candidates = []

    for ent in doc.ents:
        if ent.label_ in {"ORG", "PERSON", "PRODUCT", "GPE", "WORK_OF_ART", "LAW", "NORP"}:
            candidates.append((ent.text, "entity"))

    for chunk in doc.noun_chunks:
        txt = chunk.text.strip()

        if len(txt.split()) >= 1 and len(txt) > 3:
            candidates.append((txt, "noun_chunk"))

    for token in doc:
        if token.pos_ in {"NOUN", "PROPN"} and len(token.text) > 3:
            candidates.append((token.text, "noun"))

    seen = set()
    unique = []
    for c, t in candidates:
        if c.lower() not in seen:
            seen.add(c.lower())
            unique.append((c, t))

    return unique

def _make_fill_blank(sentence: str, answer: str) -> Optional[dict]:

    if answer.lower() not in sentence.lower():
        return None

    pattern = re.compile(re.escape(answer), re.IGNORECASE)
    question_text = pattern.sub("___", sentence, count=1)
    if "___" not in question_text:
        return None
    return {
        "question_text": question_text,
        "question_type": "fill_blank",
        "answer": answer,
        "options": None,
    }

def _make_mcq(sentence: str, answer: str, distractors: list[str]) -> dict:

    q = sentence.rstrip(".")

    if len(q.split()) < 20:
        question_text = f"Which of the following is correct about: '{q}'?"
    else:
        question_text = f"What does the following statement describe? '{q[:80]}...'"

    options = [answer] + distractors[:3]
    random.shuffle(options)

    return {
        "question_text": question_text,
        "question_type": "mcq",
        "answer": answer,
        "options": options,
    }

def generate_questions(text: str, topic_id: str, n: int = 8) -> list[dict]:

    sentences = _split_sentences(text)
    if not sentences:
        return []

    all_nouns: list[str] = []
    nlp = _get_nlp()
    for sent in sentences[:30]:
        doc = nlp(sent)
        all_nouns.extend([t.text for t in doc if t.pos_ in {"NOUN", "PROPN"} and len(t.text) > 3])

    questions = []
    used_answers = set()
    attempts = 0
    random.shuffle(sentences)

    for sentence in sentences:
        if len(questions) >= n:
            break
        if attempts > 80:
            break
        attempts += 1

        candidates = _extract_candidates(sentence)
        if not candidates:
            continue

        for answer, ctype in candidates:
            if answer.lower() in used_answers:
                continue
            if len(answer) < 2:
                continue
            used_answers.add(answer.lower())

            distractors = [
                w for w in all_nouns
                if w.lower() != answer.lower()
            ][:3]

            while len(distractors) < 3:
                distractors.append(random.choice(["Function", "Algorithm", "Variable", "Structure"]))

            pattern = re.compile(re.escape(answer), re.IGNORECASE)
            safe_sentence = pattern.sub("This concept", sentence, count=1)

            if len(safe_sentence.split()) > 15:
                question_text = f"Based on the text, which concept is best described by the following: '{safe_sentence}'"
            else:
                question_text = f"Which of the following terms is directly associated with this statement: '{safe_sentence}'"

            options = [answer] + distractors[:3]
            random.shuffle(options)

            q = {
                "question_text": question_text,
                "question_type": "mcq",
                "answer": answer,
                "options": options,
            }

            if q:
                q["id"] = str(uuid.uuid4())
                q["topic_id"] = topic_id
                questions.append(q)
                break

        if len(questions) >= n:
            break

    return questions

"""
PDF Parser — Extract plain text from PDF bytes using PyMuPDF (fitz).
No LLMs. Pure text extraction.
"""
import io
import re


def extract_text_from_pdf(content: bytes) -> str:
    """
    Extract and clean text from a PDF byte stream.
    Returns a single cleaned string.
    """
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=content, filetype="pdf")
        pages_text = []

        for page in doc:
            text = page.get_text("text")
            if text.strip():
                pages_text.append(text)

        doc.close()
        raw = "\n".join(pages_text)

        # Basic cleanup
        raw = re.sub(r'\n{3,}', '\n\n', raw)  # Collapse excess newlines
        raw = re.sub(r'[ \t]{2,}', ' ', raw)  # Collapse excess spaces
        raw = raw.strip()

        return raw

    except ImportError:
        raise RuntimeError("PyMuPDF (fitz) not installed. Run: pip install pymupdf")
    except Exception as e:
        raise RuntimeError(f"PDF parsing failed: {e}")

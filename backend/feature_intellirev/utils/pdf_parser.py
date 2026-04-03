
import io
import re

def extract_text_from_pdf(content: bytes) -> str:

    try:
        import fitz  

        doc = fitz.open(stream=content, filetype="pdf")
        pages_text = []

        for page in doc:
            text = page.get_text("text")
            if text.strip():
                pages_text.append(text)

        doc.close()
        raw = "\n".join(pages_text)

        raw = re.sub(r'\n{3,}', '\n\n', raw)  
        raw = re.sub(r'[ \t]{2,}', ' ', raw)  
        raw = raw.strip()

        return raw

    except ImportError:
        raise RuntimeError("PyMuPDF (fitz) not installed. Run: pip install pymupdf")
    except Exception as e:
        raise RuntimeError(f"PDF parsing failed: {e}")

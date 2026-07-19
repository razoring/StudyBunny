import uuid
from pypdf import PdfReader
from app.models.schemas import Chunk
import pdfplumber

CHUNK_SIZE_CHARS = 1500
CHUNK_OVERLAP_CHARS = 200


# def extract_text(file_path: str, filename: str) -> str:
#     """Extract raw text from an uploaded file. Supports PDF and plain text for now."""
#     if filename.lower().endswith(".pdf"):
#         reader = PdfReader(file_path)
#         pages = [page.extract_text() or "" for page in reader.pages]
#         return "\n\n".join(pages)
#     elif filename.lower().endswith(".txt"):
#         with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
#             return f.read()
#     else:
#         raise ValueError(f"Unsupported file type: {filename}")
    
    
def extract_text(file_path: str, filename: str) -> str:
    """Extract raw text from an uploaded file. Supports PDF and plain text for now."""
    if filename.lower().endswith(".pdf"):
        with pdfplumber.open(file_path) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        return "\n\n".join(pages)
    elif filename.lower().endswith(".txt"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    else:
        raise ValueError(f"Unsupported file type: {filename}")


# def chunk_text(text: str, document_id: str) -> list[Chunk]:
#     """
#     Simple fixed-size sliding-window chunker with overlap.
#     Good enough for a hackathon; swap for a semantic/sentence-aware
#     chunker later if retrieval quality needs improving.
#     """
#     text = text.strip()
#     if not text:
#         return []

#     chunks: list[Chunk] = []
#     start = 0
#     order = 0
#     text_len = len(text)

#     while start < text_len:
#         end = min(start + CHUNK_SIZE_CHARS, text_len)
#         chunk_str = text[start:end].strip()
#         if chunk_str:
#             chunks.append(Chunk(
#                 chunk_id=f"{document_id}_{uuid.uuid4().hex[:8]}",
#                 document_id=document_id,
#                 text=chunk_str,
#                 order=order,
#             ))
#             order += 1
#         if end == text_len:
#             break
#         start = end - CHUNK_OVERLAP_CHARS

#     return chunks

def chunk_text(text: str, document_id: str) -> list[Chunk]:
    """
    Simple fixed-size sliding-window chunker with overlap.
    Good enough for a hackathon; swap for a semantic/sentence-aware
    chunker later if retrieval quality needs improving.
    """
    text = text.strip()
    if not text:
        return []

    chunks: list[Chunk] = []
    start = 0
    order = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + CHUNK_SIZE_CHARS, text_len)
        chunk_str = text[start:end].strip()
        if chunk_str:
            chunks.append(Chunk(
                chunk_id=f"{document_id}_{uuid.uuid4().hex[:8]}",
                document_id=document_id,
                text=chunk_str,
                order=order,
            ))
            order += 1
        if end == text_len:
            break
        start = end - CHUNK_OVERLAP_CHARS

    return chunks

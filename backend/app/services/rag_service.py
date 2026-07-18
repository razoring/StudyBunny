import google.generativeai as genai
from app.config import settings
from app.services.embedding_service import embed_text
from app.vector_store.chroma_client import query_chunks

genai.configure(api_key=settings.gemini_api_key)

GENERATION_MODEL = "gemini-3.5-flash"

ANSWER_PROMPT = """You are a helpful study avatar embedded in a study app. Answer the
student's question using ONLY the context below. If the context doesn't contain the
answer, say so honestly rather than guessing. Keep answers concise and encouraging,
suitable for being read aloud via text-to-speech.

CONTEXT:
{context}

STUDENT QUESTION:
{question}
"""


def answer_question(question: str, document_id: str, n_results: int = 5) -> dict:
    query_embedding = embed_text(question)
    chunks = query_chunks(query_embedding, document_id=document_id, n_results=n_results)

    context = "\n\n---\n\n".join(c["text"] for c in chunks)

    model = genai.GenerativeModel(GENERATION_MODEL)
    prompt = ANSWER_PROMPT.format(context=context, question=question)
    response = model.generate_content(prompt)

    return {
        "reply": response.text.strip(),
        "source_chunks": [c["id"] for c in chunks],
    }
